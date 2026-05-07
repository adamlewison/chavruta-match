import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function resetDatabase() {
  console.log("🗑️  Resetting database...");

  try {
    await db.execute(sql`DROP SCHEMA public CASCADE`);
    console.log("✅ Dropped public schema");

    await db.execute(sql`CREATE SCHEMA public`);
    console.log("✅ Created public schema");

    await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO CURRENT_USER`);
    console.log("✅ Restored schema permissions");

    // Install required extensions
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`);
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS cube`);
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS earthdistance`);
    console.log("✅ Installed PostgreSQL extensions");

    console.log("\n✨ Database reset complete!");
    console.log("📝 Run migrations with: npm run db:push");
    console.log("🌱 Seed data with: npm run db:seed");
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();
