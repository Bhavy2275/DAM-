const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Single multer instance — folder chosen per field name
const uploadProductFiles = multer({
    storage: new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => {
            const isPolar = file.fieldname === 'polarDiagram';
            return {
                folder:          isPolar ? 'dam-lighting/polar-diagrams' : 'dam-lighting/product-images',
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg', 'pdf'],
                transformation:  [{ quality: 'auto', fetch_format: 'auto' }],
                // Unique filename to avoid collisions
                public_id: `${file.fieldname}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            };
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = { cloudinary, uploadProductFiles };
