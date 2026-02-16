
import { BusinessId, Account, JournalEntry } from '../types';

interface DateRange {
  start: string;
  end: string;
}

export const getFinancialDateRange = (range: 'month' | 'quarter' | 'year' | 'lastYear' | 'ytd'): DateRange => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const todayStr = now.toISOString().split('T')[0];
  
  if (range === 'month') {
    // Dynamic Current Month
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }
  if (range === 'quarter') {
    // Dynamic Current Quarter
    const quarter = Math.floor(month / 3);
    const start = new Date(year, quarter * 3, 1);
    const end = new Date(year, quarter * 3 + 3, 0);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }
  if (range === 'ytd') {
    // Task 4: End date must be TODAY to prevent future data
    return { start: `${year}-01-01`, end: todayStr };
  }
  if (range === 'year') {
    // Task 4: "Year" also interpreted as "Year to Date" for now based on requirements, or Full Calendar Year depending on usage.
    // Spec says: "For the 'ytd' and 'year' cases, the end date must be Today's Date"
    return { start: `${year}-01-01`, end: todayStr };
  }
  if (range === 'lastYear') {
    // Previous Calendar Year
    return { start: `${year - 1}-01-01`, end: `${year - 1}-12-31` };
  }
  return { start: `${year}-01-01`, end: todayStr };
};

// --- PROFIT AND LOSS ---

export interface PLLineItem {
  accountId: string;
  accountName: string;
  amount: number;
}

export interface PLReport {
  revenue: PLLineItem[];
  cogs: PLLineItem[];
  expenses: PLLineItem[];
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netIncome: number;
}

export const generateProfitAndLoss = (
  journal: JournalEntry[], 
  accounts: Account[], 
  start: string, 
  end: string, 
  businessId: BusinessId | 'Combined'
): PLReport => {
  // Task 4: Performance Optimization
  const accountMap = new Map(accounts.map(a => [a.id, a]));

  const report: PLReport = {
    revenue: [],
    cogs: [],
    expenses: [],
    totalRevenue: 0,
    totalCOGS: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netIncome: 0
  };

  const accountTotals = new Map<string, number>();

  journal.forEach(entry => {
    if (entry.date < start || entry.date > end) return;
    
    // Task 3: Shared Logic (Include Specific OR Shared, or All if Combined)
    if (businessId !== 'Combined') {
        if (entry.businessId !== businessId && entry.businessId !== 'Shared') return;
    }

    entry.lines.forEach(line => {
      const current = accountTotals.get(line.accountId) || 0;
      // Accumulate raw net impact (Debit - Credit)
      accountTotals.set(line.accountId, current + (line.debit - line.credit));
    });
  });

  // Generate Report Lines
  accountTotals.forEach((rawBalance, accountId) => {
    const acc = accountMap.get(accountId);
    if (!acc) return;

    if (acc.type === 'Income') {
      // Income is Credit Normal. Negate the (Debit - Credit) raw balance.
      const amount = -rawBalance;
      if (Math.abs(amount) > 0.01) {
        report.revenue.push({ accountId: acc.id, accountName: acc.name, amount });
        report.totalRevenue += amount;
      }
    } else if (acc.type === 'Cost of Services') {
      const amount = rawBalance;
      if (Math.abs(amount) > 0.01) {
        report.cogs.push({ accountId: acc.id, accountName: acc.name, amount });
        report.totalCOGS += amount;
      }
    } else if (acc.type === 'Expense') {
      const amount = rawBalance;
      if (Math.abs(amount) > 0.01) {
        report.expenses.push({ accountId: acc.id, accountName: acc.name, amount });
        report.totalExpenses += amount;
      }
    }
  });

  report.grossProfit = report.totalRevenue - report.totalCOGS;
  report.netIncome = report.grossProfit - report.totalExpenses;

  return report;
};

// --- BALANCE SHEET ---

