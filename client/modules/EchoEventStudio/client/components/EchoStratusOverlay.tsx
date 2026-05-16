import React, { useMemo } from"react"
import { Html } from"@react-three/drei"
import { useEchoBuilderConfig } from"@/hooks/useEchoBuilderConfig" interface Props { objects: { id: string; position: [number, number, number]; glCode: string }[]
} export function EchoStratusOverlay({ objects }: Props) { const cfg = useEchoBuilderConfig("global") as any const rates = cfg?.EchoStratusRates || {} const totalCost = useMemo(() => { let cost = 0 for (const o of objects) cost += rates[o.glCode] || 0 return cost }, [objects, rates]) const color = totalCost > 5000 ?"red" : totalCost > 2000 ?"orange" :"green" return ( <Html position={[0, 2.7, 0]} className="pointer-events-none"> <div style={{ borderColor: color }} className="rounded border-2 bg-black/50 px-3 py-1 text-xs text-white" > 💰 Total Cost ≈ ${totalCost.toFixed(0)} </div> </Html> )
}
