
import React, { useState } from 'react';
import { Contractor, JournalEntry } from '../types';
import { useFinance } from '../contexts/FinanceContext';
import { Search, Plus, FileText, AlertCircle, CheckCircle, History, User, ShieldAlert, Download, Upload, ArrowLeft, Mail, MapPin, Building } from 'lucide-react';

export const Contractors: React.FC = () => {
  const { contractors, journal, projects, addContractor } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New Contractor State
  const [newContractorName, setNewContractorName] = useState('');
  const [newContractorEmail, setNewContractorEmail] = useState('');

  // Helper: Calculate YTD from Live Ledger
  const getContractorStats = (contractorId: string) => {
    let totalPaid = 0;
    const payments: { entry: JournalEntry, amount: number, projectName?: string }[] = [];

    journal.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.contractorId === contractorId) {
          // Expense is Debit. We sum debits.
          // Note: If there's a refund (Credit), it should reduce the total paid.
          const amount = line.debit - line.credit;
          if (amount !== 0) {
             totalPaid += amount;
             const project = projects.find(p => p.id === entry.projectId);
             payments.push({ 
                 entry, 
                 amount,
                 projectName: project?.name
             });
          }
        }
      });
    });

    return { 
        totalPaid, 
        payments: payments.sort((a,b) => b.entry.date.localeCompare(a.entry.date)) 
    };
  };

  const getStatusBadge = (contractor: Contractor, totalPaid: number) => {
    // Logic 1: Compliance Warning (Paid anything but no W9)
    if (totalPaid > 0 && !contractor.w9Received) {
        // High severity if over threshold
        if (totalPaid >= 600) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                  <ShieldAlert size={12} />
                  W-9 Missing ({'>'}$600)
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle size={12} />
            W-9 Missing
            </span>
        );
    }
    // Logic 2: 1099 Eligible (Paid >= 600) & Good Standing
    if (totalPaid >= 600 && contractor.w9Received) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} />
            Ready for 1099
          </span>
        );
    }
    // Logic 3: Below Threshold
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        Below Threshold
      </span>
    );
  };

  const filteredContractors = contractors.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const headers = "Recipient Name,Tax ID,Address,City,State,Zip,Entity,Total Paid YTD,W9 Status\n";
    const rows = contractors.map(c => {
      const stats = getContractorStats(c.id);
      if (stats.totalPaid < 600) return null; // Only export eligible
      return `"${c.legalName}","${c.taxId || ''}","${c.address}","${c.city}","${c.state}","${c.zip}","${c.taxClassification}",${stats.totalPaid},${c.w9Received ? 'Received' : 'Missing'}`;
    }).filter(Boolean).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `1099_report_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleAddContractor = async () => {
      if(!newContractorName) return;
      await addContractor({
          name: newContractorName,
          legalName: newContractorName,
          email: newContractorEmail,
          address: '',
          city: '',
          state: '',
          zip: '',
          taxClassification: 'Individual',
          w9Received: false,
          status: 'active'
      });
      setShowAddModal(false);
      setNewContractorName('');
      setNewContractorEmail('');
  };

  // DETAIL VIEW
  if (selectedContractor) {
    const { totalPaid, payments } = getContractorStats(selectedContractor.id);
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <button 
          onClick={() => setSelectedContractor(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft size={16} /> Back to Directory
        </button>

        <div className="flex justify-between items-start">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
              <User size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900">{selectedContractor.name}</h2>
              <p className="text-slate-500 font-medium">{selectedContractor.legalName}</p>
              <div className="flex gap-2 mt-2">
                {getStatusBadge(selectedContractor, totalPaid)}
                <span className="px-2 py-1 text-xs font-medium bg-slate-100 rounded text-slate-600 border border-slate-200">
                  {selectedContractor.taxClassification}
                </span>
              </div>
            </div>
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-medium text-sm">
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Contact & Tax Info</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="text-slate-400 mt-0.5" size={16} />
                <div>
                  <p className="text-slate-900 font-medium">Email</p>
                  <p className="text-slate-500">{selectedContractor.email || 'No email'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="text-slate-400 mt-0.5" size={16} />
                <div>
                  <p className="text-slate-900 font-medium">Address</p>
                  <p className="text-slate-500">
                    {selectedContractor.address || 'No address'}<br/>
                    {selectedContractor.city} {selectedContractor.state} {selectedContractor.zip}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="text-slate-400 mt-0.5" size={16} />
                <div>
                  <p className="text-slate-900 font-medium">Tax ID</p>
                  <p className="font-mono text-slate-500">{selectedContractor.taxId || 'Missing'}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">W-9 Status</span>
                {selectedContractor.w9Received ? (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle size={12}/> Received</span>
                ) : (
                  <span className="text-xs text-rose-600 font-bold flex items-center gap-1"><AlertCircle size={12}/> Needed</span>
                )}
              </div>
              <button className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm flex items-center justify-center gap-2">
                <Upload size={16} /> Upload W-9 PDF
              </button>
            </div>
          </div>

          {/* Ledger History */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-900">Payment History (All Businesses)</h3>
                <span className="font-mono font-bold text-slate-900 text-lg">
                  ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
             </div>
             <div className="overflow-y-auto max-h-[600px]">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Description</th>
                        <th className="px-6 py-3 font-medium">Project</th>
                        <th className="px-6 py-3 font-medium text-right">Amount</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {payments.map((p, idx) => {
                        return (
                        <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-500 font-mono">{p.entry.date}</td>
                            <td className="px-6 py-3 font-medium text-slate-900">
                                {p.entry.description}
                                <div className="text-[10px] text-slate-400 font-normal">{p.entry.businessId}</div>
                            </td>
                            <td className="px-6 py-3 text-slate-500">
                            {p.projectName ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 border border-slate-200">
                                {p.projectName}
                                </span>
                            ) : '-'}
                            </td>
                            <td className="px-6 py-3 text-right font-mono font-medium text-slate-900">
                            ${p.amount.toLocaleString()}
                            </td>
                        </tr>
                        );
                    })}
                    {payments.length === 0 && (
                        <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No payments found for this contractor.</td>
                        </tr>
                    )}
                    </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contractors & 1099s</h2>
          <p className="text-slate-500">Manage tax compliance and vendor payments.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Export 1099 Report
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all text-sm font-medium shadow-sm shadow-indigo-200"
          >
            <Plus size={16} />
            Add Contractor
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search contractors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-medium">Contractor</th>
                <th className="px-6 py-3 font-medium">Tax ID</th>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium text-right">YTD Paid</th>
                <th className="px-6 py-3 font-medium">Compliance</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContractors.map((contractor) => {
                const { totalPaid } = getContractorStats(contractor.id);
                // Flag if paid >= 600 or if paid > 0 and no W9
                const isWarning = totalPaid >= 600 || (totalPaid > 0 && !contractor.w9Received);
                
                return (
                  <tr 
                    key={contractor.id} 
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${isWarning ? 'bg-amber-50/30' : ''}`}
                    onClick={() => setSelectedContractor(contractor)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User size={14} />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{contractor.name}</div>
                          <div className="text-xs text-slate-500">{contractor.legalName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {contractor.taxId || <span className="text-amber-500 text-xs italic">Missing</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {contractor.city && contractor.state ? `${contractor.city}, ${contractor.state}` : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(contractor, totalPaid)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                          <History size={14} />
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredContractors.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">No contractors found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
             <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Contractor</h3>
             <div className="space-y-4">
               <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contractor Name</label>
                 <input 
                   type="text" 
                   value={newContractorName}
                   onChange={(e) => setNewContractorName(e.target.value)}
                   className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   placeholder="e.g. John Doe"
                   autoFocus
                 />
               </div>
               <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
                 <input 
                   type="email" 
                   value={newContractorEmail}
                   onChange={(e) => setNewContractorEmail(e.target.value)}
                   className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   placeholder="john@example.com"
                 />
               </div>
             </div>
             <div className="flex justify-end gap-3 mt-8">
               <button 
                 onClick={() => setShowAddModal(false)}
                 className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleAddContractor}
                 className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-sm font-medium shadow-sm"
               >
                 Create Contractor
               </button>
             </div>
           </div>
         </div>
      )}
    </div>
  );
};
