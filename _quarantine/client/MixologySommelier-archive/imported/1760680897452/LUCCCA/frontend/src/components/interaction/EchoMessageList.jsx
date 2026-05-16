import React from "react";
import EchoResponseBlock from "./EchoResponseBlock";

const EchoMessageList = ({ messages }) => {
  return (
    <div className="space-y-3">
      {messages.map((msg, idx) => (
        <EchoResponseBlock key={idx} response={msg} />
      ))}
    </div>
  );
};

export default EchoMessageList;
