import * as express from "express";
import { Request, Response, NextFunction } from "express";
import * as bodyParser from "body-parser";

import { DynamoDB, SQS, config } from "aws-sdk";
import * as uuid from "uuid/v4";
import { createLogger, transports, format } from "winston";
import { series } from "async";

const PORT = process.env.PORT || 3001;

const QUEUE_URL =
  "https://sqs.us-east-1.amazonaws.com/417990783766/saga-poc-command.fifo";

const COMMANDS_TABLE_NAME = "commands";

config.update({
  region: "us-east-1",
  accessKeyId: "",
  secretAccessKey: ""
});

enum Actions {
  CREATE = "CREATE_COMMAND",
  DELETE = "DELETE_COMMAND",
  CREATED = "COMMAND_CREATED",
  DELETED = "COMMAND_DELETED"
}

const dynamoDbClient = new DynamoDB.DocumentClient();
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
    items: req.body.items
  };

  series(
    [
      insertCommand.bind(null, command),
      sendMessage.bind(null, Actions.CREATE, command)
    ],
    err => {
      if (err) return next(err);
      res
        .status(201)
        .header(
          "Location",
          req.protocol + "://" + req.hostname + "/" + req.url + "/" + id
        )
        .send(command);
    }
  );
});

app.delete(
  "/commands/:id",
  (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    series(
      [
        deleteCommand.bind(null, { id }),
        sendMessage.bind(null, Actions.DELETED, { id })
      ],
      err => {
        if (err) return next(err);
        res.status(200).end();
      }
    );
  }
);

app.get("/commands", (req: Request, res: Response, next: NextFunction) => {
  getCommands((err, data) => {
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

sqsClient.receiveMessage(
  {
    WaitTimeSeconds: 20,
    MaxNumberOfMessages: 10,
    VisibilityTimeout: 600, // 10 min wait time for anyone else to process.
    MessageAttributeNames: ["Action"],
    QueueUrl: QUEUE_URL
  },
  (err, data) => {
    if (err) throw err;
    logger.debug("Received data " + data);
    if (data.Messages)
      data.Messages.forEach(message => {
        const action = message.MessageAttributes["Action"].StringValue;
        logger.debug("Received Action : " + action);
        switch (action) {
          case Actions.CREATE:
            const command = JSON.parse(message.Body);
            series(
              [
                insertCommand.bind(null, command),
                sendMessage.bind(null, Actions.CREATED, command),
                deleteMessage.bind(null, message.ReceiptHandle)
              ],
              err => {
                if (err) throw err;
              }
            );
            break;
          case Actions.DELETE:
            const commandId = JSON.parse(message.Body).id;
            series(
              [
                deleteCommand.bind(null, commandId),
                sendMessage.bind(null, Actions.DELETED, command),
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
  }
);
function insertCommand(command, callback: (err: any, data: any) => void) {
  dynamoDbClient.put(
    {
      TableName: COMMANDS_TABLE_NAME,
      Item: command
    },
    callback
  );
}

function deleteCommand(
  commandId: string,
  callback: (err: any, data: any) => void
) {
  dynamoDbClient.delete(
    {
      TableName: COMMANDS_TABLE_NAME,
      Key: {
        id: {
          S: commandId
        }
      }
    },
    callback
  );
}

function getCommands(callback: (err: any, data: any) => void) {
  dynamoDbClient.scan(
    {
      TableName: COMMANDS_TABLE_NAME
    },
    callback
  );
}

function sendMessage(
  action: string,
  command,
  callback: (err: any, data: any) => void
) {
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
    QueueUrl: QUEUE_URL
  };
  sqsClient.sendMessage(msg, callback);
}

function deleteMessage(
  receiptHandle: string,
  callback: (err: any, data: any) => void
) {
  sqsClient.deleteMessage(
    {
      QueueUrl: QUEUE_URL,
      ReceiptHandle: receiptHandle
    },
    callback
  );
}
