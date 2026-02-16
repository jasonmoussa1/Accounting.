
import React, { useState, useMemo } from 'react';
import { Project, BusinessId, JournalEntry } from '../types';
import { mockProjects, calculateProjectStats, mockJournal, mockAccounts, mockCustomers, addProject } from '../services/accounting';
import { Autocomplete } from './Autocomplete';
import { Briefcase, Calendar, ChevronRight, DollarSign, TrendingUp, TrendingDown, Plane, Users, ArrowLeft, Plus } from 'lucide-react';

export const Projects: React.FC = () => {
  const [filter, setFilter] = useState<'All' | BusinessId>('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // New Project State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectBusiness, setNewProjectBusiness] = useState<BusinessId>('Big Sky FPV');
  const [newProjectClient, setNewProjectClient] = useState(''); // ID

  const filteredProjects = mockProjects.filter(p => filter === 'All' || p.businessId === filter);

  const clientOptions = useMemo(() => mockCustomers.map(c => ({
    id: c.id,
    label: c.name,
    subLabel: c.defaultBusiness,
    data: c
  })), [mockCustomers.length]);

  const handleCreate = () => {
    if (!newProjectName || !newProjectClient) return;
    const client = mockCustomers.find(c => c.id === newProjectClient);
    
    addProject({
      name: newProjectName,
      businessId: newProjectBusiness,
      clientId: client?.name || 'Unknown',
      date: new Date().toISOString().split('T')[0],
      status: 'active'
    });
    
    setShowNewModal(false);
    setNewProjectName('');
    setNewProjectClient('');
  };

  if (selectedProject) {
    const stats = calculateProjectStats(selectedProject.id);
    const projectEntries = mockJournal.filter(je => je.projectId === selectedProject.id);

    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Detail Header */}
        <button 
          onClick={() => setSelectedProject(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft size={16} /> Back to Projects
        </button>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wide rounded ${
                selectedProject.businessId === 'Big Sky FPV' ? 'bg-sky-100 text-sky-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {selectedProject.businessId}
              </span>
              <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wide rounded ${
                selectedProject.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                selectedProject.status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {selectedProject.status}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">{selectedProject.name}</h2>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <Users size={16} /> Client: {selectedProject.clientId}
              <span className="mx-2">•</span>
              <Calendar size={16} /> {selectedProject.date}
            </p>
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-medium text-sm">
            Edit Project
          </button>
        </div>

        {/* Profitability Scorecard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Total Revenue</p>
            <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
              ${stats.revenue.toLocaleString()}
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Direct Costs</p>
            <div className="text-2xl font-bold text-rose-600 flex items-center gap-2">
              ${stats.directCosts.toLocaleString()}
              <TrendingDown size={20} className="text-rose-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Gross Profit</p>
            <div className={`text-2xl font-bold flex items-center gap-2 ${stats.grossProfit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              ${stats.grossProfit.toLocaleString()}
              <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${stats.margin > 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {stats.margin.toFixed(1)}% Margin
              </span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Travel Ratio</p>
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {stats.travelRatio.toFixed(1)}%
              <Plane size={20} className="text-slate-400" />
            </div>
            <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${stats.travelRatio > 20 ? 'bg-rose-400' : 'bg-indigo-400'}`} 
                style={{ width: `${Math.min(stats.travelRatio, 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Ledger Detail */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-900">Project Ledger</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Account</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectEntries.map((entry) => (
                <React.Fragment key={entry.id}>
                  {entry.lines.map((line, idx) => {
                     const acct = mockAccounts.find(a => a.id === line.accountId);
                     if (line.debit === 0 && line.credit === 0) return null;

                     return (
                      <tr key={`${entry.id}-${idx}`} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-500">{idx === 0 ? entry.date : ''}</td>
                        <td className="px-6 py-3 font-medium text-slate-900">{idx === 0 ? entry.description : ''}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded border ${
                            acct?.type === 'Income' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            acct?.type === 'Cost of Services' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {acct?.name}
                          </span>
                        </td>
                        <td className={`px-6 py-3 text-right font-mono ${
                          line.credit > 0 ? 'text-emerald-600' : 'text-slate-900'
                        }`}>
                          {line.credit > 0 ? '+' : '-'}${Math.max(line.debit, line.credit).toLocaleString()}
                        </td>
                      </tr>
                     );
                  })}
                </React.Fragment>
              ))}
              {projectEntries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No journal entries found for this project.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="text-indigo-600" />
            Projects
          </h2>
          <p className="text-slate-500">Track profitability per gig.</p>
        </div>
        <div className="flex gap-4">
             <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              {(['All', 'Big Sky FPV', 'TRL Band'] as const).map(b => (
                <button
                  key={b}
                  onClick={() => setFilter(b)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    filter === b ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all font-medium text-sm shadow-sm"
            >
              <Plus size={16} /> New Project
            </button>
        </div>
       
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(project => {
          const stats = calculateProjectStats(project.id);
          return (
            <div 
              key={project.id} 
              onClick={() => setSelectedProject(project)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${
                    project.businessId === 'Big Sky FPV' ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                  }`}>
                    {project.businessId}
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    project.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {project.status}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                  {project.name}
                </h3>
                <p className="text-sm text-slate-500 mb-6">{project.clientId}</p>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-semibold">Revenue</p>
                    <p className="text-sm font-bold text-slate-700">${stats.revenue.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-slate-400 font-semibold">Net Profit</p>
                    <p className={`text-sm font-bold ${stats.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ${stats.grossProfit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-3 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100">
                <span className="flex items-center gap-1"><Calendar size={12} /> {project.date}</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-indigo-600 font-medium">
                  View Details <ChevronRight size={12} />
                </span>
              </div>
            </div>
          );
        })}
        {filteredProjects.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            No projects found. Create one to get started!
          </div>
        )}
      </div>

      {/* NEW PROJECT MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Start New Project</h3>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Project Name</label>
                 <input 
                   type="text" 
                   value={newProjectName}
                   onChange={(e) => setNewProjectName(e.target.value)}
                   className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   placeholder="e.g. Red Bull Rampage 2024"
                   autoFocus
                 />
               </div>
               
               <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Business Unit</label>
                 <select
                    value={newProjectBusiness}
                    onChange={(e) => setNewProjectBusiness(e.target.value as BusinessId)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 >
                   <option value="Big Sky FPV">Big Sky FPV</option>
                   <option value="TRL Band">TRL Band</option>
                 </select>
               </div>

               <div>
                 <Autocomplete 
                   label="Client"
                   options={clientOptions}
                   value={newProjectClient}
                   onChange={(id) => setNewProjectClient(id)}
                   placeholder="Search customers..."
                 />
               </div>
             </div>

             <div className="flex justify-end gap-3 mt-8">
               <button 
                 onClick={() => setShowNewModal(false)}
                 className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleCreate}
                 className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-sm font-medium shadow-sm"
               >
                 Create Project
               </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};
