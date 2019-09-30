import { config } from "aws-sdk";

import * as dotenv from "dotenv";

dotenv.config();

config.update({
  region: process.env.AWS_REGION || "us-east-1"
});

if (process.env.AWS_ACCESS_KEY_ID) {
  config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECREt_ACCESS_KEY || ""
  });
}

const env = {
  PORT: process.env.PORT || 3002,
  COMMANDS_QUEUE_URL: process.env.COMMANDS_QUEUE_URL || "",
  ORCHESTRATOR_QUEUE_URL: process.env.ORCHESTRATOR_QUEUE_URL || "",
  COMMANDS_TABLE_NAME: process.env.COMMANDS_TABLE_NAME || "commands",
  POLL_SQS_PERIOD: 1000 * 10 // poll every 10 seconds
};

export default env;
