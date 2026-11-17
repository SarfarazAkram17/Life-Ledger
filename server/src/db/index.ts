import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env";
import * as schema from "./schema";

export const pool = new pg.Pool({ connectionString: env.databaseUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
