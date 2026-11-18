import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env";
import * as schema from "./schema";

export const pool = new pg.Pool({ connectionString: env.databaseUrl });
// Every connection runs in Bangladesh time so now(), defaults and logs agree.
pool.on("connect", (client) => {
  client.query("SET TIME ZONE 'Asia/Dhaka'").catch((err) => {
    console.error("Failed to set database time zone:", err);
  });
});

export const db = drizzle(pool, { schema });

export * from "./schema";
