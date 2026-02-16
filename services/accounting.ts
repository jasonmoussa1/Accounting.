
import { Account, JournalEntry, Project, BusinessId, Transaction, BankRule, Contractor, AccountType, Customer, ServiceItem, Reconciliation, AuditEvent, MerchantProfile, InvoiceStatus } from '../types';

// --- MOCK DATA ---

export const mockAccounts: Account[] = [
  // Assets
  { id: '1000', code: '1000', name: 'Chase Checking (FPV)', type: 'Asset' },
  { id: '1001', code: '1001', name: 'Chase Savings (FPV)', type: 'Asset' },
  { id: '1002', code: '1002', name: 'Undeposited Funds', type: 'Asset' },
  { id: '1200', code: '1200', name: 'Accounts Receivable', type: 'Asset' },
  { id: '1500', code: '1500', name: 'Equipment & Gear', type: 'Asset' },
  { id: '1501', code: '1501', name: 'Drones', type: 'Asset', parentId: '1500' },
  { id: '1502', code: '1502', name: 'Cameras', type: 'Asset', parentId: '1500' },
  
  // Liabilities
  { id: '2000', code: '2000', name: 'Chase Credit Card', type: 'Liability' },
  { id: '2100', code: '2100', name: 'Sales Tax Payable', type: 'Liability' },
  
  // Equity
  { id: '3000', code: '3000', name: 'Owner\'s Equity', type: 'Equity' },
  { id: '3001', code: '3001', name: 'Opening Balance Equity', type: 'Equity' },
  { id: '3002', code: '3002', name: 'Retained Earnings', type: 'Equity' },
  
  // Income
  { id: '4000', code: '4000', name: 'Service Revenue', type: 'Income' },
  { id: '4100', code: '4100', name: 'Product Sales', type: 'Income' },
  
  // Cost of Services
  { id: '5000', code: '5000', name: 'Cost of Goods Sold', type: 'Cost of Services' },
  { id: '5100', code: '5100', name: 'Subcontractors', type: 'Cost of Services' },
  { id: '5200', code: '5200', name: 'Job Supplies', type: 'Cost of Services' },
  
  // Expenses
  { id: '6000', code: '6000', name: 'Advertising', type: 'Expense' },
  { id: '6001', code: '6001', name: 'Bank Charges', type: 'Expense' },
  { id: '6002', code: '6002', name: 'Dues & Subscriptions', type: 'Expense' },
  { id: '6003', code: '6003', name: 'Insurance', type: 'Expense' },
  { id: '6004', code: '6004', name: 'Meals', type: 'Expense' },
  { id: '6005', code: '6005', name: 'Office Supplies', type: 'Expense' },
  { id: '6006', code: '6006', name: 'Professional Fees', type: 'Expense' },
  { id: '6007', code: '6007', name: 'Rent', type: 'Expense' },
  { id: '6008', code: '6008', name: 'Repairs & Maintenance', type: 'Expense' },
  { id: '6009', code: '6009', name: 'Software', type: 'Expense' },
  { id: '6010', code: '6010', name: 'Travel', type: 'Expense' },
  { id: '6011', code: '6011', name: 'Utilities', type: 'Expense' },
  { id: '6012', code: '6012', name: 'Vehicle Expenses', type: 'Expense' },
  { id: '6013', code: '6013', name: 'Gas', type: 'Expense', parentId: '6012' },
];

export const mockContractors: Contractor[] = [
  { 
    id: 'cont_1', 
    name: 'Mike Smith', 
    legalName: 'Michael Smith', 
    email: 'mike@example.com', 
    address: '123 Main St', 
    city: 'Los Angeles', 
    state: 'CA', 
    zip: '90001', 
    taxClassification: 'Individual', 
    w9Received: true, 
    status: 'active' 
  },
  { 
    id: 'cont_2', 
    name: 'Visuals LLC', 
    legalName: 'Visuals LLC', 
    email: 'contact@visuals.com', 
    address: '456 Tech Blvd', 
    city: 'San Francisco', 
    state: 'CA', 
    zip: '94107', 
    taxClassification: 'LLC', 
    w9Received: false, 
    status: 'active' 
  },
];

