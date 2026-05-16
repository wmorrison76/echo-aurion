const fs = require('fs');
const file = 'src/components/PastryLibrary/EchoCanvas.tsx';
const s = fs.readFileSync(file, 'utf8');

const start = s.indexOf('\n// Animate marching ants');
if (start < 0) {
  console.error('Could not find "// Animate marching ants"');
  process.exit(1);
}
const jsxStart = s.indexOf('\nreturn (', start);
if (jsxStart < 0) {
  console.error('Could not find "return (" after the marching-ants comment');
  process.exit(1);
}

const before = s.slice(0, start);
const after = s.slice(jsxStart); // keep the real JSX return intact

const effect =
`\n// Animate marching ants
useEffect(() => {
  const id = setInterval(() => composite(), 90);
  return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectionPath, zoom, layers]);

`;

fs.writeFileSync(file, before + effect + after);
console.log('✅ Replaced marching-ants block and removed any stray JSX before return().');
