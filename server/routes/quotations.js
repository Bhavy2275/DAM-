const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { generateQuoteNumber } = require('../utils/quoteNumber');
const prisma = new PrismaClient();

router.use(authenticate);

function parseArr(str) { try { return JSON.parse(str || '[]'); } catch { return []; } }

function serializeItem(item) {
    const recs = (item.recommendations || []).reduce((acc, r) => {
        acc[r.label] = r;
        return acc;
    }, {});
    return {
        ...item,
        bodyColours: parseArr(item.bodyColours),
        reflectorColours: parseArr(item.reflectorColours),
        colourTemps: parseArr(item.colourTemps),
        beamAngles: parseArr(item.beamAngles),
        cri: parseArr(item.cri),
        recommendations: item.recommendations || [],
        recommendationsByLabel: recs,
    };
}

// Recalculate and persist quotation totals after any item change
async function recalculateQuotationTotal(quotationId) {
    try {
        const items = await prisma.quotationItem.findMany({ where: { quotationId } });
        const subtotal = items.reduce((sum, i) => sum + (i.finalAmount || 0), 0);
        const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
        if (!quotation) return;
        const gstAmount = subtotal * ((quotation.gstRate || 18) / 100);
        const grandTotal = subtotal + gstAmount;
        await prisma.quotation.update({
            where: { id: quotationId },
            data: { grandTotal, subtotal, gstAmount }
        });
    } catch (err) {
        console.error('recalculateQuotationTotal error:', err);
    }
}

