import * as uuid from "uuid/v4";

import env from "@app/env";
import { commandRepository } from "@app/repositories";
import { commandListener } from "@app/messages";

class CommandService {
  constructor() {
    setInterval(() => commandListener.listen(), env.POLL_SQS_PERIOD);
  }

  insert = (command, callback) => {
    const id = uuid();
    command.id = id;
    command.date = new Date().toISOString();
    command.status = "IN_PROCESS";

    commandRepository.insert(command, err => {
      if (err) return callback(err, null);
      callback(null, command);
    });
  };

  delete = (id: string, callback) => {
    commandRepository.delete(id, callback);
  };

  findAll = callback => {
    commandRepository.findAll(callback);
  };
}

const commandService = new CommandService();
export { commandService };
