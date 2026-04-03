const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const res = await prisma.itemRecommendation.findFirst();
    console.log('✅ Field priceType accessible:', res ? (res.priceType !== undefined) : 'N/A (No records)');
  } catch (err) {
    console.error('❌ Field priceType check failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
