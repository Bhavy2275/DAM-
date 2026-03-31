const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generatePDF } = require('./utils/pdfGenerator');

async function reproduce() {
    const quoteId = 'c66dae02-0b4a-4875-a567-89863e25a83b';
    try {
        console.log(`Attempting to generate PDF for ID: ${quoteId}`);
        const quotation = await prisma.quotation.findUnique({
            where: { id: quoteId },
            include: {
                client: true,
                lineItems: {
                    include: { recommendations: { orderBy: { label: 'asc' } } },
                    orderBy: { sno: 'asc' }
                }
            }
        });

        if (!quotation) {
            console.error('Quotation not found');
            return;
        }

        const settings = await prisma.companySettings.findFirst() || {};
        
        // Mock serializeItem logic (from quotations.js)
        const serialized = {
            ...quotation,
            lineItems: (quotation.lineItems || []).map(item => ({
                ...item,
                bodyColours: item.bodyColours || '[]',
                reflectorColours: item.reflectorColours || '[]',
                colourTemps: item.colourTemps || '[]',
                beamAngles: item.beamAngles || '[]',
                cri: item.cri || '[]',
                recommendations: item.recommendations || []
            }))
        };

        const buffer = await generatePDF(serialized, settings, 'all_recs');
        console.log('Successfully generated PDF! Buffer size:', buffer.length);
    } catch (error) {
        console.error('REPRODUCTION FAILED:');
        console.error(error);
        if (error.stack) console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

reproduce();
