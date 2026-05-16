import React, { useEffect, useRef, useState } from 'react';
import useUsers from '../state/useUsers';
const STORE_KEY = 'wb.chat.v1';
const load = ()=>{ try { return JSON.parse(localStorage.getItem(STORE_KEY)||'{"rooms":{"group":[]}}'); } catch { return {rooms:{group:[]}}; } };
const save = (data)=> localStorage.setItem(STORE_KEY, JSON.stringify(data));
export default function MessengerDock(){
  const { users = [] , me = { id:'me', name:'Me'} } = (typeof useUsers === 'function' ? useUsers() : {users:[], me:{id:'me',name:'Me'}});
  const [data, setData] = useState(load());
  const [room, setRoom] = useState('group');
  const [text, setText] = useState('');
  const listRef = useRef(null);
  useEffect(()=>{
    const onStorage = (e)=>{ if(e.key===STORE_KEY) setData(load()); };
    window.addEventListener('storage', onStorage);
    return ()=> window.removeEventListener('storage', onStorage);
  },[]);
  useEffect(()=>{ listRef.current?.lastElementChild?.scrollIntoView({block:'end'}); }, [data, room]);
  const send = ()=>{
    const msg = { ts: Date.now(), from: me?.name || 'Me', text: text.trim() };
    if(!msg.text) return;
    const next = load(); next.rooms[room] = next.rooms[room] || []; next.rooms[room].push(msg);
    save(next); setData(next); setText('');
  };
  const rooms = ['group', ...users.filter(u=>u.id!==me?.id).map(u=>`dm:${u.name||u.id}`)];
  return (
    <section className="wb-msg-dock" aria-label="Messenger">
      <header><strong>Messenger</strong><select value={room} onChange={e=>setRoom(e.target.value)}>{rooms.map(r=><option key={r} value={r}>{r==='group'?'Group':r.replace('dm:','DM: ')}</option>)}</select></header>
      <div className="wb-msg-list" ref={listRef}>
        {(data.rooms[room]||[]).map(m=>(
          <div className="wb-msg" key={m.ts}>
            <span className="wb-from">{m.from}</span><span className="wb-text">{m.text}</span>
            <time className="wb-time">{new Date(m.ts).toLocaleTimeString()}</time>
          </div>
        ))}
      </div>
      <footer><input value={text} onChange={e=>setText(e.target.value)} placeholder="Type message…" onKeyDown={e=>e.key==='Enter'&&send()}/><button onClick={send}>Send</button></footer>
    </section>
  );
}
