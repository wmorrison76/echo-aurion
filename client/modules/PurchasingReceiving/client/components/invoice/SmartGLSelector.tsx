import React, { useState, useEffect, useCallback } from "react";
import { Check, ChevronDown, Lightbulb } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
export interface GLOption {
  glCode: string;
  glAccountName: string;
  confidence?: number;
  reasoning?: string[];
}
interface SmartGLSelectorProps {
  vendorName?: string;
  invoiceAmount?: number;
  lineItemDescription?: string;
  onSelect: (glCode: string, confidence: number) => void;
  organizationId: string;
  value?: string;
}
export function SmartGLSelector({
  vendorName,
  invoiceAmount,
  lineItemDescription,
  onSelect,
  organizationId,
  value,
}: SmartGLSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<GLOption[]>([]);
  const [allGLAccounts, setAllGLAccounts] = useState<GLOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGL, setSelectedGL] = useState<GLOption | null>(null); // Fetch GL suggestions on mount or when context changes useEffect(() => { fetchGLSuggestions(); fetchChartOfAccounts(); }, [vendorName, invoiceAmount, organizationId]); const fetchGLSuggestions = useCallback(async () => { if (!vendorName && !invoiceAmount && !lineItemDescription) return; setLoading(true); try { const response = await fetch('/api/invoice-gl-integration/suggest-gl', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Org-Id': organizationId, }, body: JSON.stringify({ vendorName: vendorName || '', invoiceAmount: invoiceAmount || 0, lineItemDescription: lineItemDescription || '', }), }); if (response.ok) { const data = await response.json(); setSuggestions([ { glCode: data.suggestedGL, glAccountName: data.glAccountName, confidence: data.confidence, reasoning: data.reasoning, }, ...(data.alternativeGLCodes || []).slice(0, 2), ]); } } catch (error) { console.error('Error fetching GL suggestions:', error); } finally { setLoading(false); } }, [vendorName, invoiceAmount, lineItemDescription, organizationId]); const fetchChartOfAccounts = useCallback(async () => { try { const response = await fetch('/api/invoice-gl-integration/chart-of-accounts', { headers: { 'X-Org-Id': organizationId, }, }); if (response.ok) { const data = await response.json(); setAllGLAccounts(data); } } catch (error) { console.error('Error fetching chart of accounts:', error); } }, [organizationId]); const handleSearch = (term: string) => { setSearchTerm(term); if (term.length === 0) { return; } const filtered = allGLAccounts.filter( (gl) => gl.glCode.includes(term) || gl.glAccountName.toLowerCase().includes(term.toLowerCase()) ); setSuggestions(filtered.slice(0, 5)); }; const handleSelect = (gl: GLOption) => { setSelectedGL(gl); onSelect(gl.glCode, gl.confidence || 0.5); setIsOpen(false); setSearchTerm(''); }; const selected = selectedGL || value; return ( <div className="relative w-full"> {/* Input trigger */} <button onClick={() => setIsOpen(!isOpen)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground flex items-center justify-between hover:border-primary transition-colors" > <div className="flex items-center gap-2"> {selected ? ( <> <span className="font-mono text-sm font-semibold">{selected}</span> <span className="text-xs text-muted-foreground"> {allGLAccounts.find((g) => g.glCode === selected)?.glAccountName} </span> </> ) : ( <span className="text-muted-foreground">Select GL Account...</span> )} </div> <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} /> </button> {/* Dropdown menu */} {isOpen && ( <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-hidden flex flex-col"> <CardContent className="p-2 space-y-2"> {/* Search box */} <input type="text" placeholder="Search GL accounts..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} className="w-full px-2 py-1 border border-input rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" autoFocus /> {/* Suggestions section */} {!searchTerm && suggestions.length > 0 && ( <div className="space-y-1"> <p className="text-xs font-semibold text-muted-foreground px-2 py-1"> Smart Suggestions </p> {suggestions.map((gl, idx) => ( <div key={`${gl.glCode}-${idx}`} onClick={() => handleSelect(gl)} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted transition-colors border-l-2 border-l-green-600" > <div className="flex items-start justify-between gap-2"> <div className="flex-1"> <div className="flex items-center gap-2"> <span className="font-mono font-semibold">{gl.glCode}</span> {gl.confidence && gl.confidence >= 0.85 && ( <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded"> {(gl.confidence * 100).toFixed(0)}% </span> )} {gl.confidence && gl.confidence < 0.85 && gl.confidence >= 0.7 && ( <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded"> {(gl.confidence * 100).toFixed(0)}% </span> )} </div> <p className="text-sm text-foreground">{gl.glAccountName}</p> {gl.reasoning && gl.reasoning.length > 0 && ( <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1"> <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" /> {gl.reasoning[0]} </p> )} </div> {selected === gl.glCode && ( <Check className="h-5 w-5 text-green-600 flex-shrink-0" /> )} </div> </div> ))} </div> )} {/* Manual search results */} {searchTerm.length > 0 && suggestions.length > 0 && ( <div className="space-y-1"> {suggestions.map((gl) => ( <div key={gl.glCode} onClick={() => handleSelect(gl)} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted transition-colors" > <div className="flex items-center justify-between gap-2"> <div> <p className="font-mono font-semibold">{gl.glCode}</p> <p className="text-sm text-muted-foreground">{gl.glAccountName}</p> </div> {selected === gl.glCode && ( <Check className="h-5 w-5 text-green-600" /> )} </div> </div> ))} </div> )} {searchTerm.length > 0 && suggestions.length === 0 && ( <p className="text-xs text-muted-foreground text-center py-4"> No GL accounts found </p> )} {loading && ( <p className="text-xs text-muted-foreground text-center py-2">Loading...</p> )} </CardContent> </Card> )} {/* Close overlay when clicking outside */} {isOpen && ( <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} /> )} </div> );
}
export default SmartGLSelector;
