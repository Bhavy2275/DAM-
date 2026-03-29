const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticate = async (req, res, next) => {
    try {
        // Accept token from Authorization header (Bearer) OR cookie
        let token = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        } else {
            token = req.cookies.token;
        }
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, name: true, email: true, role: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'User session invalid' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        // If it's a Prisma error or something else, it's a 500, not a 401!
        console.error('Authentication error:', error);
        return res.status(500).json({ error: 'Internal authentication error' });
    }
};

module.exports = { authenticate };

