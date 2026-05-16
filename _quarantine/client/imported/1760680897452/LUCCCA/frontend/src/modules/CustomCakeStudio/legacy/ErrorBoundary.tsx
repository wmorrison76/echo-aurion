import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: any }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError(error: any) { return { hasError: true, error } }
  componentDidCatch(error: any, info: any) { console.error('[Legacy ErrorBoundary]', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-sm bg-red-900/30 border border-red-700 rounded">
          <div className="font-semibold mb-1">Legacy module crashed</div>
          <pre className="text-xs whitespace-pre-wrap">{String(this.state.error)}</pre>
          <button className="mt-2 px-2 py-1 bg-red-800 rounded" onClick={() => this.setState({ hasError: false, error: undefined })}>
            Reset
          </button>
        </div>
      )
    }
    return this.props.children as any
  }
}
