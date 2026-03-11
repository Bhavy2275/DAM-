const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

function arr(a) { return JSON.stringify(a); }

async function main() {
    console.log('🌱 Seeding database...');

    // ── Users
    const adminHash = await bcrypt.hash('admin123', 10);
    const staffHash = await bcrypt.hash('staff123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@damlighting.com' },
        update: {},
        create: { name: 'Admin', email: 'admin@damlighting.com', passwordHash: adminHash, role: 'ADMIN' }
    });
    await prisma.user.upsert({
        where: { email: 'staff@damlighting.com' },
        update: {},
        create: { name: 'Staff', email: 'staff@damlighting.com', passwordHash: staffHash, role: 'STAFF' }
    });
    console.log('✅ Users created');

    // ── Company Settings
    const existingSettings = await prisma.companySettings.findFirst();
    if (!existingSettings) {
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
    }
    console.log('✅ Company settings OK');

    // ── Products
    const products = await Promise.all([
        prisma.product.upsert({
            where: { productCode: 'C1' },
            update: {},
            create: {
                productCode: 'C1',
                layoutCode: 'LC-01',
                description: 'Surface/Recessed COB Down Light 12W, 3000K Warm White, CRI>90, 60° Beam Angle, Driver Included, IP20, Die-cast Aluminium Body. Suitable for hotel lobbies, corridors, and general ambient lighting.',
                bodyColours: arr(['BLACK', 'WHITE']),
                reflectorColours: arr(['BLACK', 'WHITE', 'MATT_SILVER']),
                colourTemps: arr(['3000K', '4000K']),
                beamAngles: arr(['36DEG', '60DEG']),
                cri: arr(['>90'])
            }
        }),
        prisma.product.upsert({
            where: { productCode: 'C2' },
            update: {},
            create: {
                productCode: 'C2',
                layoutCode: 'LC-02',
                description: 'Recessed COB Down Light 18W, 4000K Neutral White, CRI>90, 40° Beam Angle, Dimmable DALI, IP40, Aluminium Housing. Premium hotel room and suite lighting.',
                bodyColours: arr(['BLACK', 'WHITE', 'TITANIUM']),
                reflectorColours: arr(['BLACK', 'WHITE', 'CHROME']),
                colourTemps: arr(['3000K', '4000K', '3500K']),
                beamAngles: arr(['24DEG', '40DEG']),
                cri: arr(['>90'])
            }
        }),
        prisma.product.upsert({
            where: { productCode: 'W1' },
            update: {},
            create: {
                productCode: 'W1',
                layoutCode: 'LW-01',
                description: 'LED Wall Washer 24W, RGBW, DMX512 Control, IP65, Aluminium Body, Tempered Glass, Linear 1000mm. Facade and architectural accent lighting.',
                bodyColours: arr(['BLACK', 'DARK_GREY']),
                reflectorColours: arr(['BLACK']),
                colourTemps: arr(['3000K', 'TUNABLE']),
                beamAngles: arr(['110DEG', '120DEG']),
                cri: arr(['>80'])
            }
        }),
        prisma.product.upsert({
            where: { productCode: 'PF1' },
            update: {},
            create: {
                productCode: 'PF1',
                layoutCode: 'LP-01',
                description: 'LED Profile Light 20W/m, 3000K, CRI>95, Recessed Mounting, Aluminium Channel with PC Diffuser, 2400mm Length. Cove and linear architectural lighting.',
                bodyColours: arr(['WHITE', 'BLACK', 'BRASS']),
                reflectorColours: arr(['WHITE', 'MATT_SILVER']),
                colourTemps: arr(['2700K', '3000K', 'TUNABLE']),
                beamAngles: arr(['90DEG', '120DEG']),
                cri: arr(['>90', '>80'])
            }
        }),
        prisma.product.upsert({
            where: { productCode: 'L3' },
            update: {},
            create: {
                productCode: 'L3',
                layoutCode: 'LD-03',
                description: 'Decorative Pendant Light, E27 Base, Frosted Glass Globe, Brass Finish, 300mm Diameter, Ceiling Rose Included. Statement decorative feature for reception and dining areas.',
                bodyColours: arr(['BRASS', 'COPPER', 'WHITE']),
                reflectorColours: arr(['GOLD', 'BRASS']),
                colourTemps: arr(['2700K', '3000K']),
                beamAngles: arr(['120DEG']),
                cri: arr(['>80'])
            }
        })
    ]);
    console.log('✅ Products created:', products.map(p => p.productCode).join(', '));

    // ── Clients
    const client1 = await prisma.client.create({
        data: {
            fullName: 'Rajesh Sharma',
            companyName: 'Ramada Encore Hotels Pvt. Ltd.',
            address: 'Plot 12, Sector 62',
            city: 'Noida',
            state: 'Uttar Pradesh',
            pinCode: '201301',
            mobileNumber: '+91-9876543210',
            emailId: 'rajesh@ramadaencore.com',
            companyGstNumber: '09AABCR1234A1Z5',
            companyAddress: 'Ramada Encore, Plot 12, Sector 62, Noida, UP—201301'
        }
    });
    const client2 = await prisma.client.create({
        data: {
            fullName: 'Priya Mehta',
            companyName: 'Grand Hyatt Interiors',
            address: '45, MG Road',
            city: 'Gurugram',
            state: 'Haryana',
            pinCode: '122001',
            mobileNumber: '+91-9876543211',
            emailId: 'priya@grandhyatt.com',
        }
    });
    console.log('✅ Clients created');

    // ── Quotation (Ramada Encore)
    const productMap = {};
    for (const p of products) productMap[p.productCode] = p.id;

    const makeRec = (label, brandName, lp, disc, qty, macadam) => {
        const lpWithGst = lp * 1.18;
        const rate = lp * (1 - disc / 100);
        const amount = rate * qty;
        return { label, brandName, productCode: '', listPrice: lp, listPriceWithGst: parseFloat(lpWithGst.toFixed(2)), discountPercent: disc, rate: parseFloat(rate.toFixed(2)), unit: 'NUMBERS', quantity: qty, amount: parseFloat(amount.toFixed(2)), macadamStep: macadam };
    };

    const quotation = await prisma.quotation.create({
        data: {
            quoteNumber: 'DAM-2025-0001',
            quoteTitle: 'Ramada Encore — Ground & First Floor — Lighting Quotation',
            clientId: client1.id,
            projectName: 'Ramada Encore — Ground & First Floor',
            city: 'Noida',
            state: 'Uttar Pradesh',
            status: 'SENT',
            validDays: 30,
            gstRate: 18,
            createdById: admin.id,
            notes: '1. All prices are ex-works.\n2. GST as applicable.\n3. Delivery within 4-6 weeks from order confirmation.\n4. Payment terms: 50% advance, balance before dispatch.\n5. Quotation valid for 30 days.',
            lineItems: {
                create: [
                    {
                        sno: 1, productId: productMap['C1'],
                        productCode: 'C1', layoutCode: 'LC-01',
                        description: 'Surface/Recessed COB Down Light 12W, 3000K Warm White, CRI>90, 60° Beam Angle, Driver Included, IP20',
                        bodyColours: arr(['BLACK', 'WHITE']), reflectorColours: arr(['BLACK', 'WHITE', 'MATT_SILVER']),
                        colourTemps: arr(['3000K']), beamAngles: arr(['60DEG']), cri: arr(['>90']),
                        unit: 'NUMBERS',
                        finalBrandName: 'Hybec Elite', finalProductCode: 'HE-C1', finalListPrice: 1500, finalDiscount: 35,
                        finalRate: 975, finalQuantity: 23, finalAmount: 22425, finalMacadamStep: '3A', finalUnit: 'NUMBERS',
                        recommendations: {
                            create: [
                                makeRec('A', 'Hybec Elite', 1500, 35, 23, '3A'),
                                makeRec('B', 'Philips', 1800, 40, 23, '4A'),
                            ]
                        }
                    },
                    {
                        sno: 2, productId: productMap['C2'],
                        productCode: 'C2', layoutCode: 'LC-02',
                        description: 'Recessed COB Down Light 18W, 4000K Neutral White, CRI>90, 40° Beam Angle, Dimmable DALI, IP40',
                        bodyColours: arr(['WHITE', 'TITANIUM']), reflectorColours: arr(['WHITE', 'CHROME']),
                        colourTemps: arr(['4000K']), beamAngles: arr(['40DEG']), cri: arr(['>90']),
                        unit: 'NUMBERS',
                        finalBrandName: 'Hybec Elite', finalProductCode: 'HE-C2', finalListPrice: 2200, finalDiscount: 35,
                        finalRate: 1430, finalQuantity: 45, finalAmount: 64350, finalMacadamStep: '3A', finalUnit: 'NUMBERS',
                        recommendations: {
                            create: [
                                makeRec('A', 'Hybec Elite', 2200, 35, 45, '3A'),
                                makeRec('B', 'Philips', 2600, 40, 45, '4A'),
                            ]
                        }
                    },
                    {
                        sno: 3, productId: productMap['W1'],
                        productCode: 'W1', layoutCode: 'LW-01',
                        description: 'LED Wall Washer 24W, RGBW, DMX512 Control, IP65, Linear 1000mm',
                        bodyColours: arr(['BLACK']), reflectorColours: arr(['BLACK']),
                        colourTemps: arr(['TUNABLE']), beamAngles: arr(['110DEG']), cri: arr(['>80']),
                        unit: 'NUMBERS',
                        finalBrandName: 'Hybec Elite', finalProductCode: 'HE-W1', finalListPrice: 5500, finalDiscount: 35,
                        finalRate: 3575, finalQuantity: 18, finalAmount: 64350, finalMacadamStep: '3A', finalUnit: 'NUMBERS',
                        recommendations: {
                            create: [
                                makeRec('A', 'Hybec Elite', 5500, 35, 18, '3A'),
                                makeRec('B', 'Philips', 6200, 40, 18, '3A'),
                            ]
                        }
                    },
                    {
                        sno: 4, productId: productMap['PF1'],
                        productCode: 'PF1', layoutCode: 'LP-01',
                        description: 'LED Profile Light 20W/m, 3000K, CRI>95, Aluminium Channel with PC Diffuser, 2400mm',
                        bodyColours: arr(['WHITE']), reflectorColours: arr(['MATT_SILVER']),
                        colourTemps: arr(['3000K']), beamAngles: arr(['90DEG']), cri: arr(['>90']),
                        unit: 'METERS',
                        finalBrandName: 'Hybec Elite', finalProductCode: 'HE-PF1', finalListPrice: 2200, finalDiscount: 35,
                        finalRate: 1430, finalQuantity: 120, finalAmount: 171600, finalMacadamStep: '3A', finalUnit: 'METERS',
                        recommendations: {
                            create: [
                                makeRec('A', 'Hybec Elite', 2200, 35, 120, '3A'),
                                makeRec('B', 'Philips', 2500, 40, 120, '4A'),
                            ]
                        }
                    },
                    {
                        sno: 5, productId: productMap['L3'],
                        productCode: 'L3', layoutCode: 'LD-03',
                        description: 'Decorative Pendant Light, E27, Frosted Glass Globe, Brass Finish, 300mm Diameter',
                        bodyColours: arr(['BRASS']), reflectorColours: arr(['GOLD']),
                        colourTemps: arr(['2700K']), beamAngles: arr(['120DEG']), cri: arr(['>80']),
                        unit: 'NUMBERS',
                        finalBrandName: 'Hybec Elite', finalProductCode: 'HE-L3', finalListPrice: 10000, finalDiscount: 35,
                        finalRate: 6500, finalQuantity: 8, finalAmount: 52000, finalMacadamStep: '3A', finalUnit: 'NUMBERS',
                        recommendations: {
                            create: [
                                makeRec('A', 'Hybec Elite', 10000, 35, 8, '3A'),
                                makeRec('B', 'Philips', 11000, 40, 8, '4A'),
                            ]
                        }
                    }
                ]
            }
        }
    });
    console.log('✅ Sample quotation created:', quotation.quoteNumber);

    // ── Payment (partial)
    await prisma.payment.create({
        data: {
            quotationId: quotation.id,
            clientId: client1.id,
            amountPaid: 100000,
            paymentDate: new Date('2025-02-10'),
            paymentMethod: 'BANK_TRANSFER',
            referenceNumber: 'TXN-20250210-001',
            notes: '50% advance payment received',
            status: 'COMPLETED'
        }
    });
    console.log('✅ Sample payment created');
    console.log('🌱 Seeding complete!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
