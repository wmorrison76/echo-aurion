import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Wifi, KeyRound, Check, AlertTriangle, Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";

export const Tier3EnterprisePanel: React.FC = () => {
  const [complianceChecks] = useState([
    { id: "1", type: "GDPR", status: "pass", findings: 3, date: "2 days ago" },
    { id: "2", type: "SOC2", status: "pass", findings: 1, date: "5 days ago" },
    { id: "3", type: "HIPAA", status: "pass", findings: 0, date: "1 week ago" },
  ]);

  const [ipWhitelist] = useState([
    { id: "1", ip: "192.168.1.0/24", active: true, description: "Office Network" },
    { id: "2", ip: "10.0.0.0/8", active: true, description: "VPN Access" },
  ]);

  const [ssoConfig] = useState([
    { id: "1", provider: "SAML", enabled: true, domain: "example.com" },
    { id: "2", provider: "OAuth 2.0", enabled: false, domain: "N/A" },
  ]);

  const [twoFaStats] = useState({
    enabled: 156,
    pending: 12,
    disabled: 3,
  });

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Security & Compliance Center</h2>
        <p className="text-sm text-muted-foreground">
          Monitor security, compliance, access controls, and authentication
        </p>
      </div>

      <Tabs defaultValue="compliance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compliance" className="flex gap-2">
            <Shield className="w-4 h-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="ip" className="flex gap-2">
            <Wifi className="w-4 h-4" />
            IP Whitelist
          </TabsTrigger>
          <TabsTrigger value="sso" className="flex gap-2">
            <Lock className="w-4 h-4" />
            SSO
          </TabsTrigger>
          <TabsTrigger value="2fa" className="flex gap-2">
            <KeyRound className="w-4 h-4" />
            2FA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compliance" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Compliance Checks</h3>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Run Check
            </Button>
          </div>
          <div className="grid gap-4">
            {complianceChecks.map((check) => (
              <Card key={check.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{check.type} Compliance</p>
                        {check.status === "pass" ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {check.findings} findings • Last checked {check.date}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ip" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">IP Whitelist</h3>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add IP
            </Button>
          </div>
          <div className="grid gap-3">
            {ipWhitelist.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="font-mono text-sm font-semibold">{entry.ip}</p>
                      <p className="text-xs text-muted-foreground">{entry.description}</p>
                    </div>
                    <div className="flex gap-2">
                      {entry.active && <Check className="w-4 h-4 text-green-500" />}
                      <Button variant="ghost" size="sm">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sso" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">SSO Configuration</h3>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Provider
            </Button>
          </div>
          <div className="grid gap-3">
            {ssoConfig.map((config) => (
              <Card key={config.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="font-semibold">{config.provider}</p>
                      <p className="text-xs text-muted-foreground">{config.domain}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {config.enabled ? (
                        <span className="text-xs font-semibold text-green-600">Enabled</span>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">Disabled</span>
                      )}
                      <Button variant="ghost" size="sm">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="2fa" className="space-y-4 mt-4">
          <h3 className="font-semibold">Two-Factor Authentication</h3>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Enabled</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{twoFaStats.enabled}</p>
                <p className="text-xs text-muted-foreground mt-1">users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">{twoFaStats.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Disabled</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{twoFaStats.disabled}</p>
                <p className="text-xs text-muted-foreground mt-1">users</p>
              </CardContent>
            </Card>
          </div>
          <Button className="w-full gap-2">
            <KeyRound className="w-4 h-4" />
            Manage 2FA Policies
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Tier3EnterprisePanel;