export const mockCustomers: Customer[] = [
  {
    id: 'cust_1',
    name: 'Red Bull Media House',
    contactPerson: 'Sarah Connor',
    email: 'sarah@redbull.com',
    address: '123 Energy Dr',
    city: 'Santa Monica',
    state: 'CA',
    zip: '90404',
    defaultBusiness: 'Big Sky FPV'
  },
  {
    id: 'cust_2',
    name: 'The Viper Room',
    contactPerson: 'Johnny Depp',
    email: 'booking@viperroom.com',
    address: '8852 Sunset Blvd',
    city: 'West Hollywood',
    state: 'CA',
    zip: '90069',
    defaultBusiness: 'TRL Band'
  }
];

export const mockProjects: Project[] = [
  { id: 'proj_1', name: 'Red Bull Rampage 2023', businessId: 'Big Sky FPV', clientId: 'Red Bull Media House', status: 'completed', date: '2023-10-01' },
  { id: 'proj_2', name: 'Coachella 2024 Drone Show', businessId: 'Big Sky FPV', clientId: 'Goldenvoice', status: 'active', date: '2024-04-12' },
  { id: 'proj_3', name: 'Viper Room Thursday Night', businessId: 'TRL Band', clientId: 'The Viper Room', status: 'active', date: '2023-11-02' },
];

export const mockServiceItems: ServiceItem[] = [
  { id: 'srv_1', name: 'Drone Operator (Day Rate)', description: 'Full day FPV pilot', rate: 1500, unit: 'Day', linkedAccountId: '4000', defaultBusiness: 'Big Sky FPV' },
  { id: 'srv_2', name: 'Video Editing', description: 'Post-production per hour', rate: 150, unit: 'Hour', linkedAccountId: '4000', defaultBusiness: 'Big Sky FPV' },
  { id: 'srv_3', name: 'Live Band Performance', description: '4 hour set', rate: 2500, unit: 'Flat Fee', linkedAccountId: '4000', defaultBusiness: 'TRL Band' },
];

export const mockJournal: JournalEntry[] = [
  {
    id: 'je_1',
    date: '2023-10-01',
    description: 'Payment for Red Bull Rampage',
    businessId: 'Big Sky FPV',
    projectId: 'proj_1',
    lines: [
      { accountId: '1000', debit: 5000, credit: 0, description: 'Deposit' },
      { accountId: '4000', debit: 0, credit: 5000, description: 'Service Revenue' }
    ],
    createdAt: '2023-10-01T10:00:00Z'
  },
  {
    id: 'je_2',
    date: '2023-10-02',
    description: 'Drone Repair Parts',
    businessId: 'Big Sky FPV',
    projectId: 'proj_1',
    lines: [
      { accountId: '1000', debit: 0, credit: 250, description: 'Payment' },
      { accountId: '6008', debit: 250, credit: 0, description: 'Repairs & Maintenance' }
    ],
    createdAt: '2023-10-02T14:30:00Z'
  },
  {
      id: 'je_3',
      date: '2023-10-05',
      description: 'Contractor Payment - Mike Smith',
      businessId: 'Big Sky FPV',
      projectId: 'proj_1',
      lines: [
          { accountId: '1000', debit: 0, credit: 600, description: 'Payment' },
          { accountId: '5100', debit: 600, credit: 0, description: 'Subcontractors', contractorId: 'cont_1' }
      ],
      createdAt: '2023-10-05T09:00:00Z'
  }
];

export const mockInbox: Transaction[] = [
  {
    id: 'tx_1',
    date: '2023-10-25',
    description: 'Chevron Gas Station',
    amount: -45.50,
    bankAccountId: '1000',
    status: 'imported',
    transactionType: 'expense',
    category: 'Gas',
    merchant: 'Chevron',
    assignedBusiness: 'Big Sky FPV'
  },
  {
    id: 'tx_2',
    date: '2023-10-26',
    description: 'Adobe Creative Cloud',
    amount: -54.99,
    bankAccountId: '1000',
    status: 'imported',
    transactionType: 'expense',
    category: 'Software',
    merchant: 'Adobe',
    assignedAccount: '6009',
    assignedBusiness: 'Big Sky FPV'
  }
];

export const mockReconciliations: Reconciliation[] = [];
export const mockMerchantProfiles: MerchantProfile[] = [];
export const mockAuditLog: AuditEvent[] = [];

