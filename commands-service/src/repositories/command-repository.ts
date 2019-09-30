import env from "@app/env";
import { dynamoDbClient } from "@app/utils/aws-clients";

class CommandRepository {
  insert(command, callback: (err: any, data: any) => void) {
    dynamoDbClient.put(
      {
        TableName: env.COMMANDS_TABLE_NAME,
        Item: command
      },
      callback
    );
  }

  validate(command, callback: (err: any, data: any) => void) {
    dynamoDbClient.update(
      {
        TableName: env.COMMANDS_TABLE_NAME,
        Key: {
          id: command.id
        },
        UpdateExpression: "set #s = :val",
        ExpressionAttributeNames: {
          "#s": "status"
        },
        ExpressionAttributeValues: {
          ":val": "VALIDATED"
        }
      },
      callback
    );
  }

  cancel(command, callback: (err: any, data: any) => void) {
    dynamoDbClient.update(
      {
        TableName: env.COMMANDS_TABLE_NAME,
        Key: {
          id: command.id
        },
        UpdateExpression: "set #s = :val",
        ExpressionAttributeNames: {
          "#s": "status"
        },
        ExpressionAttributeValues: {
          ":val": "CANCELED"
        }
      },
      callback
    );
  }

  delete(commandId: string, callback: (err: any, data: any) => void) {
    dynamoDbClient.delete(
      {
        TableName: env.COMMANDS_TABLE_NAME,
        Key: {
          id: {
            S: commandId
          }
        }
      },
      callback
    );
  }

  findAll(callback: (err: any, data: any) => void) {
    dynamoDbClient.scan(
      {
        TableName: env.COMMANDS_TABLE_NAME
      },
      callback
    );
  }
}

const commandRepository = new CommandRepository();
export { commandRepository };
