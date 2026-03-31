const express = require('express');
const router  = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
    try {
        const [totalQuotations, quotations /*, payments*/] = await Promise.all([
            prisma.quotation.count(),
            prisma.quotation.findMany({
                include: {
                    client: { select: { fullName: true, companyName: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            // prisma.payment.findMany() // Table might not exist yet
        ]);

        const payments = []; // Temporary mock to avoid breaks

        const pending  = quotations.filter(q => q.status === 'DRAFT' || q.status === 'SENT').length;
        const accepted = quotations.filter(q => q.status === 'ACCEPTED').length;

        const totalQuotedValue = quotations
            .filter(q => q.status !== 'REJECTED') // Include all except rejected for total value
            .reduce((sum, q) => sum + (q.grandTotal || 0), 0);

        // Monthly quoted value — last 12 months from quotations
        const monthlyQuotedValue = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            
            const amt = quotations
                .filter(q => {
                    const d = new Date(q.createdAt);
                    return d >= monthStart && d <= monthEnd;
                })
                .reduce((s, q) => s + (q.total || 0), 0);

            monthlyQuotedValue.push({
                month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
                amount: amt
            });
        }

        const statusCounts = {
            DRAFT:    quotations.filter(q => q.status === 'DRAFT').length,
            SENT:     quotations.filter(q => q.status === 'SENT').length,
            ACCEPTED: quotations.filter(q => q.status === 'ACCEPTED').length,
            REJECTED: quotations.filter(q => q.status === 'REJECTED').length,
            INVOICED: quotations.filter(q => q.status === 'INVOICED').length,
        };

        const recentQuotations = quotations.slice(0, 10).map(q => ({
            id:          q.id,
            quoteNumber: q.quoteNumber,
            projectName: q.projectName || '—',
            clientName:  q.client?.companyName || q.client?.fullName || '—',
            status:      q.status,
            createdAt:   q.createdAt,
            total:       q.grandTotal || 0,
        }));

        res.json({
            totalQuotations,
            pending,
            accepted,
            totalQuotedValue,
            monthlyQuotedValue,
            statusCounts,
            recentQuotations
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

module.exports = router;
