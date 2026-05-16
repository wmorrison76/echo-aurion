import React, { useState } from "react";
import {
  FileText,
  AlertCircle,
  Database,
  Share2,
  Settings,
  Plus,
  Search,
  X,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
interface IntegrationOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: "embed" | "share" | "data";
  requiresAuth: boolean;
}
const AVAILABLE_INTEGRATIONS: IntegrationOption[] = [
  {
    id: "figma",
    name: "Figma",
    icon: <FileText className="w-5 h-5" />,
    description: "Embed Figma designs and collaborate",
    category: "embed",
    requiresAuth: true,
  },
  {
    id: "jira",
    name: "Jira",
    icon: <AlertCircle className="w-5 h-5" />,
    description: "Link and track Jira tickets",
    category: "embed",
    requiresAuth: true,
  },
  {
    id: "datasource",
    name: "Live Data",
    icon: <Database className="w-5 h-5" />,
    description: "Embed charts from APIs and databases",
    category: "data",
    requiresAuth: false,
  },
  {
    id: "googlesheets",
    name: "Google Sheets",
    icon: <Database className="w-5 h-5" />,
    description: "Embed and sync spreadsheet data",
    category: "embed",
    requiresAuth: true,
  },
  {
    id: "slack",
    name: "Slack",
    icon: <Share2 className="w-5 h-5" />,
    description: "Share to Slack channels",
    category: "share",
    requiresAuth: true,
  },
  {
    id: "email",
    name: "Email",
    icon: <Share2 className="w-5 h-5" />,
    description: "Share via email with preview",
    category: "share",
    requiresAuth: false,
  },
];
interface IntegrationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIntegration: (integration: IntegrationOption) => void;
  connectedIntegrations?: string[];
  onConfigureIntegration?: (integrationId: string) => void;
}
export const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({
  isOpen,
  onClose,
  onSelectIntegration,
  connectedIntegrations = [],
  onConfigureIntegration,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "embed" | "share" | "data"
  >("all");
  const [isConfiguring, setIsConfiguring] = useState<string | null>(null);
  const filteredIntegrations = AVAILABLE_INTEGRATIONS.filter((integration) => {
    const matchesSearch =
      integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const handleIntegrationClick = (integration: IntegrationOption) => {
    if (connectedIntegrations.includes(integration.id)) {
      onConfigureIntegration?.(integration.id);
    } else {
      onSelectIntegration(integration);
    }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {" "}
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {" "}
        {/* Header */}{" "}
        <div className="border-b border-gray-200 p-6 flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <h2 className="text-2xl font-bold text-gray-900">
              {" "}
              Whiteboard Integrations{" "}
            </h2>{" "}
            <p className="text-sm text-muted-foreground mt-1">
              {" "}
              Connect external tools and share your work{" "}
            </p>{" "}
          </div>{" "}
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            {" "}
            <X className="w-5 h-5" />{" "}
          </button>{" "}
        </div>{" "}
        {/* Search and Filters */}{" "}
        <div className="border-b border-gray-200 p-6 space-y-4">
          {" "}
          <div className="relative">
            {" "}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />{" "}
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />{" "}
          </div>{" "}
          <div className="flex gap-2">
            {" "}
            {(["all", "embed", "share", "data"] as const).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category ? "bg-primary text-white" : "bg-surface text-foreground hover:bg-surface"}`}
              >
                {" "}
                {category.charAt(0).toUpperCase() + category.slice(1)}{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        {/* Integrations Grid */}{" "}
        <div className="overflow-y-auto flex-1 p-6">
          {" "}
          {filteredIntegrations.length === 0 ? (
            <div className="text-center py-12">
              {" "}
              <AlertSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />{" "}
              <p className="text-muted-foreground font-medium">
                No integrations found
              </p>{" "}
              <p className="text-sm text-muted-foreground mt-1">
                {" "}
                Try adjusting your search or filters{" "}
              </p>{" "}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {" "}
              {filteredIntegrations.map((integration) => {
                const isConnected = connectedIntegrations.includes(
                  integration.id,
                );
                const isConfiguring_ = isConfiguring === integration.id;
                return (
                  <div
                    key={integration.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${isConnected ? "border-green-300 bg-green-50" : "border-gray-200 bg-background hover:border-primary hover:bg-blue-50"}`}
                    onClick={() =>
                      !isConfiguring_ && handleIntegrationClick(integration)
                    }
                  >
                    {" "}
                    <div className="flex items-start justify-between mb-3">
                      {" "}
                      <div className="flex items-center gap-3">
                        {" "}
                        <div
                          className={`p-2 rounded-lg ${isConnected ? "bg-green-100 text-green-600" : "bg-blue-100 text-primary"}`}
                        >
                          {" "}
                          {integration.icon}{" "}
                        </div>{" "}
                        <div>
                          {" "}
                          <h3 className="font-semibold text-gray-900">
                            {" "}
                            {integration.name}{" "}
                          </h3>{" "}
                          <p className="text-xs text-muted-foreground mt-1">
                            {" "}
                            {integration.description}{" "}
                          </p>{" "}
                        </div>{" "}
                      </div>{" "}
                      {isConnected && (
                        <div className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                          {" "}
                          Connected{" "}
                        </div>
                      )}{" "}
                    </div>{" "}
                    <div className="mt-4 flex gap-2">
                      {" "}
                      {isConnected ? (
                        <>
                          {" "}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsConfiguring(integration.id);
                              onConfigureIntegration?.(integration.id);
                            }}
                            disabled={isConfiguring_}
                            className="flex-1"
                          >
                            {" "}
                            {isConfiguring_ ? (
                              <>
                                {" "}
                                <Loader className="w-3 h-3 mr-1 animate-spin" />{" "}
                                Configuring...{" "}
                              </>
                            ) : (
                              <>
                                {" "}
                                <Settings className="w-3 h-3 mr-1" />{" "}
                                Configure{" "}
                              </>
                            )}{" "}
                          </Button>{" "}
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectIntegration(integration);
                            }}
                            className="flex-1"
                          >
                            {" "}
                            <Plus className="w-3 h-3 mr-1" /> Add Another{" "}
                          </Button>{" "}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          variant={
                            integration.requiresAuth ? "default" : "outline"
                          }
                        >
                          {" "}
                          <Plus className="w-3 h-3 mr-1" />{" "}
                          {integration.requiresAuth ? "Connect" : "Add"}{" "}
                        </Button>
                      )}{" "}
                    </div>{" "}
                  </div>
                );
              })}{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* Footer */}{" "}
        <div className="border-t border-gray-200 p-6 bg-surface flex justify-end">
          {" "}
          <Button variant="outline" onClick={onClose}>
            {" "}
            Close{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default IntegrationsPanel;
