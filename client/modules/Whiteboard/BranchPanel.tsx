/** * Phase 11: Branch Panel * UI for managing branches, viewing history, and initiating merges */ import React, {
  useState,
  useMemo,
} from "react";
import { BranchMetadata } from "./types/BranchTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/glass";
import {
  GitBranch,
  Plus,
  Trash2,
  Merge2,
  Clock,
  User,
  Shield,
  Search,
  Filter,
  ChevronRight,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
interface BranchPanelProps {
  branches: BranchMetadata[];
  currentBranch: BranchMetadata;
  onCreateBranch: (name: string, description: string) => void;
  onSwitchBranch: (branchId: string) => void;
  onDeleteBranch: (branchId: string) => void;
  onMergeBranch: (sourceBranchId: string, targetBranchId: string) => void;
  userId?: string;
}
export const BranchPanel: React.FC<BranchPanelProps> = ({
  branches,
  currentBranch,
  onCreateBranch,
  onSwitchBranch,
  onDeleteBranch,
  onMergeBranch,
  userId,
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchDescription, setNewBranchDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "protected"
  >("all");
  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      const matchesSearch =
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && branch.status === "active") ||
        (filterStatus === "protected" && branch.isProtected);
      return matchesSearch && matchesFilter;
    });
  }, [branches, searchQuery, filterStatus]);
  const handleCreateBranch = () => {
    if (newBranchName.trim()) {
      onCreateBranch(newBranchName, newBranchDescription);
      setNewBranchName("");
      setNewBranchDescription("");
      setCreateDialogOpen(false);
    }
  };
  const activeBranches = branches.filter((b) => b.status === "active").length;
  const protectedBranches = branches.filter((b) => b.isProtected).length;
  return (
    <div className="w-full space-y-4">
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {" "}
            <GitBranch className="w-6 h-6" /> Branches{" "}
          </h2>{" "}
          <p className="text-sm text-muted-foreground mt-1">
            {" "}
            {activeBranches} active • {protectedBranches} protected{" "}
          </p>{" "}
        </div>{" "}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          {" "}
          <DialogTrigger asChild>
            {" "}
            <Button className="gap-2">
              {" "}
              <Plus className="w-4 h-4" /> New Branch{" "}
            </Button>{" "}
          </DialogTrigger>{" "}
          <DialogContent>
            {" "}
            <DialogHeader>
              {" "}
              <DialogTitle>Create New Branch</DialogTitle>{" "}
            </DialogHeader>{" "}
            <div className="space-y-4">
              {" "}
              <div>
                {" "}
                <label className="text-sm font-semibold text-foreground mb-1 block">
                  {" "}
                  Branch Name{" "}
                </label>{" "}
                <Input
                  placeholder="feature/new-feature"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm font-semibold text-foreground mb-1 block">
                  {" "}
                  Description (optional){" "}
                </label>{" "}
                <Input
                  placeholder="What are you working on?"
                  value={newBranchDescription}
                  onChange={(e) => setNewBranchDescription(e.target.value)}
                />{" "}
              </div>{" "}
              <Button
                onClick={handleCreateBranch}
                className="w-full"
                disabled={!newBranchName.trim()}
              >
                {" "}
                Create Branch{" "}
              </Button>{" "}
            </div>{" "}
          </DialogContent>{" "}
        </Dialog>{" "}
      </div>{" "}
      {/* Search and Filter */}{" "}
      <div className="flex gap-2">
        {" "}
        <div className="relative flex-1">
          {" "}
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />{" "}
          <Input
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />{" "}
        </div>{" "}
        <div className="flex gap-1">
          {" "}
          {(["all", "active", "protected"] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="gap-1"
            >
              {" "}
              <Filter className="w-3 h-3" />{" "}
              {status.charAt(0).toUpperCase() + status.slice(1)}{" "}
            </Button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* Branch List */}{" "}
      <Tabs defaultValue="all" className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-3">
          {" "}
          <TabsTrigger value="all">All Branches</TabsTrigger>{" "}
          <TabsTrigger value="current">Current</TabsTrigger>{" "}
          <TabsTrigger value="merge">Merge</TabsTrigger>{" "}
        </TabsList>{" "}
        <TabsContent value="all" className="space-y-2 mt-4">
          {" "}
          {filteredBranches.length === 0 ? (
            <Card className="bg-background/50">
              {" "}
              <CardContent className="pt-6 text-center text-muted-foreground">
                {" "}
                No branches found{" "}
              </CardContent>{" "}
            </Card>
          ) : (
            filteredBranches.map((branch) => (
              <Card
                key={branch.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  currentBranch.id === branch.id &&
                    "ring-2 ring-primary bg-primary/5",
                )}
                onClick={() => onSwitchBranch(branch.id)}
              >
                {" "}
                <CardContent className="p-4">
                  {" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <div className="flex-1">
                      {" "}
                      <div className="flex items-center gap-2 mb-1">
                        {" "}
                        <GitBranch className="w-4 h-4 text-muted-foreground" />{" "}
                        <h3 className="font-semibold text-foreground">
                          {" "}
                          {branch.name}{" "}
                        </h3>{" "}
                        {branch.isDefault && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {" "}
                            Default{" "}
                          </span>
                        )}{" "}
                        {branch.isProtected && (
                          <Lock
                            className="w-3 h-3 text-yellow-600"
                            title="Protected"
                          />
                        )}{" "}
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            branch.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-surface text-foreground",
                          )}
                        >
                          {" "}
                          {branch.status}{" "}
                        </span>{" "}
                      </div>{" "}
                      {branch.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {" "}
                          {branch.description}{" "}
                        </p>
                      )}{" "}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {" "}
                        <span className="flex items-center gap-1">
                          {" "}
                          <User className="w-3 h-3" /> {branch.createdBy}{" "}
                        </span>{" "}
                        <span className="flex items-center gap-1">
                          {" "}
                          <Clock className="w-3 h-3" />{" "}
                          {format(
                            new Date(branch.createdAt),
                            "MMM d, yyyy",
                          )}{" "}
                        </span>{" "}
                        {branch.lastModifiedAt && (
                          <span className="flex items-center gap-1">
                            {" "}
                            <Clock className="w-3 h-3" /> Modified{""}{" "}
                            {format(
                              new Date(branch.lastModifiedAt),
                              "MMM d, yyyy",
                            )}{" "}
                          </span>
                        )}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="flex gap-2 ml-4">
                      {" "}
                      {currentBranch.id !== branch.id && (
                        <>
                          {" "}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMergeBranch(branch.id, currentBranch.id);
                            }}
                            className="gap-1"
                          >
                            {" "}
                            <Merge2 className="w-3 h-3" /> Merge{" "}
                          </Button>{" "}
                          {!branch.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteBranch(branch.id);
                              }}
                            >
                              {" "}
                              <Trash2 className="w-4 h-4 text-red-500" />{" "}
                            </Button>
                          )}{" "}
                        </>
                      )}{" "}
                      {currentBranch.id === branch.id && (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-semibold">
                          {" "}
                          Active{" "}
                        </span>
                      )}{" "}
                    </div>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>
            ))
          )}{" "}
        </TabsContent>{" "}
        <TabsContent value="current" className="mt-4">
          {" "}
          <Card className="ring-2 ring-primary">
            {" "}
            <CardContent className="p-4">
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <div>
                  {" "}
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {" "}
                    <GitBranch className="w-4 h-4" /> {currentBranch.name}{" "}
                  </h3>{" "}
                  {currentBranch.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {" "}
                      {currentBranch.description}{" "}
                    </p>
                  )}{" "}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    {" "}
                    <span className="flex items-center gap-1">
                      {" "}
                      <User className="w-3 h-3" />{" "}
                      {currentBranch.createdBy}{" "}
                    </span>{" "}
                    <span className="flex items-center gap-1">
                      {" "}
                      <Clock className="w-3 h-3" /> Created{""}{" "}
                      {format(
                        new Date(currentBranch.createdAt),
                        "MMM d, yyyy",
                      )}{" "}
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
                {currentBranch.isProtected && (
                  <Shield className="w-6 h-6 text-yellow-600" />
                )}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        <TabsContent value="merge" className="mt-4">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-base">
                {" "}
                Merge into {currentBranch.name}{" "}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-2">
              {" "}
              {branches
                .filter(
                  (b) => b.id !== currentBranch.id && b.status === "active",
                )
                .map((branch) => (
                  <Button
                    key={branch.id}
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => onMergeBranch(branch.id, currentBranch.id)}
                  >
                    {" "}
                    <Merge2 className="w-4 h-4" /> {branch.name}{" "}
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />{" "}
                  </Button>
                ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
};
export default BranchPanel;
