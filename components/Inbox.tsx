
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, BusinessId } from '../types';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { applyRules, checkDuplicate } from '../services/accounting';
import { geminiService } from '../services/geminiService';
import { CategorySelect } from './CategorySelect';
import { Check, AlertTriangle, ArrowRight, Split, Briefcase, Building, CheckCircle2, User, Upload, X, Settings, Loader2, FileText, Database, ArrowLeftRight, PiggyBank, Clock, RotateCw } from 'lucide-react';

// --- MAIN COMPONENT ---

interface TransactionRowProps {
  item: Transaction;
  onUpdate: (id: string, field: keyof Transaction, value: any) => void;
  onPost: (tx: Transaction) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ item, onUpdate, onPost }) => {
  const { accounts, projects, contractors } = useFinance();
  const isPosted = item.status === 'posted';
  const needsRepost = item.status === 'needs_repost';
  const isExpense = item.amount < 0;
  const isTransfer = item.transactionType === 'transfer';
  const isPending = item.pending;

  // Check if selected account is Labor/Contractor related
  const selectedAccount = accounts.find(a => a.id === item.assignedAccount);
  const isLaborAccount = selectedAccount?.name.includes('Subcontracted Labor') || selectedAccount?.parentId === '5100'; 
  const isDirectCost = selectedAccount?.type === 'Cost of Services';

  // Task 3: Safety Net - Validation
  const isValid = isTransfer 
      ? !!item.transferAccountId
      : (!!item.assignedAccount && item.assignedAccount !== 'uncategorized');

  return (
    <div className={`bg-white border rounded-xl p-4 transition-all ${
        needsRepost ? 'border-rose-300 bg-rose-50 shadow-md ring-1 ring-rose-200' :
        isPosted ? 'opacity-60 bg-slate-50 border-slate-200' : 
        'border-slate-200 shadow-sm hover:shadow-md'
    }`}>
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        
        {/* 1. Date & Desc */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500">{item.date}</span>
            
            {/* STATUS BADGES */}
            {needsRepost && (
               <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-white bg-rose-500 px-2 py-0.5 rounded shadow-sm">
                   <RotateCw size={10} className="animate-spin-slow" /> Re-Approval Needed
               </span>
            )}
            {isPending && !isPosted && (
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                    <Clock size={10} /> Pending
                </span>
            )}
            {item.isDuplicate && item.status !== 'posted' && (
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <AlertTriangle size={10} /> Duplicate?
              </span>
            )}
            {isPosted && (
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 size={10} /> Posted
              </span>
            )}
            {item.aiConfidence && item.aiConfidence > 0.8 && !isPosted && !isTransfer && !needsRepost && (
               <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200" title="AI Confidence">
                 AI {(item.aiConfidence * 100).toFixed(0)}%
               </span>
            )}
             {isTransfer && !isPosted && (
               <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                 <ArrowLeftRight size={10} /> Suggested Transfer
               </span>
            )}
          </div>
          <div className="font-medium text-slate-900">{item.description}</div>
          <div className={`text-sm font-mono font-bold ${isExpense ? 'text-slate-900' : 'text-emerald-600'}`}>
            {isExpense ? '-' : '+'}${Math.abs(item.amount).toFixed(2)}
          </div>
        </div>

        {/* 2. Controls */}
        {!isPosted ? (
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            
            {/* Task 1: Type Switcher */}
            <div className="flex bg-slate-100 rounded-lg p-1 h-[38px] items-center">
                {(['income', 'expense', 'transfer'] as const).map(t => {
                   return (
                     <button
                        key={t}
                        onClick={() => onUpdate(item.id, 'transactionType', t)}
                        className={`flex-1 flex justify-center py-1 text-[10px] font-bold uppercase rounded ${
                            item.transactionType === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title={t}
                     >
                        {t === 'transfer' ? <ArrowLeftRight size={14}/> : (t === 'income' ? '+' : '-')}
                     </button>
                   );
                })}
            </div>

            {/* Business Select */}
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

            {/* Task 1: Conditional Account Select (Category vs Transfer Account) */}
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

            {/* Project Select (Enforced for Direct Costs) */}
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
                {projects
                  .filter(p => !item.assignedBusiness || p.businessId === item.assignedBusiness)
                  .map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Contractor Select (Conditional) */}
            {isLaborAccount && !isTransfer && (
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <select 
                  className="w-full pl-8 pr-2 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 appearance-none text-amber-900"
                  value={item.assignedContractorId || ''}
                  onChange={(e) => onUpdate(item.id, 'assignedContractorId', e.target.value)}
                >
                  <option value="">Select Contractor...</option>
                  {contractors.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
            <div className="flex-1 text-sm text-slate-500 italic">
              Posted to Ledger {item.linkedJournalEntryId}
            </div>
        )}

        {/* 3. Actions */}
        <div className="flex items-center gap-2">
          {!isPosted && (
            <>
               {/* Task 2: Match Undeposited Funds Button (Only for Income) */}
               {!isExpense && !isTransfer && (
                  <button 
                    onClick={() => {
                        onUpdate(item.id, 'transactionType', 'transfer');
                        onUpdate(item.id, 'transferAccountId', '1002'); // Undeposited Funds
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Match to Undeposited Funds"
                  >
                    <PiggyBank size={18} />
                  </button>
               )}

              <button 
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Split Transaction"
              >
                <Split size={18} />
              </button>
              
              {/* PENDING GUARD: Disable Post if Pending */}
              {isPending ? (
                  <button 
                    disabled
                    className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-600 rounded-lg transition-all font-medium text-sm whitespace-nowrap cursor-not-allowed border border-amber-200"
                    title="Cannot post pending transactions"
                  >
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
  const { inbox, journal, accounts, updateTransaction, postJournalEntry, addTransactionToInbox, merchantProfiles } = useFinance();
  
  const [filter, setFilter] = useState<'all' | 'imported' | 'posted'>('imported');
  
  // CSV Import State
  const [isUploading, setIsUploading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({ date: -1, description: -1, amount: -1 });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Import Preview State
  const [importedItems, setImportedItems] = useState<Transaction[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdate = async (id: string, field: keyof Transaction, value: any) => {
    await updateTransaction(id, { [field]: value });
  };

  const handlePost = async (tx: Transaction) => {
    if (tx.pending) {
        alert("Cannot post pending transactions. Please wait for them to clear.");
        return;
    }
    
    try {
      if (tx.transactionType === 'transfer') {
          if (!tx.transferAccountId) {
              alert("Please select a transfer destination account.");
              return;
          }
      } else {
        if (!tx.assignedAccount) {
            alert("Please assign a category account.");
            return;
        }
      }

      if (!tx.assignedBusiness) {
        alert("Please assign a business.");
        return;
      }
      const selectedAccount = accounts.find(a => a.id === tx.assignedAccount);
      if (selectedAccount?.type === 'Cost of Services' && !tx.assignedProject) {
        alert(`Validation Error: ${selectedAccount.name} is a Direct Cost. You MUST assign a Project/Gig.`);
        return;
      }

      if (Math.abs(tx.amount) > 2500 && (selectedAccount?.type === 'Expense' || selectedAccount?.type === 'Cost of Services')) {
        const confirmAsset = confirm(
          `⚠️ ASSET WARNING\n\nThis transaction is $${Math.abs(tx.amount).toLocaleString()}, which exceeds the $2,500 threshold.\n\nYou have categorized it as '${selectedAccount.name}' (${selectedAccount.type}).\n\nShould this be capitalized as a Fixed Asset instead?`
        );
        if (!confirmAsset) return; 
      }

      const id = await postJournalEntry(tx);
      await updateTransaction(tx.id, { status: 'posted', linkedJournalEntryId: id });
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e.message}`);
    }
  };

  // CSV LOGIC
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFile(file);
      setIsUploading(true);
      setImportedItems([]);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        const parsed = lines.slice(0, 5).map(line => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '')));
        setCsvPreview(parsed);
        if (parsed.length > 0) {
           const headers = parsed[0].map(h => h.toLowerCase());
           setMapping({
             date: headers.findIndex(h => h.includes('date')),
             description: headers.findIndex(h => h.includes('desc') || h.includes('name') || h.includes('payee') || h.includes('memo')),
             amount: headers.findIndex(h => h.includes('amount') || h.includes('credit') || h.includes('debit'))
           });
        }
      };
      reader.readAsText(file);
    }
  };

  const executeImportAnalysis = async () => {
    if (!csvFile || mapping.date === -1 || mapping.amount === -1) {
      alert("Please map Date and Amount fields.");
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      
      const newItems: Transaction[] = [];
      const newIndices = new Set<number>();
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ''));
        if (row.length <= Math.max(mapping.date, mapping.amount)) continue;

        const dateStr = row[mapping.date];
        const descStr = row[mapping.description];
        const amountStr = row[mapping.amount];

        if (!dateStr || !amountStr) continue;

        const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
        if (isNaN(amount)) continue;

        let isoDate = dateStr;
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) isoDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }

        const isExpense = amount < 0;

        const tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
          date: isoDate,
          description: descStr || 'Unknown',
          amount: amount, 
          bankAccountId: '1000',
          status: 'imported',
          transactionType: isExpense ? 'expense' : 'income',
          pending: false
        };

        // Rule & Duplicate Logic
        const ruleSuggestions = applyRules(tx as Transaction, merchantProfiles);
        let finalTx = { ...tx, ...ruleSuggestions };
        
        // IMPORTANT: We temporarily assign a fake ID for duplication check to work if we were comparing against new items, 
        // but here we just check against DB.
        const isDup = checkDuplicate(finalTx as Transaction, journal);
        (finalTx as any).isDuplicate = isDup;

        newItems.push(finalTx as Transaction);
        if (!isDup) newIndices.add(i - 1);
      }

      setImportedItems(newItems);
      setSelectedIndices(newIndices);
      setIsProcessing(false);
    };
    reader.readAsText(csvFile);
  };

  const finalizeImport = async () => {
      let count = 0;
      for (let i = 0; i < importedItems.length; i++) {
          if (selectedIndices.has(i)) {
              await addTransactionToInbox(importedItems[i]);
              count++;
          }
      }
      alert(`Imported ${count} transactions.`);
      setIsUploading(false);
      setCsvFile(null);
      setImportedItems([]);
  };

  const toggleSelection = (idx: number) => {
      const next = new Set(selectedIndices);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      setSelectedIndices(next);
  };

  // Modify visible items filter to include 'needs_repost' in 'imported' view for better visibility
  const visibleItems = inbox.filter(item => {
      if (filter === 'all') return true;
      if (filter === 'imported') return item.status === 'imported' || item.status === 'needs_repost';
      return item.status === filter;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Transaction Inbox</h2>
          <p className="text-slate-500">Review, categorize, and post bank transactions.</p>
        </div>
        <div className="flex gap-3">
          <button 
             onClick={() => window.location.href = '/setup'}
             className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
             <Settings size={16} /> Opening Balances
          </button>
          <div className="flex bg-slate-100 rounded-lg p-1">
            {(['all', 'imported', 'posted'] as const).map(f => (
                <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                    filter === f 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                >
                {f}
                </button>
            ))}
          </div>
        </div>
      </div>

      {/* CSV Uploader & Mapper */}
      <div className={`border-2 border-dashed rounded-xl p-6 transition-all ${isUploading ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}>
         {!isUploading ? (
            <div 
                className="flex flex-col items-center justify-center cursor-pointer py-4"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="bg-indigo-100 p-3 rounded-full text-indigo-600 mb-3">
                    <Upload size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Upload Bank Export (CSV)</h3>
                <p className="text-xs text-slate-500 mt-1">Drag & drop or click to browse</p>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".csv" 
                    onChange={handleFileUpload}
                />
            </div>
         ) : (
             <div className="w-full">
                 <div className="flex justify-between items-center mb-4 border-b border-indigo-200 pb-2">
                     <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                        <FileText size={18} /> Import: {csvFile?.name}
                     </h3>
                     <button onClick={() => { setIsUploading(false); setCsvFile(null); setImportedItems([]); }} className="text-indigo-400 hover:text-indigo-700"><X size={18}/></button>
                 </div>
                 
                 {/* STAGE 1: MAPPING */}
                 {importedItems.length === 0 && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Date Column</label>
                                <select 
                                    className="w-full text-sm border-indigo-200 rounded-lg focus:ring-indigo-500"
                                    value={mapping.date}
                                    onChange={(e) => setMapping({...mapping, date: parseInt(e.target.value)})}
                                >
                                    <option value={-1}>Select Column...</option>
                                    {csvPreview[0]?.map((h, i) => <option key={i} value={i}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Description Column</label>
                                <select 
                                    className="w-full text-sm border-indigo-200 rounded-lg focus:ring-indigo-500"
                                    value={mapping.description}
                                    onChange={(e) => setMapping({...mapping, description: parseInt(e.target.value)})}
                                >
                                    <option value={-1}>Select Column...</option>
                                    {csvPreview[0]?.map((h, i) => <option key={i} value={i}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Amount Column</label>
                                <select 
                                    className="w-full text-sm border-indigo-200 rounded-lg focus:ring-indigo-500"
                                    value={mapping.amount}
                                    onChange={(e) => setMapping({...mapping, amount: parseInt(e.target.value)})}
                                >
                                    <option value={-1}>Select Column...</option>
                                    {csvPreview[0]?.map((h, i) => <option key={i} value={i}>{h}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white/50 rounded-lg p-3 text-xs text-indigo-800 mb-4 font-mono">
                            <strong>Preview Row 1: </strong> 
                            {mapping.date > -1 ? csvPreview[1]?.[mapping.date] : '??'} | 
                            {mapping.description > -1 ? csvPreview[1]?.[mapping.description] : '??'} | 
                            {mapping.amount > -1 ? csvPreview[1]?.[mapping.amount] : '??'}
                        </div>

                        <button 
                            onClick={executeImportAnalysis} 
                            disabled={isProcessing}
                            className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
                            {isProcessing ? 'Analyzing...' : 'Preview & Detect Duplicates'}
                        </button>
                    </>
                 )}

                 {/* STAGE 2: REVIEW */}
                 {importedItems.length > 0 && (
                     <div className="space-y-4">
                         <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded-lg bg-white">
                             <table className="w-full text-sm text-left">
                                 <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                                     <tr>
                                         <th className="p-3 w-8"><input type="checkbox" onChange={() => {
                                             if (selectedIndices.size === importedItems.length) setSelectedIndices(new Set());
                                             else setSelectedIndices(new Set(importedItems.map((_, i) => i)));
                                         }} checked={selectedIndices.size === importedItems.length} /></th>
                                         <th className="p-3">Date</th>
                                         <th className="p-3">Description</th>
                                         <th className="p-3 text-right">Amount</th>
                                         <th className="p-3">Analysis</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {importedItems.map((item, idx) => {
                                         const isDup = (item as any).isDuplicate;
                                         const isTransfer = item.transactionType === 'transfer';
                                         const isSelected = selectedIndices.has(idx);
                                         
                                         return (
                                             <tr key={idx} className={`border-b border-slate-50 ${isDup ? 'bg-rose-50' : 'hover:bg-slate-50'} ${isSelected ? '' : 'opacity-50'}`}>
                                                 <td className="p-3">
                                                     <input 
                                                        type="checkbox" 
                                                        checked={isSelected} 
                                                        onChange={() => toggleSelection(idx)}
                                                        disabled={isDup} // Disable duplicate import by default
                                                     />
                                                 </td>
                                                 <td className="p-3 font-mono text-slate-600">{item.date}</td>
                                                 <td className="p-3 font-medium text-slate-900">{item.description}</td>
                                                 <td className={`p-3 text-right font-mono ${item.amount < 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                                                     {item.amount < 0 ? '-' : '+'}${Math.abs(item.amount).toFixed(2)}
                                                 </td>
                                                 <td className="p-3">
                                                     {isDup && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded"><AlertTriangle size={10} /> Duplicate</span>}
                                                     {isTransfer && !isDup && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded"><ArrowLeftRight size={10} /> Transfer</span>}
                                                     {item.assignedAccount && !isDup && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded"><CheckCircle2 size={10} /> Rule Match</span>}
                                                 </td>
                                             </tr>
                                         );
                                     })}
                                 </tbody>
                             </table>
                         </div>
                         
                         <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-indigo-900 text-sm">
                             <div>
                                 <strong>{selectedIndices.size}</strong> items selected for import.
                             </div>
                             <button onClick={finalizeImport} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-500 shadow-sm">
                                 Import Selected
                             </button>
                         </div>
                     </div>
                 )}
             </div>
         )}
      </div>

      <div className="space-y-4">
        {visibleItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            No transactions found in this view.
          </div>
        ) : (
          visibleItems.map(item => (
            <TransactionRow key={item.id} item={item} onUpdate={handleUpdate} onPost={handlePost} />
          ))
        )}
      </div>
    </div>
  );
};
