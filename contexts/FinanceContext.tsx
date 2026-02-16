
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Account, JournalEntry, Transaction, Project, Contractor, Customer, ServiceItem, Reconciliation, MerchantProfile, SystemSettings, BusinessId, InvoiceItem, AuditEvent, Invoice, InvoicePayment } from '../types';
import { useAuth } from './AuthContext';
import { FirestoreRepository, COLLECTIONS } from '../services/repository';
import { checkEntryLocks, isLineCleared, getAccountIdByCode, validateJournalEntry, SYSTEM_CODES } from '../services/accounting';

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
  postTransaction: (tx: Transaction) => Promise<void>; 
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  
  addCustomer: (customer: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  addProject: (project: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  addAccount: (name: string, parentId?: string) => Promise<Account>;
  addContractor: (contractor: Omit<Contractor, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Contractor>;
  finalizeReconciliation: (businessId: string, accountId: string, statementEndDate: string, statementBalance: number, clearedLineIds: Set<string>) => Promise<void>;
  postBatchOpeningEntry: (date: string, balances: { accountId: string, amount: number }[], businessId?: BusinessId) => Promise<void>;
  
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
      
      // TASK 2: LEDGER GUARD (Centralized Validation)
      // This throws an error if unbalanced, locked, or invalid accounts are used.
      validateJournalEntry(entry, accounts, reconciliations);

      const id = await FirestoreRepository.addDocument(COLLECTIONS.JOURNAL, entry, currentUser.uid);
      await refreshData();
      return id;
  };

  const postTransaction = async (tx: Transaction) => {
    if (!currentUser) throw new Error("Not logged in");

    const absAmount = Math.abs(tx.amount);
    const lines = [];

    // Logic: Construct Balanced Lines
    if (tx.transactionType === 'expense') {
        lines.push({ accountId: tx.assignedAccount!, debit: absAmount, credit: 0, description: tx.description, contractorId: tx.assignedContractorId });
        lines.push({ accountId: tx.bankAccountId, debit: 0, credit: absAmount, description: tx.description });
    } else if (tx.transactionType === 'income') {
        lines.push({ accountId: tx.bankAccountId, debit: absAmount, credit: 0, description: tx.description });
        lines.push({ accountId: tx.assignedAccount!, debit: 0, credit: absAmount, description: tx.description });
    } else if (tx.transactionType === 'transfer') {
        if (!tx.transferAccountId) throw new Error("Transfer target required");
        if (tx.amount < 0) {
            lines.push({ accountId: tx.transferAccountId, debit: absAmount, credit: 0, description: "Transfer In" });
            lines.push({ accountId: tx.bankAccountId, debit: 0, credit: absAmount, description: "Transfer Out" });
        } else {
            lines.push({ accountId: tx.bankAccountId, debit: absAmount, credit: 0, description: "Transfer In" });
            lines.push({ accountId: tx.transferAccountId, debit: 0, credit: absAmount, description: "Transfer Out" });
        }
    }

    const jeId = await postJournalEntry({
        date: tx.date,
        description: tx.description,
        businessId: tx.assignedBusiness!,
        projectId: tx.assignedProject,
        lines: lines
    });

    await updateTransaction(tx.id, { 
        status: 'posted', 
        linkedJournalEntryId: jeId,
        isDuplicate: false 
    });
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
      if (!currentUser) return;
      const original = inbox.find(t => t.id === id);
      if (!original) return;

      if (original.status === 'posted' && original.linkedJournalEntryId) {
           const originalJE = journal.find(j => j.id === original.linkedJournalEntryId);
           if (!originalJE) throw new Error("Linked Journal Entry not found.");

           const hasClearedLines = originalJE.lines.some((_, idx) => {
                const lineKey = `${originalJE.id}:${idx}`; 
                return isLineCleared(lineKey, reconciliations);
           });

           if (hasClearedLines) {
               alert("Access Denied: This transaction has been cleared in a reconciliation.");
               throw new Error("Transaction is Cleared");
           }

           let isOriginalDateLocked = false;
           try {
               const accountIds = originalJE.lines.map(l => l.accountId);
               checkEntryLocks(originalJE.date, reconciliations, accountIds);
           } catch(e) {
               isOriginalDateLocked = true;
           }

           const reason = prompt("Editing a posted transaction requires an Adjusting Entry. Reason:", "Correction");
           if (!reason) return; 

           let reversalDate = originalJE.date;
           if (isOriginalDateLocked) {
               reversalDate = new Date().toISOString().split('T')[0]; 
               await logAuditEvent("PERIOD_CROSSING", `Forced AJE Date to ${reversalDate}`);
           }

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

           updates.status = 'needs_repost';
           updates.linkedJournalEntryId = undefined; 
           await logAuditEvent("EDIT_ATTEMPT", `Reversed JE ${originalJE.id}.`);
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
    await refreshData();
  };

  const postBatchOpeningEntry = async (date: string, balances: { accountId: string, amount: number }[], businessId: BusinessId = 'Shared') => {
      if (!currentUser) throw new Error("Not logged in");
      const lines = balances.map(b => {
        const acc = accounts.find(a => a.id === b.accountId);
        if (!acc) throw new Error(`Account ${b.accountId} not found`);
        let debit = 0;
        let credit = 0;
        if (acc.type === 'Asset') debit = b.amount;
        else if (acc.type === 'Liability' || acc.type === 'Equity') credit = b.amount;
        else {
            if (acc.type === 'Expense' || acc.type === 'Cost of Services') debit = b.amount;
            else credit = b.amount;
        }
        return { accountId: b.accountId, debit, credit, description: "Opening Balance" };
      });

      const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
          const diff = totalDebits - totalCredits;
          const equityId = getAccountIdByCode(accounts, SYSTEM_CODES.OPENING_BALANCE_EQUITY);
          lines.push({
              accountId: equityId,
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
      if (data.amount <= 0) throw new Error("Payment amount must be positive.");

      const invoice = invoices.find(i => i.id === data.invoiceId);
      if (!invoice) throw new Error("Invoice not found");

      const undepositedFundsId = getAccountIdByCode(accounts, SYSTEM_CODES.UNDEPOSITED_FUNDS);
      const salesIncomeId = getAccountIdByCode(accounts, SYSTEM_CODES.SALES_INCOME);

      const jeId = await postJournalEntry({
          date: data.date,
          description: `Payment for Inv #${invoice.invoiceNumber}`,
          businessId: invoice.businessId,
          lines: [
              { accountId: undepositedFundsId, debit: data.amount, credit: 0, description: 'Undeposited Funds' },
              { accountId: salesIncomeId, debit: 0, credit: data.amount, description: 'Sales Income' } 
          ]
      });

      await FirestoreRepository.addDocument<InvoicePayment>(COLLECTIONS.INVOICE_PAYMENTS, {
          invoiceId: data.invoiceId,
          date: data.date,
          amount: data.amount,
          method: data.method as any,
          linkedJournalEntryId: jeId
      }, currentUser.uid);

      const newPaid = (invoice.amountPaid || 0) + data.amount;
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
