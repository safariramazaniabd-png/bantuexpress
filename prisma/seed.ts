import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('Seeding BantuExpress database...');

  const adminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminInitialPassword) {
    console.error(
      'ADMIN_INITIAL_PASSWORD doit être défini pour créer le compte administrateur (voir .env.example).',
    );
    process.exit(1);
  }
  const adminPassword = hashPassword(adminInitialPassword);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bantu-express.com' },
    update: {},
    create: {
      email: 'admin@bantu-express.com',
      phone: '+243810000001',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'BantuExpress',
          languages: ['fr', 'ln'],
        },
      },
    },
  });
  console.log(`  ✓ Admin user: ${admin.email}`);

  const seedDemoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!seedDemoPassword) {
    console.error(
      'SEED_DEMO_PASSWORD doit être défini pour créer les comptes de démonstration (voir .env.example).',
    );
    process.exit(1);
  }
  const individualPassword = hashPassword(seedDemoPassword);

  const users = [
    { email: 'jean@example.cd', phone: '+243810000002', firstName: 'Jean', lastName: 'Mulamba', role: 'INDIVIDUAL' as const },
    { email: 'marie@example.cd', phone: '+243810000003', firstName: 'Marie', lastName: 'Kabongo', role: 'PROFESSIONAL' as const },
    { email: 'courier@example.cd', phone: '+243810000004', firstName: 'Paul', lastName: 'Lubaki', role: 'COURIER' as const },
  ];

  const createdUsers = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        phone: u.phone,
        passwordHash: individualPassword,
        role: u.role,
        isActive: true,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            firstName: u.firstName,
            lastName: u.lastName,
            languages: ['fr', 'ln'],
          },
        },
      },
    });
    createdUsers.push(user);
    console.log(`  ✓ User: ${user.email} (${u.role})`);
  }

  await prisma.category.upsert({
    where: { slug: 'restaurants' },
    update: {},
    create: { name: 'Restaurants', slug: 'restaurants' },
  });

  await prisma.category.upsert({
    where: { slug: 'marches' },
    update: {},
    create: { name: 'Marchés', slug: 'marches' },
  });

  await prisma.category.upsert({
    where: { slug: 'transports' },
    update: {},
    create: { name: 'Transports', slug: 'transports' },
  });

  await prisma.category.upsert({
    where: { slug: 'sante' },
    update: {},
    create: { name: 'Santé', slug: 'sante' },
  });

  await prisma.category.upsert({
    where: { slug: 'education' },
    update: {},
    create: { name: 'Éducation', slug: 'education' },
  });

  console.log('  ✓ Categories (5)');

  const landmarks = [
    { name: 'Marché Central de Kinshasa', category: 'MARKET' as const, city: 'Kinshasa', latitude: -4.324, longitude: 15.322 },
    { name: 'Université de Kinshasa', category: 'SCHOOL' as const, city: 'Kinshasa', latitude: -4.419, longitude: 15.308 },
    { name: 'Hôpital Général de Kinshasa', category: 'HOSPITAL' as const, city: 'Kinshasa', latitude: -4.331, longitude: 15.314 },
    { name: 'Palais de la Nation', category: 'MONUMENT' as const, city: 'Kinshasa', latitude: -4.304, longitude: 15.281 },
    { name: 'Boulevard du 30 Juin', category: 'ROUTE' as const, city: 'Kinshasa', latitude: -4.310, longitude: 15.305 },
  ];

  for (const lm of landmarks) {
    await prisma.landmark.upsert({
      where: { id: `seed-${lm.name.toLowerCase().replace(/\s/g, '-')}` },
      update: {},
      create: {
        id: `seed-${lm.name.toLowerCase().replace(/\s/g, '-')}`,
        userId: admin.id,
        name: lm.name,
        category: lm.category,
        city: lm.city,
        latitude: lm.latitude,
        longitude: lm.longitude,
        isPublic: true,
      },
    });
  }
  console.log('  ✓ Landmarks (5)');

  await prisma.address.upsert({
    where: { id: `seed-addr-jean` },
    update: {},
    create: {
      id: `seed-addr-jean`,
      userId: createdUsers[0].id,
      label: 'Domicile',
      type: 'HOME',
      avenue: 'Avenue de la Libération',
      quartier: 'Gombe',
      city: 'Kinshasa',
      province: 'Kinshasa',
      country: 'CD',
      latitude: -4.310,
      longitude: 15.305,
      isPrimary: true,
      isPublic: true,
    },
  });

  await prisma.address.upsert({
    where: { id: `seed-addr-marie` },
    update: {},
    create: {
      id: `seed-addr-marie`,
      userId: createdUsers[1].id,
      label: 'Boutique',
      type: 'BUSINESS',
      avenue: 'Avenue Kasa-Vubu',
      quartier: 'Kinshasa Centre',
      city: 'Kinshasa',
      province: 'Kinshasa',
      country: 'CD',
      latitude: -4.315,
      longitude: 15.310,
      isPrimary: true,
      isPublic: true,
    },
  });
  console.log('  ✓ Addresses (2)');

  await prisma.businessProfile.upsert({
    where: { id: `seed-biz-marie` },
    update: {},
    create: {
      id: `seed-biz-marie`,
      userId: createdUsers[1].id,
      name: 'Kabongo Épices & Éléctronique',
      type: 'ENTERPRISE',
      description: 'Vente d\'épices, produits locaux et électronique',
      sector: 'Commerce',
      city: 'Kinshasa',
      province: 'Kinshasa',
      country: 'CD',
      isVerified: true,
      isPublic: true,
    },
  });
  console.log('  ✓ BusinessProfile (1)');

  console.log('\n✅ Seed completed successfully');
  console.log('   Identifiants de test :');
  console.log('   Admin     → admin@bantu-express.com');
  console.log('   Individu  → jean@example.cd');
  console.log('   Pro       → marie@example.cd');
  console.log('   Courier   → courier@example.cd');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
