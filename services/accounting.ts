
import { Account, JournalEntry, Project, Transaction, Reconciliation, MerchantProfile, BusinessId, Contractor } from '../types';

// --- SYSTEM KEYS ---
// Hardcoded mapping to ensure renaming an account doesn't break code logic.
// Logic should lookup ID by these codes.
export const SYSTEM_CODES = {
    CHECKING: '1000',
    UNDEPOSITED_FUNDS: '1002',
    ACCOUNTS_RECEIVABLE: '1100',
    OPENING_BALANCE_EQUITY: '3000',
    RETAINED_EARNINGS: '3001',
    SALES_INCOME: '4000',
    UNCATEGORIZED_EXPENSE: '9000'
};

// --- Helper to get account details ---
const getAccount = (id: string, accounts: Account[]) => accounts.find(a => a.id === id);

export const getAccountIdByCode = (accounts: Account[], code: string): string => {
  const account = accounts.find(a => a.code === code);
  if (!account) {
      // Graceful fallback for dev environments, but critical error in prod
      console.error(`CRITICAL: System Account ${code} missing.`);
      return 'missing-account-id';
  }
  return account.id;
};

// --- THE LEDGER GUARD ---
// Strict validation logic that must pass before any write.
export const validateJournalEntry = (
    entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    accounts: Account[],
    reconciliations: Reconciliation[]
) => {
    // 1. Balance Check
    const totalDebits = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`Ledger Guard: Entry is unbalanced. Debits: $${totalDebits.toFixed(2)}, Credits: $${totalCredits.toFixed(2)}`);
    }

    // 2. Account Existence Check
    entry.lines.forEach(line => {
        if (!accounts.find(a => a.id === line.accountId)) {
            throw new Error(`Ledger Guard: Referenced Account ID ${line.accountId} does not exist.`);
        }
    });

    // 3. Period Lock Check
    const accountIds = entry.lines.map(l => l.accountId);
    checkEntryLocks(entry.date, reconciliations, accountIds);

    return true; // Passed
};

// --- Robust Multi-Account Period Locking ---

export const getLockedThroughDate = (reconciliations: Reconciliation[], accountId: string): string | null => {
  const accountLocks = reconciliations.filter(r => r.accountId === accountId && r.isLocked);
  if (accountLocks.length === 0) return null;
  accountLocks.sort((a, b) => b.statementEndDate.localeCompare(a.statementEndDate));
  return accountLocks[0].statementEndDate;
};

export const checkPeriodLock = (date: string, reconciliations: Reconciliation[], accountId: string) => {
  if (!accountId) return false;
  const lockedDate = getLockedThroughDate(reconciliations, accountId);
  if (lockedDate && date <= lockedDate) {
    throw new Error(`Period Locked: Account ${accountId} is closed through ${lockedDate}.`);
  }
  return false;
};

export const checkEntryLocks = (entryDate: string, reconciliations: Reconciliation[], accountIds: string[]) => {
  const uniqueAccounts = Array.from(new Set(accountIds));
  for (const accId of uniqueAccounts) {
    checkPeriodLock(entryDate, reconciliations, accId);
  }
};

// --- Task 3: Smart Reconciliation Logic ---

export const getLastReconciliation = (reconciliations: Reconciliation[], accountId: string): Reconciliation | null => {
    const history = reconciliations.filter(r => r.accountId === accountId);
    if (history.length === 0) return null;
    // Sort descending by statement end date
    return history.sort((a, b) => b.statementEndDate.localeCompare(a.statementEndDate))[0];
};

export const getSmartStartingBalance = (reconciliations: Reconciliation[], accountId: string, openingBalance: number = 0): number => {
    const lastRec = getLastReconciliation(reconciliations, accountId);
    if (lastRec) {
        return lastRec.statementBalance;
    }
    return openingBalance; // From Day Zero setup ideally
};

// --- Cleared Line Protection ---
export const isLineCleared = (lineKey: string, reconciliations: Reconciliation[]): boolean => {
  return reconciliations.some(rec => rec.clearedLineIds.includes(lineKey));
};

// --- Profitability Engine ---
export const calculateProjectStats = (projectId: string, journal: JournalEntry[], accounts: Account[]) => {
  const accountMap = new Map(accounts.map(a => [a.id, a]));
  const entries = journal.filter(je => je.projectId === projectId);
  
  let revenue = 0;
  let directCosts = 0;
  let travelCosts = 0;

  entries.forEach(entry => {
    entry.lines.forEach(line => {
      const account = accountMap.get(line.accountId);
      if (!account) return;
      const amount = line.debit - line.credit; 

      if (account.type === 'Income') {
        revenue += (line.credit - line.debit);
      }

      if (account.type === 'Cost of Services') {
        directCosts += amount;
        const isTravel = ['Travel', 'Airfare', 'Lodging', 'Hotel'].some(term => account.name.includes(term)) || account.code.startsWith('52');
        if (isTravel) travelCosts += amount;
      }
    });
  });

  const grossProfit = revenue - directCosts;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const travelRatio = revenue > 0 ? (travelCosts / revenue) * 100 : 0;

  return { revenue, directCosts, grossProfit, margin, travelRatio };
};

