/**
 * ColorPulseAdapter — toggles colors on beat for CSS variables or canvas elements.
 */
import { SceneAdapter } from "./SceneAdapter.js";
export class ColorPulseAdapter extends SceneAdapter {
  constructor(el, colors=["#fff","#f0f"], every=1){
    super(el,{every, action:(target,tick)=>{
      const color = colors[(tick/every)%colors.length|0];
      if (target.style) target.style.setProperty("--pulse-color", color);
    }});
  }
}
export default ColorPulseAdapter;
