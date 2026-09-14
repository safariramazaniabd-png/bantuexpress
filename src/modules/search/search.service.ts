import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SearchQueryDto, SearchType, SearchSort, SuggestionQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQueryDto) {
    const {
      q,
      type = SearchType.ALL,
      city,
      province,
      category,
      lat,
      lng,
      radius,
      sort = SearchSort.RELEVANCE,
      page = 1,
      limit = 20,
    } = query;

    const results: any[] = [];
    let total = 0;

    const searchPeople = type === SearchType.PEOPLE || type === SearchType.ALL;
    const searchLandmarks = type === SearchType.LANDMARKS || type === SearchType.ALL;
    const searchAddresses = type === SearchType.ADDRESSES || type === SearchType.ALL;
    const searchBusinesses = type === SearchType.BUSINESSES || type === SearchType.ALL;

    const useGeo = lat !== undefined && lng !== undefined;

    if (q && q.trim()) {
      const term = q.trim();

      if (searchPeople) {
        const [people, peopleTotal] = await this.searchPeople(term, city, province, sort, page, limit);
        results.push(...people.map((p: any) => ({
          type: 'people',
          id: p.id,
          userId: p.userId,
          firstName: p.firstName,
          lastName: p.lastName,
          profession: p.profession,
          avatarUrl: p.avatarUrl,
          city: p.city,
          languages: p.languages,
          ...(useGeo && 'distance' in p ? { distance: p.distance } : {}),
        })));
        total += peopleTotal;
      }

      if (searchAddresses) {
        const [addresses, addrTotal] = await this.searchAddresses(term, city, province, useGeo, lat, lng, radius, sort, page, limit);
        results.push(...addresses.map((a: any) => ({
          type: 'address',
          id: a.id,
          label: a.label,
          avenue: a.avenue,
          quartier: a.quartier,
          city: a.city,
          province: a.province,
          latitude: a.latitude,
          longitude: a.longitude,
          isPublic: a.isPublic,
          ...(useGeo && 'distance' in a ? { distance: a.distance } : {}),
        })));
        total += addrTotal;
      }

      if (searchBusinesses) {
        const [businesses, bizTotal] = await this.searchBusinesses(term, city, province, useGeo, lat, lng, radius, sort, page, limit);
        results.push(...businesses.map((b: any) => ({
          type: 'business',
          id: b.id,
          name: b.name,
          businessType: b.type,
          sector: b.sector,
          description: b.description,
          city: b.city,
          province: b.province,
          logoUrl: b.logoUrl,
          isVerified: b.isVerified,
          ...(useGeo && 'distance' in b ? { distance: b.distance } : {}),
        })));
        total += bizTotal;
      }
    }

    if (searchLandmarks) {
      const [landmarks, lmTotal] = await this.searchLandmarks(
        q?.trim(), city, province, category,
        useGeo, lat, lng, radius, sort, page, limit,
      );
      results.push(...landmarks.map((l: any) => ({
        type: 'landmark',
        id: l.id,
        name: l.name,
        category: l.category,
        description: l.description,
        city: l.city,
        province: l.province,
        latitude: l.latitude,
        longitude: l.longitude,
        ...(useGeo && 'distance' in l ? { distance: l.distance } : {}),
      })));
      total += lmTotal;
    }

    if (sort === SearchSort.DISTANCE) {
      results.sort((a: any, b: any) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else if (sort === SearchSort.NAME) {
      const nameKey = (r: any) => (r.firstName ?? r.name ?? r.label ?? '').toLowerCase();
      results.sort((a: any, b: any) => nameKey(a).localeCompare(nameKey(b)));
    }

    return {
      data: results,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async suggest(query: SuggestionQueryDto) {
    const term = query.q.trim();
    if (!term || term.length < 2) return [];

    const [people, landmarks, businesses] = await Promise.all([
      this.prisma.profile.findMany({
        where: {
          isPublic: true,
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { firstName: true, lastName: true },
        take: 5,
      }),
      this.prisma.landmark.findMany({
        where: {
          deletedAt: null,
          isPublic: true,
          name: { contains: term, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        take: 5,
      }),
      this.prisma.businessProfile.findMany({
        where: {
          deletedAt: null,
          isPublic: true,
          name: { contains: term, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        take: 5,
      }),
    ]);

    const suggestions: Array<{ text: string; type: string; entityId?: string }> = [];

    for (const p of people) {
      const name = `${p.firstName} ${p.lastName}`.trim();
      if (name) suggestions.push({ text: name, type: 'people' });
    }
    for (const l of landmarks) {
      suggestions.push({ text: l.name, type: 'landmark', entityId: l.id });
    }
    for (const b of businesses) {
      suggestions.push({ text: b.name, type: 'business', entityId: b.id });
    }

    return suggestions.slice(0, query.limit ?? 10);
  }

  private buildFtsWhere(
    term: string,
    table: string,
    fields: string[],
  ): { fts: string; like: any } {
    const tsquery = term.split(/\s+/).filter(Boolean).map(t => `${t}:*`).join(' & ');
    const fts = `"${table}"."search_vector" @@ to_tsquery('simple', $1)`;
    const like: any = {
      OR: fields.map(f => ({ [f]: { contains: term, mode: 'insensitive' as const } })),
    };
    return { fts, like };
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async searchWithFts<T>(
    table: string,
    term: string,
    ftsWhere: { fts: string; like: any },
    baseWhere: any,
    includeGeo: boolean,
    lat: number | undefined,
    lng: number | undefined,
    radius: number | undefined,
    sort: SearchSort,
    page: number,
    limit: number,
  ): Promise<[T[], number]> {
    const offset = (page - 1) * limit;

    try {
      const params: any[] = [term];
      let whereClauses = '';

      const conditions: string[] = [];
      for (const [key, val] of Object.entries(baseWhere)) {
        if (val !== undefined) {
          params.push(val);
          conditions.push(`"${key}" = $${params.length}`);
        }
      }

      const searchClause = `(${ftsWhere.fts})`;
      whereClauses = conditions.length ? `${searchClause} AND ${conditions.join(' AND ')}` : searchClause;

      let geoSelect = '';
      let geoOrder = '';
      let geoHaving = '';
      if (includeGeo && lat !== undefined && lng !== undefined) {
        const r = radius ?? 5000;
        geoSelect = `, ST_Distance(location, ST_SetSRID(ST_MakePoint($${params.length + 1}, $${params.length + 2}), 4326)::geography) / 1000 AS distance`;
        geoHaving = ` AND location IS NOT NULL AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($${params.length + 1}, $${params.length + 2}), 4326)::geography, $${params.length + 3})`;
        params.push(lng, lat, r);
        if (sort === SearchSort.DISTANCE) geoOrder = 'distance ASC, ';
      }

      const orderClause = geoOrder || (sort === SearchSort.NAME ? 'name ASC, ' : '');
      const sql = `SELECT *${geoSelect} FROM "${table}" WHERE "deletedAt" IS NULL AND ${whereClauses}${geoHaving} ORDER BY ${orderClause}ts_rank(search_vector, plainto_tsquery('simple', $1)) DESC LIMIT ${limit} OFFSET ${offset}`;

      const rows = await this.prisma.$queryRawUnsafe<T[]>(sql, ...params);
      const countSql = `SELECT COUNT(*) as cnt FROM "${table}" WHERE "deletedAt" IS NULL AND ${whereClauses}${geoHaving ? geoHaving.replace(/AND location IS NOT NULL AND/, 'AND') : ''}`;
      const countResult = await this.prisma.$queryRawUnsafe<[{ cnt: bigint }]>(countSql, ...params);
      const total = Number(countResult[0]?.cnt ?? 0);

      return [rows.map((r: any) => ({ ...r, distance: r.distance ? Number(r.distance) : undefined })) as T[], total];
    } catch {
      return this.searchWithLike<T>(table, ftsWhere.like, baseWhere, includeGeo, lat, lng, radius, sort, page, limit);
    }
  }

  private async searchWithLike<T>(
    table: string,
    likeWhere: any,
    baseWhere: any,
    includeGeo: boolean,
    lat: number | undefined,
    lng: number | undefined,
    radius: number | undefined,
    sort: SearchSort,
    page: number,
    limit: number,
  ): Promise<[T[], number]> {
    const where = { ...baseWhere, ...likeWhere, deletedAt: null };
    const isLandmark = table === 'Landmark';
    if (isLandmark) where.isPublic = true;

    if (includeGeo && lat !== undefined && lng !== undefined) {
      const R = 6371;
      const latRad = (lat * Math.PI) / 180;
      const rKm = (radius ?? 5000) / 1000;
      where.latitude = { gte: lat - (rKm / R) * (180 / Math.PI), lte: lat + (rKm / R) * (180 / Math.PI) };
      where.longitude = { gte: lng - (rKm / R) * (180 / Math.PI) / Math.cos(latRad), lte: lng + (rKm / R) * (180 / Math.PI) / Math.cos(latRad) };
    }

    const model = (this.prisma as any)[table[0].toLowerCase() + table.slice(1)];

    let data = await model.findMany({ where, skip: (page - 1) * limit, take: limit });
    const count = await model.count({ where });

    if (includeGeo && lat !== undefined && lng !== undefined) {
      data = data
        .map((r: any) => ({ ...r, distance: this.haversine(lat, lng, r.latitude, r.longitude) }))
        .filter((r: any) => (radius ? r.distance * 1000 <= radius : true));
      if (sort === SearchSort.DISTANCE) data.sort((a: any, b: any) => a.distance - b.distance);
    }

    return [data as T[], count];
  }

  private async searchPeople(term: string, city?: string, province?: string, sort?: SearchSort, page = 1, limit = 20) {
    const baseWhere: any = { isPublic: true, user: { isActive: true } };
    if (city) baseWhere.user = { ...baseWhere.user, addresses: { some: { city, isPublic: true } } };
    if (province) baseWhere.user = { ...baseWhere.user, addresses: { some: { province, isPublic: true } } };

    const ftsWhere = this.buildFtsWhere(term, 'Profile', ['firstName', 'lastName', 'profession']);

    try {
      const params: any[] = [term];
      let extraJoin = '';
      let extraWhere = '';

      if (city || province) {
        baseWhere.city = city;
        baseWhere.province = province;
      }

      const conditions = [`"Profile"."isPublic" = true`];
      if (city) { conditions.push(`"Address"."city" = $${params.length + 1}`); params.push(city); extraJoin = 'LEFT JOIN "Address" ON "Address"."userId" = "Profile"."userId" AND "Address"."deletedAt" IS NULL AND "Address"."isPublic" = true'; }
      if (province) { conditions.push(`"Address"."province" = $${params.length + 1}`); params.push(province); extraJoin = 'LEFT JOIN "Address" ON "Address"."userId" = "Profile"."userId" AND "Address"."deletedAt" IS NULL AND "Address"."isPublic" = true'; }

      conditions.push(`"Profile"."search_vector" @@ to_tsquery('simple', $1)`);
      const whereClause = conditions.join(' AND ');

      const sql = `SELECT "Profile".*, ${city || province ? `"Address"."city"` : 'NULL AS city'} FROM "Profile" ${extraJoin} WHERE ${whereClause} ORDER BY ts_rank("Profile"."search_vector", plainto_tsquery('simple', $1)) DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
      const rows = await this.prisma.$queryRawUnsafe<any[]>(sql, ...params);

      const countSql = `SELECT COUNT(*) as cnt FROM "Profile" ${extraJoin} WHERE ${whereClause}`;
      const countResult = await this.prisma.$queryRawUnsafe<[{ cnt: bigint }]>(countSql, ...params);
      const total = Number(countResult[0]?.cnt ?? 0);

      return [rows, total] as const;
    } catch {
      const like = ftsWhere.like;
      const where: any = { isPublic: true, ...like, user: { isActive: true } };
      if (city) where.user = { ...where.user, addresses: { some: { city, isPublic: true } } };
      if (province) where.user = { ...where.user, addresses: { some: { province, isPublic: true } } };

      const [data, total] = await Promise.all([
        this.prisma.profile.findMany({
          where,
          include: { user: { select: { addresses: { where: { isPublic: true, deletedAt: null }, take: 1, select: { city: true } } } } },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.profile.count({ where }),
      ]);

      return [data.map((p: any) => ({ ...p, city: p.user?.addresses?.[0]?.city })), total] as const;
    }
  }

  private async searchLandmarks(
    term: string | undefined,
    city?: string,
    province?: string,
    category?: string,
    useGeo?: boolean,
    lat?: number,
    lng?: number,
    radius?: number,
    sort?: SearchSort,
    page = 1,
    limit = 20,
  ) {
    const baseWhere: any = { isPublic: true };
    if (city) baseWhere.city = city;
    if (province) baseWhere.province = province;
    if (category) baseWhere.category = category;

    if (!term) {
      const where: any = { deletedAt: null, isPublic: true };
      if (city) where.city = { contains: city, mode: 'insensitive' as const };
      if (province) where.province = { contains: province, mode: 'insensitive' as const };
      if (category) where.category = category;

      if (useGeo && lat !== undefined && lng !== undefined) {
        return this.searchNearbyLandmarks(lat, lng, radius, where, sort, page, limit);
      }

      const [data, total] = await Promise.all([
        this.prisma.landmark.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' } }),
        this.prisma.landmark.count({ where }),
      ]);
      return [data, total] as const;
    }

    const ftsWhere = this.buildFtsWhere(term, 'Landmark', ['name', 'description']);
    return this.searchWithFts<any>('Landmark', term, ftsWhere, baseWhere, useGeo ?? false, lat, lng, radius, sort ?? SearchSort.RELEVANCE, page, limit);
  }

  private async searchAddresses(
    term: string,
    city?: string,
    province?: string,
    useGeo?: boolean,
    lat?: number,
    lng?: number,
    radius?: number,
    sort?: SearchSort,
    page = 1,
    limit = 20,
  ) {
    const baseWhere: any = { isPublic: true };
    if (city) baseWhere.city = city;
    if (province) baseWhere.province = province;

    const ftsWhere = this.buildFtsWhere(term, 'Address', ['label', 'avenue', 'quartier', 'city']);
    return this.searchWithFts<any>('Address', term, ftsWhere, baseWhere, useGeo ?? false, lat, lng, radius, sort ?? SearchSort.RELEVANCE, page, limit);
  }

  private async searchBusinesses(
    term: string,
    city?: string,
    province?: string,
    useGeo?: boolean,
    lat?: number,
    lng?: number,
    radius?: number,
    sort?: SearchSort,
    page = 1,
    limit = 20,
  ) {
    const baseWhere: any = { isPublic: true };
    if (city) baseWhere.city = city;
    if (province) baseWhere.province = province;

    const ftsWhere = this.buildFtsWhere(term, 'BusinessProfile', ['name', 'description', 'sector', 'city']);

    try {
      const params: any[] = [term];
      const conditions = [`"BusinessProfile"."isPublic" = true`, `"BusinessProfile"."deletedAt" IS NULL`, `"BusinessProfile"."search_vector" @@ to_tsquery('simple', $1)`];
      if (city) { conditions.push(`"BusinessProfile"."city" = $${params.length + 1}`); params.push(city); }
      if (province) { conditions.push(`"BusinessProfile"."province" = $${params.length + 1}`); params.push(province); }

      const whereClause = conditions.join(' AND ');
      const sql = `SELECT * FROM "BusinessProfile" WHERE ${whereClause} ORDER BY ts_rank("BusinessProfile"."search_vector", plainto_tsquery('simple', $1)) DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
      const rows = await this.prisma.$queryRawUnsafe<any[]>(sql, ...params);

      const countSql = `SELECT COUNT(*) as cnt FROM "BusinessProfile" WHERE ${whereClause}`;
      const countResult = await this.prisma.$queryRawUnsafe<[{ cnt: bigint }]>(countSql, ...params);
      const total = Number(countResult[0]?.cnt ?? 0);

      return [rows, total] as const;
    } catch {
      const like = this.buildFtsWhere(term, 'BusinessProfile', ['name', 'description', 'sector', 'city']).like;
      const where: any = { deletedAt: null, isPublic: true, ...like };
      if (city) where.city = { contains: city, mode: 'insensitive' as const };
      if (province) where.province = { contains: province, mode: 'insensitive' as const };

      const [data, total] = await Promise.all([
        this.prisma.businessProfile.findMany({ where, skip: (page - 1) * limit, take: limit }),
        this.prisma.businessProfile.count({ where }),
      ]);
      return [data, total] as const;
    }
  }

  private async searchNearbyLandmarks(
    lat: number,
    lng: number,
    radius = 5000,
    baseWhere: any,
    sort?: SearchSort,
    page = 1,
    limit = 20,
  ) {
    try {
      const params: any[] = [lng, lat, radius];
      let extraWhere = '';
      if (baseWhere.category) { params.push(baseWhere.category); extraWhere = ` AND l.category = $${params.length}`; }
      if (baseWhere.city) { params.push(baseWhere.city); extraWhere += ` AND l.city = $${params.length}`; }

      const sql = `SELECT l.*, ST_Distance(l.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 AS distance
        FROM "Landmark" l
        WHERE l."deletedAt" IS NULL AND l."isPublic" = true AND l.location IS NOT NULL
          AND ST_DWithin(l.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)${extraWhere}
        ORDER BY ${sort === SearchSort.NAME ? 'l.name ASC' : 'distance'} LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
      const rows = await this.prisma.$queryRawUnsafe<any[]>(sql, ...params);

      const countSql = `SELECT COUNT(*) as cnt FROM "Landmark" l WHERE l."deletedAt" IS NULL AND l."isPublic" = true AND l.location IS NOT NULL AND ST_DWithin(l.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)${extraWhere}`;
      const countResult = await this.prisma.$queryRawUnsafe<[{ cnt: bigint }]>(countSql, ...params);
      const total = Number(countResult[0]?.cnt ?? 0);

      return [rows.map((r: any) => ({ ...r, distance: Number(r.distance) })), total] as const;
    } catch {
      const R = 6371;
      const latRad = (lat * Math.PI) / 180;
      const rKm = radius / 1000;
      const where: any = { deletedAt: null, isPublic: true, latitude: { gte: lat - (rKm / R) * (180 / Math.PI), lte: lat + (rKm / R) * (180 / Math.PI) }, longitude: { gte: lng - (rKm / R) * (180 / Math.PI) / Math.cos(latRad), lte: lng + (rKm / R) * (180 / Math.PI) / Math.cos(latRad) } };
      if (baseWhere.category) where.category = baseWhere.category;
      if (baseWhere.city) where.city = baseWhere.city;

      let data = await this.prisma.landmark.findMany({ where, skip: (page - 1) * limit, take: limit });
      const count = await this.prisma.landmark.count({ where });

      data = data.map((r: any) => ({ ...r, distance: this.haversine(lat, lng, r.latitude, r.longitude) })).filter((r: any) => r.distance * 1000 <= radius);
      if (sort !== SearchSort.NAME) data.sort((a: any, b: any) => a.distance - b.distance);

      return [data, count] as const;
    }
  }
}
