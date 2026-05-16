import React from "react";
type Props = { children: React.ReactNode };
type State = { error: any, info: any };
export class RescueShell extends React.Component<Props, State> {
  state: State = { error: null, info: null };
  static getDerivedStateFromError(error: any){ return { error, info: null }; }
  componentDidCatch(error: any, info: any){ this.setState({ error, info }); }
  render(){
    if (this.state.error){
      return (
        <div className="p-4 text-sm text-rose-200 bg-rose-950/40 border border-rose-400/30 rounded-xl m-3">
          <div className="font-semibold mb-2">Something went wrong.</div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap opacity-80">{String(this.state.error)}</pre>
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-1 rounded bg-white/10 border border-white/20" onClick={()=>location.reload()}>Reload</button>
            <button className="px-3 py-1 rounded bg-white/10 border border-white/20" onClick={()=>navigator.clipboard.writeText(String(this.state.error))}>Copy error</button>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}
