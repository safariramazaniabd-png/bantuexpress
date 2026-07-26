import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SearchQueryDto, SearchType } from './dto/search-query.dto';

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
      page = 1,
      limit = 20,
    } = query;

    const results: any[] = [];
    let total = 0;

    const searchPeople = type === SearchType.PEOPLE || type === SearchType.ALL;
    const searchLandmarks =
      type === SearchType.LANDMARKS || type === SearchType.ALL;
    const searchAddresses =
      type === SearchType.ADDRESSES || type === SearchType.ALL;

    if (q) {
      const term = q.trim();

      if (searchPeople) {
        const [people, peopleTotal] = await this.searchPeople(
          term,
          city,
          province,
          page,
          limit,
        );
        results.push(
          ...people.map((p) => ({
            type: 'people' as const,
            id: p.id,
            userId: p.userId,
            firstName: p.firstName,
            lastName: p.lastName,
            profession: p.profession,
            avatarUrl: p.avatarUrl,
            city: p.user?.addresses?.[0]?.city,
            languages: p.languages,
          })),
        );
        total += peopleTotal;
      }

      if (searchAddresses) {
        const [addresses, addrTotal] = await this.searchAddresses(
          term,
          city,
          province,
          page,
          limit,
        );
        results.push(
          ...addresses.map((a) => ({
            type: 'address' as const,
            id: a.id,
            label: a.label,
            avenue: a.avenue,
            quartier: a.quartier,
            city: a.city,
            province: a.province,
            isPublic: a.isPublic,
          })),
        );
        total += addrTotal;
      }
    }

    if (searchLandmarks) {
      const [landmarks, lmTotal] = await this.searchLandmarks(
        q?.trim(),
        city,
        province,
        category,
        page,
        limit,
      );
      results.push(
        ...landmarks.map((l) => ({
          type: 'landmark' as const,
          id: l.id,
          name: l.name,
          category: l.category,
          description: l.description,
          city: l.city,
          province: l.province,
          latitude: l.latitude,
          longitude: l.longitude,
        })),
      );
      total += lmTotal;
    }

    return {
      data: results,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  private async searchPeople(
    term: string,
    city?: string,
    province?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {
      isPublic: true,
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { profession: { contains: term, mode: 'insensitive' } },
      ],
      user: { isActive: true },
    };

    if (city) {
      where.user = { ...where.user, addresses: { some: { city, isPublic: true } } };
    }

    if (province) {
      where.user = {
        ...where.user,
        addresses: { some: { province, isPublic: true } },
      };
    }

    const [data, count] = await Promise.all([
      this.prisma.profile.findMany({
        where,
        include: {
          user: {
            select: {
              addresses: {
                where: { isPublic: true, deletedAt: null },
                take: 1,
                select: { city: true },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.profile.count({ where }),
    ]);

    return [data, count] as const;
  }

  private async searchLandmarks(
    term: string | undefined,
    city?: string,
    province?: string,
    category?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {
      deletedAt: null,
      isPublic: true,
    };

    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (province) where.province = { contains: province, mode: 'insensitive' };
    if (category) where.category = category;

    const [data, count] = await Promise.all([
      this.prisma.landmark.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.landmark.count({ where }),
    ]);

    return [data, count] as const;
  }

  private async searchAddresses(
    term: string,
    city?: string,
    province?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {
      deletedAt: null,
      isPublic: true,
      OR: [
        { label: { contains: term, mode: 'insensitive' } },
        { avenue: { contains: term, mode: 'insensitive' } },
        { quartier: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ],
    };

    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (province) where.province = { contains: province, mode: 'insensitive' };

    const [data, count] = await Promise.all([
      this.prisma.address.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { city: 'asc' },
      }),
      this.prisma.address.count({ where }),
    ]);

    return [data, count] as const;
  }
}
