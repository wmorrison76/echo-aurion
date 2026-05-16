import React, { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import {
  BookOpen,
  Zap,
  Users,
  TrendingUp,
  Upload,
  MessageSquare,
  Settings,
  Rocket,
} from "lucide-react";
import { EchoOpenAITrainingMode } from "../EchoOpenAITrainingMode";
import { useEchoOpenAITraining } from "../../hooks/use-echo-openai-training";
import { SystemHealthDashboard } from "../SystemHealthDashboard";
import { AutomatedMultiDomainTraining } from "../AutomatedMultiDomainTraining";
import { PineconeVerificationDashboard } from "../PineconeVerificationDashboard";
import { CrawlerProgressPanel } from "./CrawlerProgressPanel";

interface EchoTrainingDashboardProps {
  onRecipeImport?: (recipes: any[]) => void;
  className?: string;
}

const TRAINING_DOMAINS = [
  {
    id: "culinary",
    label: "Culinary Arts",
    description: "Recipes, techniques, ingredients, and cooking methods",
    focusAreas: [
      "Recipe Development",
      "Cooking Techniques",
      "Ingredient Chemistry",
      "Flavor Profiles",
    ],
  },
  {
    id: "finance",
    label: "Financial Management",
    description: "Cost analysis, pricing, margins, and budgeting",
    focusAreas: [
      "Food Cost Analysis",
      "Pricing Strategy",
      "Profit Margins",
      "Budget Planning",
    ],
  },
  {
    id: "hospitality",
    label: "Hospitality & Service",
    description: "Banquet planning, service standards, and guest experience",
    focusAreas: [
      "Service Protocols",
      "Banquet Planning",
      "Guest Relations",
      "Event Management",
    ],
  },
  {
    id: "beverage",
    label: "Beverage Management",
    description: "Cocktails, wine, beer, and pairing techniques",
    focusAreas: [
      "Cocktail Development",
      "Wine Pairing",
      "Beverage Cost",
      "Service Techniques",
    ],
  },
  {
    id: "safety",
    label: "Food Safety & Compliance",
    description: "Allergen management, sanitation, and regulations",
    focusAreas: [
      "Allergen Protocols",
      "Food Safety",
      "Sanitation Standards",
      "Compliance",
    ],
  },
];

export function EchoTrainingDashboard({
  onRecipeImport,
  className,
}: EchoTrainingDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [showCollaborativeTraining, setShowCollaborativeTraining] =
    useState(false);
  const training = useEchoOpenAITraining();

  const stats = training.getSessionStats();

  const handleStartTraining = (domainId: string) => {
    setSelectedDomain(domainId);
    setShowCollaborativeTraining(true);
  };

  if (
    selectedDomain &&
    showCollaborativeTraining &&
    TRAINING_DOMAINS.find((d) => d.id === selectedDomain)
  ) {
    const domain = TRAINING_DOMAINS.find((d) => d.id === selectedDomain)!;
    return (
      <div className={className}>
        <Button
          variant="ghost"
          onClick={() => {
            setShowCollaborativeTraining(false);
            setSelectedDomain(null);
          }}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <EchoOpenAITrainingMode
          domain={selectedDomain as any}
          focusAreas={domain.focusAreas}
          onDialogueComplete={(summary) => {
            console.log("Training completed:", summary);
          }}
          onKnowledgeCapture={(knowledge) => {
            console.log("Knowledge captured:", knowledge);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Echo AI Training Center
        </h1>
        <p className="text-gray-600">
          Train Echo with culinary knowledge, financial insights, and
          operational excellence
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="multi-domain" className="gap-1">
            <Rocket className="w-4 h-4" />
            <span className="hidden sm:inline">Automated</span>
          </TabsTrigger>
          <TabsTrigger value="crawler" className="gap-1">
            🕷️ Crawler
          </TabsTrigger>
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="pinecone">Pinecone</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training" className="relative">
            Training
            {stats.isActive && (
              <Badge className="absolute -top-2 -right-2">Active</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        {/* Automated Multi-Domain Training Tab */}
        <TabsContent value="multi-domain" className="py-4">
          <AutomatedMultiDomainTraining />
        </TabsContent>

        {/* Web Recipe Crawler Tab */}
        <TabsContent value="crawler" className="py-4">
          <CrawlerProgressPanel
            onComplete={(stats) => {
              console.log("Crawler completed with stats:", stats);
            }}
          />
        </TabsContent>

        {/* System Status Tab */}
        <TabsContent value="status" className="space-y-4">
          <SystemHealthDashboard
            onStartTraining={() => {
              setSelectedDomain("culinary");
              setShowCollaborativeTraining(true);
              setActiveTab("training");
            }}
          />
        </TabsContent>

        {/* Pinecone Verification Tab */}
        <TabsContent value="pinecone" className="space-y-4">
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-purple-900">
                  Vector Database Status
                </h2>
                <p className="text-purple-700 mt-2">
                  Verify that all training data has been safely stored in Pinecone
                </p>
              </div>
            </div>
          </Card>
          <PineconeVerificationDashboard />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-indigo-900">
                  Welcome to Training Mode
                </h2>
                <p className="text-indigo-700 mt-2">
                  Echo learns through collaborative dialogue with OpenAI. Select
                  a domain below to begin training.
                </p>
              </div>
              <Zap className="w-8 h-8 text-indigo-600" />
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRAINING_DOMAINS.map((domain) => (
              <Card
                key={domain.id}
                className="hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900">
                      {domain.label}
                    </h3>
                    <Badge variant="outline" className="capitalize">
                      {domain.id}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600">{domain.description}</p>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Focus Areas:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {domain.focusAreas.map((area) => (
                        <Badge
                          key={area}
                          variant="secondary"
                          className="text-xs"
                        >
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleStartTraining(domain.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Start Collaborative Training
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Additional Features */}
          <Card className="border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Training Features
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <BookOpen className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">Recipe Import</h4>
                  <p className="text-sm text-gray-600">
                    Import recipes from PDFs or directly
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Users className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Collaborative Learning
                  </h4>
                  <p className="text-sm text-gray-600">
                    Echo and OpenAI dialogue to fill knowledge gaps
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <TrendingUp className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Knowledge Tracking
                  </h4>
                  <p className="text-sm text-gray-600">
                    Monitor Echo's learning progress
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Zap className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">Auto-Learning</h4>
                  <p className="text-sm text-gray-600">
                    Automatically capture knowledge from OpenAI
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-4">
          {training.isActive ? (
            <div className="space-y-4">
              <Card className="bg-green-50 border-green-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-900">
                      Training Session Active
                    </h3>
                    <p className="text-sm text-green-700">
                      Session ID: {stats.dialogueId?.substring(0, 8)}...
                    </p>
                  </div>
                  <Badge className="bg-green-600">Live</Badge>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-gray-600">Questions Asked</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {stats.totalQuestions}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-gray-600">Knowledge Learned</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.knowledgeLearned}
                  </p>
                </Card>
              </div>
            </div>
          ) : training.trainingSessions.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">
                Recent Training Sessions
              </h3>
              {training.trainingSessions.map((session) => (
                <Card key={session.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">
                        {session.domain}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {session.stats.knowledgeAcquired} items learned
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center p-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No active training session</p>
              <p className="text-sm text-gray-500 mt-1">
                Start a collaborative training session from the Overview tab
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Learning Statistics
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    Total Training Sessions
                  </p>
                  <p className="text-lg font-bold text-indigo-600">
                    {training.trainingSessions.length}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    Total Knowledge Items
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    {training.trainingSessions.reduce(
                      (sum, s) => sum + s.stats.knowledgeAcquired,
                      0,
                    )}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    Domains Covered
                  </p>
                  <p className="text-lg font-bold text-purple-600">
                    {
                      new Set(training.trainingSessions.map((s) => s.domain))
                        .size
                    }
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {training.learnedKnowledge.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recently Learned
              </h3>
              <div className="space-y-3">
                {training.learnedKnowledge.slice(0, 5).map((knowledge) => (
                  <div
                    key={knowledge.id}
                    className="flex items-start gap-3 pb-3 border-b last:border-0"
                  >
                    <Badge variant="outline" className="capitalize text-xs">
                      {knowledge.type}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {knowledge.title}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {knowledge.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
