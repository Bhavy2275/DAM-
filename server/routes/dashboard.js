const express = require('express');
const router  = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
    try {
        const [totalQuotations, quotations, payments] = await Promise.all([
            prisma.quotation.count(),
            prisma.quotation.findMany({
                include: {
                    client: { select: { fullName: true, companyName: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.payment.findMany()
        ]);

        const pending  = quotations.filter(q => q.status === 'DRAFT' || q.status === 'SENT').length;
        const accepted = quotations.filter(q => q.status === 'ACCEPTED').length;

        const totalRevenue = quotations
            .filter(q => q.status === 'ACCEPTED' || q.status === 'INVOICED')
            .reduce((sum, q) => sum + (q.grandTotal || 0), 0);

        // Schema confirmed: Payment.amountPaid Float, status default "COMPLETED"
        const totalPaid = payments
            .filter(p => p.status === 'COMPLETED')
            .reduce((s, p) => s + (p.amountPaid || 0), 0);

        const totalPendingPayments = payments
            .filter(p => p.status === 'PENDING')
            .reduce((s, p) => s + (p.amountPaid || 0), 0);

        // Monthly revenue — last 12 months from payments
        const monthlyRevenue = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const amt = payments
                .filter(p => {
                    const d = new Date(p.paymentDate);
                    return d >= monthStart && d <= monthEnd;
                })
                .reduce((s, p) => s + (p.amountPaid || 0), 0);
            monthlyRevenue.push({
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
            totalRevenue,
            totalPaid,
            totalPendingPayments,
            monthlyRevenue,
            statusCounts,
            recentQuotations,
        });


    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

module.exports = router;
