/**
 * Idempotent admin bootstrap script.
 * Safe to run on every deploy — uses upsert so it won't duplicate data.
 */
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

async function main() {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;
    const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@damlighting.com' } });
    
    if (!defaultPassword && !existingAdmin) {
        console.error('FATAL: ADMIN_DEFAULT_PASSWORD environment variable is not set and no admin user exists. Server cannot start.');
        process.exit(1);
    }
    
    if (!defaultPassword) {
        console.warn('⚠️ [STARTUP] WARNING: ADMIN_DEFAULT_PASSWORD missing, using existing admin credentials.');
        return; // Already initialized
    }

    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@damlighting.com' },
        update: {}, // Don't reset password on every restart
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

async function runInit() {
    try {
        await main();
    } catch (e) {
        console.error('❌ Init failed:', e);
        throw e;
    } finally {
        // Only disconnect when running as standalone script.
        // When imported from index.js the shared prisma instance must stay alive.
        if (require.main === module) {
            await prisma.$disconnect();
        }
    }
}

// When executed as a standalone script (e.g. `node prisma/init-admin.js`)
// perform the init then exit.
if (require.main === module) {
    runInit()
        .then(() => {
            process.exit(0);
        })
        .catch(() => {
            process.exit(1);
        });
}

// When imported from the server (index.js) we export the init function.
module.exports = { runInit };
