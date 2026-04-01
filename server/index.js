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
const { requireRole } = require('./middleware/role');

const app = express();
const PORT = process.env.PORT || 5000;

// Custom CORS middleware for production reliability
const ALLOWED_ORIGINS = [
  'https://www.damlightings.com',
  'https://damlightings.com',
  'https://dam-omega.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Global Logger for Production Debugging
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' || true) { // Force log during outage
    console.log(`[REQ] ${new Date().toISOString()} ${req.method} ${req.url} - Origin: ${req.get('Origin') || 'No Origin'}`);
  }
  next();
});

// Robust CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1 || origin.includes('damlightings.com')) {
      callback(null, true);
    } else {
      console.warn(`[CORS REJECTED] ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin', 'X-DAM-API-Version'],
  exposedHeaders: ['X-DAM-API-Version']
}));

// Set API Version header for monitoring
app.use((req, res, next) => {
  res.header('X-DAM-API-Version', '3.1.2');
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
app.use('/api/auth', loginLimiter);
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/payments', paymentRoutes);

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

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug-db', authenticate, requireRole('ADMIN'), async (req, res) => {
    const prisma = require('./lib/prisma');
    try {
      const userCount = await prisma.user.count();
      res.json({ success: true, userCount, message: "Database is REACHABLE" });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Database unavailable' });
    }
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Unified graceful shutdown helper
async function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  try {
    const prisma = require('./lib/prisma');
    await prisma.$disconnect();
    console.log(`✅ ${signal} handled: Database connection closed.`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ ${signal} error during shutdown:`, err);
    process.exit(1);
  }
}

// OS signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function start() {
  // 1. Diagnostics: Basic Database connectivity test
  console.log('[STARTUP] Checking database connectivity...');
  try {
    const prisma = require('./lib/prisma');
    await prisma.$connect();
    console.log('✅ [STARTUP] Database connection successful');
  } catch (err) {
    console.error('❌ [STARTUP] FATAL: Database connection failed:', err);
    // Don't exit(1) yet, allow express to start to provide health check info if possible
  }

  // 2. Start Express immediately to avoid Railway start timeouts (502/Bad Gateway)
  app.listen(PORT, () => {
    console.log(`[STARTUP] DAM Lighting API v3.1.2 running on port ${PORT}`);
  });

  // 3. Background bootstrap (Admin setup)
  try {
    await runInit();
    console.log('✅ [STARTUP] Admin/bootstrap initialisation complete');
  } catch (e) {
    console.error('❌ [STARTUP] Admin/bootstrap initialisation failed:', e);
  }
}

start();
