import React, { useState, useEffect } from "react";
import posAPIService, { POSConfig } from "../lib/pos-api";
import { AlertTriangle, CheckCircle2, Loader2, Copy } from "lucide-react";
interface VenueOption {
  id: string;
  name: string;
}
const POSSettings = () => {
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [posType, setPosType] = useState<
    "square" | "toast" | "margin_edge" | "other"
  >("square");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [syncFrequency, setSyncFrequency] = useState(5);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<POSConfig | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  useEffect(() => {
    loadVenues();
  }, []);
  useEffect(() => {
    if (selectedVenue) {
      loadPOSConfig(selectedVenue);
    }
  }, [selectedVenue]);
  async function loadVenues() {
    setLoading(true);
    try {
      const response = await fetch("/api/venues");
      const data = await response.json();
      setVenues(data || []);
    } catch (error) {
      console.error("Failed to load venues:", error);
      setMessage({ type: "error", text: "Failed to load venues" });
    } finally {
      setLoading(false);
    }
  }
  async function loadPOSConfig(venueId: string) {
    setLoading(true);
    try {
      const config = await posAPIService.getPOSConfig(venueId);
      if (config) {
        setCurrentConfig(config);
        setPosType(config.pos_type);
        setSyncFrequency(config.sync_frequency_minutes); // Don't load sensitive data for security } else { setCurrentConfig(null); setPosType("square"); } } catch (error) { console.error("Failed to load POS config:", error); setMessage({ type:"error", text:"Failed to load POS configuration" }); } finally { setLoading(false); } } async function handleSave() { if (!selectedVenue) { setMessage({ type:"error", text:"Please select a venue" }); return; } if (!apiKey || !apiSecret || !webhookUrl || !webhookSecret) { setMessage({ type:"error", text:"Please fill in all required fields" }); return; } setSaving(true); try { const config = await posAPIService.configurePOS(selectedVenue, { pos_type: posType, api_key: apiKey, api_secret: apiSecret, webhook_url: webhookUrl, webhook_secret: webhookSecret, sync_frequency_minutes: syncFrequency, }); setCurrentConfig(config); setMessage({ type:"success", text:"POS configuration saved successfully", }); // Clear sensitive fields setApiKey(""); setApiSecret(""); setWebhookSecret(""); } catch (error) { console.error("Failed to save POS config:", error); setMessage({ type:"error", text:"Failed to save POS configuration" }); } finally { setSaving(false); } } function generateWebhookUrl() { if (!selectedVenue) { setMessage({ type:"error", text:"Please select a venue first" }); return; } const url = `${window.location.origin}/api/pos/webhook/${selectedVenue}`; setWebhookUrl(url); } function copyToClipboard(text: string) { navigator.clipboard.writeText(text); setMessage({ type:"success", text:"Copied to clipboard" }); setTimeout(() => setMessage(null), 2000); } const getPOSDocumentation = () => { const docs = { square: { title:"Square Integration", steps: ["Go to Square Developer Dashboard","Create an API application","Copy your API Key and API Secret","Set webhook endpoint URL in Square settings","Copy the webhook signing secret", ], link:"https://developer.squareup.com", }, toast: { title:"Toast Integration", steps: ["Access Toast Manage portal","Navigate to Integrations","Create a new API client","Copy API credentials","Configure webhook endpoint", ], link:"https://developer.toasttab.com", }, margin_edge: { title:"MarginEdge Integration", steps: ["Log in to MarginEdge account","Go to Settings → Integrations","Enable API access","Generate API key","Configure webhook URL", ], link:"https://www.marginedge.com", }, other: { title:"Custom POS Integration", steps: ["Consult your POS provider documentation","Obtain API credentials","Configure webhook endpoint","Test connection", ], link:"#", }, }; return docs[posType] || docs.square; }; const doc = getPOSDocumentation(); return ( <div className="panel-shell min-h-screen p-8"> <Container> <div className="max-w-4xl mx-auto"> <div className="mb-8"> <h1 className="text-4xl font-bold mb-2" style={{ color:"var(--brand)", textShadow:"var(--panel-glow)" }} > POS Configuration </h1> <p style={{ color:"var(--muted)" }}> Connect your point-of-sale system for real-time inventory synchronization </p> </div> {message && ( <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${ message.type ==="success" ?"bg-green-900/20 border-green-700 text-green-300" :"bg-red-900/20 border-red-700 text-red-300" }`} > {message.type ==="success" ? ( <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" /> ) : ( <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" /> )} <div>{message.text}</div> </div> )} {/* Venue Selection */} <Card className="mb-6 bg-slate-800 border-border"> <CardHeader> <CardTitle className="text-white">Select Venue</CardTitle> <CardDescription>Choose which venue to configure</CardDescription> </CardHeader> <CardContent> {loading ? ( <div className="flex items-center justify-center py-8"> <Loader2 className="w-5 h-5 animate-spin text-cyan-400" /> </div> ) : ( <select value={selectedVenue} onChange={(e) => setSelectedVenue(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400" > <option value="">Select a venue...</option> {venues.map((v) => ( <option key={v.id} value={v.id}> {v.name} </option> ))} </select> )} </CardContent> </Card> {selectedVenue && ( <> {/* POS Type Selection */} <Card className="mb-6 bg-slate-800 border-border"> <CardHeader> <CardTitle className="text-white">POS System Type</CardTitle> <CardDescription> Select your point-of-sale system provider </CardDescription> </CardHeader> <CardContent> <div className="grid grid-cols-2 md:grid-cols-4 gap-3"> {["square","toast","margin_edge","other"].map((type) => ( <button key={type} onClick={() => setPosType( type as |"square" |"toast" |"margin_edge" |"other", ) } className={`p-4 rounded-lg border-2 transition-all ${ posType === type ?"bg-cyan-900 border-cyan-400 text-cyan-300" :"bg-slate-700 border-slate-600 text-slate-300 hover:border-cyan-400" }`} > <div className="capitalize font-semibold"> {type.replace("_","")} </div> </button> ))} </div> </CardContent> </Card> {/* Configuration Form */} <Card className="mb-6 bg-slate-800 border-border"> <CardHeader> <CardTitle className="text-white">API Credentials</CardTitle> <CardDescription> Enter your {doc.title} credentials </CardDescription> </CardHeader> <CardContent className="space-y-4"> <div> <label className="block text-sm font-medium text-slate-300 mb-2"> API Key </label> <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your API key" className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400" /> </div> <div> <label className="block text-sm font-medium text-slate-300 mb-2"> API Secret </label> <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="Enter your API secret" className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400" /> </div> <div> <label className="block text-sm font-medium text-slate-300 mb-2"> Webhook URL </label> <div className="flex gap-2"> <input type="text" value={webhookUrl} readOnly placeholder="Generate webhook URL..." className="flex-1 px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 focus:outline-none" /> <button onClick={generateWebhookUrl} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors" > Generate </button> {webhookUrl && ( <button onClick={() => copyToClipboard(webhookUrl)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-cyan-400 rounded-lg transition-colors" > <Copy className="w-5 h-5" /> </button> )} </div> </div> <div> <label className="block text-sm font-medium text-slate-300 mb-2"> Webhook Secret </label> <input type={showSecret ?"text" :"password"} value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="Enter your webhook signing secret" className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400" /> </div> <div> <label className="block text-sm font-medium text-slate-300 mb-2"> Sync Frequency (minutes) </label> <select value={syncFrequency} onChange={(e) => setSyncFrequency(parseInt(e.target.value)) } className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400" > {[1, 5, 10, 15, 30, 60].map((min) => ( <option key={min} value={min}> Every {min} minute{min !== 1 ?"s" :""} </option> ))} </select> </div> </CardContent> </Card> {/* Integration Guide */} <Card className="mb-6 bg-slate-800 border-border"> <CardHeader> <CardTitle className="text-white">Setup Guide</CardTitle> <CardDescription>{doc.title}</CardDescription> </CardHeader> <CardContent> <ol className="space-y-2 text-slate-300"> {doc.steps.map((step, idx) => ( <li key={idx} className="flex items-start gap-3"> <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-sm font-bold flex items-center justify-center"> {idx + 1} </span> <span>{step}</span> </li> ))} </ol> <a href={doc.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-cyan-400 hover:text-cyan-300 text-sm font-medium" > View Official Documentation → </a> </CardContent> </Card> {/* Current Status */} {currentConfig && ( <Card className="mb-6 bg-green-900/20 border-green-700"> <CardContent className="pt-6"> <div className="flex items-center gap-3 text-green-300"> <CheckCircle2 className="w-5 h-5" /> <div> <p className="font-semibold">POS Configured</p> <p className="text-sm"> Last synced:{""} {currentConfig.last_sync_at ? new Date( currentConfig.last_sync_at, ).toLocaleString() :"Never"} </p> </div> </div> </CardContent> </Card> )} {/* Save Button */} <button onClick={handleSave} disabled={saving || !apiKey || !apiSecret} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2" > {saving ? ( <> <Loader2 className="w-5 h-5 animate-spin" /> Saving... </> ) : ("Save Configuration" )} </button> </> )} </div> </Container> </div> );
      }
    } catch (e) {}
  }
};
export default POSSettings;
