import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { Box, ArrowRight, Sparkles } from "lucide-react";
export default function Index() {
  return (
    <Layout>
      {" "}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5">
        {" "}
        <div className="text-center max-w-4xl mx-auto px-4">
          {" "}
          <Badge
            variant="secondary"
            className="mb-6 px-4 py-2 text-sm font-medium shadow-apple"
          >
            {" "}
            <Sparkles className="h-3 w-3 mr-2" /> AI-Powered Spatial Design
            Platform{" "}
          </Badge>{" "}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent leading-tight">
            {" "}
            Design Events in <br />{" "}
            <span className="relative">
              {" "}
              3D Reality{" "}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 blur-2xl opacity-75" />{" "}
            </span>{" "}
          </h1>{" "}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            {" "}
            Create immersive digital twins, generate AI-powered layouts, and
            collaborate in real-time. The future of spatial design and event
            visualization is here.{" "}
          </p>{" "}
          <div className="flex justify-center">
            {" "}
            <Link to="/studio">
              {" "}
              <Button
                size="lg"
                className="shadow-glow relative overflow-hidden group px-8 py-4 text-lg"
              >
                {" "}
                <span className="relative z-10 flex items-center">
                  {" "}
                  <Box className="h-5 w-5 mr-2" /> Create Your Design{" "}
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />{" "}
                </span>{" "}
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-90 group-hover:opacity-100 transition-opacity" />{" "}
              </Button>{" "}
            </Link>{" "}
          </div>{" "}
          {/* Quick Stats */}{" "}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {" "}
            <div className="text-center">
              {" "}
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                10,000+
              </div>{" "}
              <div className="text-sm text-muted-foreground">
                Events Created
              </div>{" "}
            </div>{" "}
            <div className="text-center">
              {" "}
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                500+
              </div>{" "}
              <div className="text-sm text-muted-foreground">
                Happy Clients
              </div>{" "}
            </div>{" "}
            <div className="text-center">
              {" "}
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                99.9%
              </div>{" "}
              <div className="text-sm text-muted-foreground">Uptime</div>{" "}
            </div>{" "}
            <div className="text-center">
              {" "}
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                40%
              </div>{" "}
              <div className="text-sm text-muted-foreground">
                Time Saved
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </Layout>
  );
}
