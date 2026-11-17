import { env } from "./config/env";
import app from "./app";
import { logger } from "./utils/logger";

app.listen(env.port, (err) => {
  if (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
  logger.info({ port: env.port }, "Server listening");
});
