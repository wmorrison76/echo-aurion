import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  BookOpen,
  Target,
  Trophy,
  Zap,
  ChefHat,
  Clock,
  CheckCircle,
  Lock,
  Play,
  FileText,
  Users,
  Award,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

// Professional Curriculum Structure
const CURRICULUM = {
  beginner: {
    title: "Foundation Skills",
    description: "Master essential pastry fundamentals",
    duration: "6 weeks",
    modules: [
      {
        id: "flour-hydration",
        title: "Flour & Hydration Fundamentals",
        description: "Understanding protein content, gluten development, and water absorption rates",
        duration: "2 hours",
        lessons: 4,
        completed: 0,
      },
      {
        id: "lamination-basics",
        title: "Lamination Basics",
        description: "Croissants, danishes, and puff pastry fundamentals",
        duration: "3 hours",
        lessons: 5,
        completed: 0,
      },
      {
        id: "fermentation-control",
        title: "Fermentation Control",
        description: "Temperature, timing, and bulk fermentation management",
        duration: "2.5 hours",
        lessons: 4,
        completed: 0,
      },
      {
        id: "ganache-emulsions",
        title: "Ganache & Emulsion Science",
        description: "Chocolate ratios, emulsification, and tempering",
        duration: "2 hours",
        lessons: 3,
        completed: 0,
      },
    ],
  },
  intermediate: {
    title: "Advanced Techniques",
    description: "Develop specialized expertise in pastry craftsmanship",
    duration: "8 weeks",
    modules: [
      {
        id: "advanced-lamination",
        title: "Advanced Lamination Techniques",
        description: "Complex folds, reverse lamination, and multi-layer designs",
        duration: "4 hours",
        lessons: 6,
        completed: 0,
      },
      {
        id: "scientific-baking",
        title: "Scientific Baking Principles",
        description: "Maillard reaction, gelatinization, and Maillard chemistry",
        duration: "3 hours",
        lessons: 5,
        completed: 0,
      },
      {
        id: "showpiece-design",
        title: "Showpiece & Plating Design",
        description: "Structural engineering, visual composition, and artistic execution",
        duration: "5 hours",
        lessons: 7,
        completed: 0,
      },
      {
        id: "flavor-pairing",
        title: "Professional Flavor Pairing",
        description: "Taste profiles, ingredient synergy, and cultural cuisine integration",
        duration: "3 hours",
        lessons: 5,
        completed: 0,
      },
      {
        id: "bread-proofing",
        title: "Advanced Bread Proofing",
        description: "Cold fermentation, retardation, and autolyse techniques",
        duration: "3.5 hours",
        lessons: 6,
        completed: 0,
      },
    ],
  },
  advanced: {
    title: "Mastery & Innovation",
    description: "Industry leadership and culinary innovation",
    duration: "10 weeks",
    modules: [
      {
        id: "recipe-formulation",
        title: "Professional Recipe Formulation",
        description: "Baker's percentages, scaling, and yield calculations",
        duration: "4 hours",
        lessons: 6,
        completed: 0,
      },
      {
        id: "modernist-techniques",
        title: "Modernist Pastry Techniques",
        description: "Spherification, foams, gels, and avant-garde applications",
        duration: "5 hours",
        lessons: 8,
        completed: 0,
      },
      {
        id: "production-management",
        title: "Commercial Production Management",
        description: "Scheduling, cost analysis, shelf-life, and quality control",
        duration: "4 hours",
        lessons: 7,
        completed: 0,
      },
      {
        id: "confection-artistry",
        title: "Premium Confection Artistry",
        description: "Hand-pulled sugar, isomalt work, and haute couture confections",
        duration: "6 hours",
        lessons: 9,
        completed: 0,
      },
      {
        id: "sourdough-mastery",
        title: "Sourdough Mastery",
        description: "Starter management, microbiology, and wild fermentation control",
        duration: "5 hours",
        lessons: 8,
        completed: 0,
      },
      {
        id: "innovation-lab",
        title: "Innovation Lab & Development",
        description: "Creating signature products and proprietary techniques",
        duration: "6 hours",
        lessons: 10,
        completed: 0,
      },
    ],
  },
};

