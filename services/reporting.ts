
import { mockJournal, mockAccounts, mockOpenInvoices } from './accounting';
import { BusinessId, AccountType, Account } from '../types';

interface DateRange {
  start: string;
  end: string;
}

export const getFinancialDateRange = (range: 'month' | 'quarter' | 'year' | 'ytd'): DateRange => {
  const now = new Date();
  const year = now.getFullYear();
  
  if (range === 'month') {
    return { start: `${year}-10-01`, end: `${year}-10-31` }; // Hardcoded to Oct for demo
  }
  if (range === 'quarter') {
    return { start: `${year}-10-01`, end: `${year}-12-31` };
  }
  if (range === 'year' || range === 'ytd') {
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  return { start: `${year}-01-01`, end: `${year}-12-31` };
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

export const generateProfitAndLoss = (start: string, end: string, businessId: BusinessId | 'Combined'): PLReport => {
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

  mockJournal.forEach(entry => {
    if (entry.date < start || entry.date > end) return;
    if (businessId !== 'Combined' && entry.businessId !== businessId) return;

    entry.lines.forEach(line => {
      const current = accountTotals.get(line.accountId) || 0;
      // Normal Balance Logic will be handled in aggregation
      accountTotals.set(line.accountId, current + (line.debit - line.credit));
    });
  });

  mockAccounts.forEach(acc => {
    const rawBalance = accountTotals.get(acc.id) || 0;
    
    if (acc.type === 'Income') {
      // Income is Credit Normal (Credit - Debit). Since rawBalance is Debit - Credit, we negate it.
      const amount = -rawBalance;
      if (amount !== 0) {
        report.revenue.push({ accountId: acc.id, accountName: acc.name, amount });
        report.totalRevenue += amount;
      }
    } else if (acc.type === 'Cost of Services') {
      // Expense is Debit Normal
      const amount = rawBalance;
      if (amount !== 0) {
        report.cogs.push({ accountId: acc.id, accountName: acc.name, amount });
        report.totalCOGS += amount;
      }
    } else if (acc.type === 'Expense') {
      const amount = rawBalance;
      if (amount !== 0) {
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

export const generateBalanceSheet = (asOfDate: string, businessId: BusinessId | 'Combined'): BSReport => {
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

  mockJournal.forEach(entry => {
    if (entry.date > asOfDate) return;
    if (businessId !== 'Combined' && entry.businessId !== businessId) return;

    entry.lines.forEach(line => {
      const net = line.debit - line.credit;
      accountTotals.set(line.accountId, (accountTotals.get(line.accountId) || 0) + net);
      
      // Calculate Net Income Impact for Retained Earnings
      const acct = mockAccounts.find(a => a.id === line.accountId);
      if (acct) {
        if (acct.type === 'Income') netIncomeYTD += (line.credit - line.debit);
        if (acct.type === 'Expense' || acct.type === 'Cost of Services') netIncomeYTD -= (line.debit - line.credit);
      }
    });
  });

  mockAccounts.forEach(acc => {
    const rawBalance = accountTotals.get(acc.id) || 0;
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
      let amount = -rawBalance; // Credit Normal
      // Add YTD Earnings to Retained Earnings for display purposes if checking
      if (acc.name === 'Retained Earnings') {
        amount += netIncomeYTD;
      }
      if (Math.abs(amount) > 0.01) {
        report.equity.push({ accountId: acc.id, accountName: acc.name, amount });
        report.totalEquity += amount;
      }
    }
  });

  // If Retained Earnings account didn't exist in ledger but we have profit, add a virtual line
  if (!report.equity.find(e => e.accountName === 'Retained Earnings') && Math.abs(netIncomeYTD) > 0.01) {
    report.equity.push({ accountId: 'virtual-re', accountName: 'Retained Earnings (YTD)', amount: netIncomeYTD });
    report.totalEquity += netIncomeYTD;
  }

  report.isBalanced = Math.abs(report.totalAssets - (report.totalLiabilities + report.totalEquity)) < 1.0;
  return report;
};

// --- CASH FLOW ---

export interface CashFlowMonth {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

export const generateCashFlow = (): CashFlowMonth[] => {
  const months = new Map<string, {in: number, out: number}>();
  
  mockJournal.forEach(entry => {
    const monthKey = entry.date.substring(0, 7); // YYYY-MM
    if (!months.has(monthKey)) months.set(monthKey, {in: 0, out: 0});
    
    const data = months.get(monthKey)!;

    entry.lines.forEach(line => {
      // Very simplified: Track movements in Checking (1000)
      if (line.accountId === '1000') {
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

export const generateGeneralLedgerCSV = (): string => {
  const header = "Date,Business,Account,Description,Debit,Credit,Project\n";
  const rows = mockJournal.flatMap(entry => {
    return entry.lines.map(line => {
      const acct = mockAccounts.find(a => a.id === line.accountId);
      return `${entry.date},${entry.businessId},"${acct?.name || line.accountId}","${line.description || entry.description}",${line.debit},${line.credit},${entry.projectId || ''}`;
    });
  }).join("\n");
  
  return header + rows;
};
