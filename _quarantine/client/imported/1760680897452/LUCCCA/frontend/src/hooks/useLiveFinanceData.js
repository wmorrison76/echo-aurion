//src/hooks/useLiveFinanceData.js
// ============================
import { useEffect, useState } from "react";
import useStream from "./useStream";

// [TEAM LOG: Streaming] - Finance data from live stream
export default function useLiveFinanceData() {
const liveFinance = useStream("finance");
const [data, setData] = useState([]);

useEffect(() => {
if (liveFinance) setData(liveFinance);
}, [liveFinance]);

return data;
}