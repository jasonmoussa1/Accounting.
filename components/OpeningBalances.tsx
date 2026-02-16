
import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { CheckCircle, ArrowRight, Calendar, DollarSign, Flag, CreditCard, Landmark, ArrowLeft, Building } from 'lucide-react';
import { BusinessId } from '../types';

export const OpeningBalances: React.FC = () => {
  const { accounts, postBatchOpeningEntry } = useFinance();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [cutoverDate, setCutoverDate] = useState<string>(new Date().getFullYear() + '-01-01');
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessId>('Shared');

  // Filter accounts for the wizard
  const assetAccounts = useMemo(() => accounts.filter(a => a.type === 'Asset' && (a.name.includes('Checking') || a.name.includes('Savings') || a.name.includes('Cash'))), [accounts]);
  const liabilityAccounts = useMemo(() => accounts.filter(a => a.type === 'Liability' && (a.name.includes('Card') || a.name.includes('Loan'))), [accounts]);

  const handleBalanceChange = (id: string, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
        setBalances(prev => ({ ...prev, [id]: num }));
    } else {
        const next = { ...balances };
        delete next[id];
        setBalances(next);
    }
  };

  const handlePost = async () => {
    // Convert Record to Array for service
    const balanceList = Object.entries(balances).map(([accountId, amount]) => ({ accountId, amount: amount as number }));
    if (balanceList.length === 0) return;
    
    await postBatchOpeningEntry(cutoverDate, balanceList, selectedBusiness);
    setStep(4); // Success
  };

  const totalAssets = Object.entries(balances)
    .filter(([id]) => assetAccounts.find(a => a.id === id))
    .reduce((sum, [, val]) => sum + (val as number), 0);

  const totalLiabilities = Object.entries(balances)
    .filter(([id]) => liabilityAccounts.find(a => a.id === id))
    .reduce((sum, [, val]) => sum + (val as number), 0);

  return (
    <div className="p-8 max-w-4xl mx-auto mt-6">
      
      {/* Wizard Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Day Zero Setup</h1>
        <p className="text-slate-500">Migrate your balances from QuickBooks or your previous system.</p>
        
        {/* Stepper */}
        <div className="flex justify-center items-center gap-4 mt-6">
            {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === s ? 'bg-indigo-600 text-white' : step > s ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {step > s ? <CheckCircle size={16} /> : s}
                    </div>
                    {s < 3 && <div className={`w-12 h-1 rounded ${step > s ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                </div>
            ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[400px] flex flex-col">
        
        {/* STEP 1: DATE & ENTITY */}
        {step === 1 && (
            <div className="p-12 flex flex-col items-center text-center flex-1 justify-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6">
                    <Flag size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Initial Setup</h2>
                <p className="text-slate-500 mb-8 max-w-md">
                    Set your cutover date and choose which business entity these balances belong to.
                </p>
                
                <div className="w-full max-w-xs space-y-4 mb-8">
                    <div className="space-y-1 text-left">
                        <label className="text-xs font-bold uppercase text-slate-500">Cutover Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="date" 
                                value={cutoverDate} 
                                onChange={(e) => setCutoverDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-1 text-left">
                        <label className="text-xs font-bold uppercase text-slate-500">Legal Entity</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select 
                                value={selectedBusiness} 
                                onChange={(e) => setSelectedBusiness(e.target.value as BusinessId)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none font-medium appearance-none"
                            >
                                <option value="Shared">Shared / Overhead</option>
                                <option value="Big Sky FPV">Big Sky FPV</option>
                                <option value="TRL Band">TRL Band</option>
                            </select>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200"
                >
                    Next: Enter Balances <ArrowRight size={20} />
                </button>
            </div>
        )}

        {/* STEP 2: ASSETS & LIABILITIES */}
        {step === 2 && (
            <div className="flex-1 flex flex-col">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900">Enter Ending Balances</h2>
                    <p className="text-sm text-slate-500">
                        Entity: <span className="font-bold text-indigo-600">{selectedBusiness}</span> • 
                        Date: <span className="font-bold text-slate-700">{cutoverDate}</span>
                    </p>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 overflow-y-auto">
                    {/* Assets Column */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold border-b border-emerald-100 pb-2">
                            <Landmark size={20} /> Bank Accounts (Assets)
                        </div>
                        {assetAccounts.map(acc => (
                            <div key={acc.id}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{acc.name}</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input 
                                        type="number" 
                                        placeholder="0.00"
                                        value={balances[acc.id] || ''}
                                        onChange={(e) => handleBalanceChange(acc.id, e.target.value)}
                                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Liabilities Column */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-rose-600 font-bold border-b border-rose-100 pb-2">
                            <CreditCard size={20} /> Credit Cards (Liabilities)
                        </div>
                        {liabilityAccounts.map(acc => (
                            <div key={acc.id}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{acc.name}</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input 
                                        type="number" 
                                        placeholder="0.00"
                                        value={balances[acc.id] || ''}
                                        onChange={(e) => handleBalanceChange(acc.id, e.target.value)}
                                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                    <button onClick={() => setStep(1)} className="text-slate-500 font-medium hover:text-slate-800">Back</button>
                    <button 
                        onClick={() => setStep(3)}
                        className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200"
                    >
                        Review Entry <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        )}

        {/* STEP 3: REVIEW */}
        {step === 3 && (
            <div className="flex-1 flex flex-col p-12">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Confirm Opening Journal Entry</h2>
                
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 max-w-2xl mx-auto w-full mb-8">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                                <th className="text-left py-2">Account</th>
                                <th className="text-right py-2">Debit</th>
                                <th className="text-right py-2">Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* Assets */}
                            {Object.entries(balances).map(([id, val]) => {
                                const acc = accounts.find(a => a.id === id);
                                if (acc?.type !== 'Asset') return null;
                                return (
                                    <tr key={id}>
                                        <td className="py-2 font-medium text-slate-700">{acc.name}</td>
                                        <td className="py-2 text-right font-mono">${(val as number).toLocaleString()}</td>
                                        <td className="py-2 text-right font-mono text-slate-300">-</td>
                                    </tr>
                                )
                            })}
                            {/* Liabilities */}
                            {Object.entries(balances).map(([id, val]) => {
                                const acc = accounts.find(a => a.id === id);
                                if (acc?.type !== 'Liability') return null;
                                return (
                                    <tr key={id}>
                                        <td className="py-2 font-medium text-slate-700">{acc.name}</td>
                                        <td className="py-2 text-right font-mono text-slate-300">-</td>
                                        <td className="py-2 text-right font-mono">${(val as number).toLocaleString()}</td>
                                    </tr>
                                )
                            })}
                            {/* Equity Plug */}
                            <tr className="bg-indigo-50/50">
                                <td className="py-2 font-bold text-indigo-900">Opening Balance Equity (Plug)</td>
                                <td className="py-2 text-right font-mono font-bold text-indigo-900">
                                    {totalLiabilities > totalAssets ? `$${(totalLiabilities - totalAssets).toLocaleString()}` : '-'}
                                </td>
                                <td className="py-2 text-right font-mono font-bold text-indigo-900">
                                    {totalAssets > totalLiabilities ? `$${(totalAssets - totalLiabilities).toLocaleString()}` : '-'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-center gap-4">
                    <button onClick={() => setStep(2)} className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                        Edit Balances
                    </button>
                    <button 
                        onClick={handlePost}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
                    >
                        <CheckCircle size={20} /> Post to Ledger
                    </button>
                </div>
            </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
            <div className="p-12 flex flex-col items-center justify-center flex-1 text-center">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <CheckCircle size={48} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Setup Complete!</h2>
                <p className="text-slate-500 mb-8">
                    Your books are now initialized. You can view the Opening Balance entry in your General Ledger or start reconciling transactions.
                </p>
                <div className="flex gap-4">
                    <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
