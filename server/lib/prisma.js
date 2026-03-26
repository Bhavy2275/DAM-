const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['error'], // Keep logs minimal in production/dev for performance
    });
  }
  prisma = global.prisma;
}

module.exports = prisma;
