/**
 * Logger for RedPhoenix — structured JSON logs to console or file.
 */
export function log(event, detail={}){
  const msg = { ts: Date.now(), event, detail };
  console.log(JSON.stringify(msg));
}
