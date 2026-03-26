const { Client } = require('pg');

const urls = [
  'postgresql://postgres.pwuyokvfslndfrwgxijp:bk3GFg9PdGHNh4B1@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require',
  'postgresql://postgres.pwuyokvfslndfrwgxijp:bk3GFg9PdGHNh4B1@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require',
  'postgresql://postgres:bk3GFg9PdGHNh4B1@db.pwuyokvfslndfrwgxijp.supabase.co:5432/postgres?sslmode=require'
];

async function test() {
  for (const url of urls) {
    console.log(`Testing: ${url.replace(/:[^:@]+@/, ':****@')}`);
    const client = new Client({ 
      connectionString: url,
      ssl: { rejectUnauthorized: false }
    });
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
