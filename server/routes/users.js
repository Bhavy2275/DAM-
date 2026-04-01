const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { z } = require('zod');
const { validateBody } = require('../middleware/validate');

const inviteSchema = z.object({
    name: z.string().max(100).optional(),
    email: z.string().email().max(100),
    password: z.string().min(6).max(255),
    role: z.enum(['ADMIN', 'STAFF'])
});

const updateSchema = z.object({
    name: z.string().max(100).optional(),
    email: z.string().email().max(100).optional(),
    password: z.string().min(6).max(255).optional(),
    role: z.enum(['ADMIN', 'STAFF']).optional()
});

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
router.post('/invite', requireRole('ADMIN'), validateBody(inviteSchema), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        const validRole = ['ADMIN', 'STAFF'].includes(role) ? role : 'STAFF';
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { name: name || '', email, passwordHash, role: validRole },
            select: { id: true, name: true, email: true, role: true }
        });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

const roleSchema = z.object({ role: z.enum(['ADMIN', 'STAFF']) });

// PUT /api/users/:id/role
router.put('/:id/role', validateBody(roleSchema), async (req, res) => {
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
        await prisma.$transaction(async (tx) => {
            const userToDelete = await tx.user.findUnique({ where: { id: req.params.id } });
            if (!userToDelete) throw { statusCode: 404, message: 'User not found' };
            
            if (userToDelete.role === 'ADMIN') {
                const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
                if (adminCount <= 1) {
                    throw { statusCode: 400, message: 'Cannot delete the last admin user' };
                }
            }
            
            await tx.user.delete({ where: { id: req.params.id } });
        });

        res.json({ message: 'User deleted' });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
