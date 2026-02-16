
import React, { useState, useMemo } from 'react';
import { mockJournal, mockAccounts, mockReconciliations, finalizeReconciliation } from '../services/accounting';
import { JournalEntry, JournalLine, BusinessId } from '../types';
import { Check, Lock, AlertCircle, Calculator, Calendar, Building, Landmark } from 'lucide-react';

export const Reconciliation: React.FC = () => {
  const [selectedAccountId, setSelectedAccountId] = useState('1000'); // Default Checking
  const [selectedBusinessId, setSelectedBusinessId] = useState<BusinessId>('Big Sky FPV');
  const [statementDate, setStatementDate] = useState('2023-10-31');
  const [statementBalance, setStatementBalance] = useState<number>(10000.00);
  
  // State for which lines are checked off
  const [clearedLineIds, setClearedLineIds] = useState<Set<string>>(new Set());

  const selectedAccount = mockAccounts.find(a => a.id === selectedAccountId);
  
  // Available bank accounts for dropdown
  const bankAccounts = useMemo(() => mockAccounts.filter(a => a.type === 'Asset' || a.type === 'Liability'), []);

  // Check if this period is already locked in "database"
  const existingLock = useMemo(() => {
    return mockReconciliations.find(r => 
      r.accountId === selectedAccountId && 
      r.statementEndDate >= statementDate
    );
  }, [selectedAccountId, statementDate, mockReconciliations.length]);

  const isPeriodLocked = !!existingLock;

  // Get all Journal Lines affecting this account up to the statement date
  const relevantLines = useMemo(() => {
    const lines: { entryId: string; date: string; description: string; debit: number; credit: number; lineId: string; isCleared: boolean }[] = [];
    
    mockJournal.forEach(entry => {
      // 1. Date Filter
      if (entry.date > statementDate) return;
      
      // 2. Business Filter? (Usually bank accounts are specific, but if shared, we filter)
      // For now, we assume the Account ID is the source of truth, not the Business ID on the entry (since transfers can cross)
      
      entry.lines.forEach((line, idx) => {
        if (line.accountId === selectedAccountId) {
          lines.push({
            entryId: entry.id,
            date: entry.date,
            description: line.description || entry.description,
            debit: line.debit,
            credit: line.credit,
            lineId: `${entry.id}-${idx}`,
            isCleared: !!line.isCleared
          });
        }
      });
    });
    return lines.sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedAccountId, statementDate, mockJournal.length]);

  const toggleClear = (lineId: string) => {
    if (isPeriodLocked) return;
    const next = new Set(clearedLineIds);
    if (next.has(lineId)) {
      next.delete(lineId);
    } else {
      next.add(lineId);
    }
    setClearedLineIds(next);
  };

  // Calculations
  const startingBalance = 0; // In a real app, this is calculated from previous reconciliations. Simplified for demo.
  
  // If locked, use database 'isCleared' status. If open, use local state.
  const effectiveClearedLines = isPeriodLocked 
    ? new Set(relevantLines.filter(l => l.isCleared).map(l => l.lineId))
    : clearedLineIds;

  const clearedDeposits = relevantLines
    .filter(l => effectiveClearedLines.has(l.lineId))
    .reduce((sum, l) => sum + (selectedAccount?.type === 'Asset' ? l.debit : l.credit), 0);
    
  const clearedWithdrawals = relevantLines
    .filter(l => effectiveClearedLines.has(l.lineId))
    .reduce((sum, l) => sum + (selectedAccount?.type === 'Asset' ? l.credit : l.debit), 0);

  const clearedBalance = startingBalance + clearedDeposits - clearedWithdrawals;
  const difference = statementBalance - clearedBalance;
  const isBalanced = Math.abs(difference) < 0.01;

  const handleLock = () => {
    if (isBalanced && !isPeriodLocked) {
      if (confirm(`Are you sure you want to lock the period ending ${statementDate}? This will prevent changes to these transactions.`)) {
        finalizeReconciliation(selectedBusinessId, selectedAccountId, statementDate, statementBalance, clearedLineIds);
        alert("Reconciliation Complete. Period is now LOCKED.");
        // Force re-render handled by React state/memo update
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Top Control Bar */}
      <div className="bg-white border-b border-slate-200 p-6 shadow-sm z-10">
        <div className="flex flex-col xl:flex-row gap-6 justify-between mb-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    Reconciliation
                    {isPeriodLocked && <span className="text-emerald-600 flex items-center gap-1 text-sm bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"><Lock size={14} /> Locked</span>}
                </h2>
                <p className="text-slate-500 text-sm">Match ledger to bank statement.</p>
            </div>
            
            {/* Account & Business Selectors */}
            <div className="flex flex-wrap gap-4">
                <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        value={selectedBusinessId}
                        onChange={(e) => setSelectedBusinessId(e.target.value as BusinessId)}
                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 appearance-none min-w-[150px]"
                    >
                        <option value="Big Sky FPV">Big Sky FPV</option>
                        <option value="TRL Band">TRL Band</option>
                    </select>
                </div>
                <div className="relative">
                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 appearance-none min-w-[200px]"
                    >
                        {bankAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {/* Statement Inputs */}
        <div className="flex flex-wrap gap-6 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Statement Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="date" 
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                disabled={isPeriodLocked}
                className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 shadow-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Ending Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">$</span>
              <input 
                type="number" 
                value={statementBalance}
                onChange={(e) => setStatementBalance(parseFloat(e.target.value))}
                disabled={isPeriodLocked}
                className="pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono font-medium focus:ring-2 focus:ring-indigo-500/20 w-32 disabled:opacity-60 shadow-sm"
              />
            </div>
          </div>
          
          {/* Equation Display */}
          <div className="flex items-center gap-2 text-xs text-slate-500 ml-auto pb-2">
             <span className="font-mono">{startingBalance.toFixed(2)}</span>
             <span>+</span>
             <span className="font-mono text-emerald-600">{clearedDeposits.toFixed(2)}</span>
             <span>-</span>
             <span className="font-mono text-rose-600">{clearedWithdrawals.toFixed(2)}</span>
             <span>=</span>
             <span className={`font-mono font-bold ${isBalanced ? 'text-emerald-600' : 'text-slate-900'}`}>{clearedBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left: Transaction List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 font-medium w-12 text-center">
                    <Check size={14} />
                  </th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium text-right">Debit</th>
                  <th className="px-6 py-3 font-medium text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {relevantLines.map((line) => {
                  const isChecked = effectiveClearedLines.has(line.lineId);
                  const isLinePreLocked = line.isCleared; // From DB

                  return (
                    <tr 
                      key={line.lineId} 
                      className={`transition-colors ${isPeriodLocked ? 'opacity-80' : 'cursor-pointer hover:bg-slate-50'} ${isChecked ? 'bg-indigo-50/30' : ''}`}
                      onClick={() => toggleClear(line.lineId)}
                    >
                      <td className="px-6 py-3 text-center">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check size={12} />}
                          {isLinePreLocked && isPeriodLocked && <Lock size={10} className="text-white absolute" />}
                        </div>
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-600">{line.date}</td>
                      <td className="px-6 py-3 font-medium text-slate-900">{line.description}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-600">
                        {line.debit > 0 ? `$${line.debit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-slate-600">
                        {line.credit > 0 ? `$${line.credit.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  );
                })}
                {relevantLines.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">No transactions found for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Summary Panel */}
        <div className="w-full md:w-80 bg-slate-900 text-slate-300 p-6 flex flex-col justify-between shrink-0 border-l border-slate-800">
          <div className="space-y-6">
             <div>
                <h3 className="text-white font-bold text-lg mb-1">{selectedAccount?.name}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedAccount?.code} • {selectedBusinessId}</p>
             </div>

             <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span>Starting Balance</span>
                  <span className="font-mono text-white">${startingBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Deposits</span>
                  <span className="font-mono text-emerald-400">+ ${clearedDeposits.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Withdrawals</span>
                  <span className="font-mono text-rose-400">- ${clearedWithdrawals.toFixed(2)}</span>
                </div>
                <div className="h-px bg-slate-700 my-2"></div>
                <div className="flex justify-between font-bold text-white">
                  <span>Cleared Balance</span>
                  <span className="font-mono">${clearedBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Statement Balance</span>
                  <span className="font-mono">${statementBalance.toFixed(2)}</span>
                </div>
             </div>
          </div>

          <div className="mt-8">
            <div className={`p-4 rounded-xl border mb-4 text-center transition-all duration-300 ${
              isBalanced 
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/50 text-rose-400'
            }`}>
              <div className="text-xs uppercase font-bold mb-1">Difference</div>
              <div className="text-3xl font-mono font-bold tracking-tight">
                ${Math.abs(difference).toFixed(2)}
              </div>
              {!isBalanced && <div className="text-xs mt-1 opacity-80 flex justify-center items-center gap-1"><AlertCircle size={10}/> Must be $0.00</div>}
            </div>

            <button 
              onClick={handleLock}
              disabled={!isBalanced || isPeriodLocked}
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                isBalanced && !isPeriodLocked
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/50' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isPeriodLocked ? (
                <>Period Locked</>
              ) : (
                <>
                  <Lock size={18} /> Finish & Lock
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
