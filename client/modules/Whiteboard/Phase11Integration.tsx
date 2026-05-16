/** * Phase 11: Integration Component * Adds branching capabilities to WhiteboardSession */ import React, {
  useEffect,
} from "react";
import { BranchPanel } from "./BranchPanel";
import { ConflictResolutionUI } from "./ConflictResolutionUI";
import { usePhase11Branching } from "./hooks/usePhase11Branching";
import { CanvasState } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, Zap } from "lucide-react";
interface Phase11IntegrationProps {
  sessionId: string;
  userId: string;
  userName: string;
  canvasState: CanvasState;
  onCanvasStateChange?: (state: CanvasState) => void;
  visible?: boolean;
  children?: React.ReactNode;
}
export const Phase11Integration: React.FC<Phase11IntegrationProps> = ({
  sessionId,
  userId,
  userName,
  canvasState,
  onCanvasStateChange,
  visible = true,
  children,
}) => {
  const branching = usePhase11Branching({ sessionId, userId, userName }); // Initialize branching on mount useEffect(() => { branching.initializeManagers(); }, []); // Track canvas state changes useEffect(() => { branching.updateCanvasState(canvasState); }, [canvasState]); return ( <div className="relative w-full h-full"> {/* Children (main whiteboard content) */} {children} {/* Branch Panel (sidebar) */} {visible && ( <div className="absolute right-0 top-16 w-80 max-h-[calc(100vh-4rem)] bg-background border-l overflow-y-auto z-40"> <Tabs defaultValue="branches" className="w-full h-full"> <TabsList className="w-full justify-start rounded-none border-b px-4 py-2"> <TabsTrigger value="branches" className="gap-1"> <GitBranch className="w-4 h-4" /> Branches </TabsTrigger> <TabsTrigger value="changes" className="gap-1"> <Zap className="w-4 h-4" /> Changes </TabsTrigger> </TabsList> <TabsContent value="branches" className="h-full"> <div className="p-4"> <BranchPanel branches={branching.branches} currentBranch={ branching.currentBranch || { id:"main", name:"main", createdBy:"system", createdAt: Date.now(), status:"active", } } onCreateBranch={(name, description) => { branching.createBranch(name, description); }} onSwitchBranch={(branchId) => { const ok = branching.switchBranch(branchId); if (ok) { const next = branching.getCurrentCanvasState(); if (next && onCanvasStateChange) { onCanvasStateChange(next); } } return ok; }} onDeleteBranch={branching.deleteBranch} onMergeBranch={branching.mergeBranches} userId={userId} /> </div> </TabsContent> <TabsContent value="changes" className="h-full"> <div className="p-4"> <div className="text-center text-muted-foreground text-sm"> Change tracking for current branch </div> </div> </TabsContent> </Tabs> </div> )} {/* Conflict Resolution Dialog */} {visible && ( <Dialog open={branching.showConflictUI} onOpenChange={branching.cancelMerge} > <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"> <DialogHeader> <DialogTitle>Resolve Merge Conflicts</DialogTitle> </DialogHeader> {branching.currentBranch && ( <ConflictResolutionUI conflicts={branching.mergeConflicts} sourceBranch={ (branching.pendingMerge ? branching.branches.find( (b) => b.id === branching.pendingMerge?.sourceBranchId, ) : null) || branching.currentBranch } targetBranch={branching.currentBranch} onResolve={branching.completeConflictResolution} onCancel={branching.cancelMerge} /> )} </DialogContent> </Dialog> )} </div> );
};
export default Phase11Integration;
