const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  try {
    const qs = await prisma.quotation.findMany({
      include: {
        lineItems: true
      }
    });
    fs.writeFileSync('debug_stats.json', JSON.stringify(qs, null, 2));
    console.log("Wrote debug_stats.json");
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
