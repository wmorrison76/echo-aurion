import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ModuleOverview from './pages/ModuleOverview';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import Login from './pages/Login';
import UserSettings from './pages/UserSettings';
import EchoControl from './pages/EchoControl';
import ArgusMonitor from './pages/ArgusMonitor';
import SystemOverview from './pages/SystemOverview';
import { PrivateRoute } from './components/PrivateRoute';
import MainLayout from './layout/MainLayout';

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="*"
          element={
            <PrivateRoute>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/modules" element={<ModuleOverview />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/user" element={<UserSettings />} />
                  <Route path="/echo" element={<EchoControl />} />
                  <Route path="/argus" element={<ArgusMonitor />} />
                  <Route path="/overview" element={<SystemOverview />} />
                </Routes>
              </MainLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}
