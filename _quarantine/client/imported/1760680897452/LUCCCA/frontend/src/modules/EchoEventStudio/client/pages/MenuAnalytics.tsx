import { useState } from "react";
import Layout from "@/components/Layout";
import MenuPerformanceReport from "@/components/MenuPerformanceReport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart3,
  TrendingUp,
  FileText,
  Info,
  Settings,
  Download
} from "lucide-react";

export default function MenuAnalytics() {
  const [selectedView, setSelectedView] = useState<'overview' | 'report' | 'settings'>('overview');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');

  const handleGenerateReport = (outletId?: string) => {
    setSelectedOutlet(outletId || 'all');
    setSelectedView('report');
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Menu Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track best-selling items and identify opportunities for menu optimization
        </p>
      </div>

      {/* Information Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">How Menu Analytics Works</AlertTitle>
        <AlertDescription className="text-blue-700">
          Our system analyzes all BEO/REO documents to track item performance across events. 
          This helps identify which menu items are best sellers and which might need to be replaced 
          in your next menu revision.
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleGenerateReport()}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Generate Full Report</span>
            </CardTitle>
            <CardDescription>
              Comprehensive analysis of all menu items across all outlets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              View All Outlets
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Outlet-Specific Analysis</span>
            </CardTitle>
            <CardDescription>
              Focus on performance for a specific outlet or venue area
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => handleGenerateReport('main_dining')}
            >
              Main Dining Room
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => handleGenerateReport('banquet')}
            >
              Banquet Hall
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => handleGenerateReport('outdoor')}
            >
              Outdoor Pavilion
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedView('settings')}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-purple-600" />
              <span>Analytics Settings</span>
            </CardTitle>
            <CardDescription>
              Configure performance thresholds and reporting preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Configure Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Key Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>What You'll Learn from Menu Analytics</CardTitle>
          <CardDescription>Key insights to optimize your menu performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-green-700">Best Sellers</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Which items generate the most revenue per event</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Items with consistent high ordering frequency</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Hidden gems with high performance but low visibility</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Seasonal performance patterns</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-red-700">Underperformers</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <span>Items consistently ordered less frequently</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <span>Menu items with declining popularity trends</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <span>Items to consider for menu replacement</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <span>Revenue optimization opportunities</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Data Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Sample Data</AlertTitle>
        <AlertDescription>
          The reports shown use sample data for demonstration. In production, this would analyze 
          your actual BEO/REO documents and event history to provide real performance insights.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure how menu performance is calculated and reported
          </p>
        </div>
        <Button variant="outline" onClick={() => setSelectedView('overview')}>
          Back to Overview
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Scoring Weights</CardTitle>
            <CardDescription>How different metrics contribute to overall performance score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Revenue Weight (40%)</label>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Order Frequency Weight (30%)</label>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trend Weight (20%)</label>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profit Margin Weight (10%)</label>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendation Thresholds</CardTitle>
            <CardDescription>Performance levels that trigger different recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Keep Items Above:</span>
              <span className="font-medium text-green-600">75th percentile</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Replace Items Below:</span>
              <span className="font-medium text-red-600">25th percentile</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Minimum Events for Analysis:</span>
              <span className="font-medium">3 events</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Trend Significance Threshold:</span>
              <span className="font-medium">10% change</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reporting Preferences</CardTitle>
            <CardDescription>Default settings for report generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Default Analysis Period:</span>
              <span className="font-medium">6 months</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Include Seasonal Analysis:</span>
              <span className="font-medium text-green-600">Enabled</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Include Profit Margin Analysis:</span>
              <span className="font-medium text-green-600">Enabled</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Group by Outlet:</span>
              <span className="font-medium text-green-600">Enabled</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>Available formats for report exports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export as PDF Report
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export as Excel Spreadsheet
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export Raw Data (CSV)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <Layout>
      {selectedView === 'overview' && renderOverview()}
      {selectedView === 'report' && (
        <MenuPerformanceReport 
          outletId={selectedOutlet === 'all' ? undefined : selectedOutlet}
          onClose={() => setSelectedView('overview')}
        />
      )}
      {selectedView === 'settings' && renderSettings()}
    </Layout>
  );
}
