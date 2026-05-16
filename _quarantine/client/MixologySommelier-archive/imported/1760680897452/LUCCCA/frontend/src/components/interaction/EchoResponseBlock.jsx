import React from "react";
import EchoAnimator from "./EchoAnimator";

const EchoResponseBlock = ({ response }) => {
  return (
    <EchoAnimator type="fade">
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow">
        <h4 className="text-md font-semibold mb-2">{response.title}</h4>
        <ul className="list-disc pl-5 text-sm">
          {response.dataPoints.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs italic text-gray-500">{response.notes}</p>
      </div>
    </EchoAnimator>
  );
};

export default EchoResponseBlock;