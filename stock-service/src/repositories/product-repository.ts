import { forEachOf } from "async";

import env from "@app/env";
import { dynamoDbClient } from "@app/utils/aws-clients";

class ProductRepository {
  insert = (product, callback: (err: any, data: any) => void) => {
    dynamoDbClient.put(
      {
        TableName: env.PRODUCTS_TABLE_NAME,
        Item: product
      },
      callback
    );
  };

  delete = (productId: string, callback: (err: any, data: any) => void) => {
    dynamoDbClient.delete(
      {
        TableName: env.PRODUCTS_TABLE_NAME,
        Key: {
          id: productId
        }
      },
      callback
    );
  };

  findAll = (callback: (err: any, data: any) => void) => {
    dynamoDbClient.scan(
      {
        TableName: env.PRODUCTS_TABLE_NAME
      },
      callback
    );
  };

  batchDecreseCount = (
    products: any,
    callback: (err: any, data: any) => void
  ) => {
    const processedProducts = [];
    forEachOf(
      products,
      (item, _, itemCallback) => {
        this.decreaseCount(<string>item, err => {
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
                this.increaseCount(<string>item, err => {
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
  };

  increaseCount = (item, callback: (err: any, data: any) => void) => {
    dynamoDbClient.update(
      {
        TableName: env.PRODUCTS_TABLE_NAME,
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
  };

  decreaseCount = async (item, callback: (err: any, data: any) => void) => {
    await dynamoDbClient
      .update({
        TableName: env.PRODUCTS_TABLE_NAME,
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
  };
}

const productRepository = new ProductRepository();
export { productRepository };
