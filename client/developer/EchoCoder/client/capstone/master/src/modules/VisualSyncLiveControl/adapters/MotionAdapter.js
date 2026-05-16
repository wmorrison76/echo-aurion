/**
 * MotionAdapter — applies simple CSS class toggles for animations on beat.
 */
import { SceneAdapter } from "./SceneAdapter.js";
export class MotionAdapter extends SceneAdapter {
  constructor(el, cls="beat", every=1){
    super(el,{every, action:(target)=>{
      if (!target.classList) return;
      target.classList.add(cls);
      setTimeout(()=> target.classList.remove(cls), 300);
    }});
  }
}
export default MotionAdapter;
