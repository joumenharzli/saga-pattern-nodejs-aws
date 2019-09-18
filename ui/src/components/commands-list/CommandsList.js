import React from "react";
import "./CommandsList.css";

function CommandsList(props) {
  return (
    <div>
      {props.loading ? (
        <b>Loading</b>
      ) : (
        <ul>
          {props.commands.map(command => (
            <li key={command.id}>
              <div>Id: {command.id}</div>
              <div>Date: {command.date}</div>
              <div>
                Stauts: <b>{command.status}</b>
              </div>
              <div>
                Items:
                <ul>
                  {command.items.map(item => (
                    <li>{item.id}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CommandsList;
