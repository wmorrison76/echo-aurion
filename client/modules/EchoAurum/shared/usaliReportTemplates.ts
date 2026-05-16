/** * USALI Report Templates * Uniform System of Accounts for the Lodging Industry (USALI 11) * 10 hospitality-specific report templates for hotels, restaurants, and multi-outlet operations */ export type USALIReportType =

    | "room-revenue"
    | "fb-revenue"
    | "labor-analysis"
    | "departmental-pl"
    | "operating-expenses"
    | "cost-of-sales"
    | "guest-summary"
    | "departmental-profit"
    | "banquet-profitability"
    | "cash-position";
export interface USALITemplateDefinition {
  id: USALIReportType;
  name: string;
  description: string;
  category: "revenue" | "expense" | "profitability" | "summary" | "operations";
  applicableTo: ("hotel" | "restaurant" | "spa" | "entertainment" | "all")[];
  glAccountMappings: {
    section: string;
    rows: Array<{
      label: string;
      accountCodes: string[];
      operation: "sum" | "difference" | "average" | "percentage";
      parentSectionId?: string;
      isSubtotal?: boolean;
      isPercentageBase?: boolean;
    }>;
  }[];
  metrics: Array<{ name: string; formula: string; description: string }>;
  drillDownCapability:
    | "gl-accounts"
    | "cost-centers"
    | "departments"
    | "daily-detail"
    | "transaction-level";
  exportFormats: ("pdf" | "excel" | "csv")[];
}
export const USALI_TEMPLATES: Record<USALIReportType, USALITemplateDefinition> =
  {
    "room-revenue": {
      id: "room-revenue",
      name: "Room Revenue by Type",
      description:
        "Detailed breakdown of room revenue by room type, rate category, and occupancy metrics",
      category: "revenue",
      applicableTo: ["hotel", "all"],
      glAccountMappings: [
        {
          section: "Room Revenue",
          rows: [
            {
              label: "Single Room Revenue",
              accountCodes: ["4100"],
              operation: "sum",
              parentSectionId: "room-revenue-section",
            },
            {
              label: "Double Room Revenue",
              accountCodes: ["4101"],
              operation: "sum",
              parentSectionId: "room-revenue-section",
            },
            {
              label: "Suite Revenue",
              accountCodes: ["4102"],
              operation: "sum",
              parentSectionId: "room-revenue-section",
            },
            {
              label: "Upgrade/Comp Revenue",
              accountCodes: ["4103"],
              operation: "sum",
              parentSectionId: "room-revenue-section",
            },
            {
              label: "Total Room Revenue",
              accountCodes: ["4100", "4101", "4102", "4103"],
              operation: "sum",
              isSubtotal: true,
              parentSectionId: "room-revenue-section",
            },
          ],
        },
        {
          section: "Room Taxes",
          rows: [
            {
              label: "Room Tax - Occupied",
              accountCodes: ["4200"],
              operation: "sum",
            },
            {
              label: "Room Tax - Sales Tax",
              accountCodes: ["4201"],
              operation: "sum",
            },
            {
              label: "Total Room Taxes",
              accountCodes: ["4200", "4201"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "Room Allowances",
          rows: [
            {
              label: "House Use Allowance",
              accountCodes: ["4300"],
              operation: "sum",
            },
            {
              label: "Promotional Allowance",
              accountCodes: ["4301"],
              operation: "sum",
            },
            {
              label: "Complimentary Allowance",
              accountCodes: ["4302"],
              operation: "sum",
            },
            {
              label: "Total Allowances",
              accountCodes: ["4300", "4301", "4302"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
      ],
      metrics: [
        {
          name: "Average Daily Rate (ADR)",
          formula: "Total Room Revenue / Number of Rooms Sold",
          description: "Average revenue per occupied room",
        },
        {
          name: "Revenue per Available Room (RevPAR)",
          formula: "Total Room Revenue / Total Available Rooms",
          description: "Revenue efficiency metric",
        },
        {
          name: "Occupancy %",
          formula: "Rooms Sold / Total Available Rooms * 100",
          description: "Percentage of rooms occupied",
        },
      ],
      drillDownCapability: "daily-detail",
      exportFormats: ["pdf", "excel", "csv"],
    },
    "fb-revenue": {
      id: "fb-revenue",
      name: "Food & Beverage Revenue by Department",
      description:
        "Food and beverage revenue breakdown by restaurant, room service, bar, and banquet operations",
      category: "revenue",
      applicableTo: ["hotel", "restaurant", "all"],
      glAccountMappings: [
        {
          section: "Food Revenue",
          rows: [
            {
              label: "Restaurant Food Revenue",
              accountCodes: ["4410"],
              operation: "sum",
            },
            {
              label: "Room Service Food Revenue",
              accountCodes: ["4411"],
              operation: "sum",
            },
            {
              label: "Banquet Food Revenue",
              accountCodes: ["4412"],
              operation: "sum",
            },
            {
              label: "Total Food Revenue",
              accountCodes: ["4410", "4411", "4412"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "Beverage Revenue",
          rows: [
            {
              label: "Restaurant Beverage Revenue",
              accountCodes: ["4420"],
              operation: "sum",
            },
            { label: "Bar Revenue", accountCodes: ["4421"], operation: "sum" },
            {
              label: "Room Service Beverage Revenue",
              accountCodes: ["4422"],
              operation: "sum",
            },
            {
              label: "Banquet Beverage Revenue",
              accountCodes: ["4423"],
              operation: "sum",
            },
            {
              label: "Total Beverage Revenue",
              accountCodes: ["4420", "4421", "4422", "4423"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "F&B Taxes",
          rows: [
            { label: "Food Tax", accountCodes: ["4430"], operation: "sum" },
            { label: "Beverage Tax", accountCodes: ["4431"], operation: "sum" },
          ],
        },
        {
          section: "F&B Allowances",
          rows: [
            {
              label: "Complimentary Food & Beverage",
              accountCodes: ["4440"],
              operation: "sum",
            },
            {
              label: "Employee Meal",
              accountCodes: ["4441"],
              operation: "sum",
            },
          ],
        },
      ],
      metrics: [
        {
          name: "F&B Revenue % of Total Revenue",
          formula: "Total F&B Revenue / Total Hotel Revenue * 100",
          description: "F&B contribution to overall revenue",
        },
        {
          name: "Average Check",
          formula: "F&B Revenue / Number of Covers",
          description: "Average revenue per guest transaction",
        },
        {
          name: "F&B Cost %",
          formula: "Cost of Food & Beverage / F&B Revenue * 100",
          description: "Cost of goods as percentage of revenue",
        },
      ],
      drillDownCapability: "cost-centers",
      exportFormats: ["pdf", "excel", "csv"],
    },
    "labor-analysis": {
      id: "labor-analysis",
      name: "Labor Analysis by Department",
      description:
        "Detailed labor expense breakdown by department, including salary, wages, benefits, and taxes",
      category: "expense",
      applicableTo: ["hotel", "restaurant", "spa", "all"],
      glAccountMappings: [
        {
          section: "Salaries & Wages",
          rows: [
            {
              label: "Management Salaries",
              accountCodes: ["5000"],
              operation: "sum",
            },
            {
              label: "Hourly Wages - Front Office",
              accountCodes: ["5010"],
              operation: "sum",
            },
            {
              label: "Hourly Wages - Housekeeping",
              accountCodes: ["5011"],
              operation: "sum",
            },
            {
              label: "Hourly Wages - Food Service",
              accountCodes: ["5012"],
              operation: "sum",
            },
            {
              label: "Hourly Wages - Bar",
              accountCodes: ["5013"],
              operation: "sum",
            },
            {
              label: "Hourly Wages - Administrative",
              accountCodes: ["5014"],
              operation: "sum",
            },
            {
              label: "Total Salaries & Wages",
              accountCodes: ["5000", "5010", "5011", "5012", "5013", "5014"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "Benefits & Taxes",
          rows: [
            {
              label: "Payroll Taxes",
              accountCodes: ["5100"],
              operation: "sum",
            },
            {
              label: "Health Insurance",
              accountCodes: ["5101"],
              operation: "sum",
            },
            {
              label: "Workers Compensation",
              accountCodes: ["5102"],
              operation: "sum",
            },
            {
              label: "Retirement Benefits",
              accountCodes: ["5103"],
              operation: "sum",
            },
            {
              label: "Total Benefits & Taxes",
              accountCodes: ["5100", "5101", "5102", "5103"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "Other Labor Costs",
          rows: [
            {
              label: "Training & Development",
              accountCodes: ["5200"],
              operation: "sum",
            },
            { label: "Uniforms", accountCodes: ["5201"], operation: "sum" },
            {
              label: "Total Other Labor Costs",
              accountCodes: ["5200", "5201"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
      ],
      metrics: [
        {
          name: "Labor % of Revenue",
          formula: "Total Labor Cost / Total Revenue * 100",
          description: "Labor as percentage of revenue (optimal: 28-32%)",
        },
        {
          name: "Labor Cost per Room",
          formula: "Total Labor Cost / Number of Rooms",
          description: "Labor cost efficiency per room sold",
        },
        {
          name: "FTE Count",
          formula: "Total Hours / 2080",
          description: "Full-time equivalent staffing level",
        },
      ],
      drillDownCapability: "departments",
      exportFormats: ["pdf", "excel", "csv"],
    },
    "departmental-pl": {
      id: "departmental-pl",
      name: "Departmental Profit & Loss",
      description:
        "P&L statement by department (Rooms, F&B, Spa, etc.) showing revenue, COGS, and departmental profit",
      category: "profitability",
      applicableTo: ["hotel", "restaurant", "spa", "all"],
      glAccountMappings: [
        {
          section: "Rooms Department",
          rows: [
            {
              label: "Rooms Revenue",
              accountCodes: ["4100", "4101", "4102", "4103"],
              operation: "sum",
            },
            { label: "Rooms COGS", accountCodes: ["6010"], operation: "sum" },
            {
              label: "Rooms Gross Profit",
              accountCodes: ["4100", "4101", "4102", "4103", "6010"],
              operation: "difference",
              isSubtotal: true,
              isPercentageBase: true,
            },
            {
              label: "Rooms Labor",
              accountCodes: ["5000", "5010"],
              operation: "sum",
            },
            {
              label: "Rooms Operating Income",
              accountCodes: [
                "4100",
                "4101",
                "4102",
                "4103",
                "6010",
                "5000",
                "5010",
              ],
              operation: "difference",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "F&B Department",
          rows: [
            {
              label: "F&B Revenue",
              accountCodes: [
                "4410",
                "4411",
                "4412",
                "4420",
                "4421",
                "4422",
                "4423",
              ],
              operation: "sum",
            },
            { label: "F&B COGS", accountCodes: ["6011"], operation: "sum" },
            {
              label: "F&B Gross Profit",
              accountCodes: [
                "4410",
                "4411",
                "4412",
                "4420",
                "4421",
                "4422",
                "4423",
                "6011",
              ],
              operation: "difference",
              isSubtotal: true,
              isPercentageBase: true,
            },
            {
              label: "F&B Labor",
              accountCodes: ["5012", "5013"],
              operation: "sum",
            },
            {
              label: "F&B Operating Income",
              accountCodes: [
                "4410",
                "4411",
                "4412",
                "4420",
                "4421",
                "4422",
                "4423",
                "6011",
                "5012",
                "5013",
              ],
              operation: "difference",
              isSubtotal: true,
            },
          ],
        },
      ],
      metrics: [
        {
          name: "Departmental Profit Margin %",
          formula: "Departmental Operating Income / Departmental Revenue * 100",
          description: "Profit margin by department",
        },
        {
          name: "Contribution Margin %",
          formula: "Departmental Gross Profit / Departmental Revenue * 100",
          description: "Contribution after COGS",
        },
      ],
      drillDownCapability: "cost-centers",
      exportFormats: ["pdf", "excel", "csv"],
    },
    "operating-expenses": {
      id: "operating-expenses",
      name: "Operating Expenses by Category",
      description:
        "Detailed operating expense breakdown including utilities, maintenance, marketing, supplies, and commissions",
      category: "expense",
      applicableTo: ["hotel", "restaurant", "spa", "all"],
      glAccountMappings: [
        {
          section: "Administrative & General",
          rows: [
            {
              label: "Executive Salaries",
              accountCodes: ["7000"],
              operation: "sum",
            },
            {
              label: "Office Supplies",
              accountCodes: ["7010"],
              operation: "sum",
            },
            {
              label: "Professional Fees",
              accountCodes: ["7020"],
              operation: "sum",
            },
            {
              label: "Total Administrative & General",
              accountCodes: ["7000", "7010", "7020"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "Utilities",
          rows: [
            { label: "Electricity", accountCodes: ["7100"], operation: "sum" },
            { label: "Gas", accountCodes: ["7101"], operation: "sum" },
            {
              label: "Water & Sewer",
              accountCodes: ["7102"],
              operation: "sum",
            },
            {
              label: "Total Utilities",
              accountCodes: ["7100", "7101", "7102"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "Marketing & Sales",
          rows: [
            { label: "Advertising", accountCodes: ["7200"], operation: "sum" },
            { label: "Promotions", accountCodes: ["7201"], operation: "sum" },
            {
              label: "Commission - Travel Agents",
              accountCodes: ["7210"],
              operation: "sum",
            },
            {
              label: "Total Marketing & Sales",
              accountCodes: ["7200", "7201", "7210"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "Maintenance & Repairs",
          rows: [
            {
              label: "Routine Maintenance",
              accountCodes: ["7300"],
              operation: "sum",
            },
            {
              label: "Equipment Repairs",
              accountCodes: ["7301"],
              operation: "sum",
            },
            { label: "Supplies", accountCodes: ["7302"], operation: "sum" },
            {
              label: "Total Maintenance & Repairs",
              accountCodes: ["7300", "7301", "7302"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
      ],
      metrics: [
        {
          name: "Operating Expense % of Revenue",
          formula: "Total Operating Expenses / Total Revenue * 100",
          description: "Operating expense ratio",
        },
        {
          name: "Controllable Expense %",
          formula: "Controllable Expenses / Revenue * 100",
          description: "Expenses controllable by management",
        },
      ],
      drillDownCapability: "cost-centers",
      exportFormats: ["pdf", "excel", "csv"],
    },
    "cost-of-sales": {
      id: "cost-of-sales",
      name: "Cost of Sales Analysis",
      description:
        "Detailed cost of goods sold analysis showing actual vs. theoretical costs and variance percentage",
      category: "expense",
      applicableTo: ["hotel", "restaurant", "all"],
      glAccountMappings: [
        {
          section: "Food Cost",
          rows: [
            { label: "Food COGS", accountCodes: ["6011"], operation: "sum" },
            {
              label: "Food Revenue",
              accountCodes: ["4410", "4411", "4412"],
              operation: "sum",
              isPercentageBase: true,
            },
            {
              label: "Food Cost %",
              accountCodes: ["6011"],
              operation: "percentage",
            },
          ],
        },
        {
          section: "Beverage Cost",
          rows: [
            {
              label: "Beverage COGS",
              accountCodes: ["6012"],
              operation: "sum",
            },
            {
              label: "Beverage Revenue",
              accountCodes: ["4420", "4421", "4422", "4423"],
              operation: "sum",
              isPercentageBase: true,
            },
            {
              label: "Beverage Cost %",
              accountCodes: ["6012"],
              operation: "percentage",
            },
          ],
        },
        {
          section: "Total Cost of Sales",
          rows: [
            {
              label: "Total COGS",
              accountCodes: ["6010", "6011", "6012"],
              operation: "sum",
            },
            {
              label: "Total Revenue",
              accountCodes: ["4100", "4410", "4420"],
              operation: "sum",
              isPercentageBase: true,
            },
            {
              label: "Total COGS %",
              accountCodes: ["6010", "6011", "6012"],
              operation: "percentage",
              isSubtotal: true,
            },
          ],
        },
      ],
      metrics: [
        {
          name: "Food Cost %",
          formula: "Food COGS / Food Revenue * 100",
          description:
            "Percentage of food revenue spent on COGS (industry standard: 28-32%)",
        },
        {
          name: "Beverage Cost %",
          formula: "Beverage COGS / Beverage Revenue * 100",
          description:
            "Percentage of beverage revenue spent on COGS (industry standard: 18-24%)",
        },
        {
          name: "Food Variance %",
          formula: "(Actual COGS - Theoretical COGS) / Theoretical COGS * 100",
          description: "Variance between actual and expected food cost",
        },
      ],
      drillDownCapability: "transaction-level",
      exportFormats: ["pdf", "excel", "csv"],
    },
    "guest-summary": {
      id: "guest-summary",
      name: "Guest Summary Report",
      description:
        "Key operational metrics including ADR, RevPAR, occupancy, covers, and guest-related KPIs",
      category: "summary",
      applicableTo: ["hotel", "restaurant", "all"],
      glAccountMappings: [
        {
          section: "Room Metrics",
          rows: [
            {
              label: "Rooms Sold",
              accountCodes: ["4100", "4101", "4102", "4103"],
              operation: "sum",
            },
            { label: "Rooms Available", accountCodes: [], operation: "sum" },
            {
              label: "Total Room Revenue",
              accountCodes: ["4100", "4101", "4102", "4103"],
              operation: "sum",
            },
          ],
        },
        {
          section: "Covers Metrics",
          rows: [
            {
              label: "Covers Served",
              accountCodes: ["4410", "4411", "4412"],
              operation: "sum",
            },
            {
              label: "Total F&B Revenue",
              accountCodes: [
                "4410",
                "4411",
                "4412",
                "4420",
                "4421",
                "4422",
                "4423",
              ],
              operation: "sum",
            },
          ],
        },
      ],
      metrics: [
        {
          name: "Average Daily Rate (ADR)",
          formula: "Total Room Revenue / Rooms Sold",
          description: "Average revenue per occupied room",
        },
        {
          name: "Revenue per Available Room (RevPAR)",
          formula: "Total Room Revenue / Total Available Rooms",
          description: "Overall room revenue efficiency",
        },
        {
          name: "Occupancy %",
          formula: "Rooms Sold / Total Available Rooms * 100",
          description: "Percentage of rooms occupied",
        },
        {
          name: "Average Check",
          formula: "Total F&B Revenue / Covers Served",
          description: "Average revenue per guest transaction",
        },
      ],
      drillDownCapability: "daily-detail",
      exportFormats: ["pdf", "excel", "csv"],
    },
    "departmental-profit": {
      id: "departmental-profit",
      name: "Departmental Profitability Analysis",
      description:
        "Detailed analysis of profit margins by department with fixed vs. variable cost breakdown",
      category: "profitability",
      applicableTo: ["hotel", "restaurant", "spa", "all"],
      glAccountMappings: [
        {
          section: "Rooms Department Profitability",
          rows: [
            {
              label: "Revenue",
              accountCodes: ["4100", "4101", "4102", "4103"],
              operation: "sum",
            },
            {
              label: "Variable Costs",
              accountCodes: ["6010"],
              operation: "sum",
            },
            {
              label: "Contribution Margin",
              accountCodes: ["4100", "4101", "4102", "4103", "6010"],
              operation: "difference",
              isSubtotal: true,
            },
            {
              label: "Fixed Costs",
              accountCodes: ["5000", "5010", "7100", "7101", "7102"],
              operation: "sum",
            },
            {
              label: "Operating Profit",
              accountCodes: [
                "4100",
                "4101",
                "4102",
                "4103",
                "6010",
                "5000",
                "5010",
                "7100",
                "7101",
                "7102",
              ],
              operation: "difference",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "F&B Department Profitability",
          rows: [
            {
              label: "Revenue",
              accountCodes: [
                "4410",
                "4411",
                "4412",
                "4420",
                "4421",
                "4422",
                "4423",
              ],
              operation: "sum",
            },
            {
              label: "Variable Costs (COGS)",
              accountCodes: ["6011", "6012"],
              operation: "sum",
            },
            {
              label: "Contribution Margin",
              accountCodes: [
                "4410",
                "4411",
                "4412",
                "4420",
                "4421",
                "4422",
                "4423",
                "6011",
                "6012",
              ],
              operation: "difference",
              isSubtotal: true,
            },
            {
              label: "Fixed Costs (Labor)",
              accountCodes: ["5012", "5013"],
              operation: "sum",
            },
            {
              label: "Operating Profit",
              accountCodes: [
                "4410",
                "4411",
                "4412",
                "4420",
                "4421",
                "4422",
                "4423",
                "6011",
                "6012",
                "5012",
                "5013",
              ],
              operation: "difference",
              isSubtotal: true,
            },
          ],
        },
      ],
      metrics: [
        {
          name: "Contribution Margin %",
          formula: "Contribution Margin / Revenue * 100",
          description: "Percentage of revenue after variable costs",
        },
        {
          name: "Operating Profit Margin %",
          formula: "Operating Profit / Revenue * 100",
          description: "Profit as percentage of revenue",
        },
        {
          name: "Payback Period (Months)",
          formula: "Fixed Costs / Monthly Contribution Margin",
          description: "Months needed to recover fixed costs",
        },
      ],
      drillDownCapability: "cost-centers",
      exportFormats: ["pdf", "excel", "csv"],
    },
    "banquet-profitability": {
      id: "banquet-profitability",
      name: "Banquet & Event Profitability",
      description:
        "Profitability analysis of banquet and event operations by event type and client",
      category: "profitability",
      applicableTo: ["hotel", "restaurant", "all"],
      glAccountMappings: [
        {
          section: "Banquet Revenue",
          rows: [
            {
              label: "Banquet Food Revenue",
              accountCodes: ["4412"],
              operation: "sum",
            },
            {
              label: "Banquet Beverage Revenue",
              accountCodes: ["4423"],
              operation: "sum",
            },
            {
              label: "Banquet Service Charges",
              accountCodes: ["4424"],
              operation: "sum",
            },
            {
              label: "Total Banquet Revenue",
              accountCodes: ["4412", "4423", "4424"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "Banquet Costs",
          rows: [
            { label: "Food COGS", accountCodes: ["6011"], operation: "sum" },
            {
              label: "Beverage COGS",
              accountCodes: ["6012"],
              operation: "sum",
            },
            {
              label: "Labor - Direct",
              accountCodes: ["5012", "5013"],
              operation: "sum",
            },
            {
              label: "Total Banquet Costs",
              accountCodes: ["6011", "6012", "5012", "5013"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
      ],
      metrics: [
        {
          name: "Banquet Profit Margin %",
          formula: "(Banquet Revenue - Banquet Costs) / Banquet Revenue * 100",
          description: "Profit margin for banquet operations",
        },
        {
          name: "Cost per Cover",
          formula: "Total Banquet Costs / Number of Covers",
          description: "Average cost per guest served",
        },
        {
          name: "Revenue per Cover",
          formula: "Total Banquet Revenue / Number of Covers",
          description: "Average revenue per guest served",
        },
      ],
      drillDownCapability: "transaction-level",
      exportFormats: ["pdf", "excel", "csv"],
    },
    "cash-position": {
      id: "cash-position",
      name: "Cash Position Report",
      description:
        "Detailed cash position analysis including cash, AR, AP, and working capital metrics",
      category: "summary",
      applicableTo: ["hotel", "restaurant", "spa", "all"],
      glAccountMappings: [
        {
          section: "Current Assets",
          rows: [
            { label: "Cash", accountCodes: ["1000"], operation: "sum" },
            {
              label: "Accounts Receivable",
              accountCodes: ["1200"],
              operation: "sum",
            },
            { label: "Inventory", accountCodes: ["1300"], operation: "sum" },
            {
              label: "Total Current Assets",
              accountCodes: ["1000", "1200", "1300"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
        {
          section: "Current Liabilities",
          rows: [
            {
              label: "Accounts Payable",
              accountCodes: ["2000"],
              operation: "sum",
            },
            {
              label: "Payroll Accrual",
              accountCodes: ["2100"],
              operation: "sum",
            },
            {
              label: "Current Portion Long-Term Debt",
              accountCodes: ["2200"],
              operation: "sum",
            },
            {
              label: "Total Current Liabilities",
              accountCodes: ["2000", "2100", "2200"],
              operation: "sum",
              isSubtotal: true,
            },
          ],
        },
      ],
      metrics: [
        {
          name: "Working Capital",
          formula: "Current Assets - Current Liabilities",
          description: "Available capital for short-term operations",
        },
        {
          name: "Current Ratio",
          formula: "Current Assets / Current Liabilities",
          description:
            "Ability to pay short-term obligations (optimal: 1.5-3.0)",
        },
        {
          name: "Days Sales Outstanding (DSO)",
          formula: "Accounts Receivable / Daily Revenue",
          description: "Average days to collect receivables",
        },
        {
          name: "Days Payable Outstanding (DPO)",
          formula: "Accounts Payable / Daily COGS",
          description: "Average days to pay vendors",
        },
      ],
      drillDownCapability: "daily-detail",
      exportFormats: ["pdf", "excel", "csv"],
    },
  }; /** * Helper function to get template by ID */
export function getUSALITemplate(
  templateId: USALIReportType,
): USALITemplateDefinition | null {
  return USALI_TEMPLATES[templateId] || null;
} /** * Helper function to get all templates by category */
export function getTemplatesByCategory(
  category: USALITemplateDefinition["category"],
): USALITemplateDefinition[] {
  return Object.values(USALI_TEMPLATES).filter((t) => t.category === category);
} /** * Helper function to get templates applicable to entity type */
export function getTemplatesByEntityType(
  entityType: string,
): USALITemplateDefinition[] {
  return Object.values(USALI_TEMPLATES).filter(
    (t) =>
      t.applicableTo.includes(entityType as any) ||
      t.applicableTo.includes("all"),
  );
}
