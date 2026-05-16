import { useState } from 'react'
import * as THREE from 'three'
import type { PlannerScene } from './PlannerSchema'
import { isPlannerScene } from './PlannerSchema'
import { PlannerToStudioBridge } from './PlannerToStudioBridge' export function usePlannerScene(json: PlannerScene | string) { const [error, setError] = useState<string | null>(null) const [status, setStatus] = useState<string>('idle') function parse(input: PlannerScene | string): PlannerScene | null { if (typeof input === 'string') { try { const obj = JSON.parse(input) if (isPlannerScene(obj)) return obj setError('Invalid PlannerScene schema') return null } catch (e: any) { setError(`JSON parse error: ${e.message}`) return null } } return input } async function build(scene: THREE.Scene, input: PlannerScene | string) { setStatus('parsing') const data = parse(input) if (!data) return setStatus('importing') const bridge = new PlannerToStudioBridge(scene, { onProgress: (m) => setStatus(m), onError: (e) => setError(e.message), }) await bridge.import(data) setStatus('ready') } return { status, error, build }
}
