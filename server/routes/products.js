const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

router.use(authenticate);

// Multer setup for product images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/products');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${req.params.id}-${file.fieldname}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function parseArr(str) {
    try { return JSON.parse(str || '[]'); } catch { return []; }
}
function serializeProduct(p) {
    return {
        ...p,
        bodyColours: parseArr(p.bodyColours),
        reflectorColours: parseArr(p.reflectorColours),
        colourTemps: parseArr(p.colourTemps),
        beamAngles: parseArr(p.beamAngles),
        cri: parseArr(p.cri),
        customAttributes: parseArr(p.customAttributes),
    };
}

// GET /api/products
router.get('/', async (req, res) => {
    try {
        const { search, bodyColour, reflectorColour, cct, beamAngle, cri } = req.query;
        let products = await prisma.product.findMany({ orderBy: { productCode: 'asc' } });

        // Parse JSON arrays and filter
        products = products.map(serializeProduct);

        if (search) {
            const s = search.toLowerCase();
            products = products.filter(p =>
                p.productCode.toLowerCase().includes(s) ||
                p.description.toLowerCase().includes(s) ||
                (p.layoutCode || '').toLowerCase().includes(s)
            );
        }
        if (bodyColour) products = products.filter(p => p.bodyColours.includes(bodyColour));
        if (reflectorColour) products = products.filter(p => p.reflectorColours.includes(reflectorColour));
        if (cct) products = products.filter(p => p.colourTemps.includes(cct));
        if (beamAngle) products = products.filter(p => p.beamAngles.includes(beamAngle));
        if (cri) products = products.filter(p => p.cri.includes(cri));

        res.json(products);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
    try {
        const product = await prisma.product.findUnique({ where: { id: req.params.id } });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(serializeProduct(product));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// POST /api/products
router.post('/', async (req, res) => {
    try {
        const { productCode, layoutCode, description, basePrice, bodyColours, reflectorColours, colourTemps, beamAngles, cri, customAttributes } = req.body;
        const product = await prisma.product.create({
            data: {
                productCode,
                layoutCode: layoutCode || null,
                description,
                basePrice: parseFloat(basePrice) || 0,
                bodyColours: JSON.stringify(bodyColours || []),
                reflectorColours: JSON.stringify(reflectorColours || []),
                colourTemps: JSON.stringify(colourTemps || []),
                beamAngles: JSON.stringify(beamAngles || []),
                cri: JSON.stringify(cri || []),
                customAttributes: JSON.stringify(customAttributes || []),
            }
        });
        res.status(201).json(serializeProduct(product));
    } catch (error) {
        console.error('Create product error:', error);
        if (error.code === 'P2002') return res.status(400).json({ error: 'Product code already exists' });
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
    try {
        const { productCode, layoutCode, description, basePrice, bodyColours, reflectorColours, colourTemps, beamAngles, cri, customAttributes } = req.body;
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: {
                productCode,
                layoutCode: layoutCode || null,
                description,
                basePrice: parseFloat(basePrice) || 0,
                bodyColours: JSON.stringify(bodyColours || []),
                reflectorColours: JSON.stringify(reflectorColours || []),
                colourTemps: JSON.stringify(colourTemps || []),
                beamAngles: JSON.stringify(beamAngles || []),
                cri: JSON.stringify(cri || []),
                customAttributes: JSON.stringify(customAttributes || []),
            }
        });
        res.json(serializeProduct(product));
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
    try {
        await prisma.product.delete({ where: { id: req.params.id } });
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// POST /api/products/:id/polar  — upload polar diagram
router.post('/:id/polar', upload.single('polar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const url = `/uploads/products/${req.file.filename}`;
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: { polarDiagramUrl: url }
        });
        res.json({ url, product: serializeProduct(product) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload polar diagram' });
    }
});

// POST /api/products/:id/image  — upload product photo
router.post('/:id/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const url = `/uploads/products/${req.file.filename}`;
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: { productImageUrl: url }
        });
        res.json({ url, product: serializeProduct(product) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload product image' });
    }
});

module.exports = router;
