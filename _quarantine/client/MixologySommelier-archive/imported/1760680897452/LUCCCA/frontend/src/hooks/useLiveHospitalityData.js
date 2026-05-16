//src/hooks/useLiveHospitalityData.js
// ============================
import { useEffect, useState } from "react";
import useStream from "./useStream";

// [TEAM LOG: Streaming] - Hospitality data from live stream
export default function useLiveHospitalityData() {
const liveHospitality = useStream("hospitality");
const [data, setData] = useState([]);

useEffect(() => {
if (liveHospitality) setData(liveHospitality);
}, [liveHospitality]);

return data;
}