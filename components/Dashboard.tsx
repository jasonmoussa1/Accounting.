
import React, { useMemo } from 'react';
import { MetricCardProps } from '../types';
import { getDashboardMetrics } from '../services/accounting';
import { useFinance } from '../contexts/FinanceContext';
import { ArrowUpRight, ArrowDownRight, Wallet, AlertCircle, AlertTriangle, CreditCard, Scale, AlertOctagon, PiggyBank, Loader2, TrendingUp, ShieldAlert } from 'lucide-react';

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, trendUp, type }) => {
  const getIcon = () => {
    switch (type) {
      case 'positive': return <ArrowUpRight className="text-emerald-500" />;
      case 'negative': return <ArrowDownRight className="text-rose-500" />;
      case 'warning': return <AlertTriangle className="text-amber-500" />;
      default: return <Wallet className="text-indigo-500" />;
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${
            type === 'positive' ? 'bg-emerald-100' : 
            type === 'negative' ? 'bg-rose-100' : 
            type === 'warning' ? 'bg-amber-100' : 
            'bg-indigo-50'
        }`}>
          {getIcon()}
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
            </span>
            <span className="text-xs text-slate-400">vs last month</span>
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  // Use Context hook to get REAL data
  const { journal, accounts, inbox, reconciliations, loading } = useFinance();

  // Recalculate metrics when data changes
  const { revenue, profit, ownerDraw, recentActivity, needsReviewCount, totalCash, totalDebt, reconciliations: recStats } = useMemo(() => {
     if (loading) return { revenue: 0, profit: 0, ownerDraw: 0, recentActivity: [], needsReviewCount: 0, totalCash: 0, totalDebt: 0, reconciliations: [] };
     return getDashboardMetrics(journal, accounts, inbox, reconciliations);
  }, [journal, accounts, inbox, reconciliations, loading]);

  const needsRepostCount = inbox.filter(tx => tx.status === 'needs_repost').length;

  if (loading) {
      return (
          <div className="flex h-full items-center justify-center">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
      );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500">Financial health & activity overview.</p>
      </div>

      {/* Primary KPIs - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard 
          title="Cash on Hand" 
          value={`$${totalCash.toLocaleString(undefined, {minimumFractionDigits: 0})}`}
          type="positive" 
        />
        <MetricCard 
          title="Total Debt" 
          value={`$${totalDebt.toLocaleString(undefined, {minimumFractionDigits: 0})}`}
          type="negative" 
        />
        <MetricCard 
          title="Net Profit (YTD)" 
          value={`$${profit.toLocaleString(undefined, {minimumFractionDigits: 0})}`}
          type="neutral" 
        />
        
        {/* Task 3: Owner Draw Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Owner Draw (YTD)</p>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">${ownerDraw.toLocaleString(undefined, {minimumFractionDigits: 0})}</h3>
            </div>
            <div className="p-2 rounded-lg bg-indigo-50">
              <PiggyBank className="text-indigo-500" />
            </div>
          </div>
          <div className="text-xs text-slate-400">
             Money taken out of business
          </div>
        </div>
      </div>
      
      {/* INTEGRITY GUARDRAIL: NEEDS REPOST */}
      {needsRepostCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-pulse ring-2 ring-rose-500/20">
           <div className="flex items-center gap-3">
              <div className="bg-rose-100 p-2 rounded-full text-rose-600">
                 <ShieldAlert size={24} />
              </div>
              <div>
                 <h3 className="text-lg font-bold text-rose-900">Integrity Check</h3>
                 <p className="text-rose-700 text-sm">
                   {needsRepostCount} edited transactions have been reversed and need approval to re-post to the ledger.
                 </p>
              </div>
           </div>
           <button onClick={() => window.location.href='#inbox'} className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition-colors text-sm">
              Fix Now
           </button>
        </div>
      )}

      {/* Task 2: Action Needed - Uncategorized Warning */}
      {needsReviewCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                 <AlertCircle size={24} />
              </div>
              <div>
                 <h3 className="text-lg font-bold text-amber-900">Action Needed</h3>
                 <p className="text-amber-700 text-sm">{needsReviewCount} transactions are sitting in your Inbox uncategorized.</p>
              </div>
           </div>
           <button onClick={() => window.location.href='#inbox'} className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm transition-colors text-sm">
              Review Inbox
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Recent Activity</h3>
            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700">View All</button>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {recentActivity.length > 0 ? recentActivity.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{tx.date}</td>
                    <td className="px-6 py-4 text-slate-600">{tx.description}</td>
                    <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {tx.category}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-100`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Posted
                        </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${
                        tx.transactionType === 'income' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                        {tx.transactionType === 'income' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                    </td>
                    </tr>
                )) : (
                    <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="text-slate-300" size={32} />
                                <p>No recent activity. Import transactions or complete the setup wizard.</p>
                            </div>
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>

        {/* RIGHT COLUMN: Financial Health & Behavioral Guardrails */}
        <div className="space-y-6">
            {/* Task 1: Reconciliation Clock */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Scale size={18} className="text-indigo-600" /> Reconciliation Clock
                </h3>
                <div className="space-y-4">
                    {recStats && recStats.length > 0 ? recStats.map((rec, idx) => {
                        const isOverdue = rec.daysAgo > 45;
                        return (
                            <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                isOverdue ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-600 animate-pulse' : 'bg-emerald-500'}`} />
                                    <div>
                                        <p className={`text-sm font-bold ${isOverdue ? 'text-red-900' : 'text-slate-900'}`}>{rec.accountName}</p>
                                        <p className={`text-xs ${isOverdue ? 'text-red-700' : 'text-slate-500'}`}>Last: {rec.lastDate}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${
                                    isOverdue ? 'bg-red-200 text-red-800' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                    {isOverdue && <AlertOctagon size={12} />}
                                    {rec.daysAgo} days ago
                                </span>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-4 text-slate-400 text-sm italic">
                            No active bank accounts found.
                        </div>
                    )}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <button onClick={() => window.location.href='#reconciliation'} className="w-full text-xs text-center text-indigo-600 hover:text-indigo-800 font-medium">
                        Go to Reconciliation Tool
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-xl shadow-lg p-6 text-white">
                <h3 className="font-bold mb-1">Actions</h3>
                <p className="text-slate-400 text-sm mb-4">Common workflows</p>
                <div className="space-y-2">
                    <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                        <CreditCard size={16} /> Record Expense
                    </button>
                    <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                        <TrendingUp size={16} /> Create Invoice
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
