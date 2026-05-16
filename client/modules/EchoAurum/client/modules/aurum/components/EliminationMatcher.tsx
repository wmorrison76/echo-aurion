/** * Elimination Matcher Component * Manually review and approve intercompany elimination pairs * - View auto-detected pairs with confidence scores * - Approve/reject individual matches * - Adjust amounts before approval * - Batch operations */ import React, {
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Link2,
  Edit2,
  Trash2,
  RefreshCw,
} from "lucide-react";
interface IntercompanyMatch {
  senderEntity: string;
  receiverEntity: string;
  amount: number;
  transactionCount: number;
  transactionDate: string;
  confidence: number;
}
interface EliminationMatcherProps {
  matches: IntercompanyMatch[];
  loading?: boolean;
  onApprove?: (match: IntercompanyMatch) => Promise<void>;
  onReject?: (match: IntercompanyMatch) => Promise<void>;
  onAdjust?: (match: IntercompanyMatch, newAmount: number) => Promise<void>;
  readonly?: boolean;
}
export function EliminationMatcher({
  matches,
  loading = false,
  onApprove,
  onReject,
  onAdjust,
  readonly = false,
}: EliminationMatcherProps) {
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(
    new Set(),
  );
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [processedMatches, setProcessedMatches] = useState<Set<string>>(
    new Set(),
  ); // Format currency const formatCurrency = useCallback((value: number) => { return new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", minimumFractionDigits: 2, maximumFractionDigits: 2, }).format(value); }, []); // Get confidence color const getConfidenceColor = useCallback((confidence: number) => { if (confidence >= 90) return"bg-green-100 text-green-900"; if (confidence >= 70) return"bg-blue-100 text-blue-900"; return"bg-yellow-100 text-yellow-900"; }, []); // Get confidence label const getConfidenceLabel = useCallback((confidence: number) => { if (confidence >= 90) return"High"; if (confidence >= 70) return"Medium"; return"Low"; }, []); // Toggle match selection const toggleMatchSelection = useCallback((matchKey: string) => { setSelectedMatches((prev) => { const next = new Set(prev); if (next.has(matchKey)) { next.delete(matchKey); } else { next.add(matchKey); } return next; }); }, []); // Get match key const getMatchKey = useCallback((match: IntercompanyMatch): string => { return `${match.senderEntity}-${match.receiverEntity}-${match.amount}`; }, []); // Handle approve const handleApprove = useCallback( async (match: IntercompanyMatch) => { if (!onApprove || readonly) return; try { await onApprove(match); const key = getMatchKey(match); setProcessedMatches((prev) => new Set(prev).add(key)); } catch (error) { console.error("Failed to approve match:", error); } }, [onApprove, readonly, getMatchKey] ); // Handle reject const handleReject = useCallback( async (match: IntercompanyMatch) => { if (!onReject || readonly) return; try { await onReject(match); const key = getMatchKey(match); setProcessedMatches((prev) => new Set(prev).add(key)); } catch (error) { console.error("Failed to reject match:", error); } }, [onReject, readonly, getMatchKey] ); // Handle adjust amount const handleAdjustAmount = useCallback( async (match: IntercompanyMatch) => { if (!onAdjust || !editAmount || readonly) return; try { await onAdjust(match, editAmount); setEditingMatch(null); setEditAmount(0); const key = getMatchKey(match); setProcessedMatches((prev) => new Set(prev).add(key)); } catch (error) { console.error("Failed to adjust amount:", error); } }, [onAdjust, editAmount, readonly, getMatchKey] ); // Batch approve const handleBatchApprove = useCallback(async () => { if (!onApprove || readonly) return; const selectedMatches_ = matches.filter((m) => selectedMatches.has(getMatchKey(m)) ); for (const match of selectedMatches_) { try { await handleApprove(match); } catch (error) { console.error("Failed to batch approve:", error); } } setSelectedMatches(new Set()); }, [matches, selectedMatches, onApprove, readonly, getMatchKey, handleApprove]); // Batch reject const handleBatchReject = useCallback(async () => { if (!onReject || readonly) return; const selectedMatches_ = matches.filter((m) => selectedMatches.has(getMatchKey(m)) ); for (const match of selectedMatches_) { try { await handleReject(match); } catch (error) { console.error("Failed to batch reject:", error); } } setSelectedMatches(new Set()); }, [matches, selectedMatches, onReject, readonly, getMatchKey, handleReject]); // Check if all selected const allSelected = useMemo( () => matches.length > 0 && selectedMatches.size === matches.length && matches.every((m) => selectedMatches.has(getMatchKey(m))), [matches, selectedMatches, getMatchKey] ); // Check if none selected const noneSelected = selectedMatches.size === 0; if (!matches || matches.length === 0) { return ( <Card> <CardHeader> <CardTitle>Intercompany Elimination Matcher</CardTitle> </CardHeader> <CardContent> <div className="text-center py-8 text-muted-foreground"> No intercompany transactions detected for this period </div> </CardContent> </Card> ); } return ( <Card> <CardHeader> <CardTitle>Intercompany Elimination Matcher</CardTitle> <CardDescription> {matches.length} transaction pair(s) detected </CardDescription> </CardHeader> <CardContent className="space-y-4"> {/* Batch Actions */} {!readonly && ( <div className="flex gap-2 pb-4 border-b"> <Button size="sm" variant="outline" onClick={() => setSelectedMatches( new Set(matches.map((m) => getMatchKey(m))) ) } disabled={allSelected} > Select All </Button> <Button size="sm" variant="outline" onClick={() => setSelectedMatches(new Set())} disabled={noneSelected} > Deselect All </Button> {!noneSelected && ( <> <Button size="sm" onClick={handleBatchApprove} disabled={loading || selectedMatches.size === 0} > <CheckCircle2 size={16} className="mr-1" /> Approve {selectedMatches.size} </Button> <Button size="sm" variant="outline" onClick={handleBatchReject} disabled={loading || selectedMatches.size === 0} > <AlertCircle size={16} className="mr-1" /> Reject {selectedMatches.size} </Button> </> )} </div> )} {/* Matches List */} <div className="space-y-3"> {matches.map((match) => { const key = getMatchKey(match); const isSelected = selectedMatches.has(key); const isProcessed = processedMatches.has(key); const isEditing = editingMatch === key; return ( <div key={key} className={`border rounded-lg p-4 transition ${isProcessed ?"bg-surface opacity-60" :"hover:bg-surface"}`} > {/* Header */} <div className="flex items-start gap-3"> {!readonly && ( <input type="checkbox" checked={isSelected} onChange={() => toggleMatchSelection(key)} className="mt-1 cursor-pointer" disabled={isProcessed} /> )} {/* Match Details */} <div className="flex-1 space-y-2"> {/* Entity Pair */} <div className="flex items-center gap-2"> <div className="font-semibold text-sm"> {match.senderEntity} </div> <Link2 size={16} className="text-gray-400" /> <div className="font-semibold text-sm"> {match.receiverEntity} </div> </div> {/* Amount and Details */} <div className="flex items-center justify-between text-sm"> <div className="space-y-1"> <div className="flex gap-4"> <div> <span className="text-muted-foreground">Amount: </span> <span className="font-semibold"> {formatCurrency(match.amount)} </span> </div> <div> <span className="text-muted-foreground">Transactions: </span> <span className="font-semibold"> {match.transactionCount} </span> </div> <div> <span className="text-muted-foreground">Date: </span> <span className="font-semibold"> {new Date(match.transactionDate).toLocaleDateString()} </span> </div> </div> </div> {/* Confidence Badge */} <Badge className={getConfidenceColor(match.confidence)}> {getConfidenceLabel(match.confidence)} Confidence ( {match.confidence}%) </Badge> </div> {/* Editing Section */} {isEditing && ( <div className="flex gap-2 items-end bg-blue-50 p-3 rounded"> <div className="flex-1"> <label className="text-xs text-muted-foreground"> Adjusted Amount </label> <input type="number" value={editAmount || match.amount} onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0) } className="w-full border rounded px-2 py-1 mt-1 text-sm" step="0.01" /> </div> <Button size="sm" onClick={() => handleAdjustAmount(match)} disabled={!editAmount} > Save </Button> <Button size="sm" variant="outline" onClick={() => { setEditingMatch(null); setEditAmount(0); }} > Cancel </Button> </div> )} </div> {/* Actions */} {!readonly && !isProcessed && ( <div className="flex gap-2"> {onAdjust && ( <Button size="sm" variant="ghost" onClick={() => { setEditingMatch(key); setEditAmount(match.amount); }} title="Adjust amount" > <Edit2 size={16} /> </Button> )} <Button size="sm" variant="ghost" onClick={() => handleApprove(match)} disabled={loading} title="Approve this match" > <CheckCircle2 size={16} className="text-green-600" /> </Button> <Button size="sm" variant="ghost" onClick={() => handleReject(match)} disabled={loading} title="Reject this match" > <AlertCircle size={16} className="text-red-600" /> </Button> </div> )} {/* Processed Badge */} {isProcessed && ( <Badge variant="outline" className="bg-surface"> Processed </Badge> )} </div> </div> ); })} </div> {/* Summary */} <div className="pt-4 border-t text-sm text-muted-foreground"> <div className="flex justify-between"> <span> Processed: {processedMatches.size} of {matches.length} </span> <span> Pending: {matches.length - processedMatches.size} </span> </div> </div> </CardContent> </Card> );
}
