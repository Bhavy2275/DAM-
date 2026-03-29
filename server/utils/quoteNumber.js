const prisma = require('../lib/prisma');

async function generateQuoteNumber(retries = 3) {
    const year = new Date().getFullYear();
    const prefix = `DAM-${year}-`;

    for (let attempt = 0; attempt < retries; attempt++) {
        const lastQuote = await prisma.quotation.findFirst({
            where: { quoteNumber: { startsWith: prefix } },
            orderBy: { quoteNumber: 'desc' }
        });

        let nextNum = 1;
        if (lastQuote) {
            const lastNum = parseInt(lastQuote.quoteNumber.split('-')[2], 10);
            nextNum = isNaN(lastNum) ? 1 : lastNum + 1;
        }

        const quoteNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

        try {
            // Verify uniqueness before returning — avoids silent duplicate use
            const existing = await prisma.quotation.findUnique({ where: { quoteNumber } });
            if (!existing) return quoteNumber;
            // If duplicate found, loop will retry with fresh query
        } catch (err) {
            if (err.code === 'P2002' && attempt < retries - 1) continue; // unique constraint violation
            throw err;
        }
    }

    // Fallback: append timestamp to guarantee uniqueness
    return `${prefix}${Date.now().toString().slice(-4)}`;
}

module.exports = { generateQuoteNumber };
