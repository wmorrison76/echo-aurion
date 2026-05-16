const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 9091 }, () => {
  console.log('Stub WS listening on ws://localhost:9091');
});
wss.on('connection', ws => {
  ws.on('message', msg => { /* ignore or echo */ });
  ws.send(JSON.stringify({ ok:true, note:'stub-server-connected' }));
});
