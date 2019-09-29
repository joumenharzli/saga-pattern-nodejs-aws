import { series } from "async";
import { ProductActions } from "@ext/shared/actions";

import { sqsClient } from "@app/utils/aws-clients";
import env from "@app/env";
import logger from "@app/utils/logger";
import { productRepository } from "@app/repositories";
import productMessages from "./product-messages";

export class ProductListener {
  listen = () => {
    sqsClient.receiveMessage(
      {
        WaitTimeSeconds: 20,
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 1 * 60, // 1 min wait time for anyone else to process.
        MessageAttributeNames: ["Action"],
        QueueUrl: env.PRODUCTS_QUEUE_URL
      },
      (err, data) => {
        if (err) throw err;
        if (data.Messages) {
          logger.debug("Received messages from queue");
          data.Messages.forEach(message => {
            const action = message.MessageAttributes["Action"].StringValue;
            logger.debug("Received action : " + action);
            switch (action) {
              case ProductActions.DEC_COUNT:
                this.decreaseProductsCount(message);
                break;
              default:
                return;
            }
          });
        } else {
          logger.debug("Empty response received from queue");
        }
      }
    );
  };

  private decreaseProductsCount(message) {
    const command = JSON.parse(message.Body);
    const products = command.items;
    series(
      [
        productRepository.batchDecreseCount.bind(null, products),
        productMessages.send.bind(
          null,
          ProductActions.DEC_COUNT_SUCCEEDED,
          command
        ),
        productMessages.delete.bind(null, message.ReceiptHandle)
      ],
      err => {
        if (err) {
          if (err["code"] === "ConditionalCheckFailedException") {
            productMessages.delete(message.ReceiptHandle, () => {
              productMessages.send(
                ProductActions.ROLLBACK_DEC_COUNT,
                command,
                () => {}
              );
            });
          } else {
            productMessages.send(
              ProductActions.ROLLBACK_DEC_COUNT,
              command,
              () => {}
            );
          }
          throw err;
        }
      }
    );
  }
}

const productListener = new ProductListener();
export { productListener };
