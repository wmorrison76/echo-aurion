/** * 3D Labor Surface Visualizer * Displays labor % trends as 3D surface using Three.js */ import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
interface CellData {
  outlet: string;
  labor_pct: number;
}
interface LaborSurface3DProps {
  org_id: string;
} /** * 3D Surface component using Three.js */
function Surface({ data }: { data: CellData[] }) {
  if (!data || data.length === 0) {
    return (
      <mesh position={[0, 0, 0]}>
        {" "}
        <boxGeometry args={[1, 1, 1]} />{" "}
        <meshStandardMaterial color="#00ffff" wireframe />{" "}
      </mesh>
    );
  }
  return (
    <group>
      {" "}
      {data.map((d, i) => {
        const height = Math.max(0.1, d.labor_pct / 50);
        const hue = Math.max(0, 120 - d.labor_pct * 2);
        const color = `hsl(${hue}, 100%, 50%)`;
        return (
          <mesh
            key={i}
            position={[(i % 5) * 2 - 4, height, Math.floor(i / 5) * 2 - 2]}
          >
            {" "}
            <boxGeometry args={[1.8, height, 1.8]} />{" "}
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.3}
            />{" "}
          </mesh>
        );
      })}{" "}
      {/* Grid plane */}{" "}
      <mesh position={[0, -0.1, 0]} rotation={[0, 0, 0]}>
        {" "}
        <planeGeometry args={[12, 12]} />{" "}
        <meshStandardMaterial color="#1a1a2e" wireframe opacity={0.3} />{" "}
      </mesh>{" "}
    </group>
  );
}
export const LaborSurface3D: React.FC<LaborSurface3DProps> = ({ org_id }) => {
  const [data, setData] = React.useState<CellData[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    fetchData();
  }, [org_id]);
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org-summary?org_id=${org_id}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const summaryData = await res.json();
      setData(summaryData);
    } catch (err) {
      console.error("Failed to fetch 3D data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <Card className="shadow-lg">
        {" "}
        <CardContent className="p-6">
          {" "}
          <div className="text-center text-muted-foreground">
            Loading 3D visualization...
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  return (
    <Card className="shadow-2xl bg-surface border-cyan-500/20 overflow-hidden">
      {" "}
      <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600">
        {" "}
        <h3 className="text-lg font-semibold text-white">
          {" "}
          Labor % Surface (3D Trend){" "}
        </h3>{" "}
        <p className="text-xs text-cyan-100 mt-1">
          {" "}
          Height = Labor %, Color = Green (good) to Red (high){" "}
        </p>{" "}
      </CardHeader>{" "}
      <CardContent style={{ height: 400, padding: 0 }}>
        {" "}
        <Canvas
          camera={{ position: [8, 8, 8], fov: 75 }}
          style={{ background: "#0f172a" }}
        >
          {" "}
          <ambientLight intensity={0.6} />{" "}
          <pointLight position={[10, 10, 10]} intensity={1} />{" "}
          <pointLight position={[-10, -10, -10]} intensity={0.5} />{" "}
          <Surface data={data} />{" "}
          <OrbitControls
            autoRotate
            autoRotateSpeed={2}
            enableZoom
            enablePan
            minDistance={3}
            maxDistance={50}
          />{" "}
        </Canvas>{" "}
      </CardContent>{" "}
      <div className="p-3 bg-slate-800 border-t border-border text-xs text-gray-400">
        {" "}
        <div>Drag to rotate • Scroll to zoom • Right-click to pan</div>{" "}
        <button
          onClick={fetchData}
          className="text-cyan-400 hover:text-cyan-300 underline mt-1"
        >
          {" "}
          Refresh{" "}
        </button>{" "}
      </div>{" "}
    </Card>
  );
};
export default LaborSurface3D;
