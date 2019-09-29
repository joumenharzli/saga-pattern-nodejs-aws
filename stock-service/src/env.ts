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
  PORT: process.env.PORT || 3001,
  PRODUCTS_QUEUE_URL: process.env.PRODUCTS_QUEUE_URL || "",
  ORCHESTRATOR_QUEUE_URL: process.env.ORCHESTRATOR_QUEUE_URL || "",
  PRODUCTS_TABLE_NAME: process.env.PRODUCTS_TABLE_NAME || "products",
  POLL_SQS_PERIOD: 1000 * 10 // poll every 10 seconds
};

export default env;
