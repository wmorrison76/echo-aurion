/**
 * SceneAdapter — generic adapter to sync a scene element's state with beat ticks.
 * Example usage: SceneAdapter(light, { every:4, action:()=>... })
 */
export class SceneAdapter {
  constructor(target, { every=1, action }={}){
    this.target = target;
    this.every = Math.max(1, every);
    this.action = action||(()=>{});
    this.lastTick = 0;
  }
  onTick(tick){
    if (tick<=0) return;
    if (tick % this.every === 0 && tick!==this.lastTick){
      this.lastTick = tick;
      this.action(this.target, tick);
    }
  }
}
export default SceneAdapter;
