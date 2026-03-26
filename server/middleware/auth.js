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
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { authenticate };

