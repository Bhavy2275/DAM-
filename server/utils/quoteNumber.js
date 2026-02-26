const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateQuoteNumber() {
    const year = new Date().getFullYear();
    const prefix = `DAM-${year}-`;

    const lastQuote = await prisma.quotation.findFirst({
        where: { quoteNumber: { startsWith: prefix } },
        orderBy: { quoteNumber: 'desc' }
    });

    let nextNum = 1;
    if (lastQuote) {
        const lastNum = parseInt(lastQuote.quoteNumber.split('-')[2], 10);
        nextNum = lastNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

module.exports = { generateQuoteNumber };
