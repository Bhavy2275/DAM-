const { ZodError } = require('zod');

const validateBody = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (error) {
        // Catch ZodError by name as cross-module inheritance can fail in some ESM/CJS bundles
        if (error.name === 'ZodError' || error.errors) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: error.errors ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`) : error.message 
            });
        }
        return res.status(500).json({ error: 'Internal validation process failed', detail: error.message });
    }
};

module.exports = { validateBody };
