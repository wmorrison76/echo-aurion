/**
 * Reporter — collects and sends RedPhoenix events to an endpoint.
 */
export function createReporter(endpoint){
  return {
    send(event, payload){
      fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event,payload,ts:Date.now()})}).catch(e=>console.error("Reporter failed",e));
    }
  };
}
