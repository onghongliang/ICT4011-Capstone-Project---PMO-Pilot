import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

// Reads connection details from environment variables (see .env.example).
// Using a pool (not a single client) lets multiple requests query concurrently.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
