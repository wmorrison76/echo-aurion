import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function PlaceholderPage({ title, description, icon: Icon = Construction }: PlaceholderPageProps) {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center bg-card border-border">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Icon className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <CardTitle className="text-foreground">{title}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This section is under construction. Continue prompting to help build out this page with the specific features you need.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild variant="outline">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <Button>Request Feature</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
