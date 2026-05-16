import React from 'react'
import Studio from './pages/Studio'
import LegacyHost from './pages/LegacyHost'
import { CakeIcon } from './icons/CakeIcon'

/** Minimal tab contract; adapt keys to your app's tab system if needed. */
export type AppTab = {
  id: string
  title: string
  route: string
  component: React.ComponentType<any>
  icon?: React.ComponentType<any>
  closable?: boolean
}

export const CustomCakeTabs: AppTab[] = [
  {
    id: 'custom-cake-studio',
    title: 'Custom Cake Studio',
    route: '/cake-studio',
    component: Studio,
    icon: CakeIcon,
    closable: false,
  },
  {
    id: 'custom-cake-legacy',
    title: 'Studio (Legacy)',
    route: '/cake-studio-legacy',
    component: LegacyHost,
    icon: CakeIcon,
    closable: true,
  }
]

/**
 * Helper to register tabs into an existing array/registry.
 * Example:
 *   import { registerCustomCakeTabs } from 'src/modules/CustomCakeStudio/tabs'
 *   registerCustomCakeTabs(appTabsRegistry.push.bind(appTabsRegistry))
 */
export function registerCustomCakeTabs(register: (tab: AppTab) => void){
  for (const t of CustomCakeTabs) register(t)
}

export default CustomCakeTabs;
