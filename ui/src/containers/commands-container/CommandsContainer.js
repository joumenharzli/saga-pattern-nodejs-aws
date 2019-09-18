import React, { useState, useEffect } from "react";
import axios from "axios";
import env from "../../enviroment";

import CommandsList from "../../components/commands-list/CommandsList";

function CommandsContainer() {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadCommands() {
    setLoading(true);
    const req = await axios.get(env.COMMANDS_URL + "/commands");
    setCommands(req.data);
    setLoading(false);
  }

  useEffect(() => {
    loadCommands();
  }, []);

  return (
    <div>
      <CommandsList
        commands={commands}
        loading={loading}
        reloadCommands={loadCommands}
      />
      <input type="button" onClick={loadCommands} value="Reload" />
    </div>
  );
}

export default CommandsContainer;
