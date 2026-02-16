
import { Account, JournalEntry, Project, Transaction, Reconciliation, MerchantProfile, BusinessId, Contractor } from '../types';

// REFACTORED FOR PRODUCTION: NO STATE IS HELD HERE.
// This file now contains PURE FUNCTIONS for calculations.
// Data must be passed in from the FinanceContext.

// --- Helper to get account details (Requires account list injection) ---
const getAccount = (id: string, accounts: Account[]) => accounts.find(a => a.id === id);

// --- Profitability Engine ---
export const calculateProjectStats = (projectId: string, journal: JournalEntry[], accounts: Account[]) => {
  const entries = journal.filter(je => je.projectId === projectId);
  
  let revenue = 0;
  let directCosts = 0;
  let travelCosts = 0;

  entries.forEach(entry => {
    entry.lines.forEach(line => {
      const account = getAccount(line.accountId, accounts);
      if (!account) return;

      const amount = line.debit - line.credit; // Default debit normal for expenses

      if (account.type === 'Income') {
        // Income is Credit normal, so we invert
        revenue += (line.credit - line.debit);
      }

      if (account.type === 'Cost of Services') {
        directCosts += amount;

        // Robust Travel Detection
        const isTravel = 
            ['Travel', 'Airfare', 'Lodging', 'Ground', 'Hotel', 'Uber', 'Lyft'].some(term => account.name.includes(term)) || 
            account.code.startsWith('52') || 
            account.code.startsWith('53') || 
            account.code.startsWith('54') || 
            account.code.startsWith('55');

        if (isTravel) {
          travelCosts += amount;
        }
      }
    });
  });

  const grossProfit = revenue - directCosts;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const travelRatio = revenue > 0 ? (travelCosts / revenue) * 100 : 0;

  return { revenue, directCosts, grossProfit, margin, travelRatio };
};

