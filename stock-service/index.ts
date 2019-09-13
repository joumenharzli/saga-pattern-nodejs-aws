import * as express from "express";
import { Request, Response, NextFunction } from "express";
import * as bodyParser from "body-parser";

import { DynamoDB } from "aws-sdk";
import * as uuid from "uuid/v4";
import { createLogger, transports, format } from "winston";

const PORT = process.env.PORT || 3000;

const dynamoDbClient = new DynamoDB.DocumentClient({
  region: "us-east-1",
  accessKeyId: "",
  secretAccessKey: ""
});

const logger = createLogger({
  level: "debug",
  format: format.simple(),
  transports: [new transports.Console()]
});

const app = express();

app.use(bodyParser.json());

app.post("/products", (req: Request, res: Response, next: NextFunction) => {
  const id = uuid();
  const item = {
    id: id,
    name: req.body.name,
    price: req.body.price,
    count: req.body.count
  };
  dynamoDbClient.put(
    {
      TableName: "products",
      Item: item
    },
    err => {
      if (err) return next(err);
      else
        res
          .status(201)
          .header(
            "Location",
            req.protocol + "://" + req.hostname + "/" + req.url + "/" + id
          )
          .send(item);
    }
  );
});

app.get("/products", (req: Request, res: Response, next: NextFunction) => {
  dynamoDbClient.scan(
    {
      TableName: "products"
    },
    (err, data) => {
      if (err) return next(err);
      else res.status(200).send(data.Items);
    }
  );
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send({ message: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log("server started at http://localhost:" + PORT);
});
