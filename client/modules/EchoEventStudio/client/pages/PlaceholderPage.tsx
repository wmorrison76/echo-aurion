import { ReactNode } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import Layout from "../components/Layout";
import { Construction, ArrowRight, Sparkles } from "lucide-react";
interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: ReactNode;
  features?: string[];
  comingSoon?: boolean;
}
export default function PlaceholderPage({
  title,
  description,
  icon,
  features = [],
  comingSoon = true,
}: PlaceholderPageProps) {
  return (
    <Layout>
      {" "}
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center px-4">
        {" "}
        <div className="max-w-2xl mx-auto text-center">
          {" "}
          <Card className="shadow-apple-lg border-border/50 bg-card/50 backdrop-blur-sm">
            {" "}
            <CardHeader className="pb-8">
              {" "}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-primary/20 shadow-glow flex items-center justify-center mx-auto mb-6">
                {" "}
                {icon}{" "}
              </div>{" "}
              <CardTitle className="text-3xl font-bold mb-4 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                {" "}
                {title}{" "}
              </CardTitle>{" "}
              <p className="text-lg text-muted-foreground leading-relaxed">
                {" "}
                {description}{" "}
              </p>{" "}
            </CardHeader>{" "}
            <CardContent className="pt-0">
              {" "}
              {comingSoon && (
                <div className="flex items-center justify-center mb-6">
                  {" "}
                  <Construction className="h-5 w-5 text-primary mr-2" />{" "}
                  <span className="text-sm font-medium text-primary">
                    Coming Soon
                  </span>{" "}
                </div>
              )}{" "}
              {features.length > 0 && (
                <div className="mb-8">
                  {" "}
                  <h3 className="font-semibold mb-4">Planned Features:</h3>{" "}
                  <div className="grid grid-cols-1 gap-2 text-left">
                    {" "}
                    {features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center text-sm text-muted-foreground"
                      >
                        {" "}
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3" />{" "}
                        {feature}{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>
              )}{" "}
              <div className="space-y-4">
                {" "}
                <p className="text-sm text-muted-foreground">
                  {" "}
                  This feature is currently in development. Continue prompting
                  to help us build out this section!{" "}
                </p>{" "}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {" "}
                  <Button className="shadow-glow relative overflow-hidden group">
                    {" "}
                    <span className="relative z-10 flex items-center">
                      {" "}
                      <Sparkles className="h-4 w-4 mr-2" /> Request This Feature{" "}
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />{" "}
                    </span>{" "}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-90 group-hover:opacity-100 transition-opacity" />{" "}
                  </Button>{" "}
                  <Button variant="outline" className="shadow-apple">
                    {" "}
                    Back to Studio{" "}
                  </Button>{" "}
                </div>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
      </div>{" "}
    </Layout>
  );
}
