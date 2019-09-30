import { Request, Response, NextFunction } from "express";
import { commandService } from "services/command-service";

class CommandController {
  insert = (req: Request, res: Response, next: NextFunction) => {
    const command = {
      date: new Date().toISOString(),
      items: req.body.items,
      status: "IN_PROCESS"
    };

    commandService.insert(command, (err, data) => {
      if (err) return next(err);
      res
        .status(201)
        .header(
          "Location",
          req.protocol + "://" + req.hostname + "/" + req.url + "/" + data.id
        )
        .send(command);
    });
  };

  delete = (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    commandService.delete(id, err => {
      if (err) return next(err);
      res.status(200).end();
    });
  };

  findAll = (req: Request, res: Response, next: NextFunction) => {
    commandService.findAll((err, data) => {
      if (err) return next(err);
      res.send(data.Items);
    });
  };
}

const commandController = new CommandController();
export { commandController };
