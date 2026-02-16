
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Account, JournalEntry, Transaction, Project, Contractor, Customer, ServiceItem, Reconciliation, MerchantProfile, SystemSettings, BusinessId, InvoiceItem, AuditEvent, Invoice, InvoicePayment } from '../types';
import { useAuth } from './AuthContext';
import { FirestoreRepository, COLLECTIONS } from '../services/repository';
import { checkEntryLocks, isLineCleared } from '../services/accounting';

interface FinanceContextType {
  accounts: Account[];
  journal: JournalEntry[];
  inbox: Transaction[];
  projects: Project[];
  contractors: Contractor[];
  customers: Customer[];
  reconciliations: Reconciliation[];
  merchantProfiles: MerchantProfile[];
  serviceItems: ServiceItem[];
  invoices: Invoice[];
  invoicePayments: InvoicePayment[];
  refreshData: () => Promise<void>;
  loading: boolean;
  
  // Actions
  addTransactionToInbox: (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  postJournalEntry: (entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  postTransaction: (tx: Transaction) => Promise<void>; // NEW: Bridge for Inbox -> Ledger
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  
  addCustomer: (customer: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  addProject: (project: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  addAccount: (name: string, parentId?: string) => Promise<Account>;
  addContractor: (contractor: Omit<Contractor, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Contractor>;
  finalizeReconciliation: (businessId: string, accountId: string, statementEndDate: string, statementBalance: number, clearedLineIds: Set<string>) => Promise<void>;
  postBatchOpeningEntry: (date: string, balances: { accountId: string, amount: number }[], businessId?: BusinessId) => Promise<void>;
  
  // New Invoice Actions
  saveInvoice: (invoice: Omit<Invoice, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Invoice>;
  recordInvoicePayment: (data: { invoiceId: string, amount: number, date: string, method: string }) => Promise<void>;
  
  logAuditEvent: (action: string, details: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [inbox, setInbox] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [merchantProfiles, setMerchantProfiles] = useState<MerchantProfile[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<InvoicePayment[]>([]);

  const refreshData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
        const [acc, je, tx, proj, cont, cust, rec, merch, srv, inv, invPay] = await Promise.all([
            FirestoreRepository.getCollection<Account>(COLLECTIONS.ACCOUNTS, currentUser.uid),
            FirestoreRepository.getCollection<JournalEntry>(COLLECTIONS.JOURNAL, currentUser.uid),
            FirestoreRepository.getCollection<Transaction>(COLLECTIONS.TRANSACTIONS, currentUser.uid),
            FirestoreRepository.getCollection<Project>(COLLECTIONS.PROJECTS, currentUser.uid),
            FirestoreRepository.getCollection<Contractor>(COLLECTIONS.CONTRACTORS, currentUser.uid),
            FirestoreRepository.getCollection<Customer>(COLLECTIONS.CUSTOMERS, currentUser.uid),
            FirestoreRepository.getCollection<Reconciliation>(COLLECTIONS.RECONCILIATIONS, currentUser.uid),
            FirestoreRepository.getCollection<MerchantProfile>(COLLECTIONS.MERCHANT_PROFILES, currentUser.uid),
            FirestoreRepository.getCollection<ServiceItem>(COLLECTIONS.SERVICE_ITEMS, currentUser.uid),
            FirestoreRepository.getCollection<Invoice>(COLLECTIONS.INVOICES, currentUser.uid),
            FirestoreRepository.getCollection<InvoicePayment>(COLLECTIONS.INVOICE_PAYMENTS, currentUser.uid)
        ]);
        
        setAccounts(acc);
        setJournal(je);
        setInbox(tx);
        setProjects(proj);
        setContractors(cont);
        setCustomers(cust);
        setReconciliations(rec);
        setMerchantProfiles(merch);
        setServiceItems(srv);
        setInvoices(inv);
        setInvoicePayments(invPay);

    } catch (e) {
        console.error("Failed to load finance data", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
        refreshData();
    } else {
        setAccounts([]);
        setJournal([]);
        setInbox([]);
    }
  }, [currentUser]);

  // --- ACTIONS ---

  const logAuditEvent = async (action: string, details: string) => {
      if (!currentUser) return;
      await FirestoreRepository.addDocument<AuditEvent>(COLLECTIONS.AUDIT_EVENTS, {
          timestamp: new Date().toISOString(),
          action: action as any,
          details,
          user: currentUser.email || 'unknown'
      }, currentUser.uid);
  };

  const addTransactionToInbox = async (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return;
    await FirestoreRepository.addDocument(COLLECTIONS.TRANSACTIONS, tx, currentUser.uid);
    refreshData();
  };

  const postJournalEntry = async (entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      if (!currentUser) throw new Error("Not logged in");
      
      // BLOCKER 1: STRICT BALANCE CHECK
      const totalDebits = entry.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = entry.lines.reduce((sum, line) => sum + line.credit, 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
          throw new Error(`CRITICAL LEDGER ERROR: Entry is unbalanced. Debits: $${totalDebits.toFixed(2)}, Credits: $${totalCredits.toFixed(2)}.`);
      }

      // TASK 2: ENFORCE DEEP ACCOUNT LOCKING
      try {
          const accountIds = entry.lines.map(l => l.accountId);
          checkEntryLocks(entry.date, reconciliations, accountIds);
      } catch(e: any) {
          alert(e.message);
          throw e; // Block execution
      }

      const id = await FirestoreRepository.addDocument(COLLECTIONS.JOURNAL, entry, currentUser.uid);
      await refreshData();
      return id;
  };

  // NEW: Helper to convert Transaction to Journal Entry securely
  const postTransaction = async (tx: Transaction) => {
    if (!currentUser) throw new Error("Not logged in");

    const absAmount = Math.abs(tx.amount);
    const lines = [];

    // Logic: Construct Balanced Lines
    if (tx.transactionType === 'expense') {
        // Debit: Category (Increase Expense)
        lines.push({ accountId: tx.assignedAccount!, debit: absAmount, credit: 0, description: tx.description, contractorId: tx.assignedContractorId });
        // Credit: Bank (Decrease Asset)
        lines.push({ accountId: tx.bankAccountId, debit: 0, credit: absAmount, description: tx.description });
    } else if (tx.transactionType === 'income') {
        // Debit: Bank (Increase Asset)
        lines.push({ accountId: tx.bankAccountId, debit: absAmount, credit: 0, description: tx.description });
        // Credit: Category (Increase Income)
        lines.push({ accountId: tx.assignedAccount!, debit: 0, credit: absAmount, description: tx.description });
    } else if (tx.transactionType === 'transfer') {
        // Transfer logic
        if (!tx.transferAccountId) throw new Error("Transfer target required");
        
        if (tx.amount < 0) {
            // Money Leaving Bank -> Going to Transfer Account
            lines.push({ accountId: tx.transferAccountId, debit: absAmount, credit: 0, description: "Transfer In" });
            lines.push({ accountId: tx.bankAccountId, debit: 0, credit: absAmount, description: "Transfer Out" });
        } else {
            // Money Entering Bank <- Coming from Transfer Account
            lines.push({ accountId: tx.bankAccountId, debit: absAmount, credit: 0, description: "Transfer In" });
            lines.push({ accountId: tx.transferAccountId, debit: 0, credit: absAmount, description: "Transfer Out" });
        }
    }

    // 1. Post to Ledger (this performs validation & locking checks)
    const jeId = await postJournalEntry({
        date: tx.date,
        description: tx.description,
        businessId: tx.assignedBusiness!,
        projectId: tx.assignedProject,
        lines: lines
    });

    // 2. Update Transaction Status
    await updateTransaction(tx.id, { 
        status: 'posted', 
        linkedJournalEntryId: jeId,
        // Clear flags
        isDuplicate: false 
    });
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
      if (!currentUser) return;
      
      const original = inbox.find(t => t.id === id);
      if (!original) return;

      // BLOCKER 2: APPEND-ONLY LOGIC FOR POSTED TRANSACTIONS
      if (original.status === 'posted' && original.linkedJournalEntryId) {
           
           // 1. Fetch Original JE
           const originalJE = journal.find(j => j.id === original.linkedJournalEntryId);
           if (!originalJE) throw new Error("Linked Journal Entry not found.");

           // TASK 1: ENFORCE CLEARED-LINE PROTECTION
           const hasClearedLines = originalJE.lines.some((_, idx) => {
                const lineKey = `${originalJE.id}-${idx}`;
                return isLineCleared(lineKey, reconciliations);
           });

           if (hasClearedLines) {
               alert("Access Denied: This transaction has been cleared in a reconciliation. You must 'Unclear' it in the Reconciliation module before editing.");
               throw new Error("Transaction is Cleared");
           }

           // TASK 2: ENFORCE DEEP ACCOUNT LOCKING
           // Iterate through ALL accounts in the original entry to ensure none are locked on that date
           let isOriginalDateLocked = false;
           try {
               const accountIds = originalJE.lines.map(l => l.accountId);
               checkEntryLocks(originalJE.date, reconciliations, accountIds);
           } catch(e) {
               isOriginalDateLocked = true;
           }

           // 2. Prompt for Reason
           const reason = prompt("You are editing a posted transaction. This will create an Adjusting Journal Entry (AJE). Please enter a reason:", "Correction");
           if (!reason) return; // Cancel if no reason

           // TASK 4: AJE DATING STRATEGY
           // If original date is locked, force Reversal Date to Today (First day of open period)
           let reversalDate = originalJE.date;
           if (isOriginalDateLocked) {
               reversalDate = new Date().toISOString().split('T')[0]; // Use Today
               await logAuditEvent("PERIOD_CROSSING", `Forced AJE Date to ${reversalDate} because original date ${originalJE.date} is in a locked period.`);
           }

           // 3. Create Reversal JE (Swap Debits/Credits)
           const reversalLines = originalJE.lines.map(l => ({
               ...l,
               debit: l.credit,
               credit: l.debit,
               description: `Reversal of ${originalJE.id}: ${l.description}`
           }));

           await postJournalEntry({
               date: reversalDate, 
               description: `VOID/REVERSE ${originalJE.id} - ${original.description}`,
               businessId: original.businessId || 'Big Sky FPV',
               lines: reversalLines,
               isAdjustingEntry: true,
               adjustmentReason: `Reversing for update: ${reason}`,
               originalJournalEntryId: originalJE.id
           });

           // TASK 3: 'NEEDS REPOST' WORKFLOW
           // Set status to 'needs_repost' and clear link. This forces it back to the inbox.
           updates.status = 'needs_repost';
           updates.linkedJournalEntryId = undefined; // Force strict null/undefined via update
           
           await logAuditEvent("EDIT_ATTEMPT", `Reversed JE ${originalJE.id} to allow editing of Transaction ${original.id}. Status set to NEEDS_REPOST.`);
      }

      await FirestoreRepository.updateDocument(COLLECTIONS.TRANSACTIONS, id, updates, currentUser.uid);
      refreshData();
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
      if (!currentUser) return;
      await FirestoreRepository.updateDocument(COLLECTIONS.ACCOUNTS, id, updates, currentUser.uid);
      refreshData();
  };

  const addCustomer = async (customer: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error("Not logged in");
    const id = await FirestoreRepository.addDocument(COLLECTIONS.CUSTOMERS, customer, currentUser.uid);
    await refreshData();
    return { ...customer, id, userId: currentUser.uid } as Customer;
  };

  const addProject = async (project: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error("Not logged in");
    const id = await FirestoreRepository.addDocument(COLLECTIONS.PROJECTS, project, currentUser.uid);
    await refreshData();
    return { ...project, id, userId: currentUser.uid } as Project;
  };

  const addAccount = async (name: string, parentId?: string) => {
     if (!currentUser) throw new Error("Not logged in");
     const parent = accounts.find(a => a.id === parentId);
     const newAccount: Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
         name,
         parentId,
         type: parent ? parent.type : 'Expense',
         code: parent ? `${parent.code}.${Math.floor(Math.random() * 100)}` : 'XXXX'
     };
     const id = await FirestoreRepository.addDocument(COLLECTIONS.ACCOUNTS, newAccount, currentUser.uid);
     await refreshData();
     return { ...newAccount, id, userId: currentUser.uid } as Account;
  };

  const addContractor = async (contractor: Omit<Contractor, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error("Not logged in");
    const id = await FirestoreRepository.addDocument(COLLECTIONS.CONTRACTORS, contractor, currentUser.uid);
    await refreshData();
    return { ...contractor, id, userId: currentUser.uid } as Contractor;
  };

  const finalizeReconciliation = async (businessId: string, accountId: string, statementEndDate: string, statementBalance: number, clearedLineIds: Set<string>) => {
    if (!currentUser) throw new Error("Not logged in");
    
    // 1. Create Recon Record (Locked)
    const recon: Omit<Reconciliation, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        businessId: businessId as BusinessId,
        accountId,
        statementEndDate,
        statementBalance,
        clearedLineIds: Array.from(clearedLineIds),
        isLocked: true,
        performedBy: currentUser.email || 'unknown'
    };
    await FirestoreRepository.addDocument(COLLECTIONS.RECONCILIATIONS, recon, currentUser.uid);
    await logAuditEvent("LOCK_PERIOD", `Locked period ending ${statementEndDate} for account ${accountId}.`);

    // 2. Refresh
    await refreshData();
  };

  const postBatchOpeningEntry = async (date: string, balances: { accountId: string, amount: number }[], businessId: BusinessId = 'Shared') => {
      if (!currentUser) throw new Error("Not logged in");
      
      const lines = balances.map(b => {
        const acc = accounts.find(a => a.id === b.accountId);
        if (!acc) throw new Error(`Account ${b.accountId} not found`);

        let debit = 0;
        let credit = 0;

        if (acc.type === 'Asset') {
            debit = b.amount;
        } else if (acc.type === 'Liability' || acc.type === 'Equity') {
            credit = b.amount;
        } else {
            // Fallback for P&L items if migrating mid-year (Expenses=Debit, Income=Credit)
            if (acc.type === 'Expense' || acc.type === 'Cost of Services') debit = b.amount;
            else credit = b.amount;
        }

        return {
            accountId: b.accountId,
            debit,
            credit,
            description: "Opening Balance"
        };
      });

      // Calculate Plug
      const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
          const diff = totalDebits - totalCredits;
          lines.push({
              accountId: '3000', // Hardcoded Opening Balance Equity ID
              debit: diff < 0 ? Math.abs(diff) : 0,
              credit: diff > 0 ? diff : 0,
              description: "Opening Balance Equity Adjustment"
          });
      }

      const je: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
          date,
          description: "Opening Balance Set",
          businessId, 
          lines
      };
      
      await FirestoreRepository.addDocument(COLLECTIONS.JOURNAL, je, currentUser.uid);
      await logAuditEvent("CREATE_AJE", `Posted Opening Balances for ${businessId} on ${date}`);
      await refreshData();
  };

  const saveInvoice = async (invoice: Omit<Invoice, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error("Not logged in");
    const id = await FirestoreRepository.addDocument(COLLECTIONS.INVOICES, invoice, currentUser.uid);
    await logAuditEvent("INVOICE_CREATE", `Created Invoice ${invoice.invoiceNumber} for $${invoice.totalAmount}`);
    await refreshData();
    return { ...invoice, id, userId: currentUser.uid } as Invoice;
  };

  const recordInvoicePayment = async (data: { invoiceId: string, amount: number, date: string, method: string }) => {
      if (!currentUser) throw new Error("Not logged in");
      
      // 1. Validate Input
      if (data.amount <= 0) {
          throw new Error("Payment amount must be positive. Use a Credit Memo for refunds.");
      }

      const invoice = invoices.find(i => i.id === data.invoiceId);
      if (!invoice) throw new Error("Invoice not found");

      // 2. Post to Ledger (Cash Basis)
      const jeId = await postJournalEntry({
          date: data.date,
          description: `Payment for Inv #${invoice.invoiceNumber}`,
          businessId: invoice.businessId,
          lines: [
              { accountId: '1002', debit: data.amount, credit: 0, description: 'Undeposited Funds' },
              { accountId: '4000', debit: 0, credit: data.amount, description: 'Sales Income' } 
          ]
      });

      // 3. Save Payment Record
      await FirestoreRepository.addDocument<InvoicePayment>(COLLECTIONS.INVOICE_PAYMENTS, {
          invoiceId: data.invoiceId,
          date: data.date,
          amount: data.amount,
          method: data.method as any,
          linkedJournalEntryId: jeId
      }, currentUser.uid);

      // 4. Update Invoice Status
      const previousPaid = invoice.amountPaid || 0;
      const newPaid = previousPaid + data.amount;
      
      const newStatus = newPaid >= invoice.totalAmount ? 'paid' : 'partial';
      
      await FirestoreRepository.updateDocument(COLLECTIONS.INVOICES, invoice.id, {
          amountPaid: newPaid,
          status: newStatus
      }, currentUser.uid);

      await logAuditEvent("INVOICE_PAYMENT", `Recorded $${data.amount} payment for Inv #${invoice.invoiceNumber}`);
      await refreshData();
  };

  return (
    <FinanceContext.Provider value={{
      accounts,
      journal,
      inbox,
      projects,
      contractors,
      customers,
      reconciliations,
      merchantProfiles,
      serviceItems,
      invoices,
      invoicePayments,
      refreshData,
      loading,
      addTransactionToInbox,
      postJournalEntry,
      postTransaction,
      updateTransaction,
      updateAccount,
      addCustomer,
      addProject,
      addAccount,
      addContractor,
      finalizeReconciliation,
      postBatchOpeningEntry,
      saveInvoice,
      recordInvoicePayment,
      logAuditEvent
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
