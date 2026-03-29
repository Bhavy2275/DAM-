require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const rateLimit = require('express-rate-limit');
const { runInit } = require('./prisma/init-admin');

// Validate critical env vars at startup
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
    process.exit(1);
}

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const quotationRoutes = require('./routes/quotations');
const paymentRoutes = require('./routes/payments');

const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const { authenticate } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Custom CORS middleware for production reliability
const ALLOWED_ORIGINS = [
  'https://www.damlightings.com',
  'https://damlightings.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use((req, res, next) => {
  const origin = req.get('Origin');
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);

  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Origin');
  res.header('X-DAM-API-Version', '3.0.0');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
// Serve uploaded files with proper CORS + CORP headers so images load in browser & PDF
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});




// Routes
app.use('/api/auth', loginLimiter);   // 10 attempts / 15 min on ALL auth routes
app.use('/api', apiLimiter);          // 300 req/min on all other API routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/quotations', quotationRoutes);
// app.use('/api/payments', paymentRoutes); // Disabled until table exists

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// Health check with DB diagnosis
app.get('/api/health', async (req, res) => {
  const prisma = require('./lib/prisma');
  let dbStatus = 'testing';
  let dbError = null;
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (e) {
    console.error('Health check DB probe failed:', e);
    dbStatus = 'unavailable';
    dbError = { message: 'unavailable' };
  }

  const responseBody = {
    status: dbStatus === 'connected' ? 'ok' : 'unhealthy',
    database: dbStatus,
    dbError,
    timestamp: new Date().toISOString(),
  };

  if (dbStatus !== 'connected') {
    return res.status(503).json(responseBody);
  }

  res.json(responseBody);
});

app.get('/api/debug-db', authenticate, async (req, res) => {
  const prisma = require('./lib/prisma');
  try {
    const userCount = await prisma.user.count();
    res.json({ success: true, userCount, message: "Database is REACHABLE" });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Database unavailable' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  // Start listening immediately to avoid 502 Bad Gateway timeouts
  app.listen(PORT, () => {
    console.log(`DAM Lighting API running on port ${PORT}`);
  });

  try {
    // Run DB initialization in the background
    await runInit();
    console.log('✅ Admin/bootstrap initialisation complete');
  } catch (e) {
    console.error('❌ Admin/bootstrap initialisation failed:', e);
  }
}

start();
