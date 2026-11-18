import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const port = Number(process.env.PORT ?? 8080);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

type SameSite = "lax" | "strict" | "none";

function parseSameSite(value: string | undefined, fallback: SameSite): SameSite {
  const normalized = value?.trim().toLowerCase();
  return normalized === "lax" || normalized === "strict" || normalized === "none"
    ? normalized
    : fallback;
}

function parseOrigin(name: string, value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${name} must be a full URL such as https://app.example.com`);
  }
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const clientUrl = required("CLIENT_URL");
// Cross-site deployments (client and API on different sites) need SameSite=None.
// Local development and same-site deployments are safer with Lax.
const cookieSameSite = parseSameSite(
  process.env.COOKIE_SAME_SITE,
  nodeEnv === "production" ? "none" : "lax",
);

export const env = {
  port,
  nodeEnv,
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: process.env.JWT_SECRET ?? "",
  clientUrl,
  clientOrigin: parseOrigin("CLIENT_URL", clientUrl),
  cookieSameSite,
  // Browsers require Secure for SameSite=None, and it should always be on in production.
  cookieSecure: cookieSameSite === "none" || nodeEnv === "production",
};