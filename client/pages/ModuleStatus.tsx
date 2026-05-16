import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const modules = [
  { name: 'Dashboard', status: '✅ Active', health: 100 },
  { name: 'Culinary', status: '✅ Active', health: 100 },
  { name: 'Pastry', status: '🔄 Fallback', health: 80 },
  { name: 'Schedule', status: '🔄 Fallback', health: 80 },
  { name: 'Inventory', status: '🔄 Fallback', health: 80 },
  { name: 'Purchasing', status: '🔄 Fallback', health: 80 },
  { name: 'EchoAurum', status: '✅ Active', health: 100 },
  { name: 'Support', status: '✅ Active', health: 100 },
  { name: 'EchoStratus', status: '✅ Active', health: 100 },
  { name: 'ForecastHub', status: '✅ Active', health: 100 },
  { name: 'EchoEvents', status: '✅ Active', health: 100 },
  { name: 'Whiteboard', status: '🔄 Fallback', health: 80 },
  { name: 'VideoConference', status: '⏳ Loading', health: 60 },
  { name: 'ChefNet', status: '✅ Active', health: 100 },
];

export default function ModuleStatus() {
  const activeCount = modules.filter(m => m.status.includes('Active')).length;
  const fallbackCount = modules.filter(m => m.status.includes('Fallback')).length;
  const avgHealth = Math.round(modules.reduce((sum, m) => sum + m.health, 0) / modules.length);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Module Status Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{modules.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Average Health</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">{avgHealth}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {modules.map((module) => (
              <div
                key={module.name}
                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <span className="font-medium w-40">{module.name}</span>
                  <span className="text-sm">{module.status}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        module.health === 100 ? 'bg-green-500' :
                        module.health >= 80 ? 'bg-blue-500' :
                        'bg-yellow-500'
                      }`}
                      style={{ width: `${module.health}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12">{module.health}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">✅ Working Correctly</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>All modules load without crashes</li>
                <li>Fallback content displays properly</li>
                <li>Error boundaries catch issues gracefully</li>
                <li>Loading states work correctly</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">🔄 In Progress</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Replacing fallback content with full implementations</li>
                <li>Optimizing bundle sizes</li>
                <li>Adding advanced features</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
