import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const isLocalDb = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function waitForDb(retries = 5, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (err) {
      if (i === retries) throw err;
      console.log(`⏳ Database not ready yet, retrying (${i}/${retries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function main() {
  console.log('🌱 Seeding database...');
  await waitForDb();

  const categoryData = [
    { name: 'Cleaning', description: 'Home and office cleaning services', icon: '🧹', sortOrder: 1 },
    { name: 'Plumbing', description: 'Pipe repairs, installations and maintenance', icon: '🔧', sortOrder: 2 },
    { name: 'Electrical', description: 'Wiring, repairs and electrical installations', icon: '⚡', sortOrder: 3 },
    { name: 'Carpentry', description: 'Furniture assembly, repairs and woodwork', icon: '🪚', sortOrder: 4 },
    { name: 'Painting', description: 'Interior and exterior painting services', icon: '🎨', sortOrder: 5 },
    { name: 'Pest Control', description: 'Pest elimination and prevention', icon: '🐛', sortOrder: 6 },
    { name: 'AC Repair', description: 'Air conditioner servicing and repair', icon: '❄️', sortOrder: 7 },
    { name: 'Appliance Repair', description: 'Washing machine, refrigerator, microwave repairs', icon: '🔌', sortOrder: 8 },
  ];

  const categories = [];
  for (const c of categoryData) {
    const category = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    categories.push(category);
  }

  console.log(`✅ Created ${categories.length} categories`);

  const cleaningCat = categories[0];
  const serviceData = [
    { id: 'svc-home-cleaning', categoryId: cleaningCat.id, name: 'Home Deep Cleaning', description: 'Full home deep cleaning service including all rooms', basePrice: 999, duration: 240, sortOrder: 1 },
    { id: 'svc-bathroom-cleaning', categoryId: cleaningCat.id, name: 'Bathroom Cleaning', description: 'Deep bathroom sanitization and cleaning', basePrice: 349, duration: 60, sortOrder: 2 },
    { id: 'svc-kitchen-cleaning', categoryId: cleaningCat.id, name: 'Kitchen Cleaning', description: 'Kitchen deep cleaning including chimney and appliances', basePrice: 499, duration: 90, sortOrder: 3 },
  ];

  const services = [];
  for (const s of serviceData) {
    const service = await prisma.service.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
    services.push(service);
  }

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