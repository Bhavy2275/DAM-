const { Client } = require('pg');

const urls = [
  'postgresql://postgres.pwuyokvfsindfrwgxijp:dam-lighting-bhavya@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require',
  'postgresql://postgres.pwuyokvfsindfrwgxijp:dam-lighting-bhavya@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require',
  'postgresql://postgres:dam-lighting-bhavya@db.pwuyokvfsindfrwgxijp.supabase.co:5432/postgres?sslmode=require'
];

async function test() {
  for (const url of urls) {
    console.log(`Testing: ${url.replace(/:[^:@]+@/, ':****@')}`);
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      console.log('✅ SUCCESS!');
      await client.end();
      process.exit(0);
    } catch (err) {
      console.error('❌ FAILED:', err.message);
    }
  }
}

test();
