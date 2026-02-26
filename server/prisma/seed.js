const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@damlighting.com' },
        update: {},
        create: {
            name: 'Admin',
            email: 'admin@damlighting.com',
            passwordHash: adminPasswordHash,
            role: 'ADMIN'
        }
    });
    console.log('✅ Admin user created:', admin.email);

    // Create sample clients
    const client1 = await prisma.client.create({
        data: {
            name: 'Rajesh Sharma',
            company: 'Ramada Encore Hotels Pvt. Ltd.',
            address: 'Plot 12, Sector 62',
            city: 'Noida',
            state: 'Uttar Pradesh',
            pincode: '201301',
            email: 'rajesh@ramadaencore.com',
            phone: '+91-9876543210'
        }
    });

    const client2 = await prisma.client.create({
        data: {
            name: 'Priya Mehta',
            company: 'Grand Hyatt Interiors',
            address: '45, MG Road',
            city: 'Gurugram',
            state: 'Haryana',
            pincode: '122001',
            email: 'priya@grandhyatt.com',
            phone: '+91-9876543211'
        }
    });
    console.log('✅ Sample clients created');

    // Create company settings
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
            defaultTerms: '1. All prices are ex-works.\n2. GST as applicable.\n3. Delivery within 4-6 weeks from order confirmation.\n4. Payment terms: 50% advance, balance before dispatch.\n5. Quotation valid for 30 days.\n6. Warranty as per manufacturer terms.\n7. Installation charges extra if applicable.\n8. Transportation charges extra.\n9. Any changes in government taxes will be applicable.\n10. Subject to Delhi/NCR jurisdiction.'
        }
    });
    console.log('✅ Company settings created');

    // Create sample quotation (Ramada Encore)
    const quotation = await prisma.quotation.create({
        data: {
            quoteNumber: 'DAM-2025-0001',
            title: 'Ramada Encore — Ground & First Floor — Lighting Quotation',
            clientId: client1.id,
            projectName: 'Ramada Encore — Ground & First Floor',
            projectLocation: 'Noida, Uttar Pradesh',
            status: 'SENT',
            validDays: 30,
            gstRate: 18,
            createdById: admin.id,
            notes: '1. All prices are ex-works.\n2. GST as applicable.\n3. Delivery within 4-6 weeks from order confirmation.\n4. Payment terms: 50% advance, balance before dispatch.\n5. Quotation valid for 30 days.\n6. Warranty as per manufacturer terms.\n7. Installation charges extra if applicable.\n8. Transportation charges extra.\n9. Any changes in government taxes will be applicable.\n10. Subject to Delhi/NCR jurisdiction.',
            lineItems: {
                create: [
                    {
                        sno: 1,
                        productCode: 'C1',
                        description: 'Surface/Recessed COB Down Light 12W, 3000K Warm White, CRI>90, 60° Beam Angle, Driver Included, IP20, Die-cast Aluminium Body',
                        unit: 'Nos.',
                        qtyApprox: 23,
                        brands: {
                            create: [
                                { brandColumn: 'HYBEC_ELITE', macadamStep: '3A', rate: 1250, amount: 28750, spaceMatch: 100 },
                                { brandColumn: 'HYBEC_ECO_PRO', macadamStep: '5A', rate: 880, amount: 20240, spaceMatch: 90 },
                                { brandColumn: 'JAGUAR', macadamStep: '5A', rate: 650, amount: 14950, spaceMatch: 75 },
                                { brandColumn: 'PHILIPS', macadamStep: '4A', rate: 1100, amount: 25300, spaceMatch: 95 }
                            ]
                        }
                    },
                    {
                        sno: 2,
                        productCode: 'C2',
                        description: 'Recessed COB Down Light 18W, 4000K Neutral White, CRI>90, 40° Beam Angle, Dimmable DALI, IP40, Aluminium Housing',
                        unit: 'Nos.',
                        qtyApprox: 45,
                        brands: {
                            create: [
                                { brandColumn: 'HYBEC_ELITE', macadamStep: '3A', rate: 1850, amount: 83250, spaceMatch: 100 },
                                { brandColumn: 'HYBEC_ECO_PRO', macadamStep: '5A', rate: 1220, amount: 54900, spaceMatch: 85 },
                                { brandColumn: 'JAGUAR', macadamStep: '5A', rate: 890, amount: 40050, spaceMatch: 70 },
                                { brandColumn: 'PHILIPS', macadamStep: '4A', rate: 1650, amount: 74250, spaceMatch: 90 }
                            ]
                        }
                    },
                    {
                        sno: 3,
                        productCode: 'W1',
                        description: 'LED Wall Washer 24W, RGBW, DMX512 Control, IP65, Aluminium Body, Tempered Glass, Linear 1000mm',
                        unit: 'Nos.',
                        qtyApprox: 18,
                        brands: {
                            create: [
                                { brandColumn: 'HYBEC_ELITE', macadamStep: '3A', rate: 4500, amount: 81000, spaceMatch: 100 },
                                { brandColumn: 'HYBEC_ECO_PRO', macadamStep: '5A', rate: 3200, amount: 57600, spaceMatch: 80 },
                                { brandColumn: 'JAGUAR', macadamStep: '5A', rate: 2800, amount: 50400, spaceMatch: 75 },
                                { brandColumn: 'PHILIPS', macadamStep: '3A', rate: 5200, amount: 93600, spaceMatch: 100 }
                            ]
                        }
                    },
                    {
                        sno: 4,
                        productCode: 'PF1',
                        description: 'LED Profile Light 20W, 3000K, CRI>95, Recessed Mounting, Aluminium Channel with PC Diffuser, 2400mm Length',
                        unit: 'Mtr.',
                        qtyApprox: 120,
                        brands: {
                            create: [
                                { brandColumn: 'HYBEC_ELITE', macadamStep: '3A', rate: 1800, amount: 216000, spaceMatch: 100 },
                                { brandColumn: 'HYBEC_ECO_PRO', macadamStep: '4A', rate: 1200, amount: 144000, spaceMatch: 90 },
                                { brandColumn: 'JAGUAR', macadamStep: '5A', rate: 850, amount: 102000, spaceMatch: 75 },
                                { brandColumn: 'PHILIPS', macadamStep: '3A', rate: 1650, amount: 198000, spaceMatch: 95 }
                            ]
                        }
                    },
                    {
                        sno: 5,
                        productCode: 'L3',
                        description: 'Decorative Pendant Light, E27 Base, Frosted Glass Globe, Brass Finish, 300mm Diameter, Ceiling Rose Included',
                        unit: 'Nos.',
                        qtyApprox: 8,
                        brands: {
                            create: [
                                { brandColumn: 'HYBEC_ELITE', macadamStep: '3A', rate: 8500, amount: 68000, spaceMatch: 100 },
                                { brandColumn: 'HYBEC_ECO_PRO', macadamStep: '5A', rate: 5500, amount: 44000, spaceMatch: 85 },
                                { brandColumn: 'JAGUAR', macadamStep: '5A', rate: 3800, amount: 30400, spaceMatch: 70 },
                                { brandColumn: 'PHILIPS', macadamStep: '4A', rate: 7200, amount: 57600, spaceMatch: 90 }
                            ]
                        }
                    }
                ]
            },
            recommendations: {
                create: [
                    // Recommendation A — Hybec Elite for all
                    { label: 'RECOMMENDATION A', sno: 1, productCode: 'C1', qty: 23, unit: 'Nos.', brandName: 'Hybec Elite', amount: 28750 },
                    { label: 'RECOMMENDATION A', sno: 2, productCode: 'C2', qty: 45, unit: 'Nos.', brandName: 'Hybec Elite', amount: 83250 },
                    { label: 'RECOMMENDATION A', sno: 3, productCode: 'W1', qty: 18, unit: 'Nos.', brandName: 'Hybec Elite', amount: 81000 },
                    { label: 'RECOMMENDATION A', sno: 4, productCode: 'PF1', qty: 120, unit: 'Mtr.', brandName: 'Hybec Elite', amount: 216000 },
                    { label: 'RECOMMENDATION A', sno: 5, productCode: 'L3', qty: 8, unit: 'Nos.', brandName: 'Hybec Elite', amount: 68000 },
                    // Recommendation B — Mix of brands
                    { label: 'RECOMMENDATION B', sno: 1, productCode: 'C1', qty: 23, unit: 'Nos.', brandName: 'Philips', amount: 25300 },
                    { label: 'RECOMMENDATION B', sno: 2, productCode: 'C2', qty: 45, unit: 'Nos.', brandName: 'Philips', amount: 74250 },
                    { label: 'RECOMMENDATION B', sno: 3, productCode: 'W1', qty: 18, unit: 'Nos.', brandName: 'Philips', amount: 93600 },
                    { label: 'RECOMMENDATION B', sno: 4, productCode: 'PF1', qty: 120, unit: 'Mtr.', brandName: 'Hybec Elite', amount: 216000 },
                    { label: 'RECOMMENDATION B', sno: 5, productCode: 'L3', qty: 8, unit: 'Nos.', brandName: 'Philips', amount: 57600 },
                    // Recommendation C — Budget (Jaguar mostly)
                    { label: 'RECOMMENDATION C', sno: 1, productCode: 'C1', qty: 23, unit: 'Nos.', brandName: 'Jaguar', amount: 14950 },
                    { label: 'RECOMMENDATION C', sno: 2, productCode: 'C2', qty: 45, unit: 'Nos.', brandName: 'Jaguar', amount: 40050 },
                    { label: 'RECOMMENDATION C', sno: 3, productCode: 'W1', qty: 18, unit: 'Nos.', brandName: 'Jaguar', amount: 50400 },
                    { label: 'RECOMMENDATION C', sno: 4, productCode: 'PF1', qty: 120, unit: 'Mtr.', brandName: 'Jaguar', amount: 102000 },
                    { label: 'RECOMMENDATION C', sno: 5, productCode: 'L3', qty: 8, unit: 'Nos.', brandName: 'Jaguar', amount: 30400 },
                    // Recommendation D — Eco Pro
                    { label: 'RECOMMENDATION D', sno: 1, productCode: 'C1', qty: 23, unit: 'Nos.', brandName: 'Hybec Eco Pro', amount: 20240 },
                    { label: 'RECOMMENDATION D', sno: 2, productCode: 'C2', qty: 45, unit: 'Nos.', brandName: 'Hybec Eco Pro', amount: 54900 },
                    { label: 'RECOMMENDATION D', sno: 3, productCode: 'W1', qty: 18, unit: 'Nos.', brandName: 'Hybec Eco Pro', amount: 57600 },
                    { label: 'RECOMMENDATION D', sno: 4, productCode: 'PF1', qty: 120, unit: 'Mtr.', brandName: 'Hybec Eco Pro', amount: 144000 },
                    { label: 'RECOMMENDATION D', sno: 5, productCode: 'L3', qty: 8, unit: 'Nos.', brandName: 'Hybec Eco Pro', amount: 44000 }
                ]
            }
        }
    });
    console.log('✅ Sample quotation created:', quotation.quoteNumber);
    console.log('🌱 Seeding complete!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