export interface BSReport {
  assets: PLLineItem[];
  liabilities: PLLineItem[];
  equity: PLLineItem[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
}

export const generateBalanceSheet = (
  journal: JournalEntry[], 
  accounts: Account[], 
  asOfDate: string, 
  businessId: BusinessId | 'Combined'
): BSReport => {
  // Task 4: Performance Optimization
  const accountMap = new Map(accounts.map(a => [a.id, a]));

  const report: BSReport = {
    assets: [],
    liabilities: [],
    equity: [],
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    isBalanced: false
  };

  const accountTotals = new Map<string, number>();
  let netIncomeYTD = 0;

  journal.forEach(entry => {
    if (entry.date > asOfDate) return;
    
    // Task 3: Shared Logic
    if (businessId !== 'Combined') {
        if (entry.businessId !== businessId && entry.businessId !== 'Shared') return;
    }

    entry.lines.forEach(line => {
      // 1. Accumulate Account Balance
      const net = line.debit - line.credit;
      accountTotals.set(line.accountId, (accountTotals.get(line.accountId) || 0) + net);
      
      // 2. Task 1: Calculate Net Income Impact (Revenue - Expenses)
      // This calculates "Retained Earnings" or "Current Year Earnings" dynamically
      const acct = accountMap.get(line.accountId);
      if (acct) {
        if (acct.type === 'Income') {
           // Income increases Equity (Credit normal). 
           // Ledger net is (Debit - Credit). So Income adds (Credit - Debit).
           netIncomeYTD += (line.credit - line.debit);
        } else if (acct.type === 'Expense' || acct.type === 'Cost of Services') {
           // Expense decreases Equity. 
           // Expense is Debit normal. So Expense reduces Equity by (Debit - Credit).
           netIncomeYTD -= (line.debit - line.credit);
        }
      }
    });
  });

  // Build Report Sections
  accountTotals.forEach((rawBalance, accountId) => {
    const acc = accountMap.get(accountId);
    if (!acc) return;

    if (acc.type === 'Asset') {
      const amount = rawBalance; // Debit Normal
      if (Math.abs(amount) > 0.01) {
        report.assets.push({ accountId: acc.id, accountName: acc.name, amount });
        report.totalAssets += amount;
      }
    } else if (acc.type === 'Liability') {
      const amount = -rawBalance; // Credit Normal
      if (Math.abs(amount) > 0.01) {
        report.liabilities.push({ accountId: acc.id, accountName: acc.name, amount });
        report.totalLiabilities += amount;
      }
    } else if (acc.type === 'Equity') {
      const amount = -rawBalance; // Credit Normal
      // We add existing Equity accounts (Owner's Equity, Capital, etc.)
      if (Math.abs(amount) > 0.01) {
        report.equity.push({ accountId: acc.id, accountName: acc.name, amount });
        report.totalEquity += amount;
      }
    }
  });

  // Task 1: Add Calculated Earnings Line
  // This ensures Assets = Liabilities + (Equity + NetIncome)
  if (Math.abs(netIncomeYTD) > 0.01) {
    report.equity.push({ 
        accountId: 'virtual-earnings', 
        accountName: 'Current Earnings (Calculated)', 
        amount: netIncomeYTD 
    });
    report.totalEquity += netIncomeYTD;
  }

  // Task 1: Tighten Tolerance (< 0.01)
  report.isBalanced = Math.abs(report.totalAssets - (report.totalLiabilities + report.totalEquity)) < 0.01;
  
  return report;
};

// --- CASH FLOW ---

export interface CashFlowMonth {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

export const generateCashFlow = (
  journal: JournalEntry[],
  start: string,
  end: string,
  businessId: BusinessId | 'Combined',
  accounts: Account[] 
): CashFlowMonth[] => {
  const months = new Map<string, {in: number, out: number}>();
  
  // Task 4: Performance Optimization
  const accountMap = new Map(accounts.map(a => [a.id, a]));

  // Task 3: Dynamic Bank Detection (Name based)
  const isBankAccount = (accountId: string): boolean => {
      const acc = accountMap.get(accountId);
      if (!acc) return false;
      
      // Strict Asset check
      if (acc.type !== 'Asset') return false;
      
      const n = acc.name.toLowerCase();
      // Broad matching for cash equivalents
      return n.includes('checking') || 
             n.includes('savings') || 
             n.includes('venmo') || 
             n.includes('paypal') || 
             n.includes('cash') || 
             n.includes('bank') ||
             n.includes('stripe');
  };
  
  journal.forEach(entry => {
    if (entry.date < start || entry.date > end) return;
    
    // Task 3: Shared Logic
    if (businessId !== 'Combined') {
        if (entry.businessId !== businessId && entry.businessId !== 'Shared') return;
    }

    const monthKey = entry.date.substring(0, 7); // YYYY-MM
    if (!months.has(monthKey)) months.set(monthKey, {in: 0, out: 0});
    
    const data = months.get(monthKey)!;

    entry.lines.forEach(line => {
      if (isBankAccount(line.accountId)) { 
        if (line.debit > 0) data.in += line.debit;
        if (line.credit > 0) data.out += line.credit;
      }
    });
  });

  return Array.from(months.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, val]) => ({
      month,
      inflow: val.in,
      outflow: val.out,
      net: val.in - val.out
    }));
};

// --- EXPORT ---

export const generateGeneralLedgerCSV = (journal: JournalEntry[], accounts: Account[]): string => {
  // Task 4: Performance Optimization
  const accountMap = new Map(accounts.map(a => [a.id, a]));

  const header = "Date,Business,Account Name,Account Code,Description,Debit,Credit,Project\n";
  const rows = journal.flatMap(entry => {
    return entry.lines.map(line => {
      const acct = accountMap.get(line.accountId);
      // Escape description quotes
      const safeDesc = (line.description || entry.description).replace(/"/g, '""');
      return `${entry.date},${entry.businessId},"${acct?.name || line.accountId}",${acct?.code || ''},"${safeDesc}",${line.debit},${line.credit},${entry.projectId || ''}`;
    });
  }).join("\n");
  
  return header + rows;
};
