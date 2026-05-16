import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ArrowRight,
  Calendar,
  Users,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
interface Project {
  id: string;
  name: string;
  description: string;
  lastModified: string;
  status: "active" | "archived";
  events: number;
}
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      name: "Gala 2024",
      description: "Black tie gala event with 300 guests",
      lastModified: "2 hours ago",
      status: "active",
      events: 3,
    },
    {
      id: "2",
      name: "Wedding Reception",
      description: "Beach wedding with 150 guests",
      lastModified: "3 days ago",
      status: "active",
      events: 1,
    },
  ]); // Redirect if not authenticated useEffect(() => { if (!isAuthenticated) { navigate("/auth"); } }, [isAuthenticated, navigate]); const handleNewProject = () => { navigate("/studio"); }; const handleOpenProject = (id: string) => { navigate(`/studio?projectId=${id}`); }; return ( <div className="min-h-screen bg-muted/20"> {/* Header */} <div className="border-b bg-background"> <div className="max-w-7xl mx-auto px-6 py-6"> <div className="flex items-center justify-between"> <div> <h1 className="text-3xl font-bold">Welcome back, {user?.user_metadata?.name ||"Guest"}!</h1> <p className="text-muted-foreground mt-2"> Manage your event layouts and projects </p> </div> <Button onClick={handleNewProject} className="gap-2" size="lg"> <Plus className="h-5 w-5" /> New Project </Button> </div> </div> </div> {/* Main Content */} <div className="max-w-7xl mx-auto px-6 py-8 space-y-8"> {/* Quick Stats */} <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> <Card> <CardHeader className="py-4"> <CardTitle className="text-sm font-medium flex items-center gap-2"> <Zap className="h-4 w-4 text-yellow-500" /> Active Projects </CardTitle> </CardHeader> <CardContent> <div className="text-3xl font-bold">{projects.filter(p => p.status ==="active").length}</div> <p className="text-xs text-muted-foreground mt-1"> {projects.filter(p => p.status ==="active").length} in progress </p> </CardContent> </Card> <Card> <CardHeader className="py-4"> <CardTitle className="text-sm font-medium flex items-center gap-2"> <Calendar className="h-4 w-4 text-blue-500" /> Total Events </CardTitle> </CardHeader> <CardContent> <div className="text-3xl font-bold"> {projects.reduce((sum, p) => sum + p.events, 0)} </div> <p className="text-xs text-muted-foreground mt-1"> Across all projects </p> </CardContent> </Card> <Card> <CardHeader className="py-4"> <CardTitle className="text-sm font-medium flex items-center gap-2"> <Users className="h-4 w-4 text-green-500" /> Team Members </CardTitle> </CardHeader> <CardContent> <div className="text-3xl font-bold">1</div> <p className="text-xs text-muted-foreground mt-1"> Upgrade for collaboration </p> </CardContent> </Card> <Card> <CardHeader className="py-4"> <CardTitle className="text-sm font-medium flex items-center gap-2"> <TrendingUp className="h-4 w-4 text-purple-500" /> Plan </CardTitle> </CardHeader> <CardContent> <div className="text-sm font-bold">Free</div> <Button variant="link" size="sm" className="text-xs h-auto p-0 mt-1" onClick={() => navigate("/settings?tab=billing")} > Upgrade → </Button> </CardContent> </Card> </div> {/* Recent Projects */} <div> <h2 className="text-2xl font-bold mb-4">Recent Projects</h2> {projects.length === 0 ? ( <Card> <CardContent className="py-12 text-center"> <p className="text-muted-foreground mb-4">No projects yet. Create one to get started!</p> <Button onClick={handleNewProject} className="gap-2"> <Plus className="h-4 w-4" /> Create First Project </Button> </CardContent> </Card> ) : ( <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {projects.map((project) => ( <Card key={project.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleOpenProject(project.id)} > <CardHeader> <div className="flex items-start justify-between"> <div> <CardTitle>{project.name}</CardTitle> <CardDescription>{project.description}</CardDescription> </div> <Badge variant={ project.status ==="active" ?"default" :"secondary" } > {project.status} </Badge> </div> </CardHeader> <CardContent className="space-y-2"> <div className="flex items-center justify-between text-sm text-muted-foreground"> <span>Modified {project.lastModified}</span> <span>{project.events} event{project.events !== 1 ?"s" :""}</span> </div> <Button onClick={(e) => { e.stopPropagation(); handleOpenProject(project.id); }} className="w-full" > Open Project <ArrowRight className="h-4 w-4 ml-2" /> </Button> </CardContent> </Card> ))} </div> )} </div> {/* Help Section */} <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20"> <CardHeader> <CardTitle>Getting Started</CardTitle> <CardDescription> Learn how to create and manage your event layouts </CardDescription> </CardHeader> <CardContent className="space-y-2"> <Button variant="link" className="justify-start"> 📚 View Documentation </Button> <Button variant="link" className="justify-start"> 🎥 Watch Tutorial Videos </Button> <Button variant="link" className="justify-start"> 💬 Contact Support </Button> </CardContent> </Card> </div> </div> );
}
