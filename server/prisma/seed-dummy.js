const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function arr(a) { return JSON.stringify(a); }

async function main() {
    console.log('🌱 Seeding 10 dummy products, 10 clients, and 10 quotations...');

    // 1. Create 10 dummy clients
    const clients = [];
    for (let i = 1; i <= 10; i++) {
        const client = await prisma.client.create({
            data: {
                fullName: `Dummy Client ${i}`,
                companyName: `Test Company ${i} Ltd.`,
                address: `${i}00 Test Avenue, Sector ${i}`,
                city: 'Test City',
                state: 'Test State',
                pinCode: `10000${i}`,
                mobileNumber: `+91-900000000${i % 10}`,
                emailId: `client${i}@testcompany.com`,
                companyGstNumber: `09AAXYZ${i}000A1Z5`,
                companyAddress: `Test Company ${i} Ltd, Test City`
            }
        });
        clients.push(client);
    }
    console.log('✅ 10 Clients created');

    // 2. Create 10 dummy products
    const products = [];
    for (let i = 1; i <= 10; i++) {
        const product = await prisma.product.create({
            data: {
                productCode: `DUMMY-P${i}`,
                layoutCode: `LD-0${i}`,
                description: `This is dummy product ${i} for testing. High quality LED light.`,
                basePrice: 1000 + (i * 250),
                brandName: 'TestBrand',
                listPrice: 1500 + (i * 300),
                discountPercent: 10 + i,
                bodyColours: arr(['BLACK', 'WHITE']),
                reflectorColours: arr(['BLACK', 'WHITE']),
                colourTemps: arr(['3000K', '4000K']),
                beamAngles: arr(['36DEG', '60DEG']),
                cri: arr(['>90'])
            }
        });
        products.push(product);
    }
    console.log('✅ 10 Products created');

    // Get Admin user to assign as creator
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
        throw new Error('No admin user found. Please run regular seed first if not already done.');
    }

    // 3. Create 10 dummy quotations
    for (let i = 1; i <= 10; i++) {
        const clientIndex = i - 1;
        const p1 = products[(i % 10)];
        const p2 = products[((i + 1) % 10)];

        const listPrice1 = p1.listPrice || 2000;
        const discount1 = p1.discountPercent || 20;
        const rate1 = listPrice1 * (1 - discount1 / 100);

        const listPrice2 = p2.listPrice || 3000;
        const discount2 = p2.discountPercent || 25;
        const rate2 = listPrice2 * (1 - discount2 / 100);

        await prisma.quotation.create({
            data: {
                quoteNumber: `DAM-TEST-00${i}`,
                quoteTitle: `Dummy Quotation Project ${i}`,
                projectName: `Test Project ${i}`,
                city: 'Test City',
                state: 'Test State',
                validDays: 30,
                gstRate: 18,
                status: i % 2 === 0 ? 'SENT' : 'DRAFT',
                clientId: clients[clientIndex].id,
                createdById: admin.id,
                notes: 'Generated dummy data for testing.',
                grandTotal: (rate1 * 10 + rate2 * 5) * 1.18,
                subtotal: (rate1 * 10 + rate2 * 5),
                gstAmount: (rate1 * 10 + rate2 * 5) * 0.18,
                lineItems: {
                    create: [
                        {
                            sno: 1, productId: p1.id,
                            productCode: p1.productCode, layoutCode: p1.layoutCode,
                            description: p1.description,
                            bodyColours: p1.bodyColours, reflectorColours: p1.reflectorColours,
                            colourTemps: p1.colourTemps, beamAngles: p1.beamAngles, cri: p1.cri,
                            unit: 'NUMBERS',
                            finalBrandName: 'TestBrand', finalProductCode: `${p1.productCode}-X`, 
                            finalListPrice: listPrice1, finalDiscount: discount1,
                            finalRate: rate1, finalQuantity: 10, finalAmount: rate1 * 10, finalMacadamStep: '3A', finalUnit: 'NUMBERS',
                            recommendations: {
                                create: [
                                    { label: 'A', brandName: 'TestBrand', productCode: '', listPrice: listPrice1, listPriceWithGst: listPrice1 * 1.18, discountPercent: discount1, rate: rate1, unit: 'NUMBERS', quantity: 10, amount: rate1 * 10, macadamStep: '3A' },
                                    { label: 'B', brandName: 'AltBrand', productCode: '', listPrice: listPrice1 + 500, listPriceWithGst: (listPrice1 + 500) * 1.18, discountPercent: discount1, rate: (listPrice1 + 500) * (1 - discount1 / 100), unit: 'NUMBERS', quantity: 10, amount: (listPrice1 + 500) * (1 - discount1 / 100) * 10, macadamStep: '4A' }
                                ]
                            }
                        },
                        {
                            sno: 2, productId: p2.id,
                            productCode: p2.productCode, layoutCode: p2.layoutCode,
                            description: p2.description,
                            bodyColours: p2.bodyColours, reflectorColours: p2.reflectorColours,
                            colourTemps: p2.colourTemps, beamAngles: p2.beamAngles, cri: p2.cri,
                            unit: 'NUMBERS',
                            finalBrandName: 'TestBrand', finalProductCode: `${p2.productCode}-X`, 
                            finalListPrice: listPrice2, finalDiscount: discount2,
                            finalRate: rate2, finalQuantity: 5, finalAmount: rate2 * 5, finalMacadamStep: '3A', finalUnit: 'NUMBERS',
                            recommendations: {
                                create: [
                                    { label: 'A', brandName: 'TestBrand', productCode: '', listPrice: listPrice2, listPriceWithGst: listPrice2 * 1.18, discountPercent: discount2, rate: rate2, unit: 'NUMBERS', quantity: 5, amount: rate2 * 5, macadamStep: '3A' }
                                ]
                            }
                        }
                    ]
                }
            }
        });
    }
    console.log('✅ 10 Quotations created');
    console.log('🌱 Dummy seeding complete!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
