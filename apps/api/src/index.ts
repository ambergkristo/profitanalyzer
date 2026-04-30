import { createApp } from "./app.js";
import { createLogger } from "./logging/logger.js";

const port = Number(process.env.PORT ?? 3001);
const app = createApp();
const logger = createLogger(process.env);

app.listen(port, () => {
  logger.info("api_server_started", {
    port,
    url: `http://localhost:${port}`
  });
});
