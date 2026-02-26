const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { generateQuoteNumber } = require('../utils/quoteNumber');
const prisma = new PrismaClient();

router.use(authenticate);

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
                { projectName: { contains: search } },
                { client: { name: { contains: search } } }
            ];
        }

        const quotations = await prisma.quotation.findMany({
            where,
            include: {
                client: { select: { name: true, company: true } },
                recommendations: true,
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

// GET /api/quotations/:id
router.get('/:id', async (req, res) => {
    try {
        const quotation = await prisma.quotation.findUnique({
            where: { id: req.params.id },
            include: {
                client: true,
                lineItems: {
                    include: { brands: true },
                    orderBy: { sno: 'asc' }
                },
                recommendations: { orderBy: { sno: 'asc' } },
                payments: { orderBy: { paymentDate: 'desc' } }
            }
        });
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        res.json(quotation);
    } catch (error) {
        console.error('Get quotation error:', error);
        res.status(500).json({ error: 'Failed to fetch quotation' });
    }
});

// POST /api/quotations
router.post('/', async (req, res) => {
    try {
        const { title, clientId, projectName, projectLocation, validDays, gstRate, notes, lineItems, recommendations } = req.body;
        const quoteNumber = await generateQuoteNumber();

        const quotation = await prisma.quotation.create({
            data: {
                quoteNumber,
                title,
                clientId,
                projectName,
                projectLocation,
                validDays: validDays || 30,
                gstRate: gstRate || 18,
                notes,
                createdById: req.user.id,
                lineItems: lineItems ? {
                    create: lineItems.map((item, idx) => ({
                        sno: item.sno || idx + 1,
                        productCode: item.productCode,
                        description: item.description,
                        polarImageUrl: item.polarImageUrl,
                        unit: item.unit,
                        qtyApprox: item.qtyApprox,
                        brands: item.brands ? {
                            create: item.brands.map(b => ({
                                brandColumn: b.brandColumn,
                                macadamStep: b.macadamStep,
                                rate: b.rate,
                                amount: b.amount || (item.qtyApprox * (b.rate || 0)),
                                spaceMatch: b.spaceMatch
                            }))
                        } : undefined
                    }))
                } : undefined,
                recommendations: recommendations ? {
                    create: recommendations.map(r => ({
                        label: r.label,
                        sno: r.sno,
                        productCode: r.productCode,
                        qty: r.qty,
                        unit: r.unit,
                        brandName: r.brandName,
                        amount: r.amount
                    }))
                } : undefined
            },
            include: {
                client: true,
                lineItems: { include: { brands: true } },
                recommendations: true
            }
        });
        res.status(201).json(quotation);
    } catch (error) {
        console.error('Create quotation error:', error);
        res.status(500).json({ error: 'Failed to create quotation' });
    }
});

// PUT /api/quotations/:id
router.put('/:id', async (req, res) => {
    try {
        const { title, clientId, projectName, projectLocation, status, validDays, gstRate, notes, lineItems, recommendations } = req.body;

        // Delete existing line items and recommendations, then recreate
        await prisma.itemBrand.deleteMany({
            where: { quotationItem: { quotationId: req.params.id } }
        });
        await prisma.quotationItem.deleteMany({ where: { quotationId: req.params.id } });
        await prisma.recommendation.deleteMany({ where: { quotationId: req.params.id } });

        const quotation = await prisma.quotation.update({
            where: { id: req.params.id },
            data: {
                title,
                clientId,
                projectName,
                projectLocation,
                status,
                validDays,
                gstRate,
                notes,
                lineItems: lineItems ? {
                    create: lineItems.map((item, idx) => ({
                        sno: item.sno || idx + 1,
                        productCode: item.productCode,
                        description: item.description,
                        polarImageUrl: item.polarImageUrl,
                        unit: item.unit,
                        qtyApprox: item.qtyApprox,
                        brands: item.brands ? {
                            create: item.brands.map(b => ({
                                brandColumn: b.brandColumn,
                                macadamStep: b.macadamStep,
                                rate: b.rate,
                                amount: b.amount || (item.qtyApprox * (b.rate || 0)),
                                spaceMatch: b.spaceMatch
                            }))
                        } : undefined
                    }))
                } : undefined,
                recommendations: recommendations ? {
                    create: recommendations.map(r => ({
                        label: r.label,
                        sno: r.sno,
                        productCode: r.productCode,
                        qty: r.qty,
                        unit: r.unit,
                        brandName: r.brandName,
                        amount: r.amount
                    }))
                } : undefined
            },
            include: {
                client: true,
                lineItems: { include: { brands: true }, orderBy: { sno: 'asc' } },
                recommendations: { orderBy: { sno: 'asc' } },
                payments: true
            }
        });
        res.json(quotation);
    } catch (error) {
        console.error('Update quotation error:', error);
        res.status(500).json({ error: 'Failed to update quotation' });
    }
});

// DELETE /api/quotations/:id
router.delete('/:id', async (req, res) => {
    try {
        await prisma.itemBrand.deleteMany({
            where: { quotationItem: { quotationId: req.params.id } }
        });
        await prisma.quotationItem.deleteMany({ where: { quotationId: req.params.id } });
        await prisma.recommendation.deleteMany({ where: { quotationId: req.params.id } });
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
            include: {
                lineItems: { include: { brands: true } },
                recommendations: true
            }
        });
        if (!original) return res.status(404).json({ error: 'Quotation not found' });

        const quoteNumber = await generateQuoteNumber();
        const duplicate = await prisma.quotation.create({
            data: {
                quoteNumber,
                title: `${original.title} (Copy)`,
                clientId: original.clientId,
                projectName: original.projectName,
                projectLocation: original.projectLocation,
                validDays: original.validDays,
                gstRate: original.gstRate,
                notes: original.notes,
                createdById: req.user.id,
                lineItems: {
                    create: original.lineItems.map(item => ({
                        sno: item.sno,
                        productCode: item.productCode,
                        description: item.description,
                        polarImageUrl: item.polarImageUrl,
                        unit: item.unit,
                        qtyApprox: item.qtyApprox,
                        brands: {
                            create: item.brands.map(b => ({
                                brandColumn: b.brandColumn,
                                macadamStep: b.macadamStep,
                                rate: b.rate,
                                amount: b.amount,
                                spaceMatch: b.spaceMatch
                            }))
                        }
                    }))
                },
                recommendations: {
                    create: original.recommendations.map(r => ({
                        label: r.label,
                        sno: r.sno,
                        productCode: r.productCode,
                        qty: r.qty,
                        unit: r.unit,
                        brandName: r.brandName,
                        amount: r.amount
                    }))
                }
            },
            include: {
                client: true,
                lineItems: { include: { brands: true } },
                recommendations: true
            }
        });
        res.status(201).json(duplicate);
    } catch (error) {
        console.error('Duplicate quotation error:', error);
        res.status(500).json({ error: 'Failed to duplicate quotation' });
    }
});

// GET /api/quotations/:id/pdf
router.get('/:id/pdf', async (req, res) => {
    try {
        const { generatePDF } = require('../utils/pdfGenerator');
        const quotation = await prisma.quotation.findUnique({
            where: { id: req.params.id },
            include: {
                client: true,
                lineItems: { include: { brands: true }, orderBy: { sno: 'asc' } },
                recommendations: { orderBy: { sno: 'asc' } }
            }
        });
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

        const settings = await prisma.companySettings.findFirst();
        const pdfBuffer = await generatePDF(quotation, settings);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${quotation.quoteNumber}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// POST /api/quotations/:id/send-email
router.post('/:id/send-email', async (req, res) => {
    try {
        const quotation = await prisma.quotation.findUnique({
            where: { id: req.params.id },
            include: { client: true }
        });
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        if (!quotation.client.email) return res.status(400).json({ error: 'Client has no email address' });

        // Mark as sent
        await prisma.quotation.update({
            where: { id: req.params.id },
            data: { status: 'SENT' }
        });

        res.json({ message: 'Email would be sent (SMTP not configured)' });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

module.exports = router;
