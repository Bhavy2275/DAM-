const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const prisma = new PrismaClient();

// ─── Cloudinary multer upload ──────────────────────────────────────────────
const { uploadProductFiles } = require('../utils/cloudinary');

// Fields config reused on POST and PUT
const productUpload = uploadProductFiles.fields([
    { name: 'polarDiagram', maxCount: 1 },
    { name: 'productImage', maxCount: 1 },
]);

router.use(authenticate);

// ─── Helpers ──────────────────────────────────────────────────────────────
function parseArr(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
}
function serializeProduct(p) {
    return {
        ...p,
        bodyColours:      parseArr(p.bodyColours),
        reflectorColours: parseArr(p.reflectorColours),
        colourTemps:      parseArr(p.colourTemps),
        beamAngles:       parseArr(p.beamAngles),
        cri:              parseArr(p.cri),
        customAttributes: parseArr(p.customAttributes),
    };
}

// Build the Prisma data object from request body + uploaded files
function buildData(body, files) {
    const data = {
        productCode:      body.productCode,
        layoutCode:       body.layoutCode || null,
        description:      body.description || '',
        basePrice:        parseFloat(body.basePrice) || 0,
        brandName:        body.brandName   || null,
        listPrice:        body.listPrice        != null ? parseFloat(body.listPrice)        : null,
        discountPercent:  body.discountPercent  != null ? parseFloat(body.discountPercent)  : null,
        bodyColours:      JSON.stringify(parseArr(body.bodyColours)),
        reflectorColours: JSON.stringify(parseArr(body.reflectorColours)),
        colourTemps:      JSON.stringify(parseArr(body.colourTemps)),
        beamAngles:       JSON.stringify(parseArr(body.beamAngles)),
        cri:              JSON.stringify(parseArr(body.cri)),
        customAttributes: JSON.stringify(parseArr(body.customAttributes)),
    };

    // Cloudinary gives back the public HTTPS URL in file.path
    if (files?.polarDiagram?.[0]) {
        data.polarDiagramUrl = files.polarDiagram[0].path;
    }
    if (files?.productImage?.[0]) {
        data.productImageUrl = files.productImage[0].path;
    }

    return data;
}

// GET /api/products
router.get('/', async (req, res) => {
    try {
        const { search, bodyColour, reflectorColour, cct, beamAngle, cri } = req.query;
        let products = await prisma.product.findMany({ orderBy: { productCode: 'asc' } });
        products = products.map(serializeProduct);

        if (search) {
            const s = search.toLowerCase();
            products = products.filter(p =>
                p.productCode.toLowerCase().includes(s) ||
                p.description.toLowerCase().includes(s) ||
                (p.layoutCode || '').toLowerCase().includes(s)
            );
        }
        if (bodyColour)      products = products.filter(p => p.bodyColours.includes(bodyColour));
        if (reflectorColour) products = products.filter(p => p.reflectorColours.includes(reflectorColour));
        if (cct)             products = products.filter(p => p.colourTemps.includes(cct));
        if (beamAngle)       products = products.filter(p => p.beamAngles.includes(beamAngle));
        if (cri)             products = products.filter(p => p.cri.includes(cri));

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

// ── Wraps multer so its errors surface in the terminal ──────────────────────
function runUpload(req, res, next) {
    productUpload(req, res, (err) => {
        if (err) {
            console.error('🔴 UPLOAD MIDDLEWARE ERROR:', err);
            return res.status(500).json({ error: `Upload failed: ${err.message}` });
        }
        next();
    });
}

// POST /api/products — accepts multipart/form-data with optional Cloudinary uploads
router.post('/', runUpload, async (req, res) => {
    try {
        const product = await prisma.product.create({ data: buildData(req.body, req.files) });
        res.status(201).json(serializeProduct(product));
    } catch (error) {
        console.error('Create product error:', error);
        if (error.code === 'P2002') return res.status(400).json({ error: 'Product code already exists' });
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT /api/products/:id — accepts multipart/form-data with optional Cloudinary uploads
router.put('/:id', runUpload, async (req, res) => {
    try {
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: buildData(req.body, req.files),
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

module.exports = router;
