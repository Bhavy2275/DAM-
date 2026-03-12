require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { runInit } = require('./prisma/init-admin');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const quotationRoutes = require('./routes/quotations');
const paymentRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow localhost and any *.vercel.app preview/production URL
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.startsWith('http://localhost')
    ) {
      return callback(null, true);
    }
    callback(new Error('CORS not allowed'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
// Serve uploaded files with proper CORS + CORP headers so images load in browser & PDF
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await runInit();
  } catch (e) {
    // If seeding fails, log the error but still start the server
    console.error('Admin/bootstrap initialisation failed:', e);
  }

  app.listen(PORT, () => {
    console.log(`DAM Lighting API running on port ${PORT}`);
  });
}

start();
