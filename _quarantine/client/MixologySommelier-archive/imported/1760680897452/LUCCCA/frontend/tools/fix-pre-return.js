const fs = require('fs');
const path = 'src/components/PastryLibrary/EchoCanvas.tsx';

const s = fs.readFileSync(path, 'utf8');
const i = s.indexOf('return (');
if (i < 0) {
  console.error('No "return (" found. Aborting.');
  process.exit(1);
}

// HEAD: everything BEFORE return(...)
let head = s.slice(0, i);

// 1) Remove illegal JSX closers that should never appear before return(...)
head = head
  .replace(/^\s*<\/div>.*$/gm, '')  // stray </div> lines
  .replace(/^\s*\);\s*$/gm, '');    // stray ); lines

// 2) Normalize the "Animate marching ants" useEffect block if present
head = head.replace(
  /\/\/\s*Animate marching ants[\s\S]*?useEffect\s*\([\s\S]*?\)\s*;\s*/m,
  `// Animate marching ants
useEffect(() => {
  const id = setInterval(() => composite(), 90);
  return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectionPath, zoom, layers]);
`
);

// Reassemble and write back
const out = head + s.slice(i);
fs.writeFileSync(path, out);
console.log('✅ Cleaned pre-return JSX and normalized the marching-ants effect.');
