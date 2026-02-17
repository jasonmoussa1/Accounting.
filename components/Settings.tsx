
import React from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { ToggleLeft, ToggleRight, GraduationCap, Building } from 'lucide-react';

export const Settings: React.FC = () => {
  const { systemSettings, toggleTutorialMode } = useFinance();
  const tutorialMode = systemSettings?.tutorialMode ?? false;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
        <p className="text-slate-500">Configure your workspace preferences.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
             <Building size={18} /> Organization Profile
          </h3>
        </div>
        <div className="p-6 space-y-4">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Organization Name</label>
                <input 
                  type="text" 
                  value={systemSettings?.organizationName || ''} 
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
                />
             </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
             <GraduationCap size={18} /> User Experience
          </h3>
        </div>
        <div className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Tutorial Mode</h4>
                    <p className="text-xs text-slate-500 max-w-md mt-1">
                        When enabled, the Coach Panel will show extra context, definitions, and guides to help you learn the accounting system.
                    </p>
                </div>
                <button 
                  onClick={() => toggleTutorialMode(!tutorialMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      tutorialMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                   {tutorialMode ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                   {tutorialMode ? 'Enabled' : 'Disabled'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