// GET /api/quotations
router.get('/', async (req, res) => {
    try {
        const { status, clientId, search } = req.query;
        const where = {};
        if (status) where.status = status;
        if (clientId) where.clientId = clientId;
        if (search) {
            where.OR = [
                { quoteNumber: { contains: search } },
                { quoteTitle: { contains: search } },
                { projectName: { contains: search } },
                { client: { fullName: { contains: search } } },
                { client: { companyName: { contains: search } } },
            ];
        }
        const quotations = await prisma.quotation.findMany({
            where,
            include: {
                client: { select: { fullName: true, companyName: true, city: true } },
                _count: { select: { lineItems: true, payments: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(quotations);
    } catch (error) {
        console.error('Get quotations error:', error);
        res.status(500).json({ error: 'Failed to fetch quotations' });
    }
});

// GET /api/quotations/recalculate-all — recalculate and persist all quotation totals
router.get('/recalculate-all', async (req, res) => {
    try {
        const quotations = await prisma.quotation.findMany({
            include: { lineItems: true }
        });
        let updated = 0;
        for (const q of quotations) {
            const subtotal   = q.lineItems.reduce((s, i) => s + (i.finalAmount || 0), 0);
            const gstAmount  = subtotal * ((q.gstRate || 18) / 100);
            const grandTotal = subtotal + gstAmount;
            if (Math.abs(q.grandTotal - grandTotal) > 0.01) {
                await prisma.quotation.update({
                    where: { id: q.id },
                    data: { subtotal, gstAmount, grandTotal }
                });
                updated++;
            }
        }
        res.json({ success: true, updated, total: quotations.length });
    } catch (error) {
        console.error('Recalculate all error:', error);
        res.status(500).json({ error: 'Failed to recalculate totals' });
    }
});

// GET /api/quotations/:id
router.get('/:id', async (req, res) => {
    try {
        const quotation = await prisma.quotation.findUnique({
            where: { id: req.params.id },
            include: {
                client: true,
                lineItems: {
                    include: { recommendations: { orderBy: { label: 'asc' } } },
                    orderBy: { sno: 'asc' }
                },
                payments: { orderBy: { paymentDate: 'desc' } }
            }
        });
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        res.json({
            ...quotation,
            lineItems: quotation.lineItems.map(serializeItem)
        });
    } catch (error) {
        console.error('Get quotation error:', error);
        res.status(500).json({ error: 'Failed to fetch quotation' });
    }
});

// POST /api/quotations  — create header (Step 3)
router.post('/', async (req, res) => {
    try {
        const { quoteTitle, clientId, projectName, city, state, validDays, gstRate, notes } = req.body;
        const quoteNumber = await generateQuoteNumber();
        const quotation = await prisma.quotation.create({
            data: {
                quoteNumber, quoteTitle, clientId, projectName,
                city: city || '', state: state || '',
                validDays: validDays || 30,
                gstRate: gstRate || 18,
                notes: notes || '',
                createdById: req.user.id,
            },
            include: { client: true, lineItems: true }
        });
        res.status(201).json(quotation);
    } catch (error) {
        console.error('Create quotation error:', error);
        res.status(500).json({ error: 'Failed to create quotation' });
    }
});

// PUT /api/quotations/:id  — update header
router.put('/:id', async (req, res) => {
    try {
        const { quoteTitle, clientId, projectName, city, state, status, validDays, gstRate, notes } = req.body;
        const quotation = await prisma.quotation.update({
            where: { id: req.params.id },
            data: { quoteTitle, clientId, projectName, city, state, status, validDays, gstRate, notes },
            include: { client: true }
        });
        // If gstRate changed, recalculate stored totals
        if (gstRate !== undefined) {
            await recalculateQuotationTotal(req.params.id);
        }
        res.json(quotation);
    } catch (error) {
        console.error('Update quotation error:', error);
        res.status(500).json({ error: 'Failed to update quotation' });
    }
});

// DELETE /api/quotations/:id
router.delete('/:id', async (req, res) => {
    try {
        // Cascade is set in schema so just delete the quotation
        await prisma.payment.deleteMany({ where: { quotationId: req.params.id } });
        await prisma.quotation.delete({ where: { id: req.params.id } });
        res.json({ message: 'Quotation deleted' });
    } catch (error) {
        console.error('Delete quotation error:', error);
        res.status(500).json({ error: 'Failed to delete quotation' });
    }
});

// POST /api/quotations/:id/duplicate
router.post('/:id/duplicate', async (req, res) => {
    try {
        const original = await prisma.quotation.findUnique({
            where: { id: req.params.id },
            include: { lineItems: { include: { recommendations: true } } }
        });
        if (!original) return res.status(404).json({ error: 'Quotation not found' });

        const quoteNumber = await generateQuoteNumber();
        const duplicate = await prisma.quotation.create({
            data: {
                quoteNumber,
                quoteTitle: `${original.quoteTitle} (Copy)`,
                clientId: original.clientId,
                projectName: original.projectName,
                city: original.city,
                state: original.state,
                validDays: original.validDays,
                gstRate: original.gstRate,
                notes: original.notes,
                createdById: req.user.id,
                lineItems: {
                    create: original.lineItems.map(item => ({
                        sno: item.sno,
                        productId: item.productId,
                        productCode: item.productCode,
                        layoutCode: item.layoutCode,
                        description: item.description,
                        polarDiagramUrl: item.polarDiagramUrl,
                        productImageUrl: item.productImageUrl,
                        bodyColours: item.bodyColours,
                        reflectorColours: item.reflectorColours,
                        colourTemps: item.colourTemps,
                        beamAngles: item.beamAngles,
                        cri: item.cri,
                        unit: item.unit,
                        finalBrandName: item.finalBrandName,
                        finalProductCode: item.finalProductCode,
                        finalListPrice: item.finalListPrice,
                        finalDiscount: item.finalDiscount,
                        finalRate: item.finalRate,
                        finalQuantity: item.finalQuantity,
                        finalAmount: item.finalAmount,
                        finalMacadamStep: item.finalMacadamStep,
                        finalUnit: item.finalUnit,
                        recommendations: {
                            create: item.recommendations.map(r => ({
                                label: r.label, brandName: r.brandName, productCode: r.productCode,
                                listPrice: r.listPrice, listPriceWithGst: r.listPriceWithGst,
                                discountPercent: r.discountPercent, rate: r.rate, unit: r.unit,
                                quantity: r.quantity, amount: r.amount, macadamStep: r.macadamStep,
                            }))
                        }
                    }))
                }
            },
            include: { client: true, lineItems: { include: { recommendations: true } } }
        });
        await recalculateQuotationTotal(duplicate.id);
        res.status(201).json(duplicate);
    } catch (error) {
        console.error('Duplicate error:', error);
        res.status(500).json({ error: 'Failed to duplicate quotation' });
    }
});

// ── LINE ITEMS

// POST /api/quotations/:id/items  — add a product row
router.post('/:id/items', async (req, res) => {
    try {
        const { productId, productCode, layoutCode, description, polarDiagramUrl, productImageUrl,
            bodyColours, reflectorColours, colourTemps, beamAngles, cri, unit } = req.body;

        // Get current max sno
        const count = await prisma.quotationItem.count({ where: { quotationId: req.params.id } });

        const item = await prisma.quotationItem.create({
            data: {
                quotationId: req.params.id,
                sno: count + 1,
                productId: productId || null,
                productCode: productCode || '',
                layoutCode: layoutCode || null,
                description: description || '',
                polarDiagramUrl: polarDiagramUrl || null,
                productImageUrl: productImageUrl || null,
                bodyColours: JSON.stringify(bodyColours || []),
                reflectorColours: JSON.stringify(reflectorColours || []),
                colourTemps: JSON.stringify(colourTemps || []),
                beamAngles: JSON.stringify(beamAngles || []),
                cri: JSON.stringify(cri || []),
                unit: unit || 'NUMBERS',
            },
            include: { recommendations: true }
        });
        await recalculateQuotationTotal(req.params.id);
        res.status(201).json(serializeItem(item));
    } catch (error) {
        console.error('Add item error:', error);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

// PUT /api/quotations/:id/items/:itemId  — update item info AND final fields
router.put('/:id/items/:itemId', async (req, res) => {
    try {
        const {
            unit, sno, productCode, layoutCode, description,
            finalBrandName, finalProductCode, finalListPrice, finalDiscount,
            finalRate, finalUnit, finalQuantity, finalAmount, finalMacadamStep
        } = req.body;
        const item = await prisma.quotationItem.update({
            where: { id: req.params.itemId },
            data: {
                unit, sno, productCode, layoutCode, description,
                ...(finalBrandName !== undefined && { finalBrandName: finalBrandName || null }),
                ...(finalProductCode !== undefined && { finalProductCode: finalProductCode || null }),
                ...(finalListPrice !== undefined && { finalListPrice: parseFloat(finalListPrice) || null }),
                ...(finalDiscount !== undefined && { finalDiscount: parseFloat(finalDiscount) || null }),
                ...(finalRate !== undefined && { finalRate: parseFloat(finalRate) || null }),
                ...(finalUnit !== undefined && { finalUnit: finalUnit || null }),
                ...(finalQuantity !== undefined && { finalQuantity: parseFloat(finalQuantity) || null }),
                ...(finalAmount !== undefined && { finalAmount: parseFloat(finalAmount) || null }),
                ...(finalMacadamStep !== undefined && { finalMacadamStep: finalMacadamStep || null }),
            },
            include: { recommendations: true }
        });
        await recalculateQuotationTotal(req.params.id);
        res.json(serializeItem(item));
    } catch (error) {
        console.error('Update item error:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// DELETE /api/quotations/:id/items/:itemId
router.delete('/:id/items/:itemId', async (req, res) => {
    try {
        await prisma.quotationItem.delete({ where: { id: req.params.itemId } });
        // Re-number remaining items
        const remaining = await prisma.quotationItem.findMany({
            where: { quotationId: req.params.id },
            orderBy: { sno: 'asc' }
        });
        for (let i = 0; i < remaining.length; i++) {
            await prisma.quotationItem.update({ where: { id: remaining[i].id }, data: { sno: i + 1 } });
        }
        await recalculateQuotationTotal(req.params.id);
        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// PUT /api/quotations/:id/items/:itemId/recommendations  — save all A-F recs for one item
router.put('/:id/items/:itemId/recommendations', async (req, res) => {
    try {
        const { recommendations } = req.body; // array of rec objects

        // Delete existing recs for this item, then recreate
        await prisma.itemRecommendation.deleteMany({ where: { quotationItemId: req.params.itemId } });

        if (recommendations && recommendations.length > 0) {
            await prisma.itemRecommendation.createMany({
                data: recommendations.map(r => ({
                    quotationItemId: req.params.itemId,
                    label: r.label,
                    brandName: r.brandName || '',
                    productCode: r.productCode || '',
                    listPrice: parseFloat(r.listPrice) || 0,
                    listPriceWithGst: parseFloat(r.listPriceWithGst) || parseFloat(r.listPrice || 0) * 1.18,
                    discountPercent: parseFloat(r.discountPercent) || 0,
                    rate: parseFloat(r.rate) || 0,
                    unit: r.unit || 'NUMBERS',
                    quantity: parseFloat(r.quantity) || 0,
                    amount: parseFloat(r.amount) || 0,
                    macadamStep: r.macadamStep || '',
                }))
            });
        }

        const item = await prisma.quotationItem.findUnique({
            where: { id: req.params.itemId },
            include: { recommendations: { orderBy: { label: 'asc' } } }
        });
        res.json(serializeItem(item));
    } catch (error) {
        console.error('Save recommendations error:', error);
        res.status(500).json({ error: 'Failed to save recommendations' });
    }
});

// PUT /api/quotations/:id/final  — save final working quotation for all items
router.put('/:id/final', async (req, res) => {
    try {
        const { items, notes } = req.body; // items: array of { id, finalBrandName, finalProductCode, ... }

        if (notes !== undefined) {
            await prisma.quotation.update({ where: { id: req.params.id }, data: { notes } });
        }

        if (items && items.length > 0) {
            for (const item of items) {
                await prisma.quotationItem.update({
                    where: { id: item.id },
                    data: {
                        finalBrandName: item.finalBrandName || null,
                        finalProductCode: item.finalProductCode || null,
                        finalListPrice: parseFloat(item.finalListPrice) || null,
                        finalDiscount: parseFloat(item.finalDiscount) || null,
                        finalRate: parseFloat(item.finalRate) || null,
                        finalQuantity: parseFloat(item.finalQuantity) || null,
                        finalAmount: parseFloat(item.finalAmount) || null,
                        finalMacadamStep: item.finalMacadamStep || null,
                        finalUnit: item.finalUnit || null,
                    }
                });
            }
        }

        // Recalculate and persist grandTotal
        await recalculateQuotationTotal(req.params.id);

        const quotation = await prisma.quotation.findUnique({
            where: { id: req.params.id },
            include: {
                client: true,
                lineItems: { include: { recommendations: { orderBy: { label: 'asc' } } }, orderBy: { sno: 'asc' } },
                payments: true
            }
        });
        res.json({ ...quotation, lineItems: quotation.lineItems.map(serializeItem) });
    } catch (error) {
        console.error('Save final error:', error);
        res.status(500).json({ error: 'Failed to save final quotation' });
    }
});

// POST /api/quotations/:id/import-recommendation  — copy rec into final fields for all items
router.post('/:id/import-recommendation', async (req, res) => {
    try {
        const { label } = req.body; // "A" | "B" | etc.
        const items = await prisma.quotationItem.findMany({
            where: { quotationId: req.params.id },
            include: { recommendations: true },
            orderBy: { sno: 'asc' }
        });

        for (const item of items) {
            const rec = item.recommendations.find(r => r.label === label);
            if (rec) {
                await prisma.quotationItem.update({
                    where: { id: item.id },
                    data: {
                        finalBrandName: rec.brandName,
                        finalProductCode: rec.productCode,
                        finalListPrice: rec.listPrice,
                        finalDiscount: rec.discountPercent,
                        finalRate: rec.rate,
                        finalQuantity: rec.quantity,
                        finalAmount: rec.amount,
                        finalMacadamStep: rec.macadamStep,
                        finalUnit: rec.unit,
                    }
                });
            }
        }

        // Recalculate grandTotal after importing recommendation
        await recalculateQuotationTotal(req.params.id);

        const quotation = await prisma.quotation.findUnique({
            where: { id: req.params.id },
            include: {
                client: true,
                lineItems: { include: { recommendations: { orderBy: { label: 'asc' } } }, orderBy: { sno: 'asc' } },
                payments: true
            }
        });
        res.json({ ...quotation, lineItems: quotation.lineItems.map(serializeItem) });
    } catch (error) {
        console.error('Import rec error:', error);
        res.status(500).json({ error: 'Failed to import recommendation' });
    }
});

// POST /api/quotations/:id/items/reorder
router.post('/:id/items/reorder', async (req, res) => {
    try {
        const { itemIds } = req.body; // ordered array of item IDs
        for (let i = 0; i < itemIds.length; i++) {
            await prisma.quotationItem.update({ where: { id: itemIds[i] }, data: { sno: i + 1 } });
        }
        res.json({ message: 'Items reordered' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reorder items' });
    }
});

// GET /api/quotations/:id/pdf?mode=all_recs|final
router.get('/:id/pdf', async (req, res) => {
    try {
        const { generatePDF } = require('../utils/pdfGenerator');
        const mode = req.query.mode || 'final';

        const quotation = await prisma.quotation.findUnique({
            where: { id: req.params.id },
            include: {
                client: true,
                lineItems: {
                    include: { recommendations: { orderBy: { label: 'asc' } } },
                    orderBy: { sno: 'asc' }
                }
            }
        });
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

        const settings = await prisma.companySettings.findFirst();
        const serialized = {
            ...quotation,
            lineItems: quotation.lineItems.map(serializeItem)
        };

        const pdfBuffer = await generatePDF(serialized, settings, mode);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${quotation.quoteNumber}-${mode}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// POST /api/quotations/:id/send-email
router.post('/:id/send-email', async (req, res) => {
    try {
        await prisma.quotation.update({ where: { id: req.params.id }, data: { status: 'SENT' } });
        res.json({ message: 'Email sent (mark as SENT)' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email' });
    }
});

module.exports = router;
