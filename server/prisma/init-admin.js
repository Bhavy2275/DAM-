/**
 * Idempotent admin bootstrap script.
 * Safe to run on every deploy — uses upsert so it won't duplicate data.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@damlighting.com' },
        update: {}, // don't overwrite anything if already exists
        create: {
            name: 'Admin',
            email: 'admin@damlighting.com',
            passwordHash,
            role: 'ADMIN'
        }
    });

    console.log('✅ Admin user ready:', admin.email);

    // Bootstrap company settings only if missing
    const existing = await prisma.companySettings.findFirst();
    if (!existing) {
        await prisma.companySettings.create({
            data: {
                companyName: 'Dam Lighting Solution LLP',
                tagline: 'design. allocate. maintain.',
                address: '25, Industrial Area, Sector 16, Noida, Uttar Pradesh — 201301',
                phone: '+91-9876500000',
                email: 'info@damlighting.com',
                website: 'www.damlighting.com',
                gstNumber: '09AAWFD8544Q1Z7',
                bankName: 'DBS Bank India Ltd.',
                accountName: 'DAM LIGHTING SOLUTIONS LLP',
                accountNumber: '1234567890123456',
                ifscCode: 'DBSS0IN0874',
                bankAddress: 'DBS Bank India Limited, Connaught Place, New Delhi',
                defaultTerms: '1. All prices are ex-works.\n2. GST as applicable.\n3. Payment terms: 50% advance, balance before dispatch.\n4. Quotation valid for 30 days.'
            }
        });
        console.log('✅ Company settings initialised');
    }
}

main()
    .catch(e => { console.error('❌ Init failed:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
