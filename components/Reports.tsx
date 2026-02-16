
import React, { useState } from 'react';
import { generateProfitAndLoss, generateBalanceSheet, generateCashFlow, generateGeneralLedgerCSV, getFinancialDateRange } from '../services/reporting';
import { Download, Printer, Filter, TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { BusinessId, Account, JournalEntry } from '../types';
import { useFinance } from '../contexts/FinanceContext';

export const Reports: React.FC = () => {
  // TASK 2: LIVE DATA INJECTION
  const { journal, accounts, invoices, customers } = useFinance();

  const [activeTab, setActiveTab] = useState<'pnl' | 'bs' | 'ar' | 'cf'>('pnl');
  const [businessFilter, setBusinessFilter] = useState<BusinessId | 'Combined'>('Combined');
  // TASK 5: DYNAMIC DATE RANGES
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'lastYear' | 'ytd'>('ytd');

  const dates = getFinancialDateRange(dateRange);

  const handleExportGL = () => {
    // Pass live data to export
    const csv = generateGeneralLedgerCSV(journal, accounts);
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `General_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 print:p-0 print:max-w-none">
      {/* Header (No Print) */}
      <div className="flex flex-col md:flex-row justify-between gap-6 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reporting Engine</h2>
          <p className="text-slate-500">Real-time financial intelligence.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex bg-slate-100 rounded-lg p-1">
            {(['pnl', 'bs', 'ar', 'cf'] as const).map(id => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${
                  activeTab === id 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {id === 'pnl' ? 'Profit & Loss' : id === 'bs' ? 'Balance Sheet' : id === 'ar' ? 'A/R Aging' : 'Cash Flow'}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-slate-300 mx-2"></div>
          <button onClick={handleExportGL} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium">
            <Download size={14} /> Accountant Export
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium">
            <Printer size={14} /> Print PDF
          </button>
        </div>
      </div>

      {/* Filters (No Print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-center print:hidden">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Filter size={16} />
          <span className="font-semibold">Filters:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase font-bold text-slate-400">Range</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="month">Current Month</option>
            <option value="quarter">Current Quarter</option>
            <option value="ytd">Year to Date ({currentYear})</option>
            <option value="year">Full Year {currentYear}</option>
            <option value="lastYear">Last Year ({currentYear - 1})</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs uppercase font-bold text-slate-400">Business</label>
          <div className="flex bg-slate-100 rounded p-0.5">
            {(['Combined', 'Big Sky FPV', 'TRL Band'] as const).map(b => (
              <button
                key={b}
                onClick={() => setBusinessFilter(b)}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  businessFilter === b ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* REPORT CANVAS */}
      <div className="bg-white shadow-lg min-h-[800px] p-12 print:shadow-none print:p-0">
        
        {/* Print Header */}
        <div className="mb-8 border-b-2 border-slate-900 pb-4">
          <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">
            {activeTab === 'pnl' ? 'Profit & Loss Statement' : 
             activeTab === 'bs' ? 'Balance Sheet' : 
             activeTab === 'ar' ? 'A/R Aging Report' : 'Cash Flow Statement'}
          </h1>
          <div className="flex justify-between items-end mt-2">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase">{businessFilter}</p>
              <p className="text-xs text-slate-400">Generated on {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
               <p className="text-sm font-medium text-slate-900">
                 {activeTab === 'bs' ? `As of ${dates.end}` : `${dates.start} to ${dates.end}`}
               </p>
            </div>
          </div>
        </div>

        {/* CONTENT SWITCHER */}
        {activeTab === 'pnl' && (
            <ProfitAndLossView 
                journal={journal} 
                accounts={accounts} 
                start={dates.start} 
                end={dates.end} 
                businessId={businessFilter} 
            />
        )}
        {activeTab === 'bs' && (
            <BalanceSheetView 
                journal={journal} 
                accounts={accounts} 
                asOf={dates.end} 
                businessId={businessFilter} 
            />
        )}
        {activeTab === 'ar' && (
            <ARAgingView businessId={businessFilter} />
        )}
        {activeTab === 'cf' && (
            <CashFlowView 
                journal={journal}
                start={dates.start} 
                end={dates.end} 
                businessId={businessFilter} 
                accounts={accounts}
            />
        )}

      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const ReportTable: React.FC<{ title: string, rows: { name: string, amount: number, indent?: boolean }[], total: number, totalLabel: string, isPositiveGood?: boolean }> = ({ title, rows, total, totalLabel, isPositiveGood = true }) => (
  <div className="mb-8">
    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-200 pb-1">{title}</h3>
    <table className="w-full text-sm">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-slate-50">
            <td className={`py-2 ${row.indent ? 'pl-6 text-slate-500' : 'font-medium text-slate-700'}`}>{row.name}</td>
            <td className="py-2 text-right font-mono text-slate-600">{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={2} className="py-2 text-slate-400 italic text-xs">No activity</td></tr>}
      </tbody>
      <tfoot>
        <tr>
          <td className="py-3 font-bold text-slate-900">{totalLabel}</td>
          <td className={`py-3 text-right font-mono font-bold border-t-2 border-slate-900 ${total < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
);

const ProfitAndLossView: React.FC<{ journal: JournalEntry[], accounts: Account[], start: string, end: string, businessId: any }> = ({ journal, accounts, start, end, businessId }) => {
  const data = generateProfitAndLoss(journal, accounts, start, end, businessId);

  return (
    <div className="max-w-3xl mx-auto">
      <ReportTable 
        title="Income" 
        rows={data.revenue.map(i => ({ name: i.accountName, amount: i.amount }))} 
        total={data.totalRevenue} 
        totalLabel="Total Revenue" 
      />
      
      <ReportTable 
        title="Cost of Services" 
        rows={data.cogs.map(i => ({ name: i.accountName, amount: i.amount }))} 
        total={data.totalCOGS} 
        totalLabel="Total Cost of Services" 
      />

      <div className="bg-slate-50 p-4 rounded-lg mb-8 flex justify-between items-center border border-slate-200">
        <span className="font-bold text-slate-900 uppercase text-sm">Gross Profit</span>
        <span className="font-mono font-bold text-xl text-slate-900">${data.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>

      <ReportTable 
        title="Operating Expenses" 
        rows={data.expenses.map(i => ({ name: i.accountName, amount: i.amount }))} 
        total={data.totalExpenses} 
        totalLabel="Total Expenses" 
      />

      <div className={`p-6 rounded-xl flex justify-between items-center border-2 ${data.netIncome >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'}`}>
        <div>
          <span className="font-bold uppercase text-lg block">Net Income</span>
          <span className="text-xs opacity-75">Net Profit Margin: {data.totalRevenue ? ((data.netIncome / data.totalRevenue) * 100).toFixed(1) : 0}%</span>
        </div>
        <span className="font-mono font-bold text-3xl">
          ${data.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

const BalanceSheetView: React.FC<{ journal: JournalEntry[], accounts: Account[], asOf: string, businessId: any }> = ({ journal, accounts, asOf, businessId }) => {
  const data = generateBalanceSheet(journal, accounts, asOf, businessId);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {!data.isBalanced && (
        <div className="bg-rose-100 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-center gap-2 mb-6">
          <AlertTriangle size={20} />
          <span className="font-bold">Warning: Ledger is out of balance. Assets ≠ Liabilities + Equity.</span>
        </div>
      )}

      <ReportTable 
        title="Assets" 
        rows={data.assets.map(i => ({ name: i.accountName, amount: i.amount }))} 
        total={data.totalAssets} 
        totalLabel="Total Assets" 
      />

      <ReportTable 
        title="Liabilities" 
        rows={data.liabilities.map(i => ({ name: i.accountName, amount: i.amount }))} 
        total={data.totalLiabilities} 
        totalLabel="Total Liabilities" 
      />

      <ReportTable 
        title="Equity" 
        rows={data.equity.map(i => ({ name: i.accountName, amount: i.amount }))} 
        total={data.totalEquity} 
        totalLabel="Total Equity" 
      />

      <div className="border-t-4 border-slate-900 pt-4 flex justify-between items-center mt-8">
        <span className="font-bold text-slate-900 uppercase">Total Liabilities & Equity</span>
        <span className="font-mono font-bold text-xl text-slate-900">
          ${(data.totalLiabilities + data.totalEquity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

// AUDIT TARGET: A/R AGING CALCULATION
const ARAgingView: React.FC<{ businessId: any }> = ({ businessId }) => {
  const { invoices, customers } = useFinance();
  
  // Bucketing logic
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
  
  // TASK 4: HARDENED A/R LOGIC
  const relevantInvoices = invoices.filter(inv => {
      // 1. Business Filter
      if (businessId !== 'Combined' && inv.businessId !== businessId) return false;
      // 2. Exclude Drafts
      if (inv.status === 'draft') return false;
      
      // 3. Outstanding Check (Safe Math)
      // Confirmed: Uses Math.max(0, ...) to prevent negative balances from skewed payment data
      const paid = inv.amountPaid ?? 0;
      const outstanding = Math.max(0, inv.totalAmount - paid);
      
      return outstanding > 0.01;
  });

  const today = new Date();

  relevantInvoices.forEach(inv => {
    const paid = inv.amountPaid ?? 0;
    const outstanding = Math.max(0, inv.totalAmount - paid);
    
    // Default to invoice date if due date missing (Date Safety)
    const dueStr = inv.dueDate || inv.dateIssued;
    const dueDate = new Date(dueStr);
    
    const diffTime = today.getTime() - dueDate.getTime();
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (daysOverdue <= 0) buckets.current += outstanding;
    else if (daysOverdue <= 30) buckets.d30 += outstanding;
    else if (daysOverdue <= 60) buckets.d60 += outstanding;
    else if (daysOverdue <= 90) buckets.d90 += outstanding;
    else buckets.d90plus += outstanding;
  });

  const totalAR = Object.values(buckets).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Current', val: buckets.current, color: 'bg-emerald-50 text-emerald-700' },
          { label: '1-30 Days', val: buckets.d30, color: 'bg-slate-100 text-slate-700' },
          { label: '31-60 Days', val: buckets.d60, color: 'bg-amber-50 text-amber-700' },
          { label: '61-90 Days', val: buckets.d90, color: 'bg-orange-50 text-orange-700' },
          { label: '90+ Days', val: buckets.d90plus, color: 'bg-rose-50 text-rose-700' },
        ].map((bucket, i) => (
          <div key={i} className={`p-4 rounded-xl border border-slate-200 text-center ${bucket.color}`}>
            <div className="text-xs font-bold uppercase mb-1">{bucket.label}</div>
            <div className="text-lg font-mono font-bold">${bucket.val.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-bold text-slate-700">Client</th>
              <th className="px-6 py-3 font-bold text-slate-700 text-right">Invoice Date</th>
              <th className="px-6 py-3 font-bold text-slate-700 text-right">Due Date</th>
              <th className="px-6 py-3 font-bold text-slate-700 text-right">Days Overdue</th>
              <th className="px-6 py-3 font-bold text-slate-700 text-right">Amount Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {relevantInvoices.map(inv => {
                const clientName = customers.find(c => c.id === inv.customerId)?.name || 'Unknown';
                const paid = inv.amountPaid ?? 0;
                const outstanding = Math.max(0, inv.totalAmount - paid);
                
                const dueStr = inv.dueDate || inv.dateIssued;
                const dueDate = new Date(dueStr);
                const diffTime = today.getTime() - dueDate.getTime();
                const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                <tr key={inv.id}>
                    <td className="px-6 py-3 font-medium text-slate-900">{clientName}</td>
                    <td className="px-6 py-3 text-right font-mono text-slate-500">{inv.dateIssued}</td>
                    <td className="px-6 py-3 text-right font-mono text-slate-500">{inv.dueDate}</td>
                    <td className="px-6 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${daysOverdue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {daysOverdue > 0 ? `${daysOverdue} Days` : 'Current'}
                    </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">${outstanding.toLocaleString()}</td>
                </tr>
            )})}
            <tr className="bg-slate-50 font-bold">
              <td colSpan={4} className="px-6 py-4 text-right">Total Outstanding A/R</td>
              <td className="px-6 py-4 text-right font-mono text-lg">${totalAR.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CashFlowView: React.FC<{ journal: JournalEntry[], start: string, end: string, businessId: any, accounts: Account[] }> = ({ journal, start, end, businessId, accounts }) => {
  // TASK 6: SYNCED CASH FLOW
  const data = generateCashFlow(journal, start, end, businessId, accounts);

  return (
    <div>
      <div className="h-64 flex items-end justify-between gap-2 mb-8 px-4">
        {data.length > 0 ? data.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group relative">
             <div className="w-full max-w-[40px] bg-slate-100 rounded-t-sm relative flex items-end justify-center overflow-hidden" style={{height: '100%'}}>
                <div 
                   className="w-full bg-rose-400 opacity-80 absolute bottom-0" 
                   style={{height: `${Math.min((m.outflow / (m.inflow + m.outflow + 1)) * 100, 100)}%`}}
                   title={`Out: $${m.outflow}`}
                />
                <div 
                   className="w-full bg-emerald-400 opacity-60 absolute bottom-0 mix-blend-multiply" 
                   style={{height: `${Math.min((m.inflow / (m.inflow + m.outflow + 1)) * 100, 100)}%`}}
                   title={`In: $${m.inflow}`}
                />
             </div>
             <div className="text-[10px] text-slate-400 -rotate-45 mt-2 origin-left whitespace-nowrap">{m.month}</div>
          </div>
        )) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">No cash flow data for this period.</div>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="px-4 py-2 text-left">Period</th>
              <th className="px-4 py-2 text-right">Money In</th>
              <th className="px-4 py-2 text-right">Money Out</th>
              <th className="px-4 py-2 text-right">Net Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(m => (
              <tr key={m.month}>
                <td className="px-4 py-2 font-mono text-slate-600">{m.month}</td>
                <td className="px-4 py-2 text-right font-mono text-emerald-600">+${m.inflow.toLocaleString()}</td>
                <td className="px-4 py-2 text-right font-mono text-rose-600">-${m.outflow.toLocaleString()}</td>
                <td className={`px-4 py-2 text-right font-mono font-bold ${m.net >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {m.net >= 0 ? '+' : ''}${m.net.toLocaleString()}
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-slate-400">No data found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
