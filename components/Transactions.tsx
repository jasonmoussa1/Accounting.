import React, { useState } from 'react';
import { Transaction } from '../types';
import { geminiService } from '../services/geminiService';
import { mockJournal, mockInbox } from '../services/accounting';
import { syncPlaidToInbox } from '../services/plaidService';
import { Search, Filter, RefreshCw, Download, User, Sparkles, PlusCircle } from 'lucide-react';
import { BankConnect } from './BankConnect';

export const Transactions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  // Force re-render after sync
  const [lastUpdated, setLastUpdated] = useState(Date.now()); 

  // Day Zero: We only want to show actual data from our "database" (mockJournal), not hardcoded UI placeholders
  // Convert posted Journal Entries to Transaction view
  const postedTransactions: Transaction[] = mockJournal.map(je => {
     // Identify the primary line vs the bank line
     const mainLine = je.lines.find(l => l.accountId !== '1000' && l.accountId !== '3001') || je.lines[0];
     const isIncome = mainLine.credit > 0;
     return {
         id: je.id,
         date: je.date,
         description: je.description,
         category: 'Posted Entry', // Simplification for view
         amount: Math.max(mainLine.debit, mainLine.credit),
         transactionType: isIncome ? 'income' : 'expense',
         status: 'posted',
         bankAccountId: '1000'
     };
  });

  const allTransactions = [...mockInbox, ...postedTransactions];

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const count = await syncPlaidToInbox();
      setLastUpdated(Date.now());
      if (count > 0) alert(`Synced ${count} new transactions!`);
      else alert("No new transactions found.");
    } catch (e) {
      alert("Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredTransactions = allTransactions.filter(tx => 
    tx.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Transactions</h2>
          <p className="text-slate-500">Manage and categorize your bank activity.</p>
        </div>
        
        {/* Bank Connection Widget */}
        <div className="w-full md:w-80">
            {showConnect ? (
                <BankConnect onSyncComplete={() => {
                    setLastUpdated(Date.now());
                    setShowConnect(false);
                }} />
            ) : (
                <div className="flex gap-2 justify-end">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                        <Download size={16} /> Export
                    </button>
                    <button 
                        onClick={() => setShowConnect(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm"
                    >
                        <PlusCircle size={16} /> Connect Bank
                    </button>
                    <button 
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
                    >
                        <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                        {isSyncing ? "Syncing..." : "Sync"}
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by merchant or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
            <Filter size={16} />
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Logic</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{tx.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 font-medium">{tx.description}</span>
                      {tx.isContractor && (
                        <span title="Detected 1099 Contractor" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600">
                          <User size={12} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200`}>
                      {tx.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {/* Visual Logic Indicator */}
                    {tx.assignedAccount ? (
                       <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                         <Sparkles size={12} /> Auto-Rule
                       </div>
                    ) : (
                       <div className="text-xs text-slate-400">Manual</div>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-medium ${
                    tx.transactionType === 'income' ? 'text-emerald-600' : 'text-slate-900'
                  }`}>
                    {tx.transactionType === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-indigo-600 hover:text-indigo-800 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};