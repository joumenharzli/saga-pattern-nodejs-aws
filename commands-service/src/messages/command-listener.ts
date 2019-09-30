import { series } from "async";
import { CommandActions } from "@ext/shared/actions";

import { sqsClient } from "@app/utils/aws-clients";
import env from "@app/env";
import logger from "@app/utils/logger";
import { commandRepository } from "@app/repositories";
import { commandMessages } from "./command-messages";

export class CommandListener {
  listen = () => {
    sqsClient.receiveMessage(
      {
        WaitTimeSeconds: 20,
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 1 * 60, // 1 min wait time for anyone else to process.
        MessageAttributeNames: ["Action"],
        QueueUrl: env.COMMANDS_QUEUE_URL
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
              case CommandActions.CREATE:
                series(
                  [
                    commandRepository.insert.bind(null, command),
                    commandMessages.send.bind(
                      null,
                      CommandActions.CREATED,
                      command
                    ),
                    commandRepository.delete.bind(null, message.ReceiptHandle)
                  ],
                  err => {
                    if (err) throw err;
                  }
                );
                break;
              case CommandActions.VALIDATE:
                series(
                  [
                    commandRepository.validate.bind(null, command),
                    commandMessages.send.bind(
                      null,
                      CommandActions.VALIDATED,
                      command
                    ),
                    commandRepository.delete.bind(null, message.ReceiptHandle)
                  ],
                  err => {
                    if (err) throw err;
                  }
                );
                break;
              case CommandActions.CANCEL:
                series(
                  [
                    commandRepository.cancel.bind(null, command),
                    commandMessages.send.bind(
                      null,
                      CommandActions.CANCELED,
                      command
                    ),
                    commandRepository.delete.bind(null, message.ReceiptHandle)
                  ],
                  err => {
                    if (err) throw err;
                  }
                );
                break;
              case CommandActions.DELETE:
                const commandId = JSON.parse(message.Body).id;
                series(
                  [
                    commandRepository.delete.bind(null, commandId),
                    commandMessages.send.bind(
                      null,
                      CommandActions.DELETED,
                      command
                    ),
                    commandRepository.delete.bind(null, message.ReceiptHandle)
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
    );
  };
}

const commandListener = new CommandListener();
export { commandListener };
