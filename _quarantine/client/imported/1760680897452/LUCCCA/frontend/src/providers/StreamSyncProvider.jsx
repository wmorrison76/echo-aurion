//src/providers/StreamSyncProvider.jsx// ============================
import React, { createContext, useContext, useEffect, useState } from "react";

// [TEAM LOG: Streaming] - WebSocket connection manager for real-time data
const StreamContext = createContext();

export function StreamSyncProvider({ children }) {
const [streams, setStreams] = useState({});

useEffect(() => {
const ws = new WebSocket("wss://echo-stream.local");
ws.onmessage = (event) => {
try {
const { topic, data } = JSON.parse(event.data);
setStreams((prev) => ({ ...prev, [topic]: data }));
} catch (e) {
console.error("StreamSync Error:", e);
}
};
return () => ws.close();
}, []);

return (
<StreamContext.Provider value={{ streams, setStreams }}>
{children}
</StreamContext.Provider>
);
}

export const useStreamSync = () => useContext(StreamContext);