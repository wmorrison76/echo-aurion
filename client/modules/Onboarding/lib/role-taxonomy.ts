export type RoleCategoryId =
  | "ownership"
  | "executive"
  | "finance"
  | "purchasing"
  | "culinary"
  | "banquets"
  | "foh"
  | "beverage"
  | "rooms"
  | "spa"
  | "security"
  | "it-admin";

export interface RoleCategory {
  id: RoleCategoryId;
  label: string;
}

export interface RoleDefinition {
  id: string;
  label: string;
  categoryId: RoleCategoryId;
}

export const ROLE_CATEGORIES: RoleCategory[] = [
  { id: "ownership", label: "Ownership & Board" },
  { id: "executive", label: "Executive Committee" },
  { id: "finance", label: "Finance" },
  { id: "purchasing", label: "Purchasing & Receiving" },
  { id: "culinary", label: "Culinary" },
  { id: "banquets", label: "Banquets" },
  { id: "foh", label: "Front of House" },
  { id: "beverage", label: "Beverage" },
  { id: "rooms", label: "Rooms & Hotel Ops" },
  { id: "spa", label: "Spa & Wellness" },
  { id: "security", label: "Security" },
  { id: "it-admin", label: "IT & Admin" },
];

export const ROLE_TAXONOMY: RoleDefinition[] = [
  { id: "owner", label: "Owner", categoryId: "ownership" },
  { id: "co-owner", label: "Co-Owner", categoryId: "ownership" },
  { id: "board-chair", label: "Board Chair", categoryId: "ownership" },
  { id: "board-member", label: "Board Member", categoryId: "ownership" },
  {
    id: "investor-partner",
    label: "Investor / PE Partner",
    categoryId: "ownership",
  },
  {
    id: "ceo",
    label: "Chief Executive Officer (CEO)",
    categoryId: "executive",
  },
  {
    id: "coo",
    label: "Chief Operating Officer (COO)",
    categoryId: "executive",
  },
  {
    id: "cfo",
    label: "Chief Financial Officer (CFO)",
    categoryId: "executive",
  },
  {
    id: "cio-cto",
    label: "Chief Information/Technology Officer (CIO/CTO)",
    categoryId: "executive",
  },
  { id: "cro", label: "Chief Revenue Officer (CRO)", categoryId: "executive" },
  { id: "vp-operations", label: "VP of Operations", categoryId: "executive" },
  { id: "vp-fb", label: "VP of Food & Beverage", categoryId: "executive" },
  { id: "controller", label: "Controller", categoryId: "finance" },
  { id: "finance-manager", label: "Finance Manager", categoryId: "finance" },
  {
    id: "ap-specialist",
    label: "Accounts Payable Specialist",
    categoryId: "finance",
  },
  {
    id: "ar-specialist",
    label: "Accounts Receivable Specialist",
    categoryId: "finance",
  },
  { id: "payroll-manager", label: "Payroll Manager", categoryId: "finance" },
  { id: "cost-analyst", label: "Cost Analyst", categoryId: "finance" },
  {
    id: "purchasing-director",
    label: "Director of Purchasing",
    categoryId: "purchasing",
  },
  {
    id: "purchasing-manager",
    label: "Purchasing Manager",
    categoryId: "purchasing",
  },
  {
    id: "receiving-manager",
    label: "Receiving Manager",
    categoryId: "purchasing",
  },
  {
    id: "storeroom-manager",
    label: "Storeroom Manager",
    categoryId: "purchasing",
  },
  {
    id: "inventory-control",
    label: "Inventory Control Specialist",
    categoryId: "purchasing",
  },
  { id: "executive-chef", label: "Executive Chef", categoryId: "culinary" },
  { id: "chef-de-cuisine", label: "Chef de Cuisine", categoryId: "culinary" },
  { id: "sous-chef", label: "Sous Chef", categoryId: "culinary" },
  { id: "lead-line-cook", label: "Lead Line Cook", categoryId: "culinary" },
  { id: "line-cook", label: "Line Cook", categoryId: "culinary" },
  { id: "butcher", label: "Butcher", categoryId: "culinary" },
  { id: "pastry-chef", label: "Pastry Chef", categoryId: "culinary" },
  { id: "garde-manger", label: "Garde Manger", categoryId: "culinary" },
  { id: "prep-cook", label: "Prep Cook", categoryId: "culinary" },
  { id: "steward", label: "Steward / Dishwasher", categoryId: "culinary" },
  {
    id: "banquets-director",
    label: "Director of Banquets",
    categoryId: "banquets",
  },
  { id: "banquets-manager", label: "Banquet Manager", categoryId: "banquets" },
  { id: "banquet-captain", label: "Banquet Captain", categoryId: "banquets" },
  { id: "banquet-chef", label: "Banquet Chef", categoryId: "banquets" },
  { id: "banquet-steward", label: "Banquet Steward", categoryId: "banquets" },
  { id: "gm", label: "General Manager (GM)", categoryId: "foh" },
  { id: "agm", label: "Assistant General Manager (AGM)", categoryId: "foh" },
  { id: "restaurant-manager", label: "Restaurant Manager", categoryId: "foh" },
  { id: "floor-manager", label: "Floor Manager", categoryId: "foh" },
  { id: "server", label: "Server", categoryId: "foh" },
  { id: "bartender", label: "Bartender", categoryId: "foh" },
  { id: "host", label: "Host", categoryId: "foh" },
  { id: "runner", label: "Runner", categoryId: "foh" },
  { id: "busser", label: "Busser", categoryId: "foh" },
  {
    id: "beverage-director",
    label: "Beverage Director",
    categoryId: "beverage",
  },
  { id: "sommelier", label: "Sommelier", categoryId: "beverage" },
  { id: "bar-manager", label: "Bar Manager", categoryId: "beverage" },
  { id: "head-bartender", label: "Head Bartender", categoryId: "beverage" },
  { id: "barback", label: "Barback", categoryId: "beverage" },
  { id: "rooms-director", label: "Director of Rooms", categoryId: "rooms" },
  {
    id: "front-desk-manager",
    label: "Front Desk Manager",
    categoryId: "rooms",
  },
  { id: "front-desk-agent", label: "Front Desk Agent", categoryId: "rooms" },
  {
    id: "housekeeping-manager",
    label: "Housekeeping Manager",
    categoryId: "rooms",
  },
  { id: "housekeeper", label: "Housekeeper", categoryId: "rooms" },
  {
    id: "engineering-manager",
    label: "Engineering Manager",
    categoryId: "rooms",
  },
  {
    id: "maintenance-tech",
    label: "Maintenance Technician",
    categoryId: "rooms",
  },
  { id: "spa-director", label: "Spa Director", categoryId: "spa" },
  { id: "spa-manager", label: "Spa Manager", categoryId: "spa" },
  { id: "lead-therapist", label: "Lead Therapist", categoryId: "spa" },
  { id: "therapist", label: "Therapist", categoryId: "spa" },
  { id: "fitness-instructor", label: "Fitness Instructor", categoryId: "spa" },
  {
    id: "security-director",
    label: "Security Director",
    categoryId: "security",
  },
  { id: "security-manager", label: "Security Manager", categoryId: "security" },
  { id: "security-officer", label: "Security Officer", categoryId: "security" },
  { id: "it-director", label: "IT Director", categoryId: "it-admin" },
  {
    id: "systems-admin",
    label: "Systems Administrator",
    categoryId: "it-admin",
  },
  { id: "app-admin", label: "Application Admin", categoryId: "it-admin" },
  { id: "hr-admin", label: "HR / Admin", categoryId: "it-admin" },
  { id: "superadmin", label: "SuperAdmin", categoryId: "it-admin" },
];

export const ROLE_LABELS = new Map(
  ROLE_TAXONOMY.map((role) => [role.id, role.label]),
);

export function getRoleLabel(roleId: string) {
  return ROLE_LABELS.get(roleId) ?? roleId;
}
