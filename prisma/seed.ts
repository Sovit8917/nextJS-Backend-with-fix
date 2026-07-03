import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Cleaning' },
      update: {},
      create: { name: 'Cleaning', description: 'Home and office cleaning services', icon: '🧹', sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { name: 'Plumbing' },
      update: {},
      create: { name: 'Plumbing', description: 'Pipe repairs, installations and maintenance', icon: '🔧', sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { name: 'Electrical' },
      update: {},
      create: { name: 'Electrical', description: 'Wiring, repairs and electrical installations', icon: '⚡', sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { name: 'Carpentry' },
      update: {},
      create: { name: 'Carpentry', description: 'Furniture assembly, repairs and woodwork', icon: '🪚', sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { name: 'Painting' },
      update: {},
      create: { name: 'Painting', description: 'Interior and exterior painting services', icon: '🎨', sortOrder: 5 },
    }),
    prisma.category.upsert({
      where: { name: 'Pest Control' },
      update: {},
      create: { name: 'Pest Control', description: 'Pest elimination and prevention', icon: '🐛', sortOrder: 6 },
    }),
    prisma.category.upsert({
      where: { name: 'AC Repair' },
      update: {},
      create: { name: 'AC Repair', description: 'Air conditioner servicing and repair', icon: '❄️', sortOrder: 7 },
    }),
    prisma.category.upsert({
      where: { name: 'Appliance Repair' },
      update: {},
      create: { name: 'Appliance Repair', description: 'Washing machine, refrigerator, microwave repairs', icon: '🔌', sortOrder: 8 },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  const cleaningCat = categories[0];
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 'svc-home-cleaning' },
      update: {},
      create: { id: 'svc-home-cleaning', categoryId: cleaningCat.id, name: 'Home Deep Cleaning', description: 'Full home deep cleaning service including all rooms', basePrice: 999, duration: 240, sortOrder: 1 },
    }),
    prisma.service.upsert({
      where: { id: 'svc-bathroom-cleaning' },
      update: {},
      create: { id: 'svc-bathroom-cleaning', categoryId: cleaningCat.id, name: 'Bathroom Cleaning', description: 'Deep bathroom sanitization and cleaning', basePrice: 349, duration: 60, sortOrder: 2 },
    }),
    prisma.service.upsert({
      where: { id: 'svc-kitchen-cleaning' },
      update: {},
      create: { id: 'svc-kitchen-cleaning', categoryId: cleaningCat.id, name: 'Kitchen Cleaning', description: 'Kitchen deep cleaning including chimney and appliances', basePrice: 499, duration: 90, sortOrder: 3 },
    }),
  ]);

  console.log(`✅ Created ${services.length} services`);

  const settings = [
    { key: 'commission_percent', value: '20' },
    { key: 'tax_percent', value: '18' },
    { key: 'cancellation_charge_percent', value: '10' },
    { key: 'min_withdrawal_amount', value: '500' },
    { key: 'app_name', value: 'Home Service' },
    { key: 'support_phone', value: '+919876543210' },
    { key: 'support_email', value: 'support@homeservice.in' },
  ];

  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`✅ Created ${settings.length} app settings`);

  const admin = await prisma.user.upsert({
    where: { phone: 'admin@homeservice.in' },
    update: {},
    create: { phone: 'admin@homeservice.in', email: 'admin@homeservice.in', name: 'Super Admin', role: 'ADMIN' },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  await prisma.coupon.upsert({
    where: { code: 'FIRST50' },
    update: {},
    create: { code: 'FIRST50', description: '50% off on your first booking', discountType: 'percentage', discountValue: 50, maxDiscount: 200, minOrderValue: 299, usageLimit: 1000 },
  });
  console.log('✅ Created sample coupon: FIRST50');

  console.log('\n✨ Database seeded successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());