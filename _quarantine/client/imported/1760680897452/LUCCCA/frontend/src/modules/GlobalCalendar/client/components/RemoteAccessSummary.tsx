import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Globe,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  Info,
  Lock,
  Smartphone,
  Monitor,
  MapPin,
  Zap
} from "lucide-react";

interface RemoteAccessSummaryProps {
  onClose?: () => void;
}

export default function RemoteAccessSummary({ onClose }: RemoteAccessSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Remote Sales Agent Access Analysis
        </h2>
        <p className="text-muted-foreground">
          Cloud-based system access recommendations for international sales teams
        </p>
      </div>

      {/* Executive Summary */}
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-700">Key Finding: No Traditional "Remote Login" Required</AlertTitle>
        <AlertDescription className="text-green-600">
          Cloud-based systems provide secure, direct web access from anywhere globally. Traditional VPN or remote desktop solutions are unnecessary and often less secure.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cloud Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-500" />
              <span>Cloud-Based Benefits</span>
            </CardTitle>
            <CardDescription>Modern cloud infrastructure advantages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <Monitor className="h-4 w-4 text-blue-500 mt-1" />
              <div>
                <p className="font-medium text-sm">Direct Web Access</p>
                <p className="text-xs text-muted-foreground">Any modern browser, anywhere</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="h-4 w-4 text-blue-500 mt-1" />
              <div>
                <p className="font-medium text-sm">24/7 Global Availability</p>
                <p className="text-xs text-muted-foreground">No geographic limitations</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Zap className="h-4 w-4 text-blue-500 mt-1" />
              <div>
                <p className="font-medium text-sm">Automatic Updates</p>
                <p className="text-xs text-muted-foreground">All users synchronized</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className="h-4 w-4 text-blue-500 mt-1" />
              <div>
                <p className="font-medium text-sm">No VPN Required</p>
                <p className="text-xs text-muted-foreground">Cloud infrastructure handles security</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-red-500" />
              <span>Security Requirements</span>
            </CardTitle>
            <CardDescription>Essential security measures for international access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Multi-Factor Authentication</span>
              <Badge className="bg-green-100 text-green-700">Required</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Geographic IP Monitoring</span>
              <Badge className="bg-orange-100 text-orange-700">Recommended</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Role-Based Access Control</span>
              <Badge className="bg-green-100 text-green-700">Required</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Session Timeout (2 hours)</span>
              <Badge className="bg-blue-100 text-blue-700">Configured</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Data Encryption (HTTPS)</span>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Access Control Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span>International Agent Access</span>
            </CardTitle>
            <CardDescription>Recommended permissions for remote sales agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Event Viewing</span>
                <Badge variant="outline" className="text-green-700 border-green-300">Full Read</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Contact Management</span>
                <Badge variant="outline" className="text-blue-700 border-blue-300">Read/Write</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Pricing Information</span>
                <Badge variant="outline" className="text-orange-700 border-orange-300">Read Only</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Financial Reports</span>
                <Badge variant="outline" className="text-red-700 border-red-300">Restricted</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Weather Radar</span>
                <Badge variant="outline" className="text-green-700 border-green-300">Full Read</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>BEO/REO Management</span>
                <Badge variant="outline" className="text-orange-700 border-orange-300">Read Only</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Implementation Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-500" />
              <span>Implementation Timeline</span>
            </CardTitle>
            <CardDescription>Phased approach to enhanced international access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-green-700">1</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Immediate (0-7 days)</p>
                  <p className="text-xs text-muted-foreground">Enhanced MFA & Geographic Monitoring</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-700">2</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Phase 2 (30 days)</p>
                  <p className="text-xs text-muted-foreground">Advanced Security Controls & DLP</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-700">3</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Phase 3 (60 days)</p>
                  <p className="text-xs text-muted-foreground">Compliance & Advanced Monitoring</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Estimate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>💰</span>
            <span>Estimated Additional Costs</span>
          </CardTitle>
          <CardDescription>Monthly operational costs for enhanced international access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <p className="text-2xl font-bold text-foreground">$500-1500</p>
              <p className="text-sm text-muted-foreground">Enhanced Security</p>
              <p className="text-xs text-muted-foreground mt-1">MFA, monitoring, logging</p>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <p className="text-2xl font-bold text-foreground">$10K-20K</p>
              <p className="text-sm text-muted-foreground">24/7 Global Support</p>
              <p className="text-xs text-muted-foreground mt-1">International coverage</p>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <p className="text-2xl font-bold text-foreground">$5K-15K</p>
              <p className="text-sm text-muted-foreground">One-time Setup</p>
              <p className="text-xs text-muted-foreground mt-1">Training & documentation</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-700">Recommendation</AlertTitle>
        <AlertDescription className="text-blue-600">
          <strong>Start with Phase 1 immediately:</strong> Implement MFA and geographic monitoring. 
          This provides 80% of the security benefits at 20% of the cost. Cloud-based access is 
          inherently more secure and cost-effective than traditional remote login solutions.
        </AlertDescription>
      </Alert>

      {/* Alternative Solutions */}
      <Card>
        <CardHeader>
          <CardTitle>Alternative Solutions Considered</CardTitle>
          <CardDescription>Comparison of different access methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Enhanced Web Access</p>
                  <p className="text-sm text-green-600">Cloud-native, secure, cost-effective</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700">✅ Recommended</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Traditional VPN</p>
                  <p className="text-sm text-red-600">Complex, expensive, less secure</p>
                </div>
              </div>
              <Badge variant="outline" className="border-red-300 text-red-700">❌ Not Recommended</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">Native Mobile App</p>
                  <p className="text-sm text-yellow-600">Future consideration for enhanced UX</p>
                </div>
              </div>
              <Badge variant="outline" className="border-yellow-300 text-yellow-700">🔶 Future Option</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {onClose && (
        <div className="flex justify-center">
          <Button onClick={onClose} className="apple-button">
            Close Analysis
          </Button>
        </div>
      )}
    </div>
  );
}
