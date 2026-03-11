const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/clients
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let clients = await prisma.client.findMany({
            include: {
                _count: { select: { quotations: true, payments: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        if (search) {
            const s = search.toLowerCase();
            clients = clients.filter(c =>
                c.fullName.toLowerCase().includes(s) ||
                c.companyName.toLowerCase().includes(s) ||
                c.city.toLowerCase().includes(s) ||
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
                quotations: { orderBy: { createdAt: 'desc' } },
                payments: { orderBy: { paymentDate: 'desc' } }
            }
        });
        if (!client) return res.status(404).json({ error: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

// POST /api/clients
router.post('/', async (req, res) => {
    try {
        const { fullName, companyName, address, city, state, pinCode, mobileNumber, emailId, companyGstNumber, companyAddress } = req.body;
        const client = await prisma.client.create({
            data: { fullName, companyName, address, city, state, pinCode, mobileNumber, emailId, companyGstNumber, companyAddress }
        });
        res.status(201).json(client);
    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
    try {
        const { fullName, companyName, address, city, state, pinCode, mobileNumber, emailId, companyGstNumber, companyAddress } = req.body;
        const client = await prisma.client.update({
            where: { id: req.params.id },
            data: { fullName, companyName, address, city, state, pinCode, mobileNumber, emailId, companyGstNumber, companyAddress }
        });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
    try {
        await prisma.client.delete({ where: { id: req.params.id } });
        res.json({ message: 'Client deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

module.exports = router;
