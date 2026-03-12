const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
    try {
        const [totalQuotations, quotations, payments] = await Promise.all([
            prisma.quotation.count(),
            prisma.quotation.findMany({
                include: {
                    client: { select: { fullName: true, companyName: true } },
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.payment.findMany()
        ]);

        const pending = quotations.filter(q => q.status === 'DRAFT' || q.status === 'SENT').length;
        const accepted = quotations.filter(q => q.status === 'ACCEPTED').length;

        // Revenue = sum of stored grandTotal for accepted/invoiced quotes
        const totalRevenue = quotations
            .filter(q => q.status === 'ACCEPTED' || q.status === 'INVOICED')
            .reduce((sum, q) => sum + (q.grandTotal || 0), 0);

        const totalPaid = payments
            .filter(p => p.status === 'COMPLETED')
            .reduce((s, p) => s + p.amountPaid, 0);

        const totalPendingPayments = payments
            .filter(p => p.status === 'PENDING')
            .reduce((s, p) => s + p.amountPaid, 0);

        // Monthly revenue (last 12 months) from payments
        const monthlyRevenue = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthPayments = payments.filter(p => {
                const pd = new Date(p.paymentDate);
                return pd >= month && pd <= monthEnd;
            });
            monthlyRevenue.push({
                month: month.toLocaleString('default', { month: 'short', year: 'numeric' }),
                amount: monthPayments.reduce((s, p) => s + p.amountPaid, 0)
            });
        }

        // Status distribution
        const statusCounts = {
            DRAFT: quotations.filter(q => q.status === 'DRAFT').length,
            SENT: quotations.filter(q => q.status === 'SENT').length,
            ACCEPTED: quotations.filter(q => q.status === 'ACCEPTED').length,
            REJECTED: quotations.filter(q => q.status === 'REJECTED').length,
            INVOICED: quotations.filter(q => q.status === 'INVOICED').length
        };

        // Recent quotations (last 10)
        const recentQuotations = quotations.slice(0, 10).map(q => ({
            id: q.id,
            quoteNumber: q.quoteNumber,
            quoteTitle: q.quoteTitle,
            projectName: q.projectName,
            clientName: q.client?.fullName,
            clientCompany: q.client?.companyName,
            status: q.status,
            createdAt: q.createdAt,
            total: q.grandTotal || 0
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
            recentQuotations
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

module.exports = router;
