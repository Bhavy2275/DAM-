const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const { z } = require('zod');
const { validateBody } = require('../middleware/validate');

router.use(authenticate);
router.use(requireRole('ADMIN'));

const paymentSchema = z.object({
    quotationId: z.string().uuid(),
    clientId: z.string().uuid(),
    amountPaid: z.number().positive(),
    paymentDate: z.string().min(1),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE']),
    referenceNumber: z.string().max(100).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    status: z.enum(['COMPLETED', 'PENDING', 'PARTIAL']).optional()
});

const paymentUpdateSchema = paymentSchema.partial();

// GET /api/payments/summary — must be BEFORE /:id
router.get('/summary', async (req, res) => {
    try {
        const payments = await prisma.payment.findMany();
        const totalReceived = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amountPaid, 0);
        const totalPending = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amountPaid, 0);
        const totalPartial = payments.filter(p => p.status === 'PARTIAL').reduce((s, p) => s + p.amountPaid, 0);
        res.json({ totalReceived, totalPending, totalPartial, count: payments.length });
    } catch (error) {
        console.error('Payment summary error:', error);
        res.status(500).json({ error: 'Failed to fetch payment summary' });
    }
});

// GET /api/payments
router.get('/', async (req, res) => {
    try {
        const { clientId, status, method } = req.query;
        const where = {};
        if (clientId) where.clientId = clientId;
        if (status) where.status = status;
        if (method) where.paymentMethod = method;

        const payments = await prisma.payment.findMany({
            where,
            include: {
                quotation: { select: { quoteNumber: true, projectName: true } },
                client: { select: { fullName: true, companyName: true } }
            },
            orderBy: { paymentDate: 'desc' }
        });
        res.json(payments);
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// POST /api/payments
router.post('/', validateBody(paymentSchema), async (req, res) => {
    try {
        const { quotationId, clientId, amountPaid, paymentDate, paymentMethod, referenceNumber, notes, status } = req.body;
        const [quotation, client] = await Promise.all([
            prisma.quotation.findUnique({ where: { id: quotationId } }),
            prisma.client.findUnique({ where: { id: clientId } })
        ]);
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        if (!client) return res.status(404).json({ error: 'Client not found' });
        
        // Security check: Ensure the quotation belongs to that client
        if (quotation.clientId !== clientId) {
            return res.status(400).json({ error: 'Quotation does not belong to this client' });
        }
        const payment = await prisma.payment.create({
            data: {
                quotationId,
                clientId,
                amountPaid,
                paymentDate: new Date(paymentDate),
                paymentMethod,
                referenceNumber,
                notes,
                status: status || 'COMPLETED'
            },
            include: {
                quotation: { select: { quoteNumber: true } },
                client: { select: { fullName: true } }
            }
        });
        res.status(201).json(payment);
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});

// PUT /api/payments/:id
router.put('/:id', validateBody(paymentUpdateSchema), async (req, res) => {
    try {
        const { amountPaid, paymentDate, paymentMethod, referenceNumber, notes, status } = req.body;
        const payment = await prisma.payment.update({
            where: { id: req.params.id },
            data: { amountPaid, paymentDate: paymentDate ? new Date(paymentDate) : undefined, paymentMethod, referenceNumber, notes, status }
        });
        res.json(payment);
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
    try {
        await prisma.payment.delete({ where: { id: req.params.id } });
        res.json({ message: 'Payment deleted' });
    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json({ error: 'Failed to delete payment' });
    }
});

module.exports = router;
