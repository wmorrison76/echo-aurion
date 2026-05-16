import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiService from "../lib/api";
const theme = {
  colors: {
    primary: "#007AFF",
    secondary: "#5AC8FA",
    accent: "#FF3B30",
    card: "#FFFFFF",
    border: "#E5E7EB",
    background: "#F9FAFB",
    text: "#1F2937",
    textSecondary: "#6B7280",
  },
};
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  section: string;
}
interface FormData {
  orgName: string;
  venues: Array<{
    name: string;
    locationType: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    managerEmail: string;
    liquorLicenseNumber: string;
    liquorLicenseExpiry: string;
  }>;
  varianceTolerance: number;
  breakageAllowance: number;
  stateRegulations: string[];
  costMethod: "fifo" | "lifo" | "weighted_average_cost";
  posSystem: string;
  admin: { email: string; role: "admin" };
}
export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    orgName: "",
    venues: [
      {
        name: "",
        locationType: "restaurant",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        phone: "",
        managerEmail: "",
        liquorLicenseNumber: "",
        liquorLicenseExpiry: "",
      },
    ],
    varianceTolerance: 1.0,
    breakageAllowance: 0.5,
    stateRegulations: [],
    costMethod: "fifo",
    posSystem: "other",
    admin: { email: "", role: "admin" },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [stateOptions, setStateOptions] = useState<
    Array<{ state: string; state_name: string }>
  >([]);
  useEffect(() => {
    loadStateOptions();
  }, []);
  const loadStateOptions = async () => {
    try {
      const regulations = await apiService.getStateRegulations();
      const uniqueStates = regulations.map((reg: any) => ({
        state: reg.state,
        state_name: reg.stateName,
      }));
      setStateOptions(uniqueStates);
    } catch (error) {
      console.error("Failed to load state options:", error);
    }
  };
  const steps: OnboardingStep[] = [
    {
      id: "organization",
      title: "Organization Setup",
      description: "Enter your organization name and basic information",
      section: "basic",
    },
    {
      id: "venues",
      title: "Configure Venues",
      description: "Add all venue locations (restaurants, hotels, bars, etc.)",
      section: "venues",
    },
    {
      id: "compliance",
      title: "Compliance & Regulations",
      description: "Configure state regulations and variance thresholds",
      section: "compliance",
    },
    {
      id: "inventory",
      title: "Inventory Settings",
      description: "Set up inventory costing method and defaults",
      section: "inventory",
    },
    {
      id: "integration",
      title: "System Integration",
      description: "Connect to POS and other systems",
      section: "integration",
    },
    {
      id: "users",
      title: "Admin User",
      description: "Create the first admin user account",
      section: "users",
    },
    {
      id: "review",
      title: "Review & Complete",
      description: "Review configuration and complete setup",
      section: "final",
    },
  ];
  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  const handleComplete = async () => {
    setLoading(true);
    try {
      // Validate configuration const config = buildOnboardingConfig(); const response = await apiService.validateOnboardingConfig(config); if (!response.valid) { setErrors({ form: response.errors.join(",") }); return; } // Initialize system const result = await apiService.initializeSystem(config); if (result.success) { navigate("/"); } } catch (error) { setErrors({ form: error instanceof Error ? error.message :"Setup failed" }); } finally { setLoading(false); } }; const buildOnboardingConfig = () => { return { orgId: `org-${Date.now()}`, orgName: formData.orgName, venues: { venues: formData.venues, primaryVenueId: undefined, }, stateRegulations: { stateRegulations: formData.stateRegulations.map((state) => ({ state, stateName: stateOptions.find((s) => s.state === state)?.state_name || state, licenseType:"on_premise", minAgeRequirement: 21, idVerificationRequired: true, responsibleServiceTrainingRequired: true, trainingCertification:"TIPS", inventoryReportingFrequency:"monthly", reportingFormat:"digital", varianceTolerancePercentage: formData.varianceTolerance, breakageAllowancePercentage: formData.breakageAllowance, recordRetentionDays: 1095, digitalSignatureRequired: true, })), varianceSettings: { defaultVarianceTolerance: formData.varianceTolerance, breakageAllowance: formData.breakageAllowance, autoFlagThreshold: formData.varianceTolerance, requireApprovalAboveThreshold: true, }, }, costMethod: { method: formData.costMethod, description: formData.costMethod.toUpperCase(), selectedForAllVenues: true, venueOverrides: {}, }, posIntegration: { posSystem: formData.posSystem, salesTracking: true, inventorySync: true, syncFrequency:"daily", }, users: [ { email: formData.admin.email, role:"admin", venueAssignments: [], permissions: { can_view_analytics: true, can_manage_users: true, can_configure_settings: true, can_generate_reports: true, can_approve_transfers: true, can_manage_inventory: true, }, }, ], procurement: { primarySupplierName:"Primary Supplier", supplierContact:"Contact", supplierEmail:"supplier@example.com", supplierPhone:"555-0000", purchasingFrequency:"weekly", }, moduleConnections: { purchasingReceivingEnabled: true, echoRecipeProEnabled: true, posSystemConnected: true, iotMonitoringEnabled: true, mixologyModuleEnabled: true, sommelierTrainingEnabled: true, analyticsEnabled: true, }, timestamp: new Date().toISOString(), }; }; const renderOrganizationStep = () => ( <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}> <div> <label style={{ fontWeight: 600, fontSize:"0.95rem" }}>Organization Name *</label> <input type="text" placeholder="e.g., Five Star Hospitality Group" value={formData.orgName} onChange={(e) => setFormData({ ...formData, orgName: e.target.value })} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"1rem", }} /> </div> </div> ); const renderVenuesStep = () => ( <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}> {formData.venues.map((venue, idx) => ( <div key={idx} style={{ padding:"1.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"12px", backgroundColor: theme.colors.background, }} > <h4 style={{ marginBottom:"1rem", fontWeight: 600 }}>Venue {idx + 1}</h4> <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}> <div> <label style={{ fontWeight: 600, fontSize:"0.9rem" }}>Venue Name *</label> <input type="text" placeholder="e.g., Downtown Restaurant" value={venue.name} onChange={(e) => { const newVenues = [...formData.venues]; newVenues[idx].name = e.target.value; setFormData({ ...formData, venues: newVenues }); }} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"0.95rem", }} /> </div> <div> <label style={{ fontWeight: 600, fontSize:"0.9rem" }}>Location Type *</label> <select value={venue.locationType} onChange={(e) => { const newVenues = [...formData.venues]; newVenues[idx].locationType = e.target.value; setFormData({ ...formData, venues: newVenues }); }} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"0.95rem", }} > <option value="restaurant">Restaurant</option> <option value="hotel">Hotel</option> <option value="resort">Resort</option> <option value="casino">Casino</option> <option value="bar">Bar</option> </select> </div> <div style={{ gridColumn:"1 / -1" }}> <label style={{ fontWeight: 600, fontSize:"0.9rem" }}>Address *</label> <input type="text" placeholder="Street address" value={venue.address} onChange={(e) => { const newVenues = [...formData.venues]; newVenues[idx].address = e.target.value; setFormData({ ...formData, venues: newVenues }); }} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"0.95rem", }} /> </div> <div> <label style={{ fontWeight: 600, fontSize:"0.9rem" }}>City *</label> <input type="text" placeholder="City" value={venue.city} onChange={(e) => { const newVenues = [...formData.venues]; newVenues[idx].city = e.target.value; setFormData({ ...formData, venues: newVenues }); }} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"0.95rem", }} /> </div> <div> <label style={{ fontWeight: 600, fontSize:"0.9rem" }}>State *</label> <select value={venue.state} onChange={(e) => { const newVenues = [...formData.venues]; newVenues[idx].state = e.target.value; setFormData({ ...formData, venues: newVenues }); }} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"0.95rem", }} > <option value="">Select State</option> {stateOptions.map((state) => ( <option key={state.state} value={state.state}> {state.state_name} </option> ))} </select> </div> <div> <label style={{ fontWeight: 600, fontSize:"0.9rem" }}>ZIP Code</label> <input type="text" placeholder="ZIP code" value={venue.zipCode} onChange={(e) => { const newVenues = [...formData.venues]; newVenues[idx].zipCode = e.target.value; setFormData({ ...formData, venues: newVenues }); }} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"0.95rem", }} /> </div> <div> <label style={{ fontWeight: 600, fontSize:"0.9rem" }}>Phone</label> <input type="tel" placeholder="Phone number" value={venue.phone} onChange={(e) => { const newVenues = [...formData.venues]; newVenues[idx].phone = e.target.value; setFormData({ ...formData, venues: newVenues }); }} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"0.95rem", }} /> </div> <div> <label style={{ fontWeight: 600, fontSize:"0.9rem" }}>Liquor License #</label> <input type="text" placeholder="License number" value={venue.liquorLicenseNumber} onChange={(e) => { const newVenues = [...formData.venues]; newVenues[idx].liquorLicenseNumber = e.target.value; setFormData({ ...formData, venues: newVenues }); }} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"0.95rem", }} /> </div> <div> <label style={{ fontWeight: 600, fontSize:"0.9rem" }}>License Expiry</label> <input type="date" value={venue.liquorLicenseExpiry} onChange={(e) => { const newVenues = [...formData.venues]; newVenues[idx].liquorLicenseExpiry = e.target.value; setFormData({ ...formData, venues: newVenues }); }} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"0.95rem", }} /> </div> </div> </div> ))} <button onClick={() => { setFormData({ ...formData, venues: [ ...formData.venues, { name:"", locationType:"restaurant", address:"", city:"", state:"", zipCode:"", phone:"", managerEmail:"", liquorLicenseNumber:"", liquorLicenseExpiry:"", }, ], }); }} style={{ padding:"0.75rem 1.5rem", backgroundColor: theme.colors.secondary, color:"white", border:"none", borderRadius:"8px", fontWeight: 600, cursor:"pointer", }} > + Add Another Venue </button> </div> ); const renderComplianceStep = () => ( <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}> <div> <label style={{ fontWeight: 600, fontSize:"0.95rem" }}>Select States Operating In *</label> <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginTop:"1rem" }}> {stateOptions.map((state) => ( <label key={state.state} style={{ display:"flex", alignItems:"center", padding:"0.75rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", cursor:"pointer", backgroundColor: formData.stateRegulations.includes(state.state) ? theme.colors.background :"white", }} > <input type="checkbox" checked={formData.stateRegulations.includes(state.state)} onChange={(e) => { if (e.target.checked) { setFormData({ ...formData, stateRegulations: [...formData.stateRegulations, state.state], }); } else { setFormData({ ...formData, stateRegulations: formData.stateRegulations.filter((s) => s !== state.state), }); } }} style={{ marginRight:"0.75rem", cursor:"pointer" }} /> <span>{state.state}</span> </label> ))} </div> </div> <div> <label style={{ fontWeight: 600, fontSize:"0.95rem" }}>Variance Tolerance (%) *</label> <p style={{ fontSize:"0.85rem", color: theme.colors.textSecondary, marginTop:"0.25rem" }}> Default: 1% - Inventory variance above this threshold will be flagged for review </p> <input type="number" min="0" max="10" step="0.1" value={formData.varianceTolerance} onChange={(e) => setFormData({ ...formData, varianceTolerance: parseFloat(e.target.value) })} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"1rem", }} /> </div> <div> <label style={{ fontWeight: 600, fontSize:"0.95rem" }}>Breakage Allowance (%) *</label> <p style={{ fontSize:"0.85rem", color: theme.colors.textSecondary, marginTop:"0.25rem" }}> Default: 0.5% - Normal breakage/spillage allowance before write-off </p> <input type="number" min="0" max="5" step="0.1" value={formData.breakageAllowance} onChange={(e) => setFormData({ ...formData, breakageAllowance: parseFloat(e.target.value) })} style={{ width:"100%", padding:"0.75rem", marginTop:"0.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"1rem", }} /> </div> </div> ); const renderInventoryStep = () => ( <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}> <div> <label style={{ fontWeight: 600, fontSize:"0.95rem" }}>Inventory Costing Method *</label> <p style={{ fontSize:"0.85rem", color: theme.colors.textSecondary, marginTop:"0.25rem" }}> Choose how costs are tracked for inventory accounting </p> <select value={formData.costMethod} onChange={(e) => setFormData({ ...formData, costMethod: e.target.value as any })} style={{ width:"100%", padding:"0.75rem", marginTop:"0.75rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"1rem", }} > <option value="fifo">FIFO (First In, First Out)</option> <option value="lifo">LIFO (Last In, First Out)</option> <option value="weighted_average_cost">Weighted Average Cost</option> </select> </div> <div style={{ padding:"1rem", backgroundColor:"#F0F9FF", border: `1px solid ${theme.colors.secondary}`, borderRadius:"8px", }} > <p style={{ fontSize:"0.9rem", lineHeight:"1.5", color: theme.colors.text }}> <strong>FIFO:</strong> First purchased items are used/sold first. Best for perishable items and wines. </p> <p style={{ fontSize:"0.9rem", lineHeight:"1.5", color: theme.colors.text, marginTop:"0.75rem" }}> <strong>LIFO:</strong> Last purchased items are used/sold first. Used when recent purchases have different costs. </p> <p style={{ fontSize:"0.9rem", lineHeight:"1.5", color: theme.colors.text, marginTop:"0.75rem" }}> <strong>WAC:</strong> Uses average cost of all units. Good for consistency across multiple suppliers. </p> </div> </div> ); const renderIntegrationStep = () => ( <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}> <div> <label style={{ fontWeight: 600, fontSize:"0.95rem" }}>POS System</label> <p style={{ fontSize:"0.85rem", color: theme.colors.textSecondary, marginTop:"0.25rem" }}> Select your point-of-sale system for integration </p> <select value={formData.posSystem} onChange={(e) => setFormData({ ...formData, posSystem: e.target.value })} style={{ width:"100%", padding:"0.75rem", marginTop:"0.75rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"1rem", }} > <option value="other">No POS Integration (for now)</option> <option value="square">Square</option> <option value="toast">Toast</option> <option value="marginedge">MarginEdge</option> <option value="lightspeed">Lightspeed</option> </select> </div> <div style={{ padding:"1rem", backgroundColor:"#F9FAFB", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", }} > <h4 style={{ fontWeight: 600, marginBottom:"0.75rem" }}>Modules Enabled</h4> <ul style={{ listStyle:"none", padding: 0, display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem", }} > <li style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}> <CheckCircle size={18} color={theme.colors.primary} /> <span>Purchasing & Receiving</span> </li> <li style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}> <CheckCircle size={18} color={theme.colors.primary} /> <span>Echo Recipe Pro</span> </li> <li style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}> <CheckCircle size={18} color={theme.colors.primary} /> <span>Bar Liquor Inventory</span> </li> <li style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}> <CheckCircle size={18} color={theme.colors.primary} /> <span>IoT Monitoring</span> </li> <li style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}> <CheckCircle size={18} color={theme.colors.primary} /> <span>Mixology Module</span> </li> <li style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}> <CheckCircle size={18} color={theme.colors.primary} /> <span>Analytics</span> </li> </ul> </div> </div> ); const renderUsersStep = () => ( <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}> <div> <label style={{ fontWeight: 600, fontSize:"0.95rem" }}>Admin Email *</label> <p style={{ fontSize:"0.85rem", color: theme.colors.textSecondary, marginTop:"0.25rem" }}> This will be the primary administrator account for system setup </p> <input type="email" placeholder="admin@yourcompany.com" value={formData.admin.email} onChange={(e) => setFormData({ ...formData, admin: { ...formData.admin, email: e.target.value } })} style={{ width:"100%", padding:"0.75rem", marginTop:"0.75rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", fontSize:"1rem", }} /> </div> <div style={{ padding:"1rem", backgroundColor:"#FEF2F2", border: `1px solid #FECACA`, borderRadius:"8px", display:"flex", gap:"0.75rem", }} > <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0 }} /> <p style={{ fontSize:"0.9rem", color:"#991B1B" }}> This admin account will have full system access. Ensure this email is monitored and secured. </p> </div> </div> ); const renderReviewStep = () => ( <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}> <div style={{ padding:"1.5rem", backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}`, borderRadius:"12px", }} > <h4 style={{ fontWeight: 600, marginBottom:"1rem" }}>Configuration Summary</h4> <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}> <div> <p style={{ fontSize:"0.85rem", color: theme.colors.textSecondary, fontWeight: 600 }}>Organization</p> <p style={{ fontSize:"1rem", marginTop:"0.25rem" }}>{formData.orgName ||"Not set"}</p> </div> <div> <p style={{ fontSize:"0.85rem", color: theme.colors.textSecondary, fontWeight: 600 }}>Venues</p> <p style={{ fontSize:"1rem", marginTop:"0.25rem" }}>{formData.venues.length} location(s)</p> </div> <div> <p style={{ fontSize:"0.85rem", color: theme.colors.textSecondary, fontWeight: 600 }}>States</p> <p style={{ fontSize:"1rem", marginTop:"0.25rem" }}>{formData.stateRegulations.join(",") ||"Not selected"}</p> </div> <div> <p style={{ fontSize:"0.85rem", color: theme.colors.textSecondary, fontWeight: 600 }}>Variance Tolerance</p> <p style={{ fontSize:"1rem", marginTop:"0.25rem" }}>{formData.varianceTolerance}%</p> </div> <div> <p style={{ fontSize:"0.85rem", color: theme.colors.textSecondary, fontWeight: 600 }}>Cost Method</p> <p style={{ fontSize:"1rem", marginTop:"0.25rem" }}>{formData.costMethod.toUpperCase()}</p> </div> <div> <p style={{ fontSize:"0.85rem", color: theme.colors.textSecondary, fontWeight: 600 }}>Admin Email</p> <p style={{ fontSize:"1rem", marginTop:"0.25rem" }}>{formData.admin.email ||"Not set"}</p> </div> </div> </div> {errors.form && ( <div style={{ padding:"1rem", backgroundColor:"#FEF2F2", border: `1px solid #FECACA`, borderRadius:"8px", display:"flex", gap:"0.75rem", }} > <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0 }} /> <p style={{ fontSize:"0.9rem", color:"#991B1B" }}>{errors.form}</p> </div> )} <div style={{ padding:"1rem", backgroundColor:"#F0FDF4", border: `1px solid #86EFAC`, borderRadius:"8px", }} > <p style={{ fontSize:"0.9rem", lineHeight:"1.5", color:"#166534" }}> Click"Complete Setup" to initialize the system with all configured parameters. You can adjust settings anytime from the admin panel. </p> </div> </div> ); const renderStep = () => { switch (currentStep) { case 0: return renderOrganizationStep(); case 1: return renderVenuesStep(); case 2: return renderComplianceStep(); case 3: return renderInventoryStep(); case 4: return renderIntegrationStep(); case 5: return renderUsersStep(); case 6: return renderReviewStep(); default: return null; } }; return ( <div style={{ minHeight:"100vh", backgroundColor: theme.colors.background, padding:"2rem 1rem" }}> <div style={{ maxWidth:"900px", margin:"0 auto" }}> {/* Header */} <div style={{ marginBottom:"2rem" }}> <h1 style={{ fontSize:"2.5rem", fontWeight: 800, marginBottom:"0.5rem" }}> LUCCCA System Setup </h1> <p style={{ fontSize:"1rem", color: theme.colors.textSecondary }}> Complete setup in {steps.length} steps </p> </div> {/* Progress Bar */} <div style={{ marginBottom:"2rem" }}> <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", }} > {steps.map((step, idx) => ( <div key={step.id} style={{ display:"flex", alignItems:"center" }}> <div style={{ width:"40px", height:"40px", borderRadius:"50%", backgroundColor: idx <= currentStep ? theme.colors.primary : theme.colors.border, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight: 600, fontSize:"0.9rem", }} > {idx < currentStep ?"✓" : idx + 1} </div> {idx < steps.length - 1 && ( <div style={{ width:"20px", height:"2px", backgroundColor: idx < currentStep ? theme.colors.primary : theme.colors.border, margin:"0 4px", }} /> )} </div> ))} </div> <p style={{ fontSize:"0.85rem\", color: theme.colors.textSecondary" }}> Step {currentStep + 1} of {steps.length} </p> </div> {/* Current Step */} <div style={{ backgroundColor:"white", border: `1px solid ${theme.colors.border}`, borderRadius:"16px", padding:"2rem", marginBottom:"2rem", }} > <h2 style={{ fontSize:"1.75rem", fontWeight: 700, marginBottom:"0.5rem" }}> {steps[currentStep].title} </h2> <p style={{ fontSize:"1rem", color: theme.colors.textSecondary, marginBottom:"2rem" }}> {steps[currentStep].description} </p> {renderStep()} </div> {/* Navigation Buttons */} <div style={{ display:"flex", gap:"1rem", justifyContent:"space-between" }}> <button onClick={handleBack} disabled={currentStep === 0} style={{ padding:"0.75rem 1.5rem", border: `1px solid ${theme.colors.border}`, borderRadius:"8px", backgroundColor:"white", color: theme.colors.text, fontWeight: 600, cursor: currentStep === 0 ?"not-allowed" :"pointer", opacity: currentStep === 0 ? 0.5 : 1, display:"flex", alignItems:"center", gap:"0.5rem", }} > <ChevronLeft size={20} /> Back </button> {currentStep < steps.length - 1 ? ( <button onClick={handleNext} style={{ padding:"0.75rem 1.5rem", backgroundColor: theme.colors.primary, color:"white", border:"none", borderRadius:"8px", fontWeight: 600, cursor:"pointer", display:"flex", alignItems:"center", gap:"0.5rem", }} > Next <ChevronRight size={20} /> </button> ) : ( <button onClick={handleComplete} disabled={loading} style={{ padding:"0.75rem 1.5rem", backgroundColor: theme.colors.primary, color:"white", border:"none", borderRadius:"8px", fontWeight: 600, cursor: loading ?"not-allowed" :"pointer", opacity: loading ? 0.7 : 1, }} > {loading ?"Initializing..." :"Complete Setup"} </button> )} </div> </div> </div> );
    } catch (e) {}
  };
};
export default Onboarding;
