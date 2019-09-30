import { Router } from "express";
import { commandController } from "@app/controllers";

const commandRoutes = Router();

commandRoutes.post("/commands", commandController.insert);
commandRoutes.delete("/commands/:id", commandController.delete);
commandRoutes.get("/commands", commandController.findAll);

export { commandRoutes };
