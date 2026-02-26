const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/clients
router.get('/', async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { quotations: true, payments: true } }
            }
        });
        res.json(clients);
    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// POST /api/clients
router.post('/', async (req, res) => {
    try {
        const { name, company, address, city, state, pincode, email, phone } = req.body;
        const client = await prisma.client.create({
            data: { name, company, address, city, state, pincode, email, phone }
        });
        res.status(201).json(client);
    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
    try {
        const client = await prisma.client.findUnique({
            where: { id: req.params.id },
            include: {
                quotations: { orderBy: { createdAt: 'desc' } },
                payments: { orderBy: { paymentDate: 'desc' } }
            }
        });
        if (!client) return res.status(404).json({ error: 'Client not found' });
        res.json(client);
    } catch (error) {
        console.error('Get client error:', error);
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
    try {
        const { name, company, address, city, state, pincode, email, phone } = req.body;
        const client = await prisma.client.update({
            where: { id: req.params.id },
            data: { name, company, address, city, state, pincode, email, phone }
        });
        res.json(client);
    } catch (error) {
        console.error('Update client error:', error);
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
    try {
        await prisma.client.delete({ where: { id: req.params.id } });
        res.json({ message: 'Client deleted' });
    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

// GET /api/clients/:id/summary
router.get('/:id/summary', async (req, res) => {
    try {
        const client = await prisma.client.findUnique({
            where: { id: req.params.id },
            include: {
                quotations: {
                    include: { recommendations: true },
                    orderBy: { createdAt: 'desc' }
                },
                payments: { orderBy: { paymentDate: 'desc' } }
            }
        });
        if (!client) return res.status(404).json({ error: 'Client not found' });

        const totalPaid = client.payments.reduce((sum, p) => sum + p.amountPaid, 0);
        res.json({ ...client, totalPaid });
    } catch (error) {
        console.error('Get client summary error:', error);
        res.status(500).json({ error: 'Failed to fetch client summary' });
    }
});

module.exports = router;
