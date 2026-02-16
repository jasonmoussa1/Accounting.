
export type NavPath = 'dashboard' | 'transactions' | 'inbox' | 'reconciliation' | 'invoices' | 'customers' | 'contractors' | 'reports' | 'migration' | 'projects' | 'coa' | 'setup';

export type BusinessId = 'Big Sky FPV' | 'TRL Band' | 'Shared';

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

// Base interface for all Firestore documents
export interface FirestoreEntity {
  userId: string; // Security enforcement
  createdAt?: string;
  updatedAt?: string;
}

export interface BankConnection extends FirestoreEntity {
  id: string;
  institutionId: string;
  institutionName: string;
  itemId: string; // Plaid Item ID
  status: 'active' | 'error' | 'disconnected';
  lastSync: string;
}

export interface Transaction extends FirestoreEntity {
  id: string;
  date: string;
  description: string;
  amount: number; // Negative for expense, Positive for income
  bankAccountId: string; // The source asset account (e.g., Checking)
  status: 'imported' | 'posted' | 'reconciled' | 'needs_repost';
  
  transactionType: 'income' | 'expense' | 'transfer';
  transferAccountId?: string; 

  plaidTransactionId?: string;
  plaidAccountId?: string;
  merchantName?: string;
  pending: boolean;

  assignedAccount?: string;
  assignedBusiness?: BusinessId;
  assignedProject?: string;
  assignedContractorId?: string; 
  splits?: SplitLine[];
  
  linkedJournalEntryId?: string;
  
  isDuplicate?: boolean;
  aiConfidence?: number;
  category?: string; 
  isContractor?: boolean;
  merchant?: string;
}

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Cost of Services' | 'Expense';

export interface Account extends FirestoreEntity {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  status?: 'active' | 'archived';
  description?: string;
  plaidAccountId?: string; 
}

export interface JournalLine {
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
  // Task 2: Line-Level Business Attribution
  businessId?: BusinessId; 
  contractorId?: string;
  isCleared?: boolean;
  clearedAt?: string;
  reconciliationId?: string;
}

export interface JournalEntry extends FirestoreEntity {
  id: string;
  date: string;
  description: string;
  businessId: BusinessId;
  projectId?: string; 
  lines: JournalLine[];
  
  // Immutability / AJE Fields
  isAdjustingEntry?: boolean; 
  adjustmentReason?: string;
  originalJournalEntryId?: string; // Reference to the entry this reverses/corrects
}

export interface Reconciliation extends FirestoreEntity {
  id: string;
  businessId: BusinessId;
  accountId: string;
  statementEndDate: string;
  statementBalance: number;
  clearedLineIds: string[]; 
  isLocked: boolean;
  performedBy: string;
}

export interface AuditEvent extends FirestoreEntity {
  id: string;
  timestamp: string;
  action: 'LOCK_PERIOD' | 'CREATE_AJE' | 'EDIT_ATTEMPT' | 'INVOICE_CREATE' | 'INVOICE_PAYMENT' | 'PERIOD_CROSSING';
  details: string;
  user: string;
}

export interface Project extends FirestoreEntity {
  id: string;
  name: string;
  businessId: BusinessId;
  date: string;
  clientId: string;
  status: 'active' | 'completed' | 'cancelled';
  description?: string;
}

export interface Contractor extends FirestoreEntity {
  id: string;
  name: string; 
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

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';

export interface InvoiceItem {
  id: string;
  serviceItemId?: string; 
  description: string;
  quantity: number;
  rate: number;
  // REMOVED TAX FIELDS
}

export interface Invoice extends FirestoreEntity {
  id: string;
  invoiceNumber: string;
  customerId: string;
  businessId: BusinessId;
  dateIssued: string;
  dueDate: string;
  items: InvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  status: InvoiceStatus;
  logoUrl?: string;
}

export interface InvoicePayment extends FirestoreEntity {
  id: string;
  invoiceId: string;
  date: string;
  amount: number;
  method: 'Check' | 'Credit Card' | 'Bank Transfer' | 'Cash';
  linkedJournalEntryId: string;
}

export interface Customer extends FirestoreEntity {
  id: string;
  name: string; 
  contactPerson?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  defaultBusiness?: BusinessId;
  notes?: string;
}

export interface ServiceItem extends FirestoreEntity {
  id: string;
  name: string;
  description: string;
  rate: number;
  unit: 'Hour' | 'Day' | 'Flat Fee' | 'Item';
  linkedAccountId: string; 
  defaultBusiness?: BusinessId;
}

export interface MerchantProfile extends FirestoreEntity {
  id: string;
  merchantName: string;
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

export interface SystemSettings extends FirestoreEntity {
    id: string;
    schemaVersion: string;
    lastUpdatedAt: string;
    organizationName: string;
}
