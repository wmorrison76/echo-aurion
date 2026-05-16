import React, { lazy, Suspense } from 'react';
import { Tabs } from '../components/Tabs';

// Lazy-load Studio from CustomCakeStudio and gracefully support either default or named export
const LazyStudio = lazy(() => import('src/modules/CustomCakeStudio/pages/Studio.tsx').then(m => ({ default: (m as any).default ?? (m as any).Studio })));

class EchoBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; err?: any }> {
  constructor(props: any){ super(props); this.state = { hasError: false } }
  static getDerivedStateFromError(err: any){ return { hasError: true, err } }
  componentDidCatch(err: any, info: any){ console.error('[EchoCanvas Boundary]', err, info) }
  render(){
    if (this.state.hasError){
      return (
        <div className="p-4 text-sm bg-red-900/30 border border-red-700 rounded">
          <div className="font-semibold mb-1">EchoCanvas failed to load</div>
          <pre className="text-xs whitespace-pre-wrap">{String(this.state.err)}</pre>
          <button className="mt-2 px-2 py-1 bg-red-800 rounded" onClick={()=>this.setState({ hasError:false, err: undefined })}>
            Retry
          </button>
        </div>
      )
    }
    return this.props.children as any
  }
}

function EchoCanvasHost(){
  return (
    <div className="border rounded bg-gray-950">
      <Suspense fallback={<div className="p-3 text-xs opacity-70">Loading EchoCanvas…</div>}>
        <LazyStudio />
      </Suspense>
    </div>
  )
}

export default function PastryLibrary() {
  const tabs = [
    { label: 'Base Recipes', content: <p>Core Pastry Recipes</p> },
    { label: 'Flavor Variations', content: <p>Linked Variations</p> },
    { label: 'Inventory Links', content: <p>Connect Recipes to Inventory</p> },
    { label: 'EchoCanvas', content:
        <EchoBoundary>
          <EchoCanvasHost />
        </EchoBoundary>
    },
  ];

  return (
    <div className="pastry-library-page">
      <h1 className="text-2xl font-bold mb-4">Pastry Recipe Library</h1>
      <Tabs tabs={tabs} />
    </div>
  );
}
