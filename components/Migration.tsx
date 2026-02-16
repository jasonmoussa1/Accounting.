import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, ArrowRight, Database, RefreshCw } from 'lucide-react';
import { Transaction, IRSCategory } from '../types';

export const Migration: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ total: 0, duplicates: 0, new: 0 });
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');

  // Existing transaction signatures (mocked database)
  const existingSignatures = new Set([
    '2023-10-24-vercelinc.-299',
    '2023-10-23-weworkoffice-4500'
  ]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type === "text/csv" || file.name.endsWith('.csv')) {
      setFile(file);
      parseCSV(file);
    } else {
      alert("Please upload a valid CSV file.");
    }
  };

  const parseCSV = (file: File) => {
    setProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      
      // QuickBooks often uses: Date, Transaction Type, No., Name, Memo/Description, Account, Class, Split, Amount, Balance
      const colMap = {
        date: headers.findIndex(h => h.includes('date')),
        name: headers.findIndex(h => h.includes('name')),
        memo: headers.findIndex(h => h.includes('memo') || h.includes('description')),
        account: headers.findIndex(h => h.includes('account')),
        amount: headers.findIndex(h => h.includes('amount') || h.includes('debit') || h.includes('credit'))
      };

      const parsedTransactions: Transaction[] = [];
      let duplicateCount = 0;

      // Skip header, process lines
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Simple CSV split (Note: robust parser would handle commas in quotes)
        const row = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.trim().replace(/"/g, ''));

        if (row.length < 3) continue;

        const dateStr = row[colMap.date];
        const rawAmount = row[colMap.amount];
        const name = row[colMap.name];
        const memo = row[colMap.memo];
        const account = row[colMap.account] || 'Uncategorized';

        // 1. Data Cleaning
        const amount = parseFloat(rawAmount?.replace(/[^0-9.-]/g, '') || '0');
        
        // 2. Date Formatting (Assuming MM/DD/YYYY to YYYY-MM-DD)
        const dateParts = dateStr?.split('/');
        let formattedDate = dateStr;
        if (dateParts?.length === 3) {
          formattedDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
        }

        // 3. Logic: Description Priority
        const description = name || memo || 'Unknown Transaction';

        // 4. Logic: Duplicate Detection Key
        const uniqueKey = `${formattedDate}-${description.toLowerCase().replace(/\s/g, '')}-${Math.abs(amount)}`;
        
        if (existingSignatures.has(uniqueKey)) {
          duplicateCount++;
          continue; // Skip duplicate
        }

        // 5. Logic: Account Mapping to IRS Categories
        let category: IRSCategory = 'Uncategorized';
        const lowerAccount = account.toLowerCase();
        
        if (lowerAccount.includes('meal') || lowerAccount.includes('dining')) category = 'Meals';
        else if (lowerAccount.includes('travel') || lowerAccount.includes('hotel') || lowerAccount.includes('air')) category = 'Travel';
        else if (lowerAccount.includes('gas') || lowerAccount.includes('fuel') || lowerAccount.includes('auto')) category = 'Gas';
        else if (lowerAccount.includes('soft') || lowerAccount.includes('web') || lowerAccount.includes('app')) category = 'Software';
        else if (lowerAccount.includes('rent') || lowerAccount.includes('lease')) category = 'Rent';
        else if (lowerAccount.includes('contract') || lowerAccount.includes('service')) category = 'Subcontractors';
        else if (lowerAccount.includes('income') || lowerAccount.includes('sales') || lowerAccount.includes('revenue')) category = 'Income';

        parsedTransactions.push({
          id: `import-${Date.now()}-${i}`,
          date: formattedDate,
          description: description,
          category: category,
          amount: Math.abs(amount),
          transactionType: amount < 0 ? 'expense' : (category === 'Income' ? 'income' : 'expense'),
          status: 'posted',
          merchant: name,
          bankAccountId: '1000'
        });
      }

      setPreviewData(parsedTransactions);
      setStats({
        total: parsedTransactions.length + duplicateCount,
        duplicates: duplicateCount,
        new: parsedTransactions.length
      });
      setProcessing(false);
      setStep('preview');
    };

    reader.readAsText(file);
  };

  const handleImport = () => {
    setProcessing(true);
    // Simulate API call to Firestore
    setTimeout(() => {
      setProcessing(false);
      setStep('complete');
    }, 1500);
  };

  const reset = () => {
    setFile(null);
    setPreviewData([]);
    setStep('upload');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Data Migration</h2>
        <p className="text-slate-500">Import historical data from QuickBooks CSV exports.</p>
      </div>

      {step === 'upload' && (
        <div className="space-y-6">
          <div 
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' 
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4 pointer-events-none">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                <FileSpreadsheet size={32} />
              </div>
              <div>
                <p className="text-lg font-medium text-slate-900">Drag and drop your CSV file here</p>
                <p className="text-slate-500 mt-1">or click to browse from your computer</p>
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Supports QuickBooks Export (.csv)</p>
            </div>
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={handleChange}
              accept=".csv"
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-blue-600 shrink-0" size={20} />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Before you upload:</p>
              <ul className="list-disc pl-4 space-y-1 text-blue-800">
                <li>Ensure your CSV includes "Date", "Name", "Account", and "Amount" columns.</li>
                <li>We automatically detect and skip duplicate transactions.</li>
                <li>Transactions are mapped to IRS categories where possible.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-medium uppercase mb-1">Total Found</div>
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
              <div className="text-amber-700 text-xs font-medium uppercase mb-1">Duplicates Skipped</div>
              <div className="text-2xl font-bold text-amber-900">{stats.duplicates}</div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
              <div className="text-emerald-700 text-xs font-medium uppercase mb-1">Ready to Import</div>
              <div className="text-2xl font-bold text-emerald-900">{stats.new}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">Preview: First 5 Records</h3>
              <span className="text-xs text-slate-500">Mapping: QuickBooks → CustomBooks Schema</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.slice(0, 5).map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-6 py-4 text-slate-600 font-mono">{tx.date}</td>
                      <td className="px-6 py-4 text-slate-900 font-medium">{tx.description}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          tx.category === 'Uncategorized' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${
                        tx.transactionType === 'income' ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {tx.transactionType === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
              ...and {previewData.length - 5} more transactions
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              onClick={reset}
              className="px-4 py-2 text-slate-600 font-medium hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleImport}
              disabled={processing}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all font-medium shadow-sm shadow-indigo-200 disabled:opacity-70"
            >
              {processing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Database size={18} />
                  Import {stats.new} Transactions
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Import Successful!</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Successfully imported {stats.new} transactions into your ledger. 
            You can now view them in the Transactions tab.
          </p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={reset}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Import Another File
            </button>
            <button className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all font-medium shadow-sm shadow-indigo-200">
              View Transactions
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};