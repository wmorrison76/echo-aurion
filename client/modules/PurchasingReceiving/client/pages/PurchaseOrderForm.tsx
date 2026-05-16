import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  Plus,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
const MOCK_VENDORS = [
  { id: "vendor-1", name: "US Foods", payment_terms: "net_30" },
  { id: "vendor-2", name: "Sysco", payment_terms: "net_60" },
  { id: "vendor-3", name: "Local Produce Co", payment_terms: "cod" },
];
const VENDOR_CATALOGS: Record<
  string,
  Array<{
    id: string;
    name: string;
    category: string;
    unit: string;
    last_price: number;
    vendor_code?: string;
  }>
> = {
  "vendor-1": [
    {
      id: "prod-1",
      name: "Ribeye Steak 12oz",
      category: "Proteins",
      unit: "pieces",
      last_price: 12.5,
      vendor_code: "USFD-RB1200",
    },
    {
      id: "prod-3",
      name: "Whole Milk Gallon",
      category: "Dairy",
      unit: "gallons",
      last_price: 4.5,
      vendor_code: "USFD-MLK01",
    },
    {
      id: "prod-5",
      name: "All-Purpose Flour 25lb",
      category: "Pantry",
      unit: "bags",
      last_price: 8.99,
      vendor_code: "USFD-FLR25",
    },
  ],
  "vendor-2": [
    {
      id: "prod-2",
      name: "Broccoli Crown Fresh",
      category: "Vegetables",
      unit: "lbs",
      last_price: 2.25,
      vendor_code: "SYS-BROC01",
    },
    {
      id: "prod-4",
      name: "Chicken Breast Boneless",
      category: "Proteins",
      unit: "lbs",
      last_price: 3.75,
      vendor_code: "SYS-CHKN02",
    },
  ],
  "vendor-3": [
    {
      id: "prod-2",
      name: "Broccoli Crown Fresh",
      category: "Vegetables",
      unit: "lbs",
      last_price: 2.1,
      vendor_code: "LPCO-VEG001",
    },
  ],
};
const MOCK_PRODUCTS = [
  {
    id: "prod-1",
    name: "Ribeye Steak 12oz",
    category: "Proteins",
    unit: "pieces",
    last_price: 12.5,
  },
  {
    id: "prod-2",
    name: "Broccoli Crown Fresh",
    category: "Vegetables",
    unit: "lbs",
    last_price: 2.25,
  },
  {
    id: "prod-3",
    name: "Whole Milk Gallon",
    category: "Dairy",
    unit: "gallons",
    last_price: 4.5,
  },
  {
    id: "prod-4",
    name: "Chicken Breast Boneless",
    category: "Proteins",
    unit: "lbs",
    last_price: 3.75,
  },
  {
    id: "prod-5",
    name: "All-Purpose Flour 25lb",
    category: "Pantry",
    unit: "bags",
    last_price: 8.99,
  },
];
const DEFAULT_DEPARTMENTS = [
  "Hot Line",
  "Cold Prep",
  "Pastry",
  "Banquets",
  "Bar",
  "Room Service",
  "Retail",
];
const GL_CODES = [
  // REVENUE { code:"4100", name:"Room Revenue" }, { code:"4110", name:"Food & Beverage Revenue" }, { code:"4120", name:"Gaming Revenue" }, { code:"4130", name:"Entertainment Revenue" }, { code:"4140", name:"Spa & Wellness Revenue" }, { code:"4150", name:"Conference & Events Revenue" }, { code:"4160", name:"Retail Revenue" }, { code:"4170", name:"Parking Revenue" }, { code:"4180", name:"Other Operating Revenue" }, // FOOD & BEVERAGE COGS { code:"5100", name:"COGS - Food" }, { code:"5110", name:"COGS - Beverages" }, { code:"5120", name:"COGS - Spirits" }, { code:"5130", name:"COGS - Wine" }, { code:"5140", name:"COGS - Coffee/Tea" }, // ROOM OPERATIONS & HOUSEKEEPING { code:"6100", name:"COGS - Housekeeping Supplies" }, { code:"6110", name:"COGS - Linens & Laundry" }, { code:"6120", name:"COGS - Guest Amenities" }, { code:"6130", name:"COGS - Room Cleaning" }, // MAINTENANCE & OPERATIONS { code:"6200", name:"COGS - Maintenance Supplies" }, { code:"6210", name:"COGS - Engineering Supplies" }, { code:"6220", name:"COGS - Repair Materials" }, { code:"6230", name:"COGS - HVAC Supplies" }, { code:"6240", name:"COGS - Plumbing Supplies" }, { code:"6250", name:"COGS - Electrical Supplies" }, // UTILITIES { code:"6300", name:"Utilities - Electricity" }, { code:"6310", name:"Utilities - Water/Sewer" }, { code:"6320", name:"Utilities - Gas" }, { code:"6330", name:"Utilities - Trash Removal" }, // SUPPLIES & EQUIPMENT { code:"6400", name:"Office Supplies" }, { code:"6410", name:"Paper & Printing" }, { code:"6420", name:"Uniforms & Safety" }, { code:"6430", name:"IT Equipment & Supplies" }, { code:"6440", name:"Kitchen Equipment" }, { code:"6450", name:"Gaming Equipment Supplies" }, // PAYROLL & BENEFITS { code:"7000", name:"Salaries - Management" }, { code:"7010", name:"Salaries - F&B Department" }, { code:"7020", name:"Salaries - Housekeeping" }, { code:"7030", name:"Salaries - Front Desk" }, { code:"7040", name:"Salaries - Maintenance" }, { code:"7050", name:"Salaries - Gaming" }, { code:"7060", name:"Salaries - Security" }, { code:"7070", name:"Salaries - IT/Operations" }, { code:"7080", name:"Salaries - Marketing/Sales" }, { code:"7090", name:"Wages - Part-Time Staff" }, { code:"7100", name:"Payroll Taxes" }, { code:"7110", name:"Health Insurance" }, { code:"7120", name:"Dental/Vision Insurance" }, { code:"7130", name:"401k/Retirement" }, { code:"7140", name:"Workers Compensation" }, { code:"7150", name:"Employee Training & Development" }, // MARKETING & SALES { code:"7200", name:"Advertising" }, { code:"7210", name:"Digital Marketing" }, { code:"7220", name:"Promotional Materials" }, { code:"7230", name:"Events & Entertainment" }, { code:"7240", name:"Commissions" }, // FACILITIES & OCCUPANCY { code:"7300", name:"Rent/Lease - Facilities" }, { code:"7310", name:"Property Insurance" }, { code:"7320", name:"Liability Insurance" }, { code:"7330", name:"Grounds Maintenance" }, { code:"7340", name:"Security Services" }, // TECHNOLOGY { code:"7400", name:"Software Licenses" }, { code:"7410", name:"IT Support Services" }, { code:"7420", name:"Network/Telecom" }, { code:"7430", name:"POS System Maintenance" }, { code:"7440", name:"Cloud Services" }, // ADMINISTRATIVE { code:"7500", name:"Professional Services" }, { code:"7510", name:"Legal & Audit" }, { code:"7520", name:"Accounting Services" }, { code:"7530", name:"Consulting" }, { code:"7540", name:"Licenses & Permits" }, // GENERAL EXPENSES { code:"7600", name:"Travel & Transportation" }, { code:"7610", name:"Meals & Entertainment" }, { code:"7620", name:"Postage & Shipping" }, { code:"7630", name:"Telephone/Communication" }, { code:"7640", name:"Dues & Subscriptions" }, { code:"7650", name:"Bank Fees" }, { code:"7660", name:"Miscellaneous" }, // DEPRECIATION & AMORTIZATION { code:"8000", name:"Depreciation - Equipment" }, { code:"8010", name:"Depreciation - Building" }, { code:"8020", name:"Depreciation - Furniture/Fixtures" }, { code:"8100", name:"Amortization" }, // INTEREST & OTHER { code:"8200", name:"Interest Expense" }, { code:"8300", name:"Bad Debt Expense" },
];
interface LineItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vendor_code?: string;
}
export default function PurchaseOrderForm() {
  const { currentOutlet } = useMultiOutlet();
  const { user } = useAuth(); // Vendor selection const [selectedVendor, setSelectedVendor] = useState<string>(""); const [isWriteInVendor, setIsWriteInVendor] = useState(false); const [writeInVendorName, setWriteInVendorName] = useState(""); const [writeInVendorLink, setWriteInVendorLink] = useState(""); // Order details const [deliveryDate, setDeliveryDate] = useState<string>(""); const [selectedDepartment, setSelectedDepartment] = useState<string>(""); const [selectedGLCode, setSelectedGLCode] = useState<string>(""); const [notes, setNotes] = useState<string>(""); // Line items const [lineItems, setLineItems] = useState<LineItem[]>([]); const [newProduct, setNewProduct] = useState<string>(""); const [newQuantity, setNewQuantity] = useState<number>(1); const [newPrice, setNewPrice] = useState<number>(0); const [vendorCodeSearch, setVendorCodeSearch] = useState<string>(""); // UI state const [showSuccess, setShowSuccess] = useState(false); const [departmentPopoverOpen, setDepartmentPopoverOpen] = useState(false); const [newDepartmentName, setNewDepartmentName] = useState<string>(""); const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS); // Get vendor details const vendor = useMemo(() => { return MOCK_VENDORS.find((v) => v.id === selectedVendor); }, [selectedVendor]); // Get vendor's product catalog const vendorProducts = useMemo(() => { if (isWriteInVendor) return []; if (!selectedVendor) return []; return VENDOR_CATALOGS[selectedVendor] || []; }, [selectedVendor, isWriteInVendor]); // Filter vendor products by code search const filteredVendorProducts = useMemo(() => { if (!vendorCodeSearch.trim()) return vendorProducts; const search = vendorCodeSearch.toLowerCase(); return vendorProducts.filter( (p) => p.name.toLowerCase().includes(search) || p.vendor_code?.toLowerCase().includes(search) ); }, [vendorProducts, vendorCodeSearch]); // Add new department const handleAddDepartment = () => { if (!newDepartmentName.trim()) { alert("Please enter a department name"); return; } if (departments.includes(newDepartmentName.trim())) { alert("This department already exists"); return; } const updated = [...departments, newDepartmentName.trim()]; setDepartments(updated); setSelectedDepartment(newDepartmentName.trim()); setNewDepartmentName(""); setDepartmentPopoverOpen(false); }; // Calculate totals const totals = useMemo(() => { const subtotal = lineItems.reduce( (sum, item) => sum + item.quantity * item.unit_price, 0, ); const tax = subtotal * 0.08; const total = subtotal + tax; return { subtotal, tax, total }; }, [lineItems]); // Add line item const addLineItem = () => { if (!newProduct) { alert("Please select a product"); return; } const product = vendorProducts.find((p) => p.id === newProduct) || MOCK_PRODUCTS.find((p) => p.id === newProduct); if (!product) return; const newItem: LineItem = { id: `line-${Date.now()}`, product_id: product.id, product_name: product.name, quantity: newQuantity, unit: product.unit, unit_price: newPrice || product.last_price, vendor_code: (product as any).vendor_code, }; setLineItems([...lineItems, newItem]); setNewProduct(""); setNewQuantity(1); setNewPrice(0); }; // Remove line item const removeLineItem = (id: string) => { setLineItems(lineItems.filter((item) => item.id !== id)); }; // Submit order const handleSubmit = async () => { if ( (!selectedVendor && !isWriteInVendor) || lineItems.length === 0 || !selectedDepartment || !selectedGLCode ) { alert("Please select a vendor, department, GL code, and add line items"); return; } if (isWriteInVendor && !writeInVendorName.trim()) { alert("Please enter vendor name"); return; } const vendorInfo = isWriteInVendor ? { name: writeInVendorName, link: writeInVendorLink } : vendor; console.log({ vendor_id: selectedVendor ||"write-in", vendor_info: vendorInfo, outlet_id: currentOutlet?.id, delivery_date: deliveryDate, department: selectedDepartment, gl_code: selectedGLCode, notes: notes, lines: lineItems, total: totals.total, }); setShowSuccess(true); setTimeout(() => { setShowSuccess(false); setSelectedVendor(""); setIsWriteInVendor(false); setWriteInVendorName(""); setWriteInVendorLink(""); setDeliveryDate(""); setSelectedDepartment(""); setSelectedGLCode(""); setNotes(""); setLineItems([]); setVendorCodeSearch(""); }, 3000); }; return ( <AppLayout> <div className="space-y-6"> <div> <h1 className="text-3xl font-bold flex items-center gap-2"> <FileText className="h-8 w-8" /> Create Purchase Order </h1> <p className="text-slate-400 mt-2"> Place a new order for {currentOutlet?.name ||"your outlet"} </p> </div> {showSuccess && ( <Alert className="border-green-200/30 bg-green-500/5"> <CheckCircle2 className="h-4 w-4 text-green-600" /> <AlertDescription className="text-green-600"> Purchase order created successfully and sent for approval </AlertDescription> </Alert> )} <div className="grid gap-6 lg:grid-cols-4"> {/* Main Content - Items focus */} <div className="lg:col-span-3 space-y-6"> {/* Order Details - Compact */} <Card className="border-border bg-surface"> <CardHeader> <CardTitle className="text-lg">Order Details</CardTitle> </CardHeader> <CardContent className="space-y-4"> {/* Row 1: Vendor & Delivery */} <div className="grid grid-cols-2 gap-4"> <div> <label className="text-sm font-medium">Vendor</label> {!isWriteInVendor ? ( <div className="space-y-2 mt-2"> <Select value={selectedVendor} onValueChange={setSelectedVendor} > <SelectTrigger className="bg-slate-800 border-slate-600"> <SelectValue placeholder="Select a vendor..." /> </SelectTrigger> <SelectContent className="bg-slate-800 border-slate-600"> {MOCK_VENDORS.map((v) => ( <SelectItem key={v.id} value={v.id}> {v.name} </SelectItem> ))} <SelectItem value="write-in"> + Write-in Vendor </SelectItem> </SelectContent> </Select> {selectedVendor ==="write-in" && ( <Button variant="outline" size="sm" onClick={() => { setIsWriteInVendor(true); setSelectedVendor(""); }} className="w-full border-slate-600" > Continue to Write-in </Button> )} </div> ) : ( <div className="space-y-2 mt-2"> <Input value={writeInVendorName} onChange={(e) => setWriteInVendorName(e.target.value)} placeholder="Vendor name..." className="bg-slate-800 border-slate-600 text-sm" /> <Input value={writeInVendorLink} onChange={(e) => setWriteInVendorLink(e.target.value)} placeholder="Vendor link (optional)" className="bg-slate-800 border-slate-600 text-sm" /> <Button variant="outline" size="sm" onClick={() => { setIsWriteInVendor(false); setWriteInVendorName(""); setWriteInVendorLink(""); }} className="w-full border-slate-600 text-xs" > Use Registered Vendor </Button> </div> )} </div> <div> <label className="text-sm font-medium"> Expected Delivery </label> <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="bg-slate-800 border-slate-600 mt-2" /> </div> </div> {/* Row 2: Department & GL Code */} <div className="grid grid-cols-2 gap-4"> <div> <label className="text-sm font-medium">Department</label> <div className="flex gap-2 mt-2"> <Select value={selectedDepartment} onValueChange={setSelectedDepartment} > <SelectTrigger className="bg-slate-800 border-slate-600"> <SelectValue placeholder="Select department..." /> </SelectTrigger> <SelectContent className="bg-slate-800 border-slate-600"> {departments.map((dept) => ( <SelectItem key={dept} value={dept}> {dept} </SelectItem> ))} </SelectContent> </Select> <Popover open={departmentPopoverOpen} onOpenChange={setDepartmentPopoverOpen} > <PopoverTrigger asChild> <Button variant="outline" size="sm" className="border-slate-600" > <Plus className="h-4 w-4" /> </Button> </PopoverTrigger> <PopoverContent className="w-80 bg-surface border border-border p-4"> <div className="space-y-4"> <h3 className="font-semibold text-sm"> Create New Department </h3> <div> <label className="text-xs font-medium text-slate-300 block mb-2"> Department Name </label> <Input value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value) } placeholder="Enter department name..." className="bg-slate-800 border-slate-600 text-sm" autoFocus onKeyDown={(e) => { if (e.key ==="Enter") { handleAddDepartment(); } }} /> </div> <div className="flex gap-2 justify-end"> <Button variant="outline" size="sm" onClick={() => { setNewDepartmentName(""); setDepartmentPopoverOpen(false); }} className="border-slate-600 text-xs" > Cancel </Button> <Button size="sm" onClick={handleAddDepartment} className="bg-primary text-xs" > Create </Button> </div> </div> </PopoverContent> </Popover> </div> </div> <div> <label className="text-sm font-medium">GL Code</label> <Select value={selectedGLCode} onValueChange={setSelectedGLCode} > <SelectTrigger className="bg-slate-800 border-slate-600 mt-2"> <SelectValue placeholder="Select GL code..." /> </SelectTrigger> <SelectContent className="bg-slate-800 border-slate-600"> {GL_CODES.map((glCode) => ( <SelectItem key={glCode.code} value={glCode.code}> {glCode.code} - {glCode.name} </SelectItem> ))} </SelectContent> </Select> </div> </div> {/* Add Items Section - Inside Order Details */} {!isWriteInVendor && selectedVendor && ( <div className="border-t border-border pt-4"> <h3 className="text-sm font-semibold mb-3"> Add Items from {vendor?.name} Catalog </h3> <div className="space-y-3"> <div> <label className="text-xs font-medium text-slate-300"> Search by product name or vendor code </label> <Input value={vendorCodeSearch} onChange={(e) => setVendorCodeSearch(e.target.value)} placeholder="Search products..." className="bg-slate-800 border-slate-600 mt-1 text-sm" /> </div> <div className="grid grid-cols-12 gap-2"> <div className="col-span-5"> <label className="text-xs font-medium">Product</label> <Select value={newProduct} onValueChange={setNewProduct} > <SelectTrigger className="bg-slate-800 border-slate-600 mt-1 text-sm"> <SelectValue placeholder="Select..." /> </SelectTrigger> <SelectContent className="bg-slate-800 border-slate-600"> {filteredVendorProducts.map((p) => ( <SelectItem key={p.id} value={p.id}> <span className="text-xs"> {p.name} {p.vendor_code && ( <span className="text-slate-400"> {""} ({p.vendor_code}) </span> )} </span> </SelectItem> ))} </SelectContent> </Select> </div> <div className="col-span-2"> <label className="text-xs font-medium">Qty</label> <Input type="number" min="1" value={newQuantity} onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1) } className="bg-slate-800 border-slate-600 mt-1 text-sm" /> </div> <div className="col-span-2"> <label className="text-xs font-medium">Price</label> <Input type="number" min="0" step="0.01" value={newPrice ||""} onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0) } placeholder={ vendorProducts.find((p) => p.id === newProduct) ?.last_price.toFixed(2) ||"0.00" } className="bg-slate-800 border-slate-600 mt-1 text-sm" /> </div> <div className="col-span-3 flex items-end"> <Button onClick={addLineItem} size="sm" className="w-full text-xs" > <Plus className="h-3 w-3 mr-1" /> Add </Button> </div> </div> </div> </div> )} </CardContent> </Card> {/* Line Items Table - Main Focus */} <Card className="border-border bg-surface"> <CardHeader> <CardTitle className="text-lg"> Items ({lineItems.length}) </CardTitle> </CardHeader> <CardContent> {lineItems.length === 0 ? ( <div className="text-center py-8"> <p className="text-slate-400 text-sm"> No items added yet. Add items from vendor catalog above. </p> </div> ) : ( <div className="overflow-x-auto"> <Table> <TableHeader> <TableRow className="hover:bg-transparent"> <TableHead className="text-slate-300"> Product </TableHead> <TableHead className="text-slate-300"> Vendor Code </TableHead> <TableHead className="text-right text-slate-300"> Qty </TableHead> <TableHead className="text-right text-slate-300"> Unit </TableHead> <TableHead className="text-right text-slate-300"> Price </TableHead> <TableHead className="text-right text-slate-300"> Total </TableHead> <TableHead className="text-right text-slate-300"> Action </TableHead> </TableRow> </TableHeader> <TableBody> {lineItems.map((item) => ( <TableRow key={item.id} className="hover:bg-slate-800/30" > <TableCell className="font-medium"> {item.product_name} </TableCell> <TableCell className="text-sm text-slate-400"> {item.vendor_code ||"-"} </TableCell> <TableCell className="text-right"> {item.quantity} </TableCell> <TableCell className="text-right"> {item.unit} </TableCell> <TableCell className="text-right"> ${item.unit_price.toFixed(2)} </TableCell> <TableCell className="text-right font-semibold"> $ {(item.quantity * item.unit_price).toFixed(2)} </TableCell> <TableCell className="text-right"> <Button variant="ghost" size="sm" onClick={() => removeLineItem(item.id)} > <Trash2 className="h-4 w-4 text-red-400" /> </Button> </TableCell> </TableRow> ))} </TableBody> </Table> </div> )} </CardContent> </Card> </div> {/* Sidebar - Order Summary & Notes */} <div className="space-y-6"> {/* Order Summary */} <Card className="border-border bg-surface sticky top-6"> <CardHeader> <CardTitle className="text-base">Order Summary</CardTitle> </CardHeader> <CardContent className="space-y-4"> <div className="space-y-2"> <div className="flex justify-between text-sm"> <span className="text-slate-400">Subtotal</span> <span className="font-medium"> ${totals.subtotal.toFixed(2)} </span> </div> <div className="flex justify-between text-sm"> <span className="text-slate-400">Tax (8%)</span> <span className="font-medium"> ${totals.tax.toFixed(2)} </span> </div> </div> <div className="border-b border-border"></div> <div className="flex justify-between text-lg font-bold"> <span>Total</span> <span className="text-green-400"> ${totals.total.toFixed(2)} </span> </div> {vendor && ( <div className="bg-slate-800/40 rounded p-3 border border-border"> <p className="text-xs text-slate-400">Payment Terms</p> <Badge variant="outline" className="mt-2"> {vendor.payment_terms.replace(/_/g,"").toUpperCase()} </Badge> </div> )} <Button onClick={handleSubmit} disabled={ (!selectedVendor && !isWriteInVendor) || lineItems.length === 0 || !selectedDepartment || !selectedGLCode } className="w-full bg-primary text-primary-foreground" > <Send className="h-4 w-4 mr-2" /> Send for Approval </Button> {((!selectedVendor && !isWriteInVendor) || lineItems.length === 0 || !selectedDepartment || !selectedGLCode) && ( <p className="text-xs text-amber-600 text-center"> Complete all required fields </p> )} </CardContent> </Card> {/* Notes Section */} <Card className="border-border bg-surface"> <CardHeader> <CardTitle className="text-sm">Notes</CardTitle> </CardHeader> <CardContent> <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes for this purchase order..." className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" rows={4} /> </CardContent> </Card> </div> </div> </div> </AppLayout> );
}
