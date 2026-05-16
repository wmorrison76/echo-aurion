import React from "react";

const Spinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500 border-b-2"></div>
  </div>
);

export default Spinner;