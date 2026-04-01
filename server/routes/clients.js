const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { z } = require('zod');
const { validateBody } = require('../middleware/validate');

const clientSchema = z.object({
    fullName: z.string().max(150),
    companyName: z.string().max(150).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pinCode: z.string().max(20).optional().nullable(),
    mobileNumber: z.string().max(50).optional().nullable(),
    emailId: z.string().email().max(150).or(z.literal("")).optional().nullable(),
    companyGstNumber: z.string().max(50).optional().nullable(),
    companyAddress: z.string().max(500).optional().nullable(),
    customAttributes: z.any().optional().nullable(),
    customLabels: z.any().optional().nullable(),
});

router.use(authenticate);

// GET /api/clients
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let clients = await prisma.client.findMany({
            include: {
                _count: { select: { quotations: true /*, payments: true */ } }
            },
            orderBy: { createdAt: 'desc' }
        });
        if (search) {
            const s = search.toLowerCase();
            clients = clients.filter(c =>
                (c.fullName || '').toLowerCase().includes(s) ||
                (c.companyName || '').toLowerCase().includes(s) ||
                (c.city || '').toLowerCase().includes(s) ||
                (c.emailId || '').toLowerCase().includes(s)
            );
        }
        res.json(clients);
    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
    try {
        const client = await prisma.client.findUnique({
            where: { id: req.params.id },
            include: {
                quotations: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true, quoteNumber: true, quoteTitle: true, projectName: true,
                        status: true, grandTotal: true, subtotal: true, gstAmount: true,
                        createdAt: true, gstRate: true
                    }
                },
                // payments: {
                //     orderBy: { paymentDate: 'desc' },
                //     include: {
                //         quotation: { select: { quoteNumber: true } }
                //     }
                // }
            }
        });
        if (!client) return res.status(404).json({ error: 'Client not found' });

        res.json(client);
    } catch (error) {
        console.error('Get client error:', error);
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

// POST /api/clients
router.post('/', validateBody(clientSchema), async (req, res) => {
    try {
        const { fullName, companyName, address, city, state, pinCode, mobileNumber, emailId, companyGstNumber, companyAddress, customAttributes, customLabels } = req.body;
        const client = await prisma.client.create({
            data: { 
                fullName, companyName, address, city, state, pinCode, mobileNumber, emailId, companyGstNumber, companyAddress,
                customAttributes: customAttributes ? JSON.stringify(customAttributes) : "[]",
                customLabels: customLabels ? JSON.stringify(customLabels) : null
            }
        });
        res.status(201).json(client);
    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

// PUT /api/clients/:id
router.put('/:id', validateBody(clientSchema.partial()), async (req, res) => {
    try {
        const { fullName, companyName, address, city, state, pinCode, mobileNumber, emailId, companyGstNumber, companyAddress, customAttributes, customLabels } = req.body;
        const client = await prisma.client.update({
            where: { id: req.params.id },
            data: { 
                fullName, companyName, address, city, state, pinCode, mobileNumber, emailId, companyGstNumber, companyAddress,
                customAttributes: customAttributes ? JSON.stringify(customAttributes) : "[]",
                customLabels: customLabels ? JSON.stringify(customLabels) : null
            }
        });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// DELETE /api/clients/:id
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.$transaction(async (tx) => {
            await tx.payment.deleteMany({ where: { clientId: id } });
            await tx.quotationItem.deleteMany({ where: { quotation: { clientId: id } } });
            await tx.quotation.deleteMany({ where: { clientId: id } });
            await tx.client.delete({ where: { id } });
        });
        res.json({ message: 'Client and all associated records deleted successfully' });
    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

module.exports = router;
