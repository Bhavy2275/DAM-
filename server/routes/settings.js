const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const multer = require('multer');
const path = require('path');
const prisma = new PrismaClient();

router.use(authenticate);

const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => cb(null, 'logo' + path.extname(file.originalname))
});
const uploadLogo = multer({ storage: logoStorage });

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
router.put('/', requireRole('ADMIN'), async (req, res) => {
    try {
        const settings = await prisma.companySettings.findFirst();
        if (!settings) return res.status(404).json({ error: 'Settings not found' });

        const updated = await prisma.companySettings.update({
            where: { id: settings.id },
            data: req.body
        });
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

module.exports = router;
