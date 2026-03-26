const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── TEMPORARY: Auth disabled for client access ──
const authenticate = async (req, res, next) => {
    try {
        // Auto-attach the first admin user so all routes work without a token
        const user = await prisma.user.findFirst({
            select: { id: true, name: true, email: true, role: true }
        });
        req.user = user || { id: 'guest', name: 'Guest', email: 'guest@dam.app', role: 'ADMIN' };
        next();
    } catch (error) {
        req.user = { id: 'guest', name: 'Guest', email: 'guest@dam.app', role: 'ADMIN' };
        next();
    }
};

module.exports = { authenticate };
