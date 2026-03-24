// One-off migration: add customLabels column to Quotation table
// Works with both SQLite and PostgreSQL (adds column only if it doesn't exist)
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Try adding the column — will silently fail if already exists
        await prisma.$executeRawUnsafe(`ALTER TABLE "Quotation" ADD COLUMN "customLabels" TEXT`);
        console.log('✅ customLabels column added to Quotation');
    } catch (e) {
        if (e.message.includes('duplicate column') || e.message.includes('already exists')) {
            console.log('✅ customLabels column already exists — nothing to do');
        } else {
            throw e;
        }
    }
}

main()
    .catch(e => { console.error('Migration failed:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