// --- Dashboard Metrics ---
export const getDashboardMetrics = (
    journal: JournalEntry[], 
    accounts: Account[], 
    inbox: Transaction[], 
    reconciliations: Reconciliation[]
) => {
  const accountMap = new Map(accounts.map(a => [a.id, a]));
  let totalRevenue = 0;
  let totalExpenses = 0;
  let ownerDraw = 0;
  let totalCash = 0;
  let totalDebt = 0;

  // 1. Calculate Balances
  const balances = new Map<string, number>();
  journal.forEach(entry => {
    entry.lines.forEach(line => {
      balances.set(line.accountId, (balances.get(line.accountId) || 0) + (line.debit - line.credit));
      
      const acc = accountMap.get(line.accountId);
      if(!acc) return;

      if (acc.type === 'Income') totalRevenue += (line.credit - line.debit);
      else if (acc.type === 'Expense' || acc.type === 'Cost of Services') totalExpenses += (line.debit - line.credit);
      
      if (acc.code === SYSTEM_CODES.OPENING_BALANCE_EQUITY && acc.name.includes('Draw')) {
          ownerDraw += line.debit;
      }
    });
  });

  accounts.forEach(acc => {
      const bal = balances.get(acc.id) || 0;
      if (acc.type === 'Asset' && (acc.name.includes('Check') || acc.name.includes('Save'))) totalCash += bal;
      if (acc.type === 'Liability') totalDebt += (bal * -1);
  });

  const recentTransactions = journal
    .filter(je => !je.isAdjustingEntry)
    .slice(-5)
    .reverse()
    .map(je => ({
        id: je.id,
        userId: je.userId,
        date: je.date,
        description: je.description,
        amount: je.lines[0].credit > 0 ? je.lines[0].credit : -je.lines[0].debit,
        transactionType: je.lines[0].credit > 0 ? 'income' : 'expense',
        status: 'posted',
        bankAccountId: '1000',
        category: 'Journal'
    } as Transaction));

  // Rec Stats
  const recStats: any[] = [];
  accounts.filter(a => a.type === 'Asset' || a.type === 'Liability').forEach(acc => {
      const lastRec = getLastReconciliation(reconciliations, acc.id);
      if(lastRec) {
          const days = Math.ceil(Math.abs(new Date().getTime() - new Date(lastRec.statementEndDate).getTime()) / (1000 * 3600 * 24));
          recStats.push({ accountName: acc.name, lastDate: lastRec.statementEndDate, daysAgo: days });
      }
  });

  return {
    revenue: totalRevenue,
    expenses: totalExpenses,
    profit: totalRevenue - totalExpenses,
    ownerDraw,
    recentActivity: recentTransactions,
    needsReviewCount: inbox.filter(tx => tx.status === 'imported').length,
    totalCash,
    totalDebt,
    reconciliations: recStats
  };
};

export const applyRules = (tx: Transaction, merchantProfiles: MerchantProfile[] = []): Partial<Transaction> => {
  const profile = merchantProfiles.find(p => tx.description.toLowerCase().includes(p.merchantName.toLowerCase()));
  if (profile) return { assignedBusiness: profile.defaultBusiness, assignedAccount: profile.defaultAccount, assignedProject: profile.defaultProject, merchant: profile.merchantName };
  return {};
};

export const checkDuplicate = (tx: Transaction, journal: JournalEntry[] = []): boolean => {
  return journal.some(je => je.date === tx.date && je.lines.some(l => Math.abs(l.debit - l.credit) === Math.abs(tx.amount)));
};

// MOCKS
export const mockAccounts: Account[] = [];
export const mockJournal: JournalEntry[] = [];
export const mockInbox: Transaction[] = [];
export const mockProjects: Project[] = [];
export const mockContractors: Contractor[] = [];
export const mockCustomers: import('../types').Customer[] = [];
export const mockReconciliations: Reconciliation[] = [];
export const mockMerchantProfiles: MerchantProfile[] = [];
export const mockServiceItems: import('../types').ServiceItem[] = [];
export const mockOpenInvoices: any[] = []; 
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
