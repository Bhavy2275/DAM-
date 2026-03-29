require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error'], // Minimal logging for production stability
});

module.exports = prisma;
