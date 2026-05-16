/**
 * Module Loading Test
 * Tests that all modules can be imported without errors
 */

import React from 'react';

const modules: Record<string, () => Promise<unknown>> = {
  Culinary: () => import('@/modules/Culinary'),
  Pastry: () => import('@/modules/Pastry'),
  Schedule: () => import('@/schedule-panel'),
  Inventory: () => import('@/modules/Inventory'),
  EchoAurum: () => import('@/modules/EchoAurum'),
  EchoEvents: () => import('@/modules/EchoEvents'),
  Support: () => import('@/modules/Support'),
  GlobalCalendar: () => import('@/modules/GlobalCalendar'),
  EKGSystem: () => import('@/modules/EKGSystem'),
  Echo: () => import('@/modules/Echo'),
  Genesis: () => import('@/modules/Genesis'),
  KitchenLibrary: () => import('@/modules/KitchenLibrary'),
};

export function testModuleLoading() {
  console.log('🧪 Testing module loading...');
  const results: Record<string, 'pass' | 'fail'> = {};
  
  Object.entries(modules).forEach(([name, importFn]) => {
    importFn()
      .then(() => {
        results[name] = 'pass';
        console.log(`✅ ${name} loaded successfully`);
      })
      .catch((err) => {
        results[name] = 'fail';
        console.error(`❌ ${name} failed to load:`, err);
      });
  });
  
  return results;
}

// Run in dev: import { testModuleLoading } from '@/test-module-loading'; testModuleLoading();
