import React from "react";

export default function PageRenderer({ activePage }) {
  const Placeholder = () => (
    <div className="p-8 text-xl">
      <p>// TODO: Build the <strong>{activePage}</strong> page</p>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#181818]">
      <Placeholder />
    </div>
  );
}
