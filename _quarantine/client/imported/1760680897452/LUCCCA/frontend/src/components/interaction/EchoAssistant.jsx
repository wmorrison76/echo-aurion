// File: src/components/EchoCore/components/interaction/EchoAssistant.jsx

import React, { useState } from "react";
import EchoResponseBlock from "./EchoResponseBlock";
import UIActionButton from "./UIActionButton";

const EchoAssistant = () => {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState(null);

  const handleAsk = () => {
    // Mocked AI response for now
    setResponse({
      title: "Echo Response",
      dataPoints: ["Item 1", "Item 2", "Item 3"],
      notes: "Generated response from Echo AI.",
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-3">Ask Echo</h3>
      <textarea
        className="w-full p-2 border border-gray-300 rounded mb-2"
        rows={3}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type your question for Echo..."
      />
      <UIActionButton label="Ask" onClick={handleAsk} />
      {response && <EchoResponseBlock response={response} />}
    </div>
  );
};

export default EchoAssistant;