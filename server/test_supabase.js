const { Client } = require('pg');

const urls = [
  process.env.DATABASE_URL
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
