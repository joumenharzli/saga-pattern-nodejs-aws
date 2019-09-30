import { DynamoDB, SQS } from "aws-sdk";

const dynamoDbClient = new DynamoDB.DocumentClient();
const sqsClient = new SQS();

export { dynamoDbClient, sqsClient };
