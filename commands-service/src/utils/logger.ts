import { createLogger, transports, format } from "winston";

const logger = createLogger({
  level: "debug",
  format: format.simple(),
  transports: [new transports.Console()]
});

export default logger;
