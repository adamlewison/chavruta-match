import { client } from "@/lib/db";

async function main() {
  console.log("Installing PostgreSQL extensions...");
  
  await client.unsafe(`CREATE EXTENSION IF NOT EXISTS postgis;`);
  console.log("✓ postgis installed");
  
  await client.unsafe(`CREATE EXTENSION IF NOT EXISTS cube;`);
  console.log("✓ cube installed");
  
  await client.unsafe(`CREATE EXTENSION IF NOT EXISTS earthdistance;`);
  console.log("✓ earthdistance installed");
  
  console.log("All extensions installed successfully!");
  await client.end();
}

main().catch((err) => {
  console.error("Error installing extensions:", err);
  process.exit(1);
});
