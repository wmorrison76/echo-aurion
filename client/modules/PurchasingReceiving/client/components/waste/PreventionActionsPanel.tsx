import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertCircle, CheckCircle2, Clock, TrendingDown } from "lucide-react";
interface PreventionAction {
  id: string;
  title: string;
  description: string;
  action_type: string;
  expected_cost_savings: number;
  status: "proposed" | "approved" | "in_progress" | "completed";
  target_date: string;
  created_at: string;
}
interface PreventionActionsPanelProps {
  organizationId: string;
  outletId: string;
  onActionApprove?: (actionId: string) => void;
}
const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "in_progress":
      return <Clock className="h-4 w-4 text-primary" />;
    case "approved":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
};
const getActionColor = (actionType: string): string => {
  switch (actionType) {
    case "par_reduction":
      return "bg-blue-50 border-blue-200";
    case "rotation_urgency":
      return "bg-red-50 border-red-200";
    case "storage_fix":
      return "bg-orange-50 border-orange-200";
    case "disposal_recommendation":
      return "bg-surface border-gray-200";
    case "supplier_review":
      return "bg-purple-50 border-purple-200";
    default:
      return "bg-surface border-gray-200";
  }
};
const getActionLabel = (actionType: string): string => {
  switch (actionType) {
    case "par_reduction":
      return "Par Level Reduction";
    case "rotation_urgency":
      return "Rotation Urgency";
    case "storage_fix":
      return "Storage Maintenance";
    case "disposal_recommendation":
      return "Disposal Action";
    case "supplier_review":
      return "Supplier Review";
    default:
      return "Action";
  }
};
export const PreventionActionsPanel: React.FC<PreventionActionsPanelProps> = ({
  organizationId,
  outletId,
  onActionApprove,
}) => {
  const [actions, setActions] = useState<PreventionAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("active"); // 'all' | 'active' | 'completed' useEffect(() => { const fetchActions = async () => { try { setLoading(true); const response = await fetch( `/api/waste/prevention-actions?organization_id=${organizationId}&outlet_id=${outletId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, }, } ); if (!response.ok) { throw new Error('Failed to fetch actions'); } const data = await response.json(); setActions(data.data || []); } catch (error) { console.error('Error fetching prevention actions:', error); } finally { setLoading(false); } }; fetchActions(); }, [organizationId, outletId]); const filteredActions = actions.filter(action => { if (filter === 'all') return true; if (filter === 'active') return ['proposed', 'approved', 'in_progress'].includes(action.status); if (filter === 'completed') return action.status === 'completed'; return true; }); const totalPotentialSavings = actions.reduce((sum, a) => sum + a.expected_cost_savings, 0); const completedSavings = actions .filter(a => a.status === 'completed') .reduce((sum, a) => sum + a.expected_cost_savings, 0); if (loading) { return <div className="h-64 bg-surface rounded-lg animate-pulse" />; } return ( <div className="space-y-6"> {/* Savings Overview */} <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-muted-foreground">Total Potential Savings</CardTitle> </CardHeader> <CardContent> <p className="text-2xl font-bold text-green-600">${totalPotentialSavings.toFixed(2)}</p> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-muted-foreground">Realized Savings</CardTitle> </CardHeader> <CardContent> <p className="text-2xl font-bold text-green-700">${completedSavings.toFixed(2)}</p> <p className="text-xs text-muted-foreground mt-1">From completed actions</p> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-muted-foreground">Active Actions</CardTitle> </CardHeader> <CardContent> <p className="text-2xl font-bold text-primary"> {actions.filter(a => ['proposed', 'approved', 'in_progress'].includes(a.status)).length} </p> </CardContent> </Card> </div> {/* Filter Buttons */} <div className="flex gap-2"> {['active', 'all', 'completed'].map(f => ( <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} > {f.charAt(0).toUpperCase() + f.slice(1)} </Button> ))} </div> {/* Actions List */} <Card> <CardHeader> <CardTitle>Recommended Prevention Actions</CardTitle> <CardDescription> Automated recommendations to reduce spoilage and improve efficiency </CardDescription> </CardHeader> <CardContent> {filteredActions.length === 0 ? ( <p className="text-muted-foreground text-sm py-8 text-center"> No prevention actions {filter === 'all' ? 'found' : `in ${filter} status`}. </p> ) : ( <div className="space-y-3"> {filteredActions.map(action => ( <div key={action.id} className={`p-4 rounded-lg border ${getActionColor(action.action_type)}`} > <div className="flex items-start justify-between gap-3 mb-2"> <div className="flex items-center gap-2"> {getStatusIcon(action.status)} <div> <h4 className="font-medium">{action.title}</h4> <Badge variant="outline" className="mt-1"> {getActionLabel(action.action_type)} </Badge> </div> </div> <div className="text-right"> <p className="text-sm font-semibold text-green-600 flex items-center gap-1"> <TrendingDown className="h-4 w-4" /> Save ${action.expected_cost_savings.toFixed(2)} </p> <p className="text-xs text-muted-foreground"> Due: {new Date(action.target_date).toLocaleDateString()} </p> </div> </div> <p className="text-sm text-foreground mb-3">{action.description}</p> <div className="flex items-center justify-between"> <Badge variant="secondary"> {action.status.charAt(0).toUpperCase() + action.status.slice(1)} </Badge> {action.status === 'proposed' && ( <Button size="sm" onClick={() => onActionApprove?.(action.id)} > Approve & Start </Button> )} </div> </div> ))} </div> )} </CardContent> </Card> {/* Info Card */} <Alert className="bg-blue-50 border-blue-200"> <AlertCircle className="h-4 w-4 text-primary" /> <AlertDescription className="text-blue-800 text-sm"> Prevention actions are automatically generated from spoilage predictions. Approve high-priority actions to reduce waste costs. Each action tracks expected vs. actual savings. </AlertDescription> </Alert> </div> );
};
