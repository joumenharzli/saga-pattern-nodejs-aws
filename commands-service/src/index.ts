import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";

import logger from "@app/utils/logger";
import env from "@app/env";

import { commandRoutes } from "@app/routes";

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(commandRoutes);

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send({ message: "Internal Server Error" });
});

app.listen(env.PORT, () => {
  logger.info("server started at http://localhost:" + env.PORT);
});
