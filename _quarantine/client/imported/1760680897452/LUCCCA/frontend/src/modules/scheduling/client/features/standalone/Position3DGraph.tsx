import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EmployeeRow, DAYS, hoursForCell } from "@/lib/schedule";

interface Props {
  employees: EmployeeRow[];
  mode: "weekly" | "daily";
  dayIndex?: number; // 0..6 for daily
}

function aggregate(employees: EmployeeRow[], mode: "weekly"|"daily", dayIndex?: number) {
  const map = new Map<string, number>();
  for (const e of employees) {
    for (let i=0;i<7;i++){
      if (mode === "daily" && i !== (dayIndex ?? 0)) continue;
      const d = DAYS[i];
      const pos = e.shifts[d].position || e.role || "Unassigned";
      const h = hoursForCell(e.shifts[d]);
      map.set(pos, (map.get(pos) ?? 0) + h);
    }
  }
  return Array.from(map.entries()).sort((a,b)=> b[1]-a[1]);
}

export default function Position3DGraph({ employees, mode, dayIndex=0 }: Props){
  const data = aggregate(employees, mode, dayIndex);
  const width = Math.max(6, data.length * 1.2);
  return (
    <div className="h-72 rounded-lg border glass-panel">
      <Canvas camera={{ position: [0, 4, 8], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[5,5,5]} />
        {data.map(([pos, hours], idx)=>{
          const x = (idx - data.length/2) * 1.2;
          const height = Math.max(0.1, hours/4);
          const color = `hsl(${(idx*47)%360} 90% 60%)`;
          return (
            <group key={pos} position={[x, height/2, idx*0.1]}>
              <mesh>
                <boxGeometry args={[1, height, 1]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2}/>
              </mesh>
              <Html center distanceFactor={8}>
                <div className="text-xs bg-black/60 text-white px-2 py-1 rounded-md border border-white/10">
                  {pos}: {hours.toFixed(1)}h
                </div>
              </Html>
            </group>
          );
        })}
        <OrbitControls />
      </Canvas>
    </div>
  );
}
