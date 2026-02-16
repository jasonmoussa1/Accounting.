import { Transaction } from '../types';
import { mockInbox, mockJournal, applyRules } from './accounting';

// This file simulates the server-side logic that would normally run in a Cloud Function.
// It returns MOCK data to ensure the UI renders without needing a real backend or API keys.

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number; // Plaid: Positive = Expense, Negative = Deposit
  date: string;
  name: string;
  merchant_name: string | null;
  pending: boolean;
  category: string[] | null;
}

// Mock Plaid API Response
const mockPlaidResponse: PlaidTransaction[] = [
  {
    transaction_id: 'plaid_tx_1',
    account_id: 'acc_checking',
    amount: 120.50, // Expense
    date: new Date().toISOString().split('T')[0],
    name: 'Exxon Mobil',
    merchant_name: 'Exxon Mobil',
    pending: false,
    category: ['Travel', 'Gas Stations']
  },
  {
    transaction_id: 'plaid_tx_2',
    account_id: 'acc_checking',
    amount: 54.99, // Expense
    date: new Date().toISOString().split('T')[0],
    name: 'Adobe *Creative Cloud',
    merchant_name: 'Adobe',
    pending: false,
    category: ['Service', 'Computers', 'Software']
  },
  {
    transaction_id: 'plaid_tx_3',
    account_id: 'acc_checking',
    amount: -2500.00, // Deposit
    date: new Date().toISOString().split('T')[0],
    name: 'Deposit - Red Bull Media',
    merchant_name: null,
    pending: false,
    category: ['Transfer', 'Deposit']
  },
  {
    transaction_id: 'plaid_tx_4',
    account_id: 'acc_checking',
    amount: 14.00,
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    name: 'Chick-fil-A',
    merchant_name: 'Chick-fil-A',
    pending: false,
    category: ['Food and Drink', 'Fast Food']
  }
];

export const fetchPlaidTransactions = async (accessToken: string, startDate: string, endDate: string): Promise<Transaction[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const plaidTransactions = mockPlaidResponse;
  const processedTransactions: Transaction[] = [];

  for (const pt of plaidTransactions) {
    // 1. DUPLICATE CHECK
    const existsInInbox = mockInbox.some(t => t.plaidTransactionId === pt.transaction_id);
    const existsInLedger = mockJournal.some(je => false); // Simplified for demo

    if (existsInInbox || existsInLedger) {
      console.log(`[Server] Skipping duplicate: ${pt.transaction_id}`);
      continue;
    }

    // 2. MAPPING LOGIC
    // Plaid: + is Money Out. JasonOS: - is Money Out (Expense).
    // Plaid: - is Money In. JasonOS: + is Money In (Income).
    const jasonAmount = pt.amount * -1;
    
    // Basic Category Guess based on Plaid taxonomy
    let legacyCategory = 'Uncategorized';
    if (pt.category) {
      if (pt.category.includes('Gas Stations')) legacyCategory = 'Gas';
      if (pt.category.includes('Food and Drink')) legacyCategory = 'Meals';
      if (pt.category.includes('Software')) legacyCategory = 'Software';
    }

    const newTx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: pt.date,
      description: pt.name,
      merchant: pt.merchant_name || pt.name,
      amount: jasonAmount,
      bankAccountId: '1000',
      status: 'imported',
      transactionType: jasonAmount > 0 ? 'income' : 'expense',
      category: legacyCategory,
      plaidTransactionId: pt.transaction_id,
      plaidAccountId: pt.account_id,
      pending: pt.pending,
      isDuplicate: false,
    };

    // 3. APPLY RULES ENGINE (Auto-Tagging)
    const suggestions = applyRules(newTx);
    const enrichedTx = { ...newTx, ...suggestions };

    processedTransactions.push(enrichedTx);
  }

  return processedTransactions;
};

export const syncPlaidToInbox = async (): Promise<number> => {
  const newTxs = await fetchPlaidTransactions('mock-token', '2023-10-01', '2023-10-31');
  
  // Mutate the mockInbox (Simulating DB Write)
  newTxs.forEach(tx => {
    mockInbox.unshift(tx);
  });

  return newTxs.length;
};