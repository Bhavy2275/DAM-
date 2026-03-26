const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { generateQuoteNumber } = require('../utils/quoteNumber');

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
        customFields: parseArr(item.customFields || '{}'),
        recommendations: item.recommendations || [],
        recommendationsByLabel: recs,
    };
}

// Recalculate and persist quotation totals after any item change
// Recalculate and persist quotation totals after any item change
async function recalculateQuotationTotal(quotationId, tx = prisma) {
    try {
        const items = await tx.quotationItem.findMany({ 
            where: { quotationId },
            include: { recommendations: true }
        });
        
        let subtotal = items.reduce((sum, i) => sum + (Number(i.finalAmount) || 0), 0);
        
        // If Final Quote is totally empty (0), fallback to REC A total so the dashboard isn't 0
        if (subtotal === 0) {
            subtotal = items.reduce((sum, item) => {
                const recA = item.recommendations.find(r => r.label === 'A');
                return sum + (recA ? (Number(recA.amount) || 0) : 0);
            }, 0);
        }

        const quotation = await tx.quotation.findUnique({ where: { id: quotationId } });
        if (!quotation) return;
        
        const gstAmount = subtotal * ((Number(quotation.gstRate) || 18) / 100);
        const grandTotal = subtotal + gstAmount;
        
        await tx.quotation.update({
            where: { id: quotationId },
            data: { grandTotal, subtotal, gstAmount }
        });
    } catch (err) {
        console.error('recalculateQuotationTotal error:', err);
    }
}

// ... existing routes ...

// PUT /api/quotations/:id/batch  — fully atomic save for header + all items + all recs
router.put('/:id/batch', async (req, res) => {
    try {
        const { id } = req.params;
        const { header, items, notes } = req.body;

        await prisma.$transaction(async (tx) => {
            // 1. Update Header if provided
            if (header) {
                const { customLabels, ...hData } = header;
                const updateData = { ...hData };
                if (customLabels !== undefined) {
                    updateData.customLabels = typeof customLabels === 'string' ? customLabels : JSON.stringify(customLabels);
                }
                if (notes !== undefined) updateData.notes = notes;
                
                await tx.quotation.update({ where: { id }, data: updateData });
            } else if (notes !== undefined) {
                await tx.quotation.update({ where: { id }, data: { notes } });
            }

            // 2. Update Items & Recommendations
            if (items && items.length > 0) {
                for (const item of items) {
                    const { id: itemId, recommendations, customFields, ...itemData } = item;
                    if (!itemId) continue; // Safety check

                    const dataToUpdate = { ...itemData };
                    if (customFields !== undefined) {
                        dataToUpdate.customFields = typeof customFields === 'string' ? customFields : JSON.stringify(customFields);
                    }
                    // Stringify attribute arrays if present
                    ['bodyColours', 'reflectorColours', 'colourTemps', 'beamAngles', 'cri'].forEach(key => {
                        if (item[key] !== undefined) {
                            dataToUpdate[key] = JSON.stringify(item[key] || []);
                        }
                    });

                    // Update item itself
                    await tx.quotationItem.update({
                        where: { id: itemId },
                        data: dataToUpdate
                    });

                    // Update recommendations if provided
                    if (recommendations !== undefined) {
                        await tx.itemRecommendation.deleteMany({ where: { quotationItemId: itemId } });
                        if (Array.isArray(recommendations) && recommendations.length > 0) {
                            await tx.itemRecommendation.createMany({
                                data: recommendations.map(r => ({
                                    quotationItemId: itemId,
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
                    }
                }
            }

            // 3. Recalculate Totals inside the transaction
            await recalculateQuotationTotal(id, tx);
        });

        // Fetch fresh state to return
        const quotation = await prisma.quotation.findUnique({
            where: { id },
            include: {
                client: true,
                lineItems: { include: { recommendations: { orderBy: { label: 'asc' } } }, orderBy: { sno: 'asc' } },
                payments: true
            }
        });
        res.json({ ...quotation, lineItems: quotation.lineItems.map(serializeItem) });
    } catch (error) {
        console.error('Batch save error:', error);
        res.status(500).json({ error: 'Failed to perform batch save', detail: error.message });
    }
});


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

// GET /api/quotations/recalculate-all
router.get('/recalculate-all', async (req, res) => {
    try {
        const quotations = await prisma.quotation.findMany({
            include: { lineItems: { include: { recommendations: true } } }
        });

        let updated = 0;

        for (const q of quotations) {
            let subtotal = q.lineItems.reduce((s, i) => s + (Number(i.finalAmount) || 0), 0);
            
            // Fallback to REC A if Final Quote is empty
            if (subtotal === 0) {
                subtotal = q.lineItems.reduce((sum, item) => {
                    const recA = item.recommendations.find(r => r.label === 'A');
                    return sum + (recA ? (Number(recA.amount) || 0) : 0);
                }, 0);
            }

            const gstAmount  = subtotal * ((Number(q.gstRate) || 18) / 100);
            const grandTotal = subtotal + gstAmount;

            // ONLY update financial fields — never touch quoteNumber here
            // quoteNumber already exists for all records (it has @unique constraint)
            await prisma.quotation.update({
                where: { id: q.id },
                data: { subtotal, gstAmount, grandTotal }
            });
            updated++;
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
        const { quoteTitle, clientId, projectName, city, state, validDays, gstRate, notes, customLabels } = req.body;
        const quoteNumber = await generateQuoteNumber();
        const quotation = await prisma.quotation.create({
            data: {
                quoteNumber, quoteTitle, clientId, projectName,
                city: city || '', state: state || '',
                validDays: validDays || 30,
                gstRate: gstRate || 18,
                notes: notes || '',
                customLabels: customLabels || null,
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
        const { quoteTitle, clientId, projectName, city, state, status, validDays, gstRate, notes, customLabels } = req.body;
        const updateData = { quoteTitle, clientId, projectName, city, state, status, validDays, gstRate, notes };
        if (customLabels !== undefined) updateData.customLabels = customLabels;
        const quotation = await prisma.quotation.update({
            where: { id: req.params.id },
            data: updateData,
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
            bodyColours, reflectorColours, colourTemps, beamAngles, cri, unit, customFields } = req.body;

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
                customFields: JSON.stringify(customFields || {}),
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
            unit, sno, productCode, layoutCode, description, currentCustomFields,
            finalBrandName, finalProductCode, finalListPrice, finalDiscount,
            finalRate, finalUnit, finalQuantity, finalAmount, finalMacadamStep
        } = req.body;
        const dataToUpdate = {
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
        };
        if (currentCustomFields !== undefined) {
            dataToUpdate.customFields = typeof currentCustomFields === 'string' ? currentCustomFields : JSON.stringify(currentCustomFields);
        }
        const item = await prisma.quotationItem.update({
            where: { id: req.params.itemId },
            data: dataToUpdate,
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
        
        // Ensure the main quotation total updates to reflect this new recommendation!
        await recalculateQuotationTotal(req.params.id);
        
        res.json(serializeItem(item));
    } catch (error) {
        console.error('Save recommendations error:', error?.message, error?.code, error?.meta);
        res.status(500).json({ error: 'Failed to save recommendations', detail: error?.message });
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
                // Only update fields that are explicitly provided — never null-out existing data
                const data = {};
                if (item.productId        !== undefined) data.productId        = item.productId        || null;
                if (item.productCode      !== undefined) data.productCode      = item.productCode      || '';
                if (item.layoutCode       !== undefined) data.layoutCode       = item.layoutCode       || '';
                if (item.description      !== undefined) data.description      = item.description      || '';
                if (item.productImageUrl  !== undefined) data.productImageUrl  = item.productImageUrl  || null;
                if (item.polarDiagramUrl  !== undefined) data.polarDiagramUrl  = item.polarDiagramUrl  || null;
                if (item.bodyColours      !== undefined) data.bodyColours      = JSON.stringify(item.bodyColours || []);
                if (item.reflectorColours !== undefined) data.reflectorColours = JSON.stringify(item.reflectorColours || []);
                if (item.colourTemps      !== undefined) data.colourTemps      = JSON.stringify(item.colourTemps || []);
                if (item.beamAngles       !== undefined) data.beamAngles       = JSON.stringify(item.beamAngles || []);
                if (item.cri              !== undefined) data.cri              = JSON.stringify(item.cri || []);

                if (item.finalBrandName   !== undefined) data.finalBrandName   = item.finalBrandName   || null;
                if (item.finalProductCode !== undefined) data.finalProductCode = item.finalProductCode || null;
                if (item.finalListPrice   !== undefined) data.finalListPrice   = parseFloat(item.finalListPrice)  || null;
                if (item.finalDiscount    !== undefined) data.finalDiscount    = parseFloat(item.finalDiscount)   || null;
                if (item.finalRate        !== undefined) data.finalRate        = parseFloat(item.finalRate)       || null;
                if (item.finalQuantity    !== undefined) data.finalQuantity    = parseFloat(item.finalQuantity)   || null;
                if (item.finalAmount      !== undefined) data.finalAmount      = parseFloat(item.finalAmount)     || null;
                if (item.finalMacadamStep !== undefined) data.finalMacadamStep = item.finalMacadamStep || null;
                if (item.finalUnit        !== undefined) data.finalUnit        = item.finalUnit        || null;
                if (item.customFields     !== undefined) {
                    data.customFields = typeof item.customFields === 'string' ? item.customFields : JSON.stringify(item.customFields);
                }

                if (Object.keys(data).length > 0) {
                    await prisma.quotationItem.update({ where: { id: item.id }, data });
                }
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
