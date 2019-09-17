import * as express from "express";
import { Request, Response, NextFunction } from "express";
import * as bodyParser from "body-parser";

import { DynamoDB, SQS, config } from "aws-sdk";
import * as uuid from "uuid/v4";
import { createLogger, transports, format } from "winston";
import { series, forEachOf } from "async";

import * as dotenv from "dotenv";

import { ProductActions } from "../../shared/actions";

dotenv.config();

const PORT = process.env.PORT || 3002;
const QUEUE_URL = process.env.QUEUE_URL || "";
const ORCHESTRATOR_QUEUE_URL = process.env.ORCHESTRATOR_QUEUE_URL || "";

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME || "products";

config.update({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_SECREt_ACCESS_KEY || ""
});

const dynamoDbClient = new DynamoDB.DocumentClient();
const sqsClient = new SQS();

const logger = createLogger({
  level: "debug",
  format: format.simple(),
  transports: [new transports.Console()]
});

const app = express();

app.use(bodyParser.json());

app.post("/products", (req: Request, res: Response, next: NextFunction) => {
  const id = uuid();

  const product = {
    id: id,
    name: req.body.name,
    price: req.body.price,
    count: req.body.count
  };

  insertProduct(product, err => {
    if (err) return next(err);
    res
      .status(201)
      .header(
        "Location",
        req.protocol + "://" + req.hostname + "/" + req.url + "/" + id
      )
      .send(product);
  });
});

app.delete(
  "/products/:id",
  (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    deleteProduct(id, err => {
      if (err) return next(err);
      res.status(200).end();
    });
  }
);

app.get("/products", (req: Request, res: Response, next: NextFunction) => {
  getProducts((err, data) => {
    if (err) return next(err);
    res.send(data);
  });
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send({ message: "Internal Server Error" });
});

app.listen(PORT, () => {
  logger.info("server started at http://localhost:" + PORT);
});

setInterval(
  () =>
    sqsClient.receiveMessage(
      {
        WaitTimeSeconds: 20,
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 1 * 60, // 1 min wait time for anyone else to process.
        MessageAttributeNames: ["Action"],
        QueueUrl: QUEUE_URL
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
                const command = JSON.parse(message.Body);
                const products = command.items;

                series(
                  [
                    decreseProductsCount.bind(null, products),
                    sendMessage.bind(
                      null,
                      ProductActions.DEC_COUNT_SUCCEEDED,
                      command
                    ),
                    deleteMessage.bind(null, message.ReceiptHandle)
                  ],
                  err => {
                    if (err) {
                      if (err["code"] === "ConditionalCheckFailedException") {
                        deleteMessage(message.ReceiptHandle, () => {
                          sendMessage(
                            ProductActions.ROLLBACK_DEC_COUNT,
                            command,
                            () => {}
                          );
                        });
                      } else {
                        sendMessage(
                          ProductActions.ROLLBACK_DEC_COUNT,
                          command,
                          () => {}
                        );
                      }
                      throw err;
                    }
                  }
                );
                break;
              default:
                return;
            }
          });
        } else {
          logger.debug("Empty response received from queue");
        }
      }
    ),
  1000 * 30
);

function decreseProductsCount(
  products: any,
  callback: (err: any, data: any) => void
) {
  const processedProducts = [];
  forEachOf(
    products,
    (item, _, itemCallback) => {
      decreaseProductCount(<string>item, err => {
        if (err) itemCallback(err);
        else {
          processedProducts.push(item);
          itemCallback();
        }
      });
    },
    err => {
      if (err) {
        if (err["code"] === "ConditionalCheckFailedException") {
          forEachOf(
            processedProducts,
            (item, _, itemCallback) => {
              increaseProductCount(<string>item, err => {
                if (err) itemCallback(err);
                else itemCallback();
              });
            },
            rollbackErr => {
              if (rollbackErr) callback(rollbackErr, null);
              else callback(err, null);
            }
          );
        } else {
          callback(err, null);
        }
      } else callback(null, processedProducts);
    }
  );
}

function insertProduct(product, callback: (err: any, data: any) => void) {
  dynamoDbClient.put(
    {
      TableName: PRODUCTS_TABLE_NAME,
      Item: product
    },
    callback
  );
}

function deleteProduct(
  productId: string,
  callback: (err: any, data: any) => void
) {
  dynamoDbClient.delete(
    {
      TableName: PRODUCTS_TABLE_NAME,
      Key: {
        id: {
          S: productId
        }
      }
    },
    callback
  );
}

function getProducts(callback: (err: any, data: any) => void) {
  dynamoDbClient.scan(
    {
      TableName: PRODUCTS_TABLE_NAME
    },
    callback
  );
}

function increaseProductCount(item, callback: (err: any, data: any) => void) {
  dynamoDbClient.update(
    {
      TableName: PRODUCTS_TABLE_NAME,
      Key: { id: item.id },
      UpdateExpression: "set #c = #c + :val",
      ExpressionAttributeNames: {
        "#c": "count"
      },
      ExpressionAttributeValues: {
        ":val": item.count
      }
    },
    callback
  );
}

async function decreaseProductCount(
  item,
  callback: (err: any, data: any) => void
) {
  await dynamoDbClient
    .update({
      TableName: PRODUCTS_TABLE_NAME,
      Key: { id: item.id },
      UpdateExpression: "set #c = #c - :val",
      ConditionExpression: "#c >= :val",
      ExpressionAttributeNames: {
        "#c": "count"
      },
      ExpressionAttributeValues: {
        ":val": item.count
      }
    })
    .promise()
    .then(data => callback(null, data))
    .catch(ex => callback(ex, null));
}

function sendMessage(
  action: string,
  product,
  callback: (err: any, data: any) => void
) {
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
    QueueUrl: ORCHESTRATOR_QUEUE_URL
  };
  sqsClient.sendMessage(msg, callback);
}

function deleteMessage(
  receiptHandle: string,
  callback: (err: any, data: any) => void
) {
  logger.debug("Processed message deleted");

  sqsClient.deleteMessage(
    {
      QueueUrl: QUEUE_URL,
      ReceiptHandle: receiptHandle
    },
    callback
  );
}