export const mockOpenInvoices = [
  { id: 'inv_1', client: 'Red Bull Media House', date: '2023-09-15', dueDate: '2023-10-15', amount: 12500, daysOverdue: 10 },
  { id: 'inv_2', client: 'Goldenvoice', date: '2023-10-01', dueDate: '2023-10-31', amount: 5000, daysOverdue: 0 },
  { id: 'inv_3', client: 'The Viper Room', date: '2023-08-01', dueDate: '2023-08-31', amount: 2500, daysOverdue: 55 },
];

// --- HELPER FUNCTIONS ---

export const getAccount = (id: string) => mockAccounts.find(a => a.id === id);

export const calculateProjectStats = (projectId: string) => {
    let revenue = 0;
    let directCosts = 0;
    let travelExpenses = 0;

    mockJournal.forEach(entry => {
        if (entry.projectId === projectId) {
            entry.lines.forEach(line => {
                const acct = getAccount(line.accountId);
                if (acct?.type === 'Income') {
                    revenue += (line.credit - line.debit);
                } else if (acct?.type === 'Cost of Services') {
                    directCosts += (line.debit - line.credit);
                } else if (acct?.name === 'Travel' || acct?.name === 'Gas') {
                    travelExpenses += (line.debit - line.credit);
                }
            });
        }
    });

    const grossProfit = revenue - directCosts;
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const travelRatio = revenue > 0 ? (travelExpenses / revenue) * 100 : 0;

    return { revenue, directCosts, grossProfit, margin, travelRatio };
};

