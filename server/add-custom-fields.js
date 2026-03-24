require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "QuotationItem" ADD COLUMN "customFields" TEXT;`);
        console.log('✅ customFields column added to QuotationItem');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('✅ customFields column already exists in QuotationItem');
        } else {
            console.error('❌ Failed to alter QuotationItem:', e.message);
        }
    }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
