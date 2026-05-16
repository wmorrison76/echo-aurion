import React from 'react'
import Studio from './pages/Studio'
import LegacyHost from './pages/LegacyHost'

export const customCakeRoutes = [
  { path: '/cake-studio', element: <Studio /> },
  { path: '/cake-studio-legacy', element: <LegacyHost /> },
] as const

/** Convenience: returns an array of <Route> elements if you want to inline it. */
export function renderCustomCakeRoutes(Route: any){
  return customCakeRoutes.map(r => <Route key={r.path} path={r.path} element={r.element} />)
}

export default customCakeRoutes;
