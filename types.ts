
export type NavPath = 'dashboard' | 'transactions' | 'inbox' | 'reconciliation' | 'invoices' | 'customers' | 'contractors' | 'reports' | 'migration' | 'projects' | 'coa' | 'setup';

export type BusinessId = 'Big Sky FPV' | 'TRL Band';

export type IRSCategory = 
  | 'Meals' 
  | 'Travel' 
  | 'Gas' 
  | 'Software' 
  | 'Office Expenses' 
  | 'Rent' 
  | 'Utilities' 
  | 'Subcontractors' 
  | 'Uncategorized'
  | 'Income';

export interface SplitLine {
  accountId: string;
  amount: number;
  description?: string;
  projectId?: string;
  businessId?: BusinessId;
  contractorId?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number; // Negative for expense, Positive for income
  bankAccountId: string; // The source asset account (e.g., Checking)
  status: 'imported' | 'posted' | 'reconciled';
  
  // New Type Logic (Task 1)
  transactionType: 'income' | 'expense' | 'transfer';
  transferAccountId?: string; // If transfer, which account is on the other side?

  // Plaid Integration Fields
  plaidTransactionId?: string;
  plaidAccountId?: string;
  merchantName?: string;
  pending?: boolean;

  // Staging fields (used in Inbox before posting)
  assignedAccount?: string; // The target expense/income account
  assignedBusiness?: BusinessId;
  assignedProject?: string;
  assignedContractorId?: string; // Staging for contractor
  splits?: SplitLine[];
  
  // Link to the real ledger
  linkedJournalEntryId?: string;
  
  // Metadata
  isDuplicate?: boolean;
  aiConfidence?: number;
  category?: string; // Legacy field for display
  isContractor?: boolean;
  merchant?: string;
}

// --- New Double-Entry Types ---

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Cost of Services' | 'Expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  status?: 'active' | 'archived';
  description?: string;
}

export interface JournalLine {
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
  contractorId?: string; // Link to contractor
  
  // Reconciliation Fields (Task 1)
  isCleared?: boolean;
  clearedAt?: string;
  reconciliationId?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  businessId: BusinessId;
  projectId?: string; // Optional link to specific gig
  lines: JournalLine[];
  createdAt: string;
  
  // Immutability Fields (Task 2)
  isAdjustingEntry?: boolean; // AJE
  adjustmentReason?: string;
}

export interface Reconciliation {
  id: string;
  businessId: BusinessId; // Task 1: Added businessId
  accountId: string;
  statementEndDate: string;
  statementBalance: number;
  clearedLineIds: string[]; // List of JournalLine IDs (format: entryId-lineIndex)
  isLocked: boolean;
  createdAt: string;
  performedBy: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: 'LOCK_PERIOD' | 'CREATE_AJE' | 'EDIT_ATTEMPT';
  details: string;
  user: string;
}

export interface BankRule {
  id: string;
  contains: string;
  assignBusiness: BusinessId;
  assignAccount: string; // ID from CoA
  assignProject?: string;
}

// --- Project Types ---

export interface Project {
  id: string;
  name: string;
  businessId: BusinessId;
  date: string;
  clientId: string;
  status: 'active' | 'completed' | 'cancelled';
  description?: string;
}

export interface Contractor {
  id: string;
  name: string; // Display Name
  legalName: string;
  dba?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  taxClassification: 'Individual' | 'LLC' | 'Corporation' | 'Partnership';
  taxId?: string;
  w9Received: boolean;
  w9Url?: string;
  status: 'active' | 'archived';
  notes?: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface InvoiceItem {
  id: string;
  serviceItemId?: string; // Link to catalog
  description: string;
  quantity: number;
  rate: number;
}

export interface Customer {
  id: string;
  name: string; // Company Name
  contactPerson?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  defaultBusiness?: BusinessId;
  notes?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  rate: number;
  unit: 'Hour' | 'Day' | 'Flat Fee' | 'Item';
  linkedAccountId: string; // Income account
  defaultBusiness?: BusinessId;
}

// Task 2: Merchant Profiles
export interface MerchantProfile {
  id: string;
  merchantName: string; // Normalized name (e.g., "Home Depot" from "HOME DEPOT #4829")
  defaultBusiness?: BusinessId;
  defaultAccount?: string;
  defaultProject?: string;
  lastSeen: string;
}

export interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  type: 'neutral' | 'positive' | 'negative' | 'warning';
}