const CERTIFICATIONS = [
  {
    id: "foundation",
    name: "Professional Pastry Foundation",
    level: "Entry",
    requirements: "Complete all Beginner modules",
    color: "from-blue-400 to-blue-600",
  },
  {
    id: "advanced",
    name: "Advanced Pastry Technician",
    level: "Intermediate",
    requirements: "Complete Beginner + 4 Intermediate modules",
    color: "from-purple-400 to-purple-600",
  },
  {
    id: "master",
    name: "Master Pastry Chef",
    level: "Advanced",
    requirements: "Complete all curriculum levels",
    color: "from-gold-400 to-gold-600",
  },
];

export function PastryTrainingModule() {
  const [selectedLevel, setSelectedLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("curriculum");

  const currentCurriculum = CURRICULUM[selectedLevel];
  const totalProgress = Math.round(
    (currentCurriculum.modules.reduce((sum, m) => sum + m.completed, 0) /
      currentCurriculum.modules.reduce((sum, m) => sum + m.lessons, 0)) *
      100
  );

  return (
    <div className="w-full h-full overflow-auto bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-muted/50">
          <TabsTrigger value="curriculum" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Curriculum
          </TabsTrigger>
          <TabsTrigger value="certifications" className="gap-2">
            <Award className="w-4 h-4" />
            Certifications
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <FileText className="w-4 h-4" />
            Resources
          </TabsTrigger>
        </TabsList>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="space-y-6 p-6">
          {/* Level Selector */}
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(CURRICULUM).map(([level, data]) => (
              <Button
                key={level}
                variant={selectedLevel === level ? "default" : "outline"}
                className={`h-auto flex flex-col items-start p-4 ${
                  selectedLevel === level ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedLevel(level as any)}
              >
                <div className="font-semibold text-left">{data.title}</div>
                <div className="text-xs text-muted-foreground text-left">{data.duration}</div>
              </Button>
            ))}
          </div>

          {/* Curriculum Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5" />
                {currentCurriculum.title}
              </CardTitle>
              <CardDescription>{currentCurriculum.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Overall Progress</span>
                  <span className="font-semibold">{totalProgress}%</span>
                </div>
                <Progress value={totalProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Modules List */}
          <div className="space-y-3">
            {currentCurriculum.modules.map((module) => (
              <Card
                key={module.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {module.completed === module.lessons ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Play className="w-5 h-5 text-primary" />
                        )}
                        {module.title}
                      </CardTitle>
                      <CardDescription className="mt-1">{module.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {expandedModule === module.id && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Duration</div>
                        <div className="font-semibold flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {module.duration}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Lessons</div>
                        <div className="font-semibold">{module.lessons} topics</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Module Progress</span>
                        <span>
                          {module.completed}/{module.lessons}
                        </span>
                      </div>
                      <Progress
                        value={(module.completed / module.lessons) * 100}
                        className="h-2"
                      />
                    </div>
                    <Button className="w-full">
                      {module.completed === 0
                        ? "Start Module"
                        : module.completed === module.lessons
                          ? "Review Completed"
                          : "Continue Learning"}
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications" className="p-6 space-y-6">
          <div className="grid gap-6">
            {CERTIFICATIONS.map((cert) => (
              <Card key={cert.id} className="overflow-hidden">
                <div
                  className={`h-1 bg-gradient-to-r ${cert.color}`}
                />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5" />
                        {cert.name}
                      </CardTitle>
                      <CardDescription className="mt-1">{cert.level} Level Certification</CardDescription>
                    </div>
                    <Badge>{cert.level}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-2">Requirements:</div>
                    <div className="text-sm">{cert.requirements}</div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="p-6 space-y-6">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Instructor Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Access live Q&A sessions, mentorship programs, and one-on-one guidance from master pastry chefs.
                </p>
                <Button variant="outline">Schedule Session</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Reference Materials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Downloadable techniques guides, recipe formulations, and professional reference documents.
                </p>
                <Button variant="outline">Download Resources</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Video Demonstrations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  High-definition instructional videos covering techniques, recipes, and best practices.
                </p>
                <Button variant="outline">Watch Videos</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
