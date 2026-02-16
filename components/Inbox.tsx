
import React, { useState, useRef } from 'react';
import { Transaction } from '../types';
import { useFinance } from '../contexts/FinanceContext';
import { applyRules, checkDuplicate } from '../services/accounting';
import { CategorySelect } from './CategorySelect';
import { CoachPanel } from './CoachPanel';
import { Check, AlertTriangle, ArrowRight, Split, Briefcase, Building, CheckCircle2, User, Upload, X, Settings, Loader2, FileText, Database, ArrowLeftRight, PiggyBank, Clock, RotateCw, Layout } from 'lucide-react';

// --- ROW COMPONENT ---
interface TransactionRowProps {
  item: Transaction;
  onUpdate: (id: string, field: keyof Transaction, value: any) => void;
  onPost: (tx: Transaction) => void;
  isSelected: boolean;
  onSelect: () => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ item, onUpdate, onPost, isSelected, onSelect }) => {
  const { accounts, projects, contractors } = useFinance();
  const isPosted = item.status === 'posted';
  const needsRepost = item.status === 'needs_repost';
  const isExpense = item.amount < 0;
  const isTransfer = item.transactionType === 'transfer';
  const isPending = item.pending;

  const selectedAccount = accounts.find(a => a.id === item.assignedAccount);
  const isLaborAccount = selectedAccount?.name.includes('Subcontracted Labor') || selectedAccount?.parentId === '5100'; 
  const isDirectCost = selectedAccount?.type === 'Cost of Services';

  const isValid = isTransfer 
      ? !!item.transferAccountId
      : (!!item.assignedAccount && item.assignedAccount !== 'uncategorized');

  return (
    <div 
        onClick={onSelect}
        className={`bg-white border rounded-xl p-4 transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-indigo-500 shadow-md z-10 relative' : 
        needsRepost ? 'border-amber-300 bg-amber-50 shadow-md' :
        isPosted ? 'opacity-60 bg-slate-50 border-slate-200' : 
        'border-slate-200 shadow-sm hover:shadow-md'
    }`}>
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        
        {/* 1. Date & Desc */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500">{item.date}</span>
            {needsRepost && <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200"><RotateCw size={10} /> Re-Approval Needed</span>}
            {isPending && !isPosted && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse"><Clock size={10} /> Pending</span>}
            {item.isDuplicate && !isPosted && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"><AlertTriangle size={10} /> Duplicate?</span>}
            {isPosted && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"><CheckCircle2 size={10} /> Posted</span>}
          </div>
          <div className="font-medium text-slate-900">{item.description}</div>
          <div className={`text-sm font-mono font-bold ${isExpense ? 'text-slate-900' : 'text-emerald-600'}`}>
            {isExpense ? '-' : '+'}${Math.abs(item.amount).toFixed(2)}
          </div>
        </div>

        {/* 2. Controls */}
        {!isPosted && (
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2" onClick={e => e.stopPropagation()}>
            
            <div className="flex bg-slate-100 rounded-lg p-1 h-[38px] items-center">
                {(['income', 'expense', 'transfer'] as const).map(t => (
                     <button
                        key={t}
                        onClick={() => onUpdate(item.id, 'transactionType', t)}
                        className={`flex-1 flex justify-center py-1 text-[10px] font-bold uppercase rounded ${
                            item.transactionType === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
                        }`}
                     >
                        {t === 'transfer' ? <ArrowLeftRight size={14}/> : (t === 'income' ? '+' : '-')}
                     </button>
                ))}
            </div>

            <div className="relative">
              <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <select 
                className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                value={item.assignedBusiness || ''}
                onChange={(e) => onUpdate(item.id, 'assignedBusiness', e.target.value)}
              >
                <option value="" disabled>Select Business...</option>
                <option value="Big Sky FPV">Big Sky FPV</option>
                <option value="TRL Band">TRL Band</option>
              </select>
            </div>

            <div className="relative z-10">
              {isTransfer ? (
                  <div className="relative">
                      <ArrowLeftRight className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <select
                        className="w-full pl-8 pr-2 py-2 bg-sky-50 border border-sky-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 appearance-none text-sky-900"
                        value={item.transferAccountId || ''}
                        onChange={(e) => onUpdate(item.id, 'transferAccountId', e.target.value)}
                      >
                         <option value="">{isExpense ? 'Transfer To...' : 'Transfer From...'}</option>
                         {accounts.filter(a => (a.type === 'Asset' || a.type === 'Liability') && a.id !== item.bankAccountId).map(a => (
                             <option key={a.id} value={a.id}>{a.name}</option>
                         ))}
                      </select>
                  </div>
              ) : (
                <CategorySelect 
                    value={item.assignedAccount}
                    onChange={(id) => onUpdate(item.id, 'assignedAccount', id)}
                />
              )}
            </div>

            <div className="relative">
              <Briefcase className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDirectCost && !item.assignedProject ? 'text-amber-500' : 'text-slate-400'}`} size={14} />
              <select 
                className={`w-full pl-8 pr-2 py-2 border rounded-lg text-sm focus:ring-2 appearance-none ${
                  isDirectCost && !item.assignedProject 
                    ? 'bg-amber-50 border-amber-300 focus:border-amber-500 focus:ring-amber-500/20' 
                    : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
                value={item.assignedProject || ''}
                onChange={(e) => onUpdate(item.id, 'assignedProject', e.target.value)}
              >
                <option value="">{isDirectCost ? 'Project Required *' : 'No Project'}</option>
                {projects.filter(p => !item.assignedBusiness || p.businessId === item.assignedBusiness).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {isLaborAccount && !isTransfer && (
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <select 
                  className="w-full pl-8 pr-2 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 appearance-none text-amber-900"
                  value={item.assignedContractorId || ''}
                  onChange={(e) => onUpdate(item.id, 'assignedContractorId', e.target.value)}
                >
                  <option value="">Select Contractor...</option>
                  {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
        ) : (
            <div className="flex-1 text-sm text-slate-500 italic">Posted to Ledger {item.linkedJournalEntryId}</div>
        )}

        {/* 3. Actions */}
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {!isPosted && (
            <>
               {!isExpense && !isTransfer && (
                  <button 
                    onClick={() => {
                        onUpdate(item.id, 'transactionType', 'transfer');
                        onUpdate(item.id, 'transferAccountId', '1002');
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Match to Undeposited Funds"
                  >
                    <PiggyBank size={18} />
                  </button>
               )}
              <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Split Transaction"><Split size={18} /></button>
              {isPending ? (
                  <button disabled className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-600 rounded-lg font-medium text-sm cursor-not-allowed border border-amber-200">
                    <Clock size={14} /> Pending
                  </button>
              ) : (
                  <button 
                    onClick={() => onPost(item)}
                    disabled={!isValid}
                    className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all font-medium shadow-sm text-sm whitespace-nowrap ${
                        isValid ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-200' : 'bg-slate-300 cursor-not-allowed'
                    }`}
                  >
                    Approve <ArrowRight size={14} />
                  </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const Inbox: React.FC = () => {
  const { inbox, journal, accounts, updateTransaction, postTransaction, addTransactionToInbox, merchantProfiles } = useFinance();
  
  const [filter, setFilter] = useState<'all' | 'imported' | 'posted'>('imported');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdate = async (id: string, field: keyof Transaction, value: any) => {
    await updateTransaction(id, { [field]: value });
  };

  const handlePost = async (tx: Transaction) => {
    if (tx.pending) { alert("Cannot post pending transactions."); return; }
    try {
      // Basic Client-Side Checks (Server does the real work)
      if (tx.transactionType === 'transfer' && !tx.transferAccountId) { alert("Select transfer account."); return; }
      if (tx.transactionType !== 'transfer' && !tx.assignedAccount) { alert("Assign category."); return; }
      if (!tx.assignedBusiness) { alert("Assign business."); return; }
      await postTransaction(tx);
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e.message}`);
    }
  };

  const visibleItems = inbox.filter(item => {
      if (filter === 'all') return true;
      if (filter === 'imported') return item.status === 'imported' || item.status === 'needs_repost';
      return item.status === filter;
  });

  const selectedTransaction = inbox.find(t => t.id === selectedTransactionId) || null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* LEFT: Main Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
            <h2 className="text-2xl font-bold text-slate-900">Transaction Inbox</h2>
            <p className="text-slate-500">Review, categorize, and post bank transactions.</p>
            </div>
            <div className="flex gap-3">
            <button onClick={() => window.location.href = '/setup'} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"><Settings size={16} /> Opening Balances</button>
            <div className="flex bg-slate-100 rounded-lg p-1">
                {(['all', 'imported', 'posted'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{f}</button>
                ))}
            </div>
            </div>
        </div>

        {/* List */}
        <div className="space-y-4 pb-20">
            {visibleItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                No transactions found in this view.
            </div>
            ) : (
            visibleItems.map(item => (
                <TransactionRow 
                    key={item.id} 
                    item={item} 
                    onUpdate={handleUpdate} 
                    onPost={handlePost} 
                    isSelected={item.id === selectedTransactionId}
                    onSelect={() => setSelectedTransactionId(item.id)}
                />
            ))
            )}
        </div>
      </div>

      {/* RIGHT: Coach Panel */}
      <div className="w-80 border-l border-slate-200 bg-white shadow-xl z-20">
         <CoachPanel transaction={selectedTransaction} accounts={accounts} />
      </div>
    </div>
  );
};