// --- Financial Health Metrics ---
export const getFinancialHealth = (accounts: Account[], journal: JournalEntry[], reconciliations: Reconciliation[]) => {
  let totalCash = 0;
  let totalDebt = 0;
  const recStatus: { accountName: string, lastDate: string, daysAgo: number }[] = [];

  // 1. Calculate Ledger Balances
  const accountBalances = new Map<string, number>();

  journal.forEach(entry => {
    entry.lines.forEach(line => {
      accountBalances.set(line.accountId, (accountBalances.get(line.accountId) || 0) + (line.debit - line.credit));
    });
  });

  accounts.forEach(acc => {
    const balance = accountBalances.get(acc.id) || 0;
    
    // Cash: Asset type, usually Banks
    if (acc.type === 'Asset' && (acc.name.includes('Checking') || acc.name.includes('Savings'))) {
      totalCash += balance; 
    }

    // Debt: Liability type, Credit Cards
    if (acc.type === 'Liability') {
      totalDebt += (balance * -1); 
    }

    // Reconciliation Status
    if (acc.type === 'Asset' || (acc.type === 'Liability' && acc.name.includes('Credit'))) {
       const lastRecon = reconciliations
         .filter(r => r.accountId === acc.id)
         .sort((a, b) => b.statementEndDate.localeCompare(a.statementEndDate))[0];
       
       if (lastRecon) {
         const diffTime = Math.abs(new Date().getTime() - new Date(lastRecon.statementEndDate).getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
         recStatus.push({ accountName: acc.name, lastDate: lastRecon.statementEndDate, daysAgo: diffDays });
       } else {
         recStatus.push({ accountName: acc.name, lastDate: 'Never', daysAgo: 999 });
       }
    }
  });

  return { totalCash, totalDebt, reconciliations: recStatus };
};

// --- Dashboard Metrics ---
export const getDashboardMetrics = (
    journal: JournalEntry[], 
    accounts: Account[], 
    inbox: Transaction[], 
    reconciliations: Reconciliation[]
) => {
  let totalRevenue = 0;
  let totalExpenses = 0;
  let ownerDraw = 0;
  let recentTransactions: Transaction[] = [];

  journal.forEach(entry => {
    entry.lines.forEach(line => {
      const account = getAccount(line.accountId, accounts);
      if (!account) return;

      if (account.type === 'Income') {
        totalRevenue += (line.credit - line.debit);
      } else if (account.type === 'Expense' || account.type === 'Cost of Services') {
        totalExpenses += (line.debit - line.credit);
      } else if (account.code === '3000' || account.name === 'Owner\'s Equity') {
        ownerDraw += line.debit;
      }
    });
  });

  const needsReviewCount = inbox.filter(tx => tx.status === 'imported').length;

  const { totalCash, totalDebt, reconciliations: recStats } = getFinancialHealth(accounts, journal, reconciliations);

  // Convert last 5 journal entries
  recentTransactions = journal
    .filter(je => !je.isAdjustingEntry && je.description !== 'Opening Balance Set')
    .slice(-5)
    .reverse()
    .map(je => {
        const mainLine = je.lines.find(l => l.accountId !== '1000' && l.accountId !== '3001') || je.lines[0];
        const account = getAccount(mainLine.accountId, accounts);
        const isIncome = account?.type === 'Income';
        return {
            id: je.id,
            userId: je.userId,
            date: je.date,
            description: je.description,
            amount: isIncome ? mainLine.credit : mainLine.debit,
            transactionType: isIncome ? 'income' : 'expense',
            status: 'posted',
            bankAccountId: '1000',
            category: account?.name || 'Unknown'
        } as Transaction;
    });

  return {
    revenue: totalRevenue,
    expenses: totalExpenses,
    profit: totalRevenue - totalExpenses,
    ownerDraw,
    recentActivity: recentTransactions,
    needsReviewCount,
    totalCash,
    totalDebt,
    reconciliations: recStats
  };
};

// --- Logic & Detection ---

export const detectTransfer = (tx: Transaction): Partial<Transaction> => {
  const desc = tx.description.toLowerCase();
  
  if (desc.includes('transfer') || desc.includes('zelle') || desc.includes('venmo') || desc.includes('payment to')) {
    if (tx.amount < 0) {
       return { transactionType: 'transfer' };
    }
    return { transactionType: 'transfer' };
  }
  return {};
};

export const applyMerchantMemory = (tx: Transaction, merchantProfiles: MerchantProfile[]): Partial<Transaction> => {
    const profile = merchantProfiles.find(p => tx.description.toLowerCase().includes(p.merchantName.toLowerCase()));
    if (profile) {
        return {
            assignedBusiness: profile.defaultBusiness,
            assignedAccount: profile.defaultAccount,
            assignedProject: profile.defaultProject,
            merchant: profile.merchantName 
        };
    }
    return {};
};

export const applyRules = (tx: Transaction, merchantProfiles: MerchantProfile[] = []): Partial<Transaction> => {
  const memory = applyMerchantMemory(tx, merchantProfiles);
  if (memory.assignedAccount) return memory;

  const transfer = detectTransfer(tx);
  if (transfer.transactionType) return transfer;

  return {};
};

export const checkDuplicate = (tx: Transaction, journal: JournalEntry[] = []): boolean => {
  return journal.some(je => {
    const isDateMatch = je.date === tx.date;
    const isAmountMatch = je.lines.some(l => 
      Math.abs(l.debit - l.credit) === Math.abs(tx.amount) && 
      l.accountId === tx.bankAccountId
    );
    return isDateMatch && isAmountMatch;
  });
};

export const checkPeriodLock = (date: string, reconciliations: Reconciliation[], accountId?: string) => {
  const lockedRecon = reconciliations.find(r => 
    r.isLocked && 
    (accountId ? r.accountId === accountId : true) && 
    date <= r.statementEndDate
  );

  if (lockedRecon) {
    throw new Error(`Period Locked: The period ending ${lockedRecon.statementEndDate} is closed. You must create an Adjusting Journal Entry to affect this period.`);
  }
  return false;
};

// --- MOCKS CLEARED FOR PRODUCTION ---
export const mockAccounts: Account[] = [];
export const mockJournal: JournalEntry[] = [];
export const mockInbox: Transaction[] = [];
export const mockProjects: Project[] = [];
export const mockContractors: Contractor[] = [];
export const mockCustomers: import('../types').Customer[] = [];
export const mockReconciliations: Reconciliation[] = [];
export const mockMerchantProfiles: MerchantProfile[] = [];
export const mockServiceItems: import('../types').ServiceItem[] = [];
export const mockOpenInvoices: any[] = []; // DEPRECATED
export const addAccount = (...args: any[]) => { throw new Error("Use FinanceContext") };
export const updateAccount = (...args: any[]) => { throw new Error("Use FinanceContext") };
export const archiveAccount = (...args: any[]) => { throw new Error("Use FinanceContext") };
export const addCustomer = (...args: any[]) => { throw new Error("Use FinanceContext") };
export const addServiceItem = (...args: any[]) => { throw new Error("Use FinanceContext") };
export const addProject = (...args: any[]) => { throw new Error("Use FinanceContext") };
export const postTransactionToLedger = (...args: any[]) => { throw new Error("Use FinanceContext.postJournalEntry") };
export const postOpeningBalance = (...args: any[]) => { throw new Error("Use FinanceContext") };
export const postBatchOpeningEntry = (...args: any[]) => { throw new Error("Use FinanceContext") };
export const recordInvoicePayment = (...args: any[]) => { throw new Error("Use FinanceContext") };
export const saveMerchantProfile = (...args: any[]) => { throw new Error("Use FinanceContext") };
export const finalizeReconciliation = (...args: any[]) => { throw new Error("Use FinanceContext") };
