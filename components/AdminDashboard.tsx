
import React, { useState, useEffect } from 'react';
import { BellowsPart } from '../types';
import { db } from '../api/database';

interface AdminDashboardProps {
  onDataChange: () => void;
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onDataChange, onClose }) => {
  const [data, setData] = useState<BellowsPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPart, setEditingPart] = useState<BellowsPart | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'status'>('inventory');
  const [policyStatus, setPolicyStatus] = useState<{message: string, success: boolean} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const catalog = await db.getAll();
    setData(catalog);
    setLoading(false);
  };

  const runPolicyDiagnostic = async () => {
    setPolicyStatus({ message: 'Probing database permissions...', success: true });
    
    const testPart: BellowsPart = {
      part_number: 'POLICY_PROBE_TEST',
      pipe_size: 0,
      bellows_id_in: 0,
      bellows_od_in: 0,
      live_length_ll_in: 0,
      overall_length_oal_in: 0,
      axial_spring_rate_lbf_in: "0",
      lateral_spring_rate_lbf_in: "0",
      angular_spring_rate_ft_lbs_deg: "0",
      axial_movement_in: 0,
      lateral_movement_in: 0,
      angular_movement_deg: 0,
      max_allowable_pressure_psig: 0,
      bellows_material: "PROBE",
      bellows_material_grade: "PROBE",
      pressure_psig: "0",
      temperature_f: "0",
      number_of_cycles: "0",
      cycles_format: "0",
      number_of_plys: "0",
      weld_neck_material: "0",
      weld_neck_grade: "0"
    };

    const result = await db.create(testPart);
    if (!result.success) {
      setPolicyStatus({ 
        message: result.error || 'Permission Denied. Check your Supabase RLS policies.', 
        success: false 
      });
    } else {
      await db.delete('POLICY_PROBE_TEST');
      setPolicyStatus({ 
        message: 'Success! Your policies allow "Authenticated" users to WRITE data.', 
        success: true 
      });
    }
  };

  const filteredData = data.filter(p => 
    p.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.bellows_material && p.bellows_material.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (partNum: string) => {
    if (confirm('Permanently delete this part from your Cloud Database? This action cannot be undone.')) {
      const result = await db.delete(partNum);
      if (result.success) {
        await loadData();
        onDataChange();
      } else {
        alert(result.error);
      }
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const partData: any = {};
    formData.forEach((value, key) => {
      const numericFields = ['pipe_size', 'bellows_id_in', 'bellows_od_in', 'live_length_ll_in', 'overall_length_oal_in', 'axial_movement_in', 'lateral_movement_in', 'angular_movement_deg', 'max_allowable_pressure_psig'];
      if (numericFields.includes(key)) {
        partData[key] = parseFloat(value as string) || 0;
      } else {
        partData[key] = value;
      }
    });

    let result;
    if (isAdding) {
      result = await db.create(partData as BellowsPart);
    } else {
      result = await db.update(editingPart!.part_number, partData);
    }

    if (result.success) {
      setIsAdding(false);
      setEditingPart(null);
      await loadData();
      onDataChange();
    } else {
      alert(result.error);
    }
  };

  const PartForm = ({ initialData }: { initialData?: BellowsPart }) => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 md:p-10 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
          <h3 className="text-xl md:text-2xl font-black text-[#414042]">
            {isAdding ? 'Register New Cloud Entry' : `Update Cloud Entry: ${initialData?.part_number}`}
          </h3>
          <button onClick={() => { setIsAdding(false); setEditingPart(null); }} className="text-gray-400 hover:text-red-500">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[
            { id: 'part_number', label: 'Part Number', type: 'text', req: true, readOnly: !isAdding },
            { id: 'pipe_size', label: 'Pipe Size (IN)', type: 'number', step: "0.01" },
            { id: 'bellows_id_in', label: 'Bellows ID (IN)', type: 'number', step: "0.01" },
            { id: 'bellows_od_in', label: 'Bellows OD (IN)', type: 'number', step: "0.01" },
            { id: 'live_length_ll_in', label: 'Live Length (IN)', type: 'number', step: "0.01" },
            { id: 'overall_length_oal_in', label: 'Overall Length (IN)', type: 'number', step: "0.01" },
            { id: 'axial_spring_rate_lbf_in', label: 'Axial Spring Rate', type: 'text' },
            { id: 'lateral_spring_rate_lbf_in', label: 'Lateral Spring Rate', type: 'text' },
            { id: 'angular_spring_rate_ft_lbs_deg', label: 'Angular Spring Rate', type: 'text' },
            { id: 'axial_movement_in', label: 'Axial Movement (IN)', type: 'number', step: "0.001" },
            { id: 'lateral_movement_in', label: 'Lateral Movement (IN)', type: 'number', step: "0.001" },
            { id: 'angular_movement_deg', label: 'Angular Movement (Deg)', type: 'number', step: "0.01" },
            { id: 'max_allowable_pressure_psig', label: 'Max Pressure (PSIG)', type: 'number' },
            { id: 'bellows_material', label: 'Material', type: 'text' },
            { id: 'bellows_material_grade', label: 'Grade', type: 'text' },
            { id: 'pressure_psig', label: 'Pressure Range', type: 'text' },
            { id: 'temperature_f', label: 'Temperature (F)', type: 'text' },
            { id: 'number_of_cycles', label: 'Cycles', type: 'text' },
            { id: 'cycles_format', label: 'Cycles Format', type: 'text' },
            { id: 'number_of_plys', label: 'No. of Plys', type: 'text' },
          ].map(field => (
            <div key={field.id} className="space-y-1.5">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.15em]">{field.label}</label>
              <input 
                name={field.id}
                type={field.type}
                step={field.step}
                defaultValue={(initialData as any)?.[field.id]}
                className={`w-full px-5 py-3.5 rounded-xl border-2 border-gray-100 bg-white text-[#414042] focus:ring-4 focus:ring-[#C80A37]/10 focus:border-[#C80A37] outline-none text-sm transition-all font-semibold ${field.readOnly ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}`}
                required={field.req}
                readOnly={field.readOnly}
              />
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-3 flex flex-col md:flex-row justify-end gap-4 mt-8 pt-8 border-t border-gray-100">
            <button type="button" onClick={() => { setIsAdding(false); setEditingPart(null); }} className="px-8 py-3.5 text-gray-500 font-bold hover:text-gray-700 transition-colors order-2 md:order-1">Cancel Changes</button>
            <button type="submit" className="px-10 py-3.5 bg-[#C80A37] text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-red-50 hover:bg-[#a0082c] order-1 md:order-2 transition-transform active:scale-95">Commit to Cloud</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-300">
      <header className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 md:py-6 flex flex-wrap justify-between items-center shadow-sm gap-4">
        <div className="flex items-center gap-4 md:gap-10">
          <h2 className="text-xl md:text-2xl font-black text-[#414042] tracking-tight">Cloud Manager</h2>
          <nav className="flex gap-1 bg-gray-100 p-1 rounded-xl">
             <button 
               onClick={() => setActiveTab('inventory')} 
               className={`px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'inventory' ? 'bg-white shadow-sm text-[#C80A37]' : 'text-gray-500 hover:text-gray-700'}`}
             >
               Inventory
             </button>
             <button 
               onClick={() => setActiveTab('status')} 
               className={`px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'status' ? 'bg-white shadow-sm text-[#C80A37]' : 'text-gray-500 hover:text-gray-700'}`}
             >
               Security
             </button>
          </nav>
        </div>
        <div className="flex gap-2 md:gap-4 w-full md:w-auto">
          {activeTab === 'inventory' && (
            <button onClick={() => setIsAdding(true)} className="flex-1 md:flex-none px-6 py-2.5 md:py-3 bg-[#C80A37] text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#a0082c] shadow-lg shadow-red-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Add Entry
            </button>
          )}
          <button onClick={onClose} className="px-6 py-2.5 md:py-3 border-2 border-gray-100 text-gray-600 rounded-xl text-xs md:text-sm font-bold hover:bg-gray-50 transition-colors">
            Exit
          </button>
        </div>
      </header>
      
      <main className="flex-grow overflow-hidden flex flex-col bg-gray-50/50">
        {activeTab === 'inventory' ? (
          <div className="p-4 md:p-8 flex-grow flex flex-col overflow-hidden">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div className="relative w-full md:w-auto">
                <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                  type="text" 
                  placeholder="Search catalog..." 
                  className="pl-12 pr-6 py-3.5 border-2 border-gray-100 rounded-2xl text-sm w-full md:w-96 focus:ring-4 focus:ring-[#C80A37]/5 focus:border-[#C80A37] outline-none bg-white shadow-sm transition-all font-semibold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="hidden md:block text-[10px] text-gray-400 font-black uppercase tracking-[0.25em]">
                Live Nodes: <span className="text-[#C80A37]">{data.length}</span>
              </div>
            </div>

            <div className="flex-grow bg-white border border-gray-100 rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col">
              {loading ? (
                <div className="flex-grow flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <svg className="animate-spin h-10 w-10 text-[#C80A37] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Accessing Secure Records...</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-8 py-6">Part Reference</th>
                        <th className="px-8 py-6">Nominal Dimension</th>
                        <th className="px-8 py-6">Material Profile</th>
                        <th className="px-8 py-6">Pressure Range</th>
                        <th className="px-8 py-6 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-700">
                      {filteredData.map((part) => (
                        <tr key={part.part_number} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="px-8 py-6 font-black text-[#414042]">{part.part_number}</td>
                          <td className="px-8 py-6">{part.pipe_size}" Nominal</td>
                          <td className="px-8 py-6 text-gray-500">{part.bellows_material} {part.bellows_material_grade}</td>
                          <td className="px-8 py-6"><span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold">{part.pressure_psig}</span></td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingPart(part)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button onClick={() => handleDelete(part.part_number)} className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 max-w-4xl mx-auto space-y-10">
              <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl">
                 <h3 className="text-2xl font-black mb-4">RLS Diagnostic</h3>
                 <p className="text-gray-500 mb-8">Test administrative write/delete capabilities for the current active session.</p>
                 <button 
                  onClick={runPolicyDiagnostic}
                  className="px-8 py-4 bg-[#414042] text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg shadow-gray-200"
                 >
                   Execute Probe
                 </button>
                 {policyStatus && (
                  <div className={`mt-8 p-6 rounded-2xl border-2 ${policyStatus.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <p className="font-bold text-sm">{policyStatus.message}</p>
                  </div>
                 )}
              </div>
          </div>
        )}
      </main>
      {(isAdding || editingPart) && <PartForm initialData={editingPart || undefined} />}
    </div>
  );
};

export default AdminDashboard;
