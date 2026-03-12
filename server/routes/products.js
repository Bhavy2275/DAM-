const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

router.use(authenticate);

// ─── Multer: single uploads dir with field-type prefix in filename ─────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/products');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const prefix = file.fieldname === 'polarDiagram' ? 'polar' : 'img';
        const id = req.params.id || 'new';
        cb(null, `${id}-${prefix}-${Date.now()}${ext}`);
    }
});
const fileFilter = (req, file, cb) => {
    const ok = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(ok.includes(ext) ? null : new Error(`File type ${ext} not allowed`), ok.includes(ext));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Fields config used on POST and PUT
const productUpload = upload.fields([
    { name: 'polarDiagram', maxCount: 1 },
    { name: 'productImage', maxCount: 1 },
]);

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
function buildData(body, files) {
    return {
        productCode:      body.productCode,
        layoutCode:       body.layoutCode || null,
        description:      body.description || '',
        basePrice:        parseFloat(body.basePrice) || 0,
        bodyColours:      JSON.stringify(parseArr(body.bodyColours)),
        reflectorColours: JSON.stringify(parseArr(body.reflectorColours)),
        colourTemps:      JSON.stringify(parseArr(body.colourTemps)),
        beamAngles:       JSON.stringify(parseArr(body.beamAngles)),
        cri:              JSON.stringify(parseArr(body.cri)),
        customAttributes: JSON.stringify(parseArr(body.customAttributes)),
        ...(files?.polarDiagram?.[0]
            ? { polarDiagramUrl: `/uploads/products/${files.polarDiagram[0].filename}` }
            : {}),
        ...(files?.productImage?.[0]
            ? { productImageUrl: `/uploads/products/${files.productImage[0].filename}` }
            : {}),
    };
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

// POST /api/products — accepts JSON or multipart/form-data (with optional files)
router.post('/', productUpload, async (req, res) => {
    try {
        const product = await prisma.product.create({ data: buildData(req.body, req.files) });
        res.status(201).json(serializeProduct(product));
    } catch (error) {
        console.error('Create product error:', error);
        if (error.code === 'P2002') return res.status(400).json({ error: 'Product code already exists' });
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT /api/products/:id — accepts JSON or multipart/form-data (with optional files)
router.put('/:id', productUpload, async (req, res) => {
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

// Legacy: POST /api/products/:id/polar — still supported
router.post('/:id/polar', upload.single('polar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const url = `/uploads/products/${req.file.filename}`;
        const product = await prisma.product.update({ where: { id: req.params.id }, data: { polarDiagramUrl: url } });
        res.json({ url, product: serializeProduct(product) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload polar diagram' });
    }
});

// Legacy: POST /api/products/:id/image — still supported
router.post('/:id/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const url = `/uploads/products/${req.file.filename}`;
        const product = await prisma.product.update({ where: { id: req.params.id }, data: { productImageUrl: url } });
        res.json({ url, product: serializeProduct(product) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload product image' });
    }
});

module.exports = router;
