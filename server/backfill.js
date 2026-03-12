const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const quotations = await prisma.quotation.findMany({
        include: { lineItems: { include: { recommendations: true } } }
    });
    
    let updated = 0;
    for (const q of quotations) {
        // Compute subtotal from line items (using finalAmount if it exists)
        const subtotal = q.lineItems.reduce((s, i) => s + (i.finalAmount || 0), 0);
        const gstAmount = subtotal * ((q.gstRate || 18) / 100);
        const grandTotal = subtotal + gstAmount;
        
        await prisma.quotation.update({
            where: { id: q.id },
            data: { subtotal, gstAmount, grandTotal }
        });
        updated++;
    }
    console.log(`Backfilled ${updated} quotations successfully.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
