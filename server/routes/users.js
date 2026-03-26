const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(authenticate);
router.use(requireRole('ADMIN'));

// GET /api/users
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/users/invite
router.post('/invite', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, passwordHash, role: role || 'STAFF' },
            select: { id: true, name: true, email: true, role: true }
        });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /api/users/:id/role
router.put('/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { role },
            select: { id: true, name: true, email: true, role: true }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
