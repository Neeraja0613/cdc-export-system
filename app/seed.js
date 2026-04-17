const { Client } = require('pg');

async function seed() {
  // ✅ dynamic import for faker
  const { faker } = await import('@faker-js/faker');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const res = await client.query("SELECT COUNT(*) FROM users");
  if (parseInt(res.rows[0].count) > 0) {
    console.log("Already seeded");
    await client.end();
    return;
  }

  for (let i = 0; i < 100000; i++) {
    const created = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const updated = new Date(created.getTime() + Math.random() * 1000000);

    await client.query(
      `INSERT INTO users(name,email,created_at,updated_at,is_deleted)
       VALUES($1,$2,$3,$4,$5)`,
      [
        faker.person.fullName(),   // ✅ updated faker syntax
        `${faker.internet.email()}_${i}`,
        created,
        updated,
        Math.random() < 0.015
      ]
    );
  }

  console.log("Seeding done");
  await client.end();
}

seed();