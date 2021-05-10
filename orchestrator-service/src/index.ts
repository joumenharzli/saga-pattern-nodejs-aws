import * as express from "express";
import { Request, Response, NextFunction } from "express";
import * as bodyParser from "body-parser";

import { SQS, config } from "aws-sdk";
import * as uuid from "uuid/v4";
import { createLogger, transports, format } from "winston";
import { series, forEachOf } from "async";

import * as dotenv from "dotenv";

import { CommandActions, ProductActions } from "../../shared/actions";

dotenv.config();

const PORT = process.env.PORT || 3003;
const ORCHESTRATOR_QUEUE_URL = process.env.ORCHESTRATOR_QUEUE_URL || "";

const COMMANDS_QUEUE_URL = process.env.COMMANDS_QUEUE_URL || "";
const PRODUCTS_QUEUE_URL = process.env.PRODUCTS_QUEUE_URL || "";

config.update({
  region: process.env.AWS_REGION || "us-east-1"
});

if (process.env.AWS_ACCESS_KEY_ID) {
  config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECREt_ACCESS_KEY || ""
  });
}

const sqsClient = new SQS();

const logger = createLogger({
  level: "debug",
  format: format.simple(),
  transports: [new transports.Console()]
});

const app = express();

app.use(bodyParser.json());

app.post("/commands", (req: Request, res: Response, next: NextFunction) => {
  const id = uuid();

  const command = {
    id: id,
    date: new Date().toISOString(),
    items: req.body.items,
    status: "IN_PROCESS"
  };

  sendMessageToCommandQueue(CommandActions.CREATE, command, err => {
    if (err) return next(err);
    res
      .status(201)
      .header(
        "Location",
        req.protocol + "://" + req.hostname + "/" + req.url + "/" + id
      )
      .send(command);
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
        QueueUrl: ORCHESTRATOR_QUEUE_URL
      },
      (err, data) => {
        if (err) throw err;
        if (data.Messages) {
          logger.debug("Received messages from queue");
          data.Messages.forEach(message => {
            const action = message.MessageAttributes["Action"].StringValue;
            logger.debug("Received action : " + action);

            const command = JSON.parse(message.Body);

            switch (action) {
              case CommandActions.CREATED:
                series(
                  [
                    sendMessageToProductQueue.bind(
                      null,
                      ProductActions.DEC_COUNT,
                      command
                    ),
                    deleteMessage.bind(null, message.ReceiptHandle)
                  ],
                  err => {
                    if (err) throw err;
                  }
                );
                break;

              case ProductActions.DEC_COUNT_SUCCEEDED:
                series(
                  [
                    sendMessageToCommandQueue.bind(
                      null,
                      CommandActions.VALIDATE,
                      command
                    ),
                    deleteMessage.bind(null, message.ReceiptHandle)
                  ],
                  err => {
                    if (err) throw err;
                  }
                );
                break;

              case CommandActions.VALIDATED:
                deleteMessage(message.ReceiptHandle, err => {
                  if (err) throw err;
                });
                break;

              case CommandActions.CANCELED:
                deleteMessage(message.ReceiptHandle, err => {
                  if (err) throw err;
                });
                break;

              case ProductActions.ROLLBACK_DEC_COUNT:
                series(
                  [
                    sendMessageToCommandQueue.bind(
                      null,
                      CommandActions.CANCEL,
                      command
                    ),
                    deleteMessage.bind(null, message.ReceiptHandle)
                  ],
                  err => {
                    if (err) throw err;
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
  1000 * 10 
  // poll every 10 seconds
);

function sendMessageToCommandQueue(
  action: string,
  command,
  callback: (err: any, data: any) => void
) {
  logger.debug("Message sent to command queue : " + action);

  const msg = {
    MessageAttributes: {
      Action: {
        DataType: "String",
        StringValue: action
      }
    },
    MessageBody: JSON.stringify(command),
    MessageDeduplicationId: uuid(),
    MessageGroupId: "Commands-" + command.id,
    QueueUrl: COMMANDS_QUEUE_URL
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
      QueueUrl: ORCHESTRATOR_QUEUE_URL,
      ReceiptHandle: receiptHandle
    },
    callback
  );
}

function sendMessageToProductQueue(
  action: string,
  command,
  callback: (err: any, data: any) => void
) {
  logger.debug("Message sent to product queue : " + action);

  const msg = {
    MessageAttributes: {
      Action: {
        DataType: "String",
        StringValue: action
      }
    },
    MessageBody: JSON.stringify(command),
    MessageDeduplicationId: uuid(),
    MessageGroupId: "Commands-" + command.id,
    QueueUrl: PRODUCTS_QUEUE_URL
  };
  sqsClient.sendMessage(msg, callback);
}
