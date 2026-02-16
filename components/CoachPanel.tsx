
import React from 'react';
import { Transaction, Account } from '../types';
import { Lightbulb, AlertTriangle, ShieldCheck, Briefcase } from 'lucide-react';

interface CoachPanelProps {
  transaction: Transaction | null;
  accounts: Account[];
}

export const CoachPanel: React.FC<CoachPanelProps> = ({ transaction, accounts }) => {
  if (!transaction) {
    return (
      <div className="h-full bg-slate-50 border-l border-slate-200 p-6 flex flex-col items-center justify-center text-center text-slate-400">
        <Lightbulb size={48} className="mb-4 text-indigo-200" />
        <p className="font-medium text-slate-600">Accounting Coach</p>
        <p className="text-xs mt-2 max-w-[200px]">Select a transaction to receive categorization advice and tax tips.</p>
      </div>
    );
  }

  const amount = Math.abs(transaction.amount);
  const selectedAccount = accounts.find(a => a.id === transaction.assignedAccount);
  
  // Logic Engine
  const tips = [];

  // Tip 1: Capital Asset
  if (amount > 2500 && transaction.transactionType === 'expense' && selectedAccount?.type !== 'Asset') {
    tips.push({
      type: 'warning',
      title: 'Capital Asset Warning',
      text: 'This item is over $2,500. The IRS typically requires items of this value to be depreciated over time rather than expensed immediately. Consider categorizing as "Equipment (Asset)".'
    });
  }

  // Tip 2: Meals
  if (selectedAccount?.name.toLowerCase().includes('meal')) {
    tips.push({
      type: 'info',
      title: 'Meals Deductibility',
      text: 'Business meals are generally 50% deductible. Ensure you have listed the attendees and business purpose in the memo.'
    });
  }

  // Tip 3: Contractors
  if (selectedAccount?.name.toLowerCase().includes('contract') || selectedAccount?.name.toLowerCase().includes('labor') || transaction.isContractor) {
    tips.push({
      type: 'action',
      title: '1099 Compliance',
      text: 'If you pay this vendor more than $600 this year, you must file a 1099-NEC. Do you have their W-9 on file?'
    });
  }

  // Tip 4: Direct vs Operating
  if (selectedAccount?.type === 'Cost of Services') {
    tips.push({
        type: 'info',
        title: 'Direct Cost (COGS)',
        text: 'This reduces your Gross Margin. Use this only for costs directly tied to a specific project.'
    });
  } else if (selectedAccount?.type === 'Expense') {
    tips.push({
        type: 'info',
        title: 'Operating Expense',
        text: 'This is an overhead cost that keeps the business running, regardless of project volume.'
    });
  }

  return (
    <div className="h-full bg-white border-l border-slate-200 p-6 overflow-y-auto w-80 shrink-0">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <Lightbulb size={20} />
        </div>
        <div>
            <h3 className="font-bold text-slate-900">Coach</h3>
            <p className="text-xs text-slate-500">Contextual Advice</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
         <p className="text-xs font-bold text-slate-400 uppercase mb-1">Current Item</p>
         <p className="font-medium text-slate-900">{transaction.description}</p>
         <p className="text-lg font-mono font-bold text-slate-700 mt-1">${amount.toFixed(2)}</p>
      </div>

      <div className="space-y-4">
        {tips.length > 0 ? tips.map((tip, i) => (
            <div key={i} className={`p-4 rounded-xl border ${
                tip.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                tip.type === 'action' ? 'bg-indigo-50 border-indigo-200' :
                'bg-slate-50 border-slate-200'
            }`}>
                <div className="flex items-center gap-2 mb-2">
                    {tip.type === 'warning' && <AlertTriangle size={16} className="text-amber-600" />}
                    {tip.type === 'action' && <ShieldCheck size={16} className="text-indigo-600" />}
                    {tip.type === 'info' && <Briefcase size={16} className="text-slate-600" />}
                    <span className={`text-xs font-bold uppercase ${
                        tip.type === 'warning' ? 'text-amber-700' :
                        tip.type === 'action' ? 'text-indigo-700' :
                        'text-slate-700'
                    }`}>{tip.title}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                    {tip.text}
                </p>
            </div>
        )) : (
            <div className="text-center py-8 opacity-50">
                <ShieldCheck size={48} className="mx-auto mb-2 text-emerald-200" />
                <p className="text-sm text-slate-400">No issues detected.</p>
            </div>
        )}
      </div>
    </div>
  );
};
