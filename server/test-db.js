const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.mopehzmgrcrmevbafzsq:a12g6UMCq9lEPQuf@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});
prisma.$queryRawUnsafe('SELECT 1').then(() => console.log('CONNECTION OK')).catch(e => console.error('CONNECTION ERROR:', e.message)).finally(() => prisma.$disconnect());
