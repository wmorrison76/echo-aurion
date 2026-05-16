import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';

// Standard routes
import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';

// Lazy load the heavier RecipeInput component
const RecipeInput = lazy(() => import('./pages/RecipeInput'));

// Add more lazy-loaded modules if desired later (e.g. Inventory, Maestro)
function App() {
  return (
    <Router>
      <div className="flex">
        <Sidebar />
        <div className="flex-grow p-6 bg-white min-h-screen overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recipes" element={<Recipes />} />
            
            {/* New Recipe Page (protected + lazy loaded) */}
            <Route
              path="/new-recipe"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-6 text-gray-600">Loading Recipe Builder...</div>}>
                    <RecipeInput />
                  </Suspense>
                </ErrorBoundary>
              }
            />

            {/* Placeholder Routes for Future Expansion */}
            {/* <Route path="/inventory" element={<Inventory />} /> */}
            {/* <Route path="/menu-builder" element={<MenuBuilder />} /> */}
            {/* Add more as needed */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