// --- Financial Health Metrics (For Dashboard) ---
export const getFinancialHealth = () => {
  let totalCash = 0;
  let totalDebt = 0;
  const reconciliations: { accountName: string, lastDate: string, daysAgo: number }[] = [];

  // 1. Calculate Ledger Balances
  const accountBalances = new Map<string, number>();

  mockJournal.forEach(entry => {
    entry.lines.forEach(line => {
      accountBalances.set(line.accountId, (accountBalances.get(line.accountId) || 0) + (line.debit - line.credit));
    });
  });

  mockAccounts.forEach(acc => {
    const balance = accountBalances.get(acc.id) || 0;
    
    // Cash: Asset type, usually Banks
    if (acc.type === 'Asset' && (acc.name.includes('Checking') || acc.name.includes('Savings'))) {
      totalCash += balance; // Asset is Debit normal
    }

    // Debt: Liability type, Credit Cards
    if (acc.type === 'Liability') {
      totalDebt += (balance * -1); // Liability is Credit normal (so negative balance in calculation means positive liability)
    }

    // Reconciliation Status
    if (acc.type === 'Asset' || (acc.type === 'Liability' && acc.name.includes('Credit'))) {
       const lastRecon = mockReconciliations
         .filter(r => r.accountId === acc.id)
         .sort((a, b) => b.statementEndDate.localeCompare(a.statementEndDate))[0];
       
       if (lastRecon) {
         const diffTime = Math.abs(new Date().getTime() - new Date(lastRecon.statementEndDate).getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
         reconciliations.push({ accountName: acc.name, lastDate: lastRecon.statementEndDate, daysAgo: diffDays });
       } else {
         reconciliations.push({ accountName: acc.name, lastDate: 'Never', daysAgo: 999 });
       }
    }
  });

  return { totalCash, totalDebt, reconciliations };
};

// --- Dashboard Metrics (Dynamic) ---
export const getDashboardMetrics = () => {
  let totalRevenue = 0;
  let totalExpenses = 0;
  let ownerDraw = 0; // Task 3: Owner Draw Tracking
  let recentTransactions: Transaction[] = [];

  mockJournal.forEach(entry => {
    entry.lines.forEach(line => {
      const account = getAccount(line.accountId);
      if (!account) return;

      if (account.type === 'Income') {
        totalRevenue += (line.credit - line.debit);
      } else if (account.type === 'Expense' || account.type === 'Cost of Services') {
        totalExpenses += (line.debit - line.credit);
      } else if (account.id === '3000') {
        // Task 3: Track Owner Draws (Debits to Equity)
        ownerDraw += line.debit;
      }
    });
  });

  // Task 3: Uncategorized Needs Review Count
  const needsReviewCount = mockInbox.filter(tx => tx.status === 'imported').length;

  const { totalCash, totalDebt, reconciliations } = getFinancialHealth();

  // Convert last 5 journal entries to transaction view
  recentTransactions = mockJournal
    .filter(je => !je.isAdjustingEntry && je.description !== 'Opening Balance Set') // Filter out system entries for clean feed
    .slice(-5)
    .reverse()
    .map(je => {
        const mainLine = je.lines.find(l => l.accountId !== '1000' && l.accountId !== '3001') || je.lines[0];
        const account = getAccount(mainLine.accountId);
        const isIncome = account?.type === 'Income';
        return {
            id: je.id,
            date: je.date,
            description: je.description,
            amount: isIncome ? mainLine.credit : mainLine.debit,
            type: isIncome ? 'income' : 'expense',
            transactionType: isIncome ? 'income' : 'expense', // Fallback
            category: account?.name || 'Unknown',
            status: 'posted',
            bankAccountId: '1000'
        };
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
    reconciliations
  };
};

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

export const applyMerchantMemory = (tx: Transaction): Partial<Transaction> => {
    const profile = mockMerchantProfiles.find(p => tx.description.toLowerCase().includes(p.merchantName.toLowerCase()));
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

export const saveMerchantProfile = (tx: Transaction) => {
    if (!tx.assignedAccount || !tx.assignedBusiness) return;
    
    const merchantName = tx.merchant || tx.description.split(' ')[0]; 

    const existingIndex = mockMerchantProfiles.findIndex(p => p.merchantName.toLowerCase() === merchantName.toLowerCase());
    
    const newProfile: MerchantProfile = {
        id: existingIndex >= 0 ? mockMerchantProfiles[existingIndex].id : `mp_${Date.now()}`,
        merchantName: merchantName,
        defaultBusiness: tx.assignedBusiness,
        defaultAccount: tx.assignedAccount,
        defaultProject: tx.assignedProject,
        lastSeen: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        mockMerchantProfiles[existingIndex] = newProfile;
    } else {
        mockMerchantProfiles.push(newProfile);
    }
};

export const applyRules = (tx: Transaction): Partial<Transaction> => {
  const memory = applyMerchantMemory(tx);
  if (memory.assignedAccount) return memory;

  const transfer = detectTransfer(tx);
  if (transfer.transactionType) return transfer;

  return {};
};

export const checkDuplicate = (tx: Transaction): boolean => {
  return mockJournal.some(je => {
    const isDateMatch = je.date === tx.date;
    const isAmountMatch = je.lines.some(l => 
      Math.abs(l.debit - l.credit) === Math.abs(tx.amount) && 
      l.accountId === tx.bankAccountId
    );
    return isDateMatch && isAmountMatch;
  });
};

export const checkPeriodLock = (date: string, accountId?: string) => {
  const lockedRecon = mockReconciliations.find(r => 
    r.isLocked && 
    r.accountId === accountId && 
    date <= r.statementEndDate
  );

  if (lockedRecon) {
    throw new Error(`Period Locked: Cannot modify transactions on or before ${lockedRecon.statementEndDate}. Please create an Adjusting Journal Entry.`);
  }
  return false;
};

export const postTransactionToLedger = (tx: Transaction): JournalEntry => {
  if ((!tx.assignedAccount || tx.assignedAccount === 'uncategorized') && tx.transactionType !== 'transfer') {
      throw new Error("Categorization Required: You cannot post 'Uncategorized' transactions.");
  }

  checkPeriodLock(tx.date, tx.bankAccountId);

  const jeId = `je-${Date.now()}`;
  const absAmount = Math.abs(tx.amount);
  const lines: any[] = [];

  if (tx.transactionType === 'transfer') {
      if (!tx.transferAccountId) throw new Error("Transfer requires a destination account.");
      
      const isMoneyOut = tx.amount < 0; 

      if (isMoneyOut) {
          lines.push({
              accountId: tx.transferAccountId, 
              description: tx.description,
              debit: absAmount,
              credit: 0
          });
          lines.push({
              accountId: tx.bankAccountId, 
              description: tx.description,
              debit: 0,
              credit: absAmount
          });
      } else {
          lines.push({
              accountId: tx.bankAccountId, 
              description: tx.description,
              debit: absAmount,
              credit: 0
          });
          lines.push({
              accountId: tx.transferAccountId, 
              description: tx.description,
              debit: 0,
              credit: absAmount
          });
      }
  } else {
      const isExpense = tx.transactionType === 'expense';
      
      lines.push({
        accountId: tx.bankAccountId,
        description: tx.description,
        debit: isExpense ? 0 : absAmount,
        credit: isExpense ? absAmount : 0
      });

      if (tx.assignedAccount) {
        lines.push({
          accountId: tx.assignedAccount,
          description: tx.description,
          debit: isExpense ? absAmount : 0,
          credit: isExpense ? 0 : absAmount,
          contractorId: tx.assignedContractorId
        });
      }
  }

  const newEntry: JournalEntry = {
    id: jeId,
    date: tx.date,
    description: tx.description,
    businessId: tx.assignedBusiness || 'Big Sky FPV',
    projectId: tx.assignedProject,
    lines: lines,
    createdAt: new Date().toISOString()
  };

  mockJournal.push(newEntry);

  if (tx.transactionType !== 'transfer') {
      saveMerchantProfile(tx);
  }

  return newEntry;
};

export const createAdjustingEntry = (
  date: string, 
  description: string, 
  businessId: BusinessId, 
  lines: { accountId: string, debit: number, credit: number }[],
  reason: string
): JournalEntry => {
  const jeId = `aje-${Date.now()}`;
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`AJE Out of Balance: Debits $${totalDebit} vs Credits $${totalCredit}`);
  }

  const entry: JournalEntry = {
    id: jeId,
    date,
    description,
    businessId,
    lines: lines.map(l => ({ ...l, description })),
    createdAt: new Date().toISOString(),
    isAdjustingEntry: true,
    adjustmentReason: reason
  };

  mockJournal.push(entry);

  mockAuditLog.push({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'CREATE_AJE',
    details: `Posted AJE ${jeId} for date ${date}. Reason: ${reason}`,
    user: 'Current User'
  });

  return entry;
};

export const finalizeReconciliation = (
  businessId: BusinessId,
  accountId: string,
  endDate: string,
  endBalance: number,
  clearedLineIds: Set<string>
) => {
  const reconId = `rec-${Date.now()}`;
  const clearedList = Array.from(clearedLineIds);

  const reconciliation: Reconciliation = {
    id: reconId,
    businessId,
    accountId,
    statementEndDate: endDate,
    statementBalance: endBalance,
    clearedLineIds: clearedList,
    isLocked: true,
    createdAt: new Date().toISOString(),
    performedBy: 'Current User'
  };

  mockReconciliations.push(reconciliation);

  mockJournal.forEach(entry => {
    entry.lines.forEach((line, index) => {
      const lineUniqueId = `${entry.id}-${index}`;
      if (clearedLineIds.has(lineUniqueId)) {
        line.isCleared = true;
        line.clearedAt = new Date().toISOString();
        line.reconciliationId = reconId;
      }
    });
  });

  mockAuditLog.push({
    id: `audit-lock-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'LOCK_PERIOD',
    details: `Reconciled Account ${accountId} through ${endDate}. Locked ${clearedList.length} transactions.`,
    user: 'Current User'
  });

  return reconciliation;
};

export const postOpeningBalance = (businessId: BusinessId, amount: number, date: string): JournalEntry => {
    checkPeriodLock(date, '1000');

    const jeId = `je-setup-${Date.now()}`;
    const lines = [
        {
            accountId: '1000',
            description: 'Opening Balance',
            debit: amount,
            credit: 0
        },
        {
            accountId: '3001',
            description: 'Opening Balance',
            debit: 0,
            credit: amount
        }
    ];

    const entry: JournalEntry = {
        id: jeId,
        date,
        description: 'Opening Balance Adjustment',
        businessId,
        lines,
        createdAt: new Date().toISOString()
    };
    
    mockJournal.push(entry);
    return entry;
};

// NEW: Batch Opening Entry for Day Zero Wizard
export const postBatchOpeningEntry = (date: string, balances: { accountId: string, amount: number }[]): JournalEntry => {
    const jeId = `je-dayzero-${Date.now()}`;
    const lines: { accountId: string; description: string; debit: number; credit: number }[] = [];
    
    let totalDebit = 0;
    let totalCredit = 0;

    balances.forEach(item => {
        const account = mockAccounts.find(a => a.id === item.accountId);
        if (!account) return;

        // Assets = Debit Normal. Liability = Credit Normal.
        // User inputs positive numbers for "Balance".
        if (account.type === 'Asset') {
            lines.push({
                accountId: item.accountId,
                description: 'Day Zero Balance',
                debit: item.amount,
                credit: 0
            });
            totalDebit += item.amount;
        } else if (account.type === 'Liability') {
            lines.push({
                accountId: item.accountId,
                description: 'Day Zero Balance',
                debit: 0,
                credit: item.amount
            });
            totalCredit += item.amount;
        }
    });

    // Equity Plug
    const difference = totalDebit - totalCredit;
    const equityAccount = '3001'; // Opening Balance Equity

    if (difference > 0) {
        // Debits > Credits. Need to Credit Equity to balance.
        lines.push({
            accountId: equityAccount,
            description: 'Opening Balance Equity Plug',
            debit: 0,
            credit: difference
        });
    } else if (difference < 0) {
        // Credits > Debits. Need to Debit Equity to balance.
        lines.push({
            accountId: equityAccount,
            description: 'Opening Balance Equity Plug',
            debit: Math.abs(difference),
            credit: 0
        });
    }

    const entry: JournalEntry = {
        id: jeId,
        date,
        description: 'Day Zero Cutover Balances',
        businessId: 'Big Sky FPV', // Default owner
        lines,
        createdAt: new Date().toISOString()
    };

    mockJournal.push(entry);
    return entry;
};

// --- Task 1: Record Invoice Payment to Undeposited Funds ---
export const recordInvoicePayment = (invoice: { number: string, businessId: BusinessId, items: any[], taxAmount: number }) => {
    // 1. Validate
    if (!invoice.items || invoice.items.length === 0) throw new Error("No items on invoice");
    
    // 2. Group by Income Account
    const lines: any[] = [];
    let totalAmount = 0;
    
    invoice.items.forEach((item: any) => {
        const amount = item.quantity * item.rate;
        totalAmount += amount;
        
        // Find linked account
        const service = mockServiceItems.find(s => s.id === item.serviceItemId);
        const incomeAccountId = service?.linkedAccountId || '4000'; // Default to Service Revenue
        
        // Credit Income
        lines.push({
            accountId: incomeAccountId,
            description: `Invoice ${invoice.number} - ${item.description}`,
            debit: 0,
            credit: amount
        });
    });

    // Tax
    if (invoice.taxAmount > 0) {
        totalAmount += invoice.taxAmount;
        lines.push({
            accountId: '2100', // Sales Tax Payable
            description: `Invoice ${invoice.number} - Sales Tax`,
            debit: 0,
            credit: invoice.taxAmount
        });
    }

    // Debit Undeposited Funds
    lines.push({
        accountId: '1002', // Undeposited Funds (Asset)
        description: `Payment for Invoice ${invoice.number}`,
        debit: totalAmount,
        credit: 0
    });

    // Create Entry
    const jeId = `je-inv-${Date.now()}`;
    const entry: JournalEntry = {
        id: jeId,
        date: new Date().toISOString().split('T')[0],
        description: `Payment Received: Invoice ${invoice.number}`,
        businessId: invoice.businessId,
        lines,
        createdAt: new Date().toISOString()
    };
    
    mockJournal.push(entry);
    return entry;
};

export const addAccount = (name: string, parentId: string): Account => {
  const parent = mockAccounts.find(a => a.id === parentId);
  if (!parent) throw new Error("Parent account not found");
  
  const newAccount: Account = {
    id: (Math.max(...mockAccounts.map(a => parseInt(a.id))) + 1).toString(),
    code: (Math.max(...mockAccounts.map(a => parseInt(a.code))) + 1).toString(),
    name,
    type: parent.type,
    parentId,
    status: 'active'
  };
  
  mockAccounts.push(newAccount);
  return newAccount;
};

export const updateAccount = (id: string, updates: Partial<Account>) => {
  const index = mockAccounts.findIndex(a => a.id === id);
  if (index !== -1) {
    mockAccounts[index] = { ...mockAccounts[index], ...updates };
  }
};

export const archiveAccount = (id: string) => {
  updateAccount(id, { status: 'archived' });
};

export const addCustomer = (customer: Omit<Customer, 'id'>): Customer => {
  const newCustomer = { ...customer, id: `cust_${Date.now()}` };
  mockCustomers.push(newCustomer);
  return newCustomer;
};

export const addServiceItem = (item: Omit<ServiceItem, 'id'>): ServiceItem => {
  const newItem = { ...item, id: `srv_${Date.now()}` };
  mockServiceItems.push(newItem);
  return newItem;
};

export const addProject = (project: Omit<Project, 'id'>): Project => {
  const newProject = { ...project, id: `proj_${Date.now()}` };
  mockProjects.push(newProject);
  return newProject;
};
