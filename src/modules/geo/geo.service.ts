import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionQueryDto } from './dto/position-query.dto';
import { CalculateRouteDto } from './dto/calculate-route.dto';
import { MarkerQueryDto } from './dto/marker-query.dto';
import { SaveRouteDto } from './dto/save-route.dto';

export interface NearbyResult {
  users?: Array<{
    userId: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    distance: number;
  }>;
  landmarks?: Array<Record<string, any> & { distance: number }>;
}

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  private haversine(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async updatePosition(userId: string, dto: UpdatePositionDto) {
    return this.prisma.userPosition.create({
      data: {
        userId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        source: dto.source ?? 'gps',
      },
    });
  }

  async getCurrentPosition(userId: string) {
    const position = await this.prisma.userPosition.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
    });

    if (!position) {
      throw new NotFoundException('No position recorded yet');
    }

    return position;
  }

  async getPositionHistory(userId: string, query: PositionQueryDto) {
    const { page = 1, limit = 50 } = query;

    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.userPosition.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.userPosition.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findNearby(userId: string, query: PositionQueryDto): Promise<NearbyResult> {
    const {
      latitude,
      longitude,
      radius = 5000,
      type = 'all',
      page = 1,
      limit = 20,
    } = query;

    if (latitude === undefined || longitude === undefined) {
      const current = await this.getCurrentPosition(userId);
      return this.findNearby(userId, {
        ...query,
        latitude: current.latitude,
        longitude: current.longitude,
      });
    }

    const results: NearbyResult = {};

    if (type === 'users' || type === 'all') {
      results.users = await this.findNearbyUsers(userId, latitude, longitude, radius, page, limit);
    }

    if (type === 'landmarks' || type === 'all') {
      results.landmarks = await this.findNearbyLandmarks(latitude, longitude, radius, page, limit);
    }

    return results;
  }

  private async findNearbyUsers(
    userId: string,
    latitude: number,
    longitude: number,
    radius: number,
    page: number,
    limit: number,
  ) {
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{
        userId: string;
        latitude: number;
        longitude: number;
        accuracy: number | null;
        distance: number;
      }>>(
        `SELECT DISTINCT ON (up."userId") up."userId", up.latitude, up.longitude, up.accuracy,
          ST_Distance(up.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 AS distance
         FROM "UserPosition" up
         WHERE up."userId" != $3
           AND up.location IS NOT NULL
           AND ST_DWithin(up.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $4)
         ORDER BY up."userId", up."recordedAt" DESC
         OFFSET $5 LIMIT $6`,
        longitude, latitude, userId, radius, (page - 1) * limit, limit,
      );
      return rows.map((r) => ({
        userId: r.userId,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        accuracy: r.accuracy,
        distance: Number(r.distance),
      }));
    } catch {
      return this.findNearbyUsersFallback(userId, latitude, longitude, radius, page, limit);
    }
  }

  private async findNearbyUsersFallback(
    userId: string,
    latitude: number,
    longitude: number,
    radius: number,
    page: number,
    limit: number,
  ) {
    const earthRadius = 6371;
    const latRad = (latitude * Math.PI) / 180;
    const latMin = latitude - (radius / earthRadius) * (180 / Math.PI);
    const latMax = latitude + (radius / earthRadius) * (180 / Math.PI);
    const lngMin = longitude - (radius / earthRadius) * (180 / Math.PI) / Math.cos(latRad);
    const lngMax = longitude + (radius / earthRadius) * (180 / Math.PI) / Math.cos(latRad);

    const recentPositions = await this.prisma.userPosition.findMany({
      where: {
        userId: { not: userId },
        latitude: { gte: latMin, lte: latMax },
        longitude: { gte: lngMin, lte: lngMax },
      },
      orderBy: { recordedAt: 'desc' },
      distinct: ['userId'],
    });

    const filtered = recentPositions
      .map((p) => ({
        userId: p.userId,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy,
        distance: this.haversine(latitude, longitude, p.latitude, p.longitude),
      }))
      .filter((p) => p.distance <= radius / 1000)
      .sort((a, b) => a.distance - b.distance);

    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }

  private async findNearbyLandmarks(
    latitude: number,
    longitude: number,
    radius: number,
    page: number,
    limit: number,
  ) {
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT l.*,
          ST_Distance(l.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 AS distance
         FROM "Landmark" l
         WHERE l."deletedAt" IS NULL
           AND l."isPublic" = true
           AND l.location IS NOT NULL
           AND ST_DWithin(l.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
         ORDER BY distance
         OFFSET $4 LIMIT $5`,
        longitude, latitude, radius, (page - 1) * limit, limit,
      );
      return rows.map((r: any) => ({ ...r, distance: Number(r.distance) }));
    } catch {
      return this.findNearbyLandmarksFallback(latitude, longitude, radius, page, limit);
    }
  }

  private async findNearbyLandmarksFallback(
    latitude: number,
    longitude: number,
    radius: number,
    page: number,
    limit: number,
  ) {
    const earthRadius = 6371;
    const latRad = (latitude * Math.PI) / 180;
    const latMin = latitude - (radius / earthRadius) * (180 / Math.PI);
    const latMax = latitude + (radius / earthRadius) * (180 / Math.PI);
    const lngMin = longitude - (radius / earthRadius) * (180 / Math.PI) / Math.cos(latRad);
    const lngMax = longitude + (radius / earthRadius) * (180 / Math.PI) / Math.cos(latRad);

    const landmarks = await this.prisma.landmark.findMany({
      where: {
        deletedAt: null,
        isPublic: true,
        latitude: { gte: latMin, lte: latMax },
        longitude: { gte: lngMin, lte: lngMax },
      },
    });

    const filtered = landmarks
      .map((l) => ({
        ...l,
        distance: this.haversine(latitude, longitude, l.latitude, l.longitude),
      }))
      .filter((l) => l.distance <= radius / 1000)
      .sort((a, b) => a.distance - b.distance);

    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }

  async getMarkersInBounds(query: MarkerQueryDto) {
    const { swLat, swLng, neLat, neLng, category, limit = 100 } = query;

    try {
      let sql = `SELECT id, name, category, latitude, longitude
                 FROM "Landmark"
                 WHERE "deletedAt" IS NULL AND "isPublic" = true
                   AND location IS NOT NULL
                   AND ST_Intersects(location, ST_SetSRID(ST_MakeEnvelope($1, $2, $3, $4, 4326), 4326))`;
      const params: unknown[] = [swLng, swLat, neLng, neLat];

      if (category) {
        params.push(category);
        sql += ` AND category = $${params.length}`;
      }

      sql += ` ORDER BY "createdAt" DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string; name: string; category: string; latitude: number; longitude: number }>>(sql, ...params);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
      }));
    } catch {
      const where: any = {
        deletedAt: null,
        isPublic: true,
        latitude: { gte: swLat, lte: neLat },
        longitude: { gte: swLng, lte: neLng },
      };

      if (category) {
        where.category = category;
      }

      const landmarks = await this.prisma.landmark.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return landmarks.map((l) => ({
        id: l.id,
        name: l.name,
        category: l.category,
        latitude: l.latitude,
        longitude: l.longitude,
      }));
    }
  }

  async calculateRoute(dto: CalculateRouteDto) {
    const distanceKm = Math.round(
      this.haversine(dto.originLat, dto.originLng, dto.destLat, dto.destLng) * 100,
    ) / 100;

    const avgSpeedKmh = 30;
    const durationMin = Math.round((distanceKm / avgSpeedKmh) * 60);

    const polyline = this.encodePolyline([
      [dto.originLat, dto.originLng],
      [dto.destLat, dto.destLng],
    ]);

    const route = await this.prisma.route.create({
      data: {
        name: dto.name ?? `${dto.originLat.toFixed(4)},${dto.originLng.toFixed(4)} → ${dto.destLat.toFixed(4)},${dto.destLng.toFixed(4)}`,
        originLat: dto.originLat,
        originLng: dto.originLng,
        destLat: dto.destLat,
        destLng: dto.destLng,
        distanceKm,
        durationMin,
        polyline,
      },
    });

    return route;
  }

  async saveRoute(userId: string, dto: SaveRouteDto) {
    return this.prisma.route.create({
      data: { ...dto, userId },
    });
  }

  async getRoutes(userId: string) {
    return this.prisma.route.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRoute(id: string, userId?: string) {
    const route = await this.prisma.route.findUnique({ where: { id } });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    if (route.userId && route.userId !== userId) {
      throw new NotFoundException('Route not found');
    }

    return route;
  }

  private encodePolyline(points: number[][]): string {
    const encodeCoord = (num: number): string => {
      let n = Math.round(num * 1e5);
      n <<= 1;
      if (num < 0) n = ~n;
      let encoded = '';
      while (n >= 0x20) {
        encoded += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
        n >>= 5;
      }
      encoded += String.fromCharCode(n + 63);
      return encoded;
    };

    let result = '';
    let prevLat = 0;
    let prevLng = 0;

    for (const [lat, lng] of points) {
      result += encodeCoord(lat - prevLat);
      result += encodeCoord(lng - prevLng);
      prevLat = lat;
      prevLng = lng;
    }

    return result;
  }
}
