const { ZodError } = require('zod');

const validateBody = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
            });
        }
        next(error);
    }
};

module.exports = { validateBody };
