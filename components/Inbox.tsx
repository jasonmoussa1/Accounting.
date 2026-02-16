
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, BusinessId } from '../types';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { applyRules, checkDuplicate } from '../services/accounting';
import { geminiService } from '../services/geminiService';
import { CategorySelect } from './CategorySelect';
import { Check, AlertTriangle, ArrowRight, Split, Briefcase, Building, CheckCircle2, User, Upload, X, Settings, Loader2, FileText, Database, ArrowLeftRight, PiggyBank, Clock } from 'lucide-react';

// --- HELPER COMPONENTS ---

const OpeningBalanceModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { postBatchOpeningEntry } = useFinance();
  const [date, setDate] = useState('2024-01-01');
  const [balances, setBalances] = useState<{ [key in BusinessId]: string }>({
    'Big Sky FPV': '',
    'TRL Band': ''
  });

  const handleSave = async () => {
    let count = 0;
    try {
      const batchData: { accountId: string, amount: number }[] = [];
      Object.entries(balances).forEach(([biz, amountStr]) => {
        const amount = parseFloat(amountStr as string);
        if (!isNaN(amount) && amount !== 0) {
          const accountId = biz === 'Big Sky FPV' ? '1000' : '1001'; 
          batchData.push({ accountId, amount });
          count++;
        }
      });
      await postBatchOpeningEntry(date, batchData);
      alert(`Posted ${count} opening balance entries.`);
      onClose();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-900">Set Opening Balances</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Effective Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Checking Account Balances</label>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xs">FPV</div>
              <input 
                type="number" 
                placeholder="Big Sky FPV Balance"
                value={balances['Big Sky FPV']}
                onChange={(e) => setBalances({...balances, 'Big Sky FPV': e.target.value})}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">TRL</div>
              <input 
                type="number" 
                placeholder="TRL Band Balance"
                value={balances['TRL Band']}
                onChange={(e) => setBalances({...balances, 'TRL Band': e.target.value})}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500">Save Balances</button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

interface TransactionRowProps {
  item: Transaction;
  onUpdate: (id: string, field: keyof Transaction, value: any) => void;
  onPost: (tx: Transaction) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ item, onUpdate, onPost }) => {
  const { accounts, projects, contractors } = useFinance();
  const isPosted = item.status === 'posted';
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
    <div className={`bg-white border border-slate-200 rounded-xl p-4 transition-all ${isPosted ? 'opacity-60 bg-slate-50' : 'shadow-sm hover:shadow-md'}`}>
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        
        {/* 1. Date & Desc */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500">{item.date}</span>
            
            {/* STATUS BADGES */}
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
            {item.aiConfidence && item.aiConfidence > 0.8 && !isPosted && !isTransfer && (
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
  const { inbox, accounts, updateTransaction, postJournalEntry, addTransactionToInbox } = useFinance();
  
  const [filter, setFilter] = useState<'all' | 'imported' | 'posted'>('imported');
  const [showOpeningBalance, setShowOpeningBalance] = useState(false);
  
  // CSV Import State
  const [isUploading, setIsUploading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({ date: -1, description: -1, amount: -1 });
  const [isProcessing, setIsProcessing] = useState(false);
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

  const executeImport = async () => {
    if (!csvFile || mapping.date === -1 || mapping.amount === -1) {
      alert("Please map Date and Amount fields.");
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      
      let count = 0;
      
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
          pending: false // CSV imports are usually settled
        };

        const ruleSuggestions = applyRules(tx as Transaction);
        let finalTx = { ...tx, ...ruleSuggestions };

        if (!finalTx.assignedAccount && finalTx.transactionType !== 'transfer') {
            try {
                const aiResult = await geminiService.categorizeTransaction(tx.description, tx.amount);
                finalTx.assignedAccount = aiResult.suggestedAccountId;
                finalTx.isContractor = aiResult.isContractor;
                finalTx.aiConfidence = aiResult.confidence;
            } catch (err) {
                console.warn("AI skipped");
            }
        }

        await addTransactionToInbox(finalTx);
        count++;
      }

      setIsProcessing(false);
      setIsUploading(false);
      setCsvFile(null);
      alert(`Imported ${count} transactions.`);
    };
    reader.readAsText(csvFile);
  };

  const visibleItems = inbox.filter(item => filter === 'all' || item.status === filter);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {showOpeningBalance && <OpeningBalanceModal onClose={() => setShowOpeningBalance(false)} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Transaction Inbox</h2>
          <p className="text-slate-500">Review, categorize, and post bank transactions.</p>
        </div>
        <div className="flex gap-3">
          <button 
             onClick={() => setShowOpeningBalance(true)}
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
                        <FileText size={18} /> Mapping: {csvFile?.name}
                     </h3>
                     <button onClick={() => { setIsUploading(false); setCsvFile(null); }} className="text-indigo-400 hover:text-indigo-700"><X size={18}/></button>
                 </div>
                 
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
                    onClick={executeImport} 
                    disabled={isProcessing}
                    className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
                 >
                    {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
                    {isProcessing ? 'Analyzing & Categorizing...' : 'Run Import & AI Categorization'}
                 </button>
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
