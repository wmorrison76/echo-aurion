/**
 * RedPhoenix.SafePatch
 * Run mutating patch functions safely with try/catch and rollback data.
 * Works for in-memory objects; persistence is left to callers.
 */
export function run(patchFn, target){
  const snapshot = JSON.parse(JSON.stringify(target));
  try{
    const res = patchFn(target);
    return { ok:true, result: res, rollback: ()=> Object.assign(target, snapshot) };
  }catch(err){
    return { ok:false, error: String(err), rollback: ()=> Object.assign(target, snapshot) };
  }
}
