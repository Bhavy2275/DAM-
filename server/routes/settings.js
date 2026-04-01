const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const multer = require('multer');
const path = require('path');
const { z } = require('zod');
const { validateBody } = require('../middleware/validate');

const settingsSchema = z.object({
    companyName: z.string().max(150).optional(),
    address: z.string().max(500).optional(),
    bankName: z.string().max(150).optional(),
    accountName: z.string().max(150).optional(),
    accountNumber: z.string().max(50).optional(),
    ifscCode: z.string().max(30).optional(),
    gstNumber: z.string().max(50).optional(),
    logoUrl: z.string().max(255).optional().nullable(),
    polarDiagramUrl: z.string().max(255).optional().nullable(),
    defaultTerms: z.string().max(5000).optional(),
    defaultPaymentTerms: z.string().max(5000).optional(),
    prePrintedTerms: z.boolean().optional(),
    prePrintedPaymentTerms: z.boolean().optional(),
    defaultGstRate: z.union([z.number(), z.string()]).optional()
});

router.use(authenticate);

const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => cb(null, 'logo-' + Date.now() + path.extname(file.originalname).toLowerCase())
});
const uploadLogo = multer({ 
    storage: logoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
        }
        cb(null, true);
    }
});

// GET /api/settings
router.get('/', async (req, res) => {
    try {
        let settings = await prisma.companySettings.findFirst();
        if (!settings) {
            settings = await prisma.companySettings.create({
                data: {
                    companyName: 'Dam Lighting Solution LLP',
                    tagline: 'design. allocate. maintain.',
                    address: 'Noida, Uttar Pradesh — 201301',
                    phone: '+91-XXXXXXXXXX',
                    email: 'info@damlighting.com',
                    website: 'www.damlighting.com',
                    gstNumber: '09AAWFD8544Q1Z7',
                    bankName: 'DBS Bank India Ltd.',
                    accountName: 'DAM LIGHTING SOLUTIONS LLP',
                    accountNumber: 'XXXXXXXXXXXXXXXX',
                    ifscCode: 'DBSS0IN0874',
                    bankAddress: 'DBS Bank India Limited, Connaught Place, New Delhi',
                    defaultTerms: '1. All prices are ex-works.\n2. GST as applicable.\n3. Delivery within 4-6 weeks from order confirmation.\n4. Payment terms: 50% advance, balance before dispatch.\n5. Quotation valid for 30 days.\n6. Warranty as per manufacturer terms.\n7. Installation charges extra if applicable.\n8. Transportation charges extra.\n9. Any changes in government taxes will be applicable.\n10. Subject to Delhi/NCR jurisdiction.'
                }
            });
        }
        res.json(settings);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PUT /api/settings
router.put('/', requireRole('ADMIN'), validateBody(settingsSchema), async (req, res) => {
    try {
        const {
            companyName, address, bankName, accountName, accountNumber,
            ifscCode, gstNumber, logoUrl, polarDiagramUrl,
            defaultTerms, defaultPaymentTerms,
            prePrintedTerms, prePrintedPaymentTerms,
        } = req.body;
        const data = {
            companyName, address, bankName, accountName, accountNumber,
            ifscCode, gstNumber, logoUrl, polarDiagramUrl,
            defaultTerms, defaultPaymentTerms,
            prePrintedTerms, prePrintedPaymentTerms,
        };
        // Handle both field names (client sends defaultGstRate, schema uses defaultGst)
        if (req.body.defaultGstRate != null) {
            data.defaultGst = parseFloat(req.body.defaultGstRate) || 18;
        }
        Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
        const existing = await prisma.companySettings.findFirst();
        const updated = existing
            ? await prisma.companySettings.update({ where: { id: existing.id }, data })
            : await prisma.companySettings.create({ data });
        res.json(updated);
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// POST /api/settings/logo
router.post('/logo', requireRole('ADMIN'), uploadLogo.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const settings = await prisma.companySettings.findFirst();
        if (!settings) return res.status(404).json({ error: 'Settings not found' });
        const updated = await prisma.companySettings.update({
            where: { id: settings.id },
            data: { logoUrl: `/uploads/${req.file.filename}` }
        });
        res.json(updated);
    } catch (error) {
        console.error('Upload logo error:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

// GET /api/settings/backup - Export all data as JSON
router.get('/backup', requireRole('ADMIN'), async (req, res) => {
    try {
        const [
            clients,
            quotations,
            products,
            users,
            settings
        ] = await Promise.all([
            prisma.client.findMany(),
            prisma.quotation.findMany({ 
                include: { 
                    lineItems: {
                        include: { recommendations: true }
                    } 
                } 
            }),
            prisma.product.findMany(),
            prisma.user.findMany({ select: { id: true, email: true, role: true, name: true } }),
            prisma.companySettings.findFirst()
        ]);

        const backupData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            data: {
                clients,
                quotations,
                products,
                users,
                settings
            }
        };

        const fileName = `DAM-backup-${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(JSON.stringify(backupData, null, 2));
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ error: 'Failed to generate backup' });
    }
});

module.exports = router;
