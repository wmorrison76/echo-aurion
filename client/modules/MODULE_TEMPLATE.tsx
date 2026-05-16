/**
 * Module Template
 * Copy this to create new modules
 */

import React, { useState, useEffect } from "react";
import {
  ModuleWrapper,
  ModuleErrorBoundary,
} from "@/components/modules/ModuleWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function YourModuleName() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data
    const loadData = async () => {
      try {
        // Fetch your data here
        setData({ example: "data" });
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ModuleWrapper title="Your Module Name">
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Your module content here</p>
        </CardContent>
      </Card>
    </ModuleWrapper>
  );
}

// Export with error boundary
export default function Module() {
  return (
    <ModuleErrorBoundary moduleName="YourModuleName">
      <YourModuleName />
    </ModuleErrorBoundary>
  );
}
