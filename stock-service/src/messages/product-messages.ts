import uuid = require("uuid");

import env from "@app/env";
import logger from "@app/utils/logger";
import { sqsClient } from "@app/utils/aws-clients";

class ProductMessages {
  send = (action: string, product, callback: (err: any, data: any) => void) => {
    logger.debug("Sending message with action " + action);

    const msg = {
      MessageAttributes: {
        Action: {
          DataType: "String",
          StringValue: action
        }
      },
      MessageBody: JSON.stringify(product),
      MessageDeduplicationId: uuid(),
      MessageGroupId: "Products-" + product.id,
      QueueUrl: env.ORCHESTRATOR_QUEUE_URL
    };
    sqsClient.sendMessage(msg, callback);
  };

  delete = (receiptHandle: string, callback: (err: any, data: any) => void) => {
    logger.debug("Processed message deleted");

    sqsClient.deleteMessage(
      {
        QueueUrl: env.PRODUCTS_QUEUE_URL,
        ReceiptHandle: receiptHandle
      },
      callback
    );
  };
}

const productMessages = new ProductMessages();

export default productMessages;
