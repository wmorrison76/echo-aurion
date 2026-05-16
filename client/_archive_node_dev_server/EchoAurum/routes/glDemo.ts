import type {
  GLAccountCode,
  GLTransaction,
  GLAccountBalance,
  GLExplorerNode,
  GLReport,
} from "@shared/gl";
const GL_CHART_OF_ACCOUNTS: GLAccountCode[] = [
  {
    code: "1000",
    name: "Cash and Cash Equivalents",
    classification: "asset",
    description: "Operating and reserve cash",
    status: "active",
    level: 1,
    isControlAccount: true,
  },
  {
    code: "1100",
    name: "Checking Accounts",
    classification: "asset",
    description: "Primary operating checking accounts",
    status: "active",
    parentCode: "1000",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "1110",
    name: "Downtown Operating Account",
    classification: "asset",
    status: "active",
    parentCode: "1100",
    level: 3,
    isControlAccount: false,
  },
  {
    code: "1120",
    name: "Bayfront Operating Account",
    classification: "asset",
    status: "active",
    parentCode: "1100",
    level: 3,
    isControlAccount: false,
  },
  {
    code: "1200",
    name: "Accounts Receivable",
    classification: "asset",
    status: "active",
    parentCode: "1000",
    level: 2,
    isControlAccount: true,
  },
  {
    code: "1210",
    name: "Room & Banquet Receivables",
    classification: "asset",
    status: "active",
    parentCode: "1200",
    level: 3,
    isControlAccount: false,
  },
  {
    code: "1500",
    name: "Property, Plant & Equipment",
    classification: "asset",
    status: "active",
    level: 1,
    isControlAccount: true,
  },
  {
    code: "1510",
    name: "Buildings & Structures",
    classification: "asset",
    status: "active",
    parentCode: "1500",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "1600",
    name: "Accumulated Depreciation",
    classification: "asset",
    status: "active",
    parentCode: "1500",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "2000",
    name: "Accounts Payable",
    classification: "liability",
    status: "active",
    level: 1,
    isControlAccount: true,
  },
  {
    code: "2100",
    name: "Vendor Payables",
    classification: "liability",
    status: "active",
    parentCode: "2000",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "2110",
    name: "Food & Beverage Payables",
    classification: "liability",
    status: "active",
    parentCode: "2100",
    level: 3,
    isControlAccount: false,
  },
  {
    code: "2120",
    name: "Service & Supply Payables",
    classification: "liability",
    status: "active",
    parentCode: "2100",
    level: 3,
    isControlAccount: false,
  },
  {
    code: "2200",
    name: "Short-term Debt",
    classification: "liability",
    status: "active",
    parentCode: "2000",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "4000",
    name: "Room Revenue",
    classification: "revenue",
    status: "active",
    level: 1,
    isControlAccount: true,
  },
  {
    code: "4010",
    name: "Room Revenue - Nightly",
    classification: "revenue",
    status: "active",
    parentCode: "4000",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "4020",
    name: "Room Revenue - Group",
    classification: "revenue",
    status: "active",
    parentCode: "4000",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "4100",
    name: "Food & Beverage Revenue",
    classification: "revenue",
    status: "active",
    level: 1,
    isControlAccount: true,
  },
  {
    code: "4110",
    name: "Restaurant Revenue",
    classification: "revenue",
    status: "active",
    parentCode: "4100",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "4120",
    name: "Banquet Revenue",
    classification: "revenue",
    status: "active",
    parentCode: "4100",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "4130",
    name: "Bar Revenue",
    classification: "revenue",
    status: "active",
    parentCode: "4100",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "4200",
    name: "Event & Other Revenue",
    classification: "revenue",
    status: "active",
    level: 1,
    isControlAccount: true,
  },
  {
    code: "4210",
    name: "Event Rental Revenue",
    classification: "revenue",
    status: "active",
    parentCode: "4200",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "5000",
    name: "Cost of Goods Sold",
    classification: "expense",
    status: "active",
    level: 1,
    isControlAccount: true,
  },
  {
    code: "5100",
    name: "Food Cost",
    classification: "expense",
    status: "active",
    parentCode: "5000",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "5200",
    name: "Beverage Cost",
    classification: "expense",
    status: "active",
    parentCode: "5000",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "5300",
    name: "Labor Expense",
    classification: "expense",
    status: "active",
    level: 1,
    isControlAccount: true,
  },
  {
    code: "5310",
    name: "Hourly Labor",
    classification: "expense",
    status: "active",
    parentCode: "5300",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "5320",
    name: "Management Salaries",
    classification: "expense",
    status: "active",
    parentCode: "5300",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "5330",
    name: "Payroll Taxes",
    classification: "expense",
    status: "active",
    parentCode: "5300",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "5400",
    name: "Operating Expense",
    classification: "expense",
    status: "active",
    level: 1,
    isControlAccount: true,
  },
  {
    code: "5410",
    name: "Utilities",
    classification: "expense",
    status: "active",
    parentCode: "5400",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "5420",
    name: "Repairs & Maintenance",
    classification: "expense",
    status: "active",
    parentCode: "5400",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "5430",
    name: "Supplies & Materials",
    classification: "expense",
    status: "active",
    parentCode: "5400",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "5440",
    name: "Marketing & Advertising",
    classification: "expense",
    status: "active",
    parentCode: "5400",
    level: 2,
    isControlAccount: false,
  },
  {
    code: "5500",
    name: "Depreciation Expense",
    classification: "expense",
    status: "active",
    level: 1,
    isControlAccount: false,
  },
];
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomAmount(base: number, variance: number): number {
  const varyAmount = base * (variance / 100);
  return base + (Math.random() - 0.5) * 2 * varyAmount;
}
function dateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}
function generateTransactions(): GLTransaction[] {
  const transactions: GLTransaction[] = [];
  const sources: GLTransaction["source"][] = [
    "opera",
    "toast",
    "vendor",
    "purchase_order",
    "manual",
  ];
  const accountsForTransactions = [
    { code: "1110", name: "Downtown Operating Account", type: "debit" },
    { code: "1120", name: "Bayfront Operating Account", type: "debit" },
    { code: "1210", name: "Room & Banquet Receivables", type: "debit" },
    { code: "2110", name: "Food & Beverage Payables", type: "credit" },
    { code: "2120", name: "Service & Supply Payables", type: "credit" },
    { code: "4010", name: "Room Revenue - Nightly", type: "credit" },
    { code: "4020", name: "Room Revenue - Group", type: "credit" },
    { code: "4110", name: "Restaurant Revenue", type: "credit" },
    { code: "4120", name: "Banquet Revenue", type: "credit" },
    { code: "4130", name: "Bar Revenue", type: "credit" },
    { code: "4210", name: "Event Rental Revenue", type: "credit" },
    { code: "5100", name: "Food Cost", type: "debit" },
    { code: "5200", name: "Beverage Cost", type: "debit" },
    { code: "5310", name: "Hourly Labor", type: "debit" },
    { code: "5320", name: "Management Salaries", type: "debit" },
    { code: "5410", name: "Utilities", type: "debit" },
    { code: "5420", name: "Repairs & Maintenance", type: "debit" },
    { code: "5430", name: "Supplies & Materials", type: "debit" },
    { code: "5440", name: "Marketing & Advertising", type: "debit" },
  ];
  for (let i = 0; i < 120; i++) {
    const account =
      accountsForTransactions[randomInt(0, accountsForTransactions.length - 1)];
    const amount = randomAmount(randomInt(500, 25000), 30);
    const daysAgo = randomInt(0, 29);
    transactions.push({
      id: `txn-${i + 1}`,
      accountCode: account.code,
      accountName: account.name,
      transactionType: account.type as "debit" | "credit",
      amount: Math.round(amount * 100) / 100,
      currency: "USD",
      postedAt: dateDaysAgo(daysAgo).toISOString(),
      source: sources[randomInt(0, sources.length - 1)],
      memo: `Transaction ${i + 1}`,
    });
  }
  return transactions;
}
function calculateAccountBalances(
  transactions: GLTransaction[],
): Map<string, GLAccountBalance> {
  const balances = new Map<string, GLAccountBalance>();
  const accountsMap = new Map(
    GL_CHART_OF_ACCOUNTS.map((acc) => [acc.code, acc]),
  );
  for (const account of GL_CHART_OF_ACCOUNTS) {
    balances.set(account.code, {
      accountCode: account.code,
      accountName: account.name,
      classification: account.classification,
      debitBalance: 0,
      creditBalance: 0,
      netBalance: 0,
      currency: "USD",
      asOf: new Date().toISOString(),
      transactionCount: 0,
    });
  }
  for (const txn of transactions) {
    const balance = balances.get(txn.accountCode);
    if (balance) {
      if (txn.transactionType === "debit") {
        balance.debitBalance += txn.amount;
      } else {
        balance.creditBalance += txn.amount;
      }
      balance.transactionCount += 1;
      if (
        balance.classification === "asset" ||
        balance.classification === "expense"
      ) {
        balance.netBalance = balance.debitBalance - balance.creditBalance;
      } else {
        balance.netBalance = balance.creditBalance - balance.debitBalance;
      }
    }
  }
  return balances;
}
function buildExplorerNode(
  code: string,
  transactions: GLTransaction[],
  balances: Map<string, GLAccountBalance>,
): GLExplorerNode | null {
  const account = GL_CHART_OF_ACCOUNTS.find((a) => a.code === code);
  const balance = balances.get(code);
  if (!account || !balance) {
    return null;
  }
  const accountTransactions = transactions
    .filter((t) => t.accountCode === code)
    .sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    )
    .slice(0, 10);
  const children = GL_CHART_OF_ACCOUNTS.filter((a) => a.parentCode === code);
  return {
    code: account.code,
    name: account.name,
    classification: account.classification,
    level: account.level,
    balance: balance.netBalance,
    debitBalance: balance.debitBalance,
    creditBalance: balance.creditBalance,
    transactionCount: balance.transactionCount,
    hasChildren: children.length > 0,
    recentTransactions: accountTransactions,
  };
}
function buildGLReport(
  transactions: GLTransaction[],
  balances: Map<string, GLAccountBalance>,
): GLReport {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;
  const accounts: any[] = [];
  for (const [code, balance] of balances.entries()) {
    const monthlyChange = randomAmount(balance.netBalance * 0.1, 20);
    const yearToDateChange = randomAmount(balance.netBalance * 0.2, 25);
    if (balance.classification === "asset") {
      totalAssets += balance.netBalance;
    } else if (balance.classification === "liability") {
      totalLiabilities += balance.netBalance;
    } else if (balance.classification === "equity") {
      totalEquity += balance.netBalance;
    } else if (balance.classification === "revenue") {
      totalRevenue += balance.netBalance;
    } else if (balance.classification === "expense") {
      totalExpenses += balance.netBalance;
    }
    accounts.push({
      code: balance.accountCode,
      name: balance.accountName,
      classification: balance.classification,
      totalBalance: balance.netBalance,
      debitBalance: balance.debitBalance,
      creditBalance: balance.creditBalance,
      monthlyChange,
      yearToDateChange,
    });
  }
  return {
    period: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
    generatedAt: new Date().toISOString(),
    accounts,
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    totalEquity: Math.round(totalEquity * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
  };
}
export function generateGLCatalog() {
  return { codes: GL_CHART_OF_ACCOUNTS, catalog: GL_CHART_OF_ACCOUNTS };
}
export function generateGLExplorer() {
  const transactions = generateTransactions();
  const balances = calculateAccountBalances(transactions);
  const topLevelAccounts = GL_CHART_OF_ACCOUNTS.filter((a) => a.level === 1);
  const nodes: GLExplorerNode[] = [];
  for (const account of topLevelAccounts) {
    const node = buildExplorerNode(account.code, transactions, balances);
    if (node) {
      nodes.push(node);
    }
  }
  return { accounts: nodes, transactions };
}
export function generateGLReport() {
  const transactions = generateTransactions();
  const balances = calculateAccountBalances(transactions);
  return buildGLReport(transactions, balances);
}
export function generateGLDrillDown(accountCode: string) {
  const account = GL_CHART_OF_ACCOUNTS.find((a) => a.code === accountCode);
  if (!account) {
    throw new Error(`Account code ${accountCode} not found`);
  }
  const transactions = generateTransactions();
  const balances = calculateAccountBalances(transactions);
  const balance = balances.get(accountCode);
  if (!balance) {
    throw new Error(`No balance data for account ${accountCode}`);
  }
  const accountTransactions = transactions
    .filter((t) => t.accountCode === accountCode)
    .sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    );
  const ancestors: Array<{ code: string; name: string }> = [];
  let current = account;
  while (current.parentCode) {
    const parent = GL_CHART_OF_ACCOUNTS.find(
      (a) => a.code === current.parentCode,
    );
    if (parent) {
      ancestors.unshift({ code: parent.code, name: parent.name });
      current = parent;
    } else {
      break;
    }
  }
  return {
    code: account.code,
    name: account.name,
    classification: account.classification,
    parentCode: account.parentCode,
    ancestors,
    balance: balance.netBalance,
    debitBalance: balance.debitBalance,
    creditBalance: balance.creditBalance,
    transactionCount: balance.transactionCount,
    transactions: accountTransactions.slice(0, 50),
    variances: [
      {
        period: "November 2024",
        budgeted: 25000,
        actual: balance.netBalance,
        variance: balance.netBalance - 25000,
        variancePercent: ((balance.netBalance - 25000) / 25000) * 100,
        trend: balance.netBalance > 25000 ? "unfavorable" : "favorable",
      },
    ],
  };
}
