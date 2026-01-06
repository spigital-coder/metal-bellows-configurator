import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header';
import SpecsTable from './components/SpecsTable';
import Visualizer from './components/Visualizer';
import LoginModal from './components/LoginModal';
import AdminDashboard from './components/AdminDashboard';
import { CUFF_OPTIONS } from './data';
import { BellowsPart } from './types';
import { db } from './api/database';

declare global {
  interface Window {
    jspdf: any;
    XLSX: any;
  }
}

const APPLICATION_OPTIONS = [
  "Oil & Gas",
  "Power Generation",
  "Aerospace, Space and Defense",
  "Marine Bellows and Expansion Joints",
  "Industrial and OEM",
  "Water and Wastewater",
  "Automotive",
  "Pulp and Paper",
  "Other"
];

// Conversion Constants
const IN_TO_MM = 25.4;
const PSIG_TO_BAR = 0.0689476;
const LBF_IN_TO_NMM = 0.175127;
const LBF_IN_TO_KGMM = 0.017858;
const LBF_IN_TO_KGCM = 1.7858;
const FTLBS_TO_NM = 1.35582;

// Explicitly define return type as number to satisfy arithmetic operation requirements
const parseValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

// Fix arithmetic operation error by ensuring val is a number
const convertFtoC = (f: string) => {
  const val = parseValue(f);
  // Ensure val is treated as a number for arithmetic
  const numVal = Number(val);
  return Math.round((numVal - 32) * 5 / 9).toString();
};

// Fix arithmetic operation error by ensuring val is a number
const convertCtoF = (c: string) => {
  const val = parseValue(c);
  // Ensure val is treated as a number for arithmetic
  const numVal = Number(val);
  return Math.round((numVal * 9 / 5) + 32).toString();
};

function App() {
  const [bellowsList, setBellowsList] = useState<BellowsPart[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const [importInfo, setImportInfo] = useState<{ rows: number, cols: number, source: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPartNumber, setSelectedPartNumber] = useState<string>('');
  const [diameterInput, setDiameterInput] = useState<string>('');
  const [oalInput, setOalInput] = useState<string>('');

  const [diameterUnit, setDiameterUnit] = useState<string>('IN');
  const [oalUnit, setOalUnit] = useState<string>('IN');

  const [pressure, setPressure] = useState('');
  const [pressureUnit, setPressureUnit] = useState('PSIG');
  const [temperature, setTemperature] = useState('');
  const [tempUnit, setTempUnit] = useState('°F');
  const [cyclesValue, setCyclesValue] = useState('');
  const [cycleType, setCycleType] = useState('Non-concurrent');
  const [materialSpec, setMaterialSpec] = useState('');
  const [materialGrade, setMaterialGrade] = useState('');
  const [numberOfPlys, setNumberOfPlys] = useState('');
  const [application, setApplication] = useState('');
  const [customApplication, setCustomApplication] = useState('');

  const [axialEnabled, setAxialEnabled] = useState(false);
  const [lateralEnabled, setLateralEnabled] = useState(false);
  const [angularEnabled, setAngularEnabled] = useState(false);

  const [axialDistUnit, setAxialDistUnit] = useState<'in' | 'mm'>('in');
  const [axialSpringUnit, setAxialSpringUnit] = useState<'LBF/IN' | 'N/mm' | 'kg/mm' | 'kg/cm'>('LBF/IN');
  const [lateralDistUnit, setLateralDistUnit] = useState<'in' | 'mm'>('in');
  const [lateralSpringUnit, setLateralSpringUnit] = useState<'LBF/IN' | 'N/mm' | 'kg/mm' | 'kg/cm'>('LBF/IN');
  const [angularSpringUnit, setAngularSpringUnit] = useState<'FT. LBS/DEG' | 'n-m/deg'>('FT. LBS/DEG');

  const [baseAxialMove, setBaseAxialMove] = useState(0);
  const [baseAxialSpring, setBaseAxialSpring] = useState(0);
  const [baseLateralMove, setBaseLateralMove] = useState(0);
  const [baseLateralSpring, setBaseLateralSpring] = useState(0);
  const [baseAngularMove, setBaseAngularMove] = useState(0);
  const [baseAngularSpring, setBaseAngularSpring] = useState(0);

  const [cuffType, setCuffType] = useState<string>(CUFF_OPTIONS[0]);

  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        const session = await db.auth.getSession();
        if (session) setIsAdmin(true);
        await refreshData();
      } catch (e) {
        console.error("Initialization Error", e);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  const refreshData = async () => {
    const data = await db.getAll();
    setBellowsList(data);
  };

  // Explicitly ensure numeric parameters for arithmetic logic
  const getDisplayLength = (val: number | string, unit: string) => {
    const n = typeof val === 'number' ? val : parseValue(val);
    if (unit === 'MM' || unit === 'DM') return (n * 25.4).toFixed(2);
    if (unit === 'FT') return (n / 12).toFixed(3);
    return n.toString();
  };

  const selectedPart = useMemo(() => {
    return bellowsList.find(p => p.part_number === selectedPartNumber) || null;
  }, [selectedPartNumber, bellowsList]);

  const catalogDiameters = useMemo(() => {
    const sizes = bellowsList.map(p => p.pipe_size);
    return Array.from(new Set(sizes)).sort((a, b) => (a as number) - (b as number));
  }, [bellowsList]);

  const availableOALs = useMemo(() => {
    if (!diameterInput) return [];
    const filtered = bellowsList.filter(p => getDisplayLength(p.pipe_size, diameterUnit) === diameterInput);
    const lengths = filtered.map(p => p.overall_length_oal_in);
    return Array.from(new Set(lengths)).sort((a, b) => (a as number) - (b as number));
  }, [bellowsList, diameterInput, diameterUnit]);

  const availablePartNumbers = useMemo(() => {
    return bellowsList.filter(p => {
      const diaMatch = !diameterInput || getDisplayLength(p.pipe_size, diameterUnit) === diameterInput;
      const oalMatch = !oalInput || getDisplayLength(p.overall_length_oal_in, oalUnit) === oalInput;
      return diaMatch && oalMatch;
    });
  }, [bellowsList, diameterInput, diameterUnit, oalInput, oalUnit]);

  useEffect(() => {
    if (selectedPart) {
      setPressure(String(selectedPart.pressure_psig));
      setPressureUnit('PSIG');
      setCyclesValue(String(selectedPart.number_of_cycles));
      setCycleType(selectedPart.cycles_format);
      setMaterialSpec(selectedPart.bellows_material);
      setMaterialGrade(selectedPart.bellows_material_grade);
      setNumberOfPlys(selectedPart.number_of_plys);
      
      setBaseAxialMove(parseValue(selectedPart.axial_movement_in));
      setBaseAxialSpring(parseValue(selectedPart.axial_spring_rate_lbf_in));
      setBaseLateralMove(parseValue(selectedPart.lateral_movement_in));
      setBaseLateralSpring(parseValue(selectedPart.lateral_spring_rate_lbf_in));
      setBaseAngularMove(parseValue(selectedPart.angular_movement_deg));
      setBaseAngularSpring(parseValue(selectedPart.angular_spring_rate_ft_lbs_deg));

      if (tempUnit === '°F') {
        setTemperature(selectedPart.temperature_f);
      } else {
        setTemperature(convertFtoC(selectedPart.temperature_f));
      }
    }
  }, [selectedPart, tempUnit]);

  const displayAxialMove = (baseAxialMove * (axialDistUnit === 'mm' ? IN_TO_MM : 1)).toFixed(3);
  const displayAxialSpring = (() => {
    const val = baseAxialSpring;
    if (axialSpringUnit === 'N/mm') return (val * LBF_IN_TO_NMM).toFixed(3);
    if (axialSpringUnit === 'kg/mm') return (val * LBF_IN_TO_KGMM).toFixed(3);
    if (axialSpringUnit === 'kg/cm') return (val * LBF_IN_TO_KGCM).toFixed(3);
    return val.toLocaleString();
  })();

  const displayLateralMove = (baseLateralMove * (lateralDistUnit === 'mm' ? IN_TO_MM : 1)).toFixed(3);
  const displayLateralSpring = (() => {
    const val = baseLateralSpring;
    if (lateralSpringUnit === 'N/mm') return (val * LBF_IN_TO_NMM).toFixed(3);
    if (lateralSpringUnit === 'kg/mm') return (val * LBF_IN_TO_KGMM).toFixed(3);
    if (lateralSpringUnit === 'kg/cm') return (val * LBF_IN_TO_KGCM).toFixed(3);
    return val.toLocaleString();
  })();

  const displayAngularSpring = (() => {
    const val = baseAngularSpring;
    if (angularSpringUnit === 'n-m/deg') return (val * FTLBS_TO_NM).toFixed(3);
    return val.toLocaleString();
  })();

  const resetConfigurator = () => {
    setPressure('');
    setPressureUnit('PSIG');
    setTemperature('');
    setCyclesValue('');
    setCycleType('Non-concurrent');
    setMaterialSpec('');
    setMaterialGrade('');
    setNumberOfPlys('');
    setAxialEnabled(false);
    setLateralEnabled(false);
    setAngularEnabled(false);
    setApplication('');
    setCustomApplication('');
    setCuffType(CUFF_OPTIONS[0]);
    setTempUnit('°F');
  };

  const handleDiameterChange = (val: string) => {
    setDiameterInput(val);
    setSelectedPartNumber('');
    resetConfigurator();
  };

  const handleOALChange = (val: string) => {
    setOalInput(val);
    setSelectedPartNumber('');
    resetConfigurator();
  };

  const handlePartNumberChange = (partNum: string) => {
    if (!partNum) {
      setSelectedPartNumber('');
      resetConfigurator();
      return;
    }
    setSelectedPartNumber(partNum);
    const part = bellowsList.find(p => p.part_number === partNum);
    if (part) {
      setDiameterInput(getDisplayLength(part.pipe_size, diameterUnit));
      setOalInput(getDisplayLength(part.overall_length_oal_in, oalUnit));
    }
  };

  const handlePressureUnitChange = (newUnit: string) => {
    if (pressure && pressureUnit !== newUnit) {
      const val = parseFloat(pressure);
      if (!isNaN(val)) {
        if (newUnit === 'BAR') {
          setPressure((val * PSIG_TO_BAR).toFixed(2));
        } else {
          setPressure((val / PSIG_TO_BAR).toFixed(2));
        }
      }
    }
    setPressureUnit(newUnit);
  };

  const handleTempUnitChange = (newUnit: string) => {
    if (temperature && tempUnit !== newUnit) {
      if (newUnit === '°C') {
        setTemperature(convertFtoC(temperature));
      } else {
        setTemperature(convertCtoF(temperature));
      }
    }
    setTempUnit(newUnit);
  };

  const handleDownloadPDF = () => {
    if (!selectedPart) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const primaryColor = [200, 10, 55];
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Bellows Systems', 15, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('QUOTATION REQUEST SUMMARY', 15, 32);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1.5);
    doc.line(15, 38, 195, 38);
    let y = 55;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Contact Information', 15, y);
    y += 10;
    doc.setTextColor(65, 64, 66);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const customerInfo = [
      ['Contact Name', contactName || 'N/A'],
      ['Company', companyName || 'N/A'],
      ['Address', address || 'N/A'],
      ['Location', `${city || ''} ${postalCode || ''} ${country || ''}`.trim() || 'N/A'],
      ['Email', email || 'N/A'],
      ['Phone', phone || 'N/A'],
    ];
    customerInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 50, y);
      y += 6;
    });
    y += 10;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Configuration Details', 15, y);
    y += 10;
    doc.setTextColor(65, 64, 66);
    doc.setFontSize(10);
    const appVal = application === 'Other' ? customApplication : application;
    const configData = [
      ['Application', appVal || 'General Industrial'],
      ['Part Number', selectedPart.part_number],
      ['Nominal Diameter', `${diameterInput} ${diameterUnit}`],
      ['Overall Length', `${oalInput} ${oalUnit}`],
      ['End Configuration', cuffType],
      ['No. of Plys', selectedPart.number_of_plys],
    ];
    configData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 50, y);
      y += 6;
    });
    y += 10;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Design Specifications', 15, y);
    y += 10;
    doc.setTextColor(65, 64, 66);
    doc.setFontSize(10);
    const designSpecs = [
      ['Pressure', `${pressure} ${pressureUnit}`],
      ['Temperature', `${temperature} ${tempUnit}`],
      ['Cycles', `${cyclesValue} (${cycleType})`],
      ['Bellows SPEC', `${materialSpec} ${materialGrade}`],
    ];
    if (axialEnabled) {
      designSpecs.push(['Axial Movement', `${displayAxialMove} ${axialDistUnit}`]);
      designSpecs.push(['Axial Spring Rate', `${displayAxialSpring} ${axialSpringUnit}`]);
    }
    if (lateralEnabled) {
      designSpecs.push(['Lateral Movement', `${displayLateralMove} ${lateralDistUnit}`]);
      designSpecs.push(['Lateral Spring Rate', `${displayLateralSpring} ${lateralSpringUnit}`]);
    }
    if (angularEnabled) {
      designSpecs.push(['Angular Movement', `${baseAngularMove} Deg`]);
      designSpecs.push(['Angular Spring Rate', `${displayAngularSpring} ${angularSpringUnit}`]);
    }
    designSpecs.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 50, y);
      y += 6;
    });
    doc.save(`Quotation_${selectedPart.part_number}.pdf`);
  };

  const labelStyle = "block text-sm font-semibold text-[#414042] mb-1.5";
  const subLabelStyle = "text-[10px] text-gray-400 block mb-1 uppercase tracking-tight font-bold";
  const inputStyle = "block w-full px-3 py-2.5 text-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C80A37] focus:border-[#C80A37] rounded border bg-white text-[#414042] transition-shadow";
  const selectAddonStyle = "bg-gray-50 border border-gray-300 border-l-0 px-2 py-2.5 text-xs font-semibold text-gray-500 rounded-r focus:outline-none focus:border-[#C80A37]";

  if (showDashboard && isAdmin) {
    return <AdminDashboard onClose={() => setShowDashboard(false)} onDataChange={refreshData} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-['Poppins'] text-[#414042]">
      <Header 
        isAdmin={isAdmin} 
        onLoginClick={() => setShowLogin(true)} 
        onLogout={async () => { await db.auth.signOut(); setIsAdmin(false); }}
        onDashboardClick={() => setShowDashboard(true)}
      />
      
      {isAdmin && (
        <div className="bg-gray-800 text-white px-8 py-2 hidden md:flex justify-between items-center text-xs sticky top-20 md:top-24 z-40 shadow-xl">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Cloud Database Active
            </span>
          </div>
          <div className="flex gap-4">
            <span className="text-gray-400 font-medium uppercase">Admin Mode</span>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {loading && (
          <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-[#C80A37] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Synchronizing Catalog...</span>
          </div>
        )}

        <div className="mb-10 text-center md:text-left">
            <h2 className="text-2xl md:text-4xl font-black text-[#414042] leading-tight">Bellows Configurator</h2>
            <p className="mt-3 text-base md:text-lg text-gray-500 max-w-3xl">Professional engineering tool for configuring expansion joints from our comprehensive cloud database.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
          <div className="lg:col-span-5 space-y-8">
            {/* Step 1: Part Selection */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative">
              <div className="flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#C80A37] text-white flex items-center justify-center font-bold mr-3 text-sm">1</div>
                  <h3 className="text-lg font-semibold text-[#414042]">Part Selection</h3>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Nominal Diameter</label>
                    <div className="flex relative">
                      <input type="text" list="diameters" value={diameterInput} onChange={(e) => handleDiameterChange(e.target.value)} placeholder="Type size..." className={`${inputStyle} rounded-r-none border-r-0`} />
                      <datalist id="diameters">{catalogDiameters.map((size) => (<option key={size} value={getDisplayLength(size, diameterUnit)} />))}</datalist>
                      <select value={diameterUnit} onChange={(e) => setDiameterUnit(e.target.value)} className={selectAddonStyle}>
                        <option value="DM">DM</option><option value="NB">NB</option><option value="IN">IN</option><option value="MM">MM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelStyle}>Overall Length</label>
                    <div className="flex relative">
                      <input type="text" list="lengths" value={oalInput} onChange={(e) => handleOALChange(e.target.value)} placeholder="Type length..." className={`${inputStyle} rounded-r-none border-r-0`} />
                      <datalist id="lengths">{availableOALs.map((len) => (<option key={len} value={getDisplayLength(len, oalUnit)} />))}</datalist>
                      <select value={oalUnit} onChange={(e) => setOalUnit(e.target.value)} className={selectAddonStyle}>
                        <option value="IN">IN</option><option value="MM">MM</option><option value="FT">FT</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <label htmlFor="partNumber" className="text-sm font-semibold text-[#414042]">Part Number</label>
                    <span className="text-[11px] font-semibold text-[#C80A37] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                      {availablePartNumbers.length} available
                    </span>
                  </div>
                  <select id="partNumber" value={selectedPartNumber} onChange={(e) => handlePartNumberChange(e.target.value)} className={inputStyle}>
                    <option value="">-- Select Part Number --</option>
                    {availablePartNumbers.map((part) => (<option key={part.part_number} value={part.part_number}>{part.part_number}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>No of Plys</label>
                  <input type="text" readOnly value={numberOfPlys} className={`${inputStyle} bg-gray-50 cursor-not-allowed font-medium text-gray-500`} placeholder="N/A" />
                </div>
                <div>
                  <label htmlFor="cuffType" className={labelStyle}>End Configuration</label>
                  <select id="cuffType" value={cuffType} onChange={(e) => setCuffType(e.target.value)} className={inputStyle}>{CUFF_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                </div>
              </div>
            </div>
            
            {/* Step 2: Design Specification */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#C80A37] text-white flex items-center justify-center font-bold mr-3 text-sm">2</div>
                  <h3 className="text-lg font-semibold text-[#414042]">Design Specification</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-[#414042] mb-3 uppercase tracking-wide border-b border-gray-100 pb-1">PRESSURE</h4>
                  <div className="flex">
                    <input type="text" value={pressure} onChange={(e) => setPressure(e.target.value)} className={`${inputStyle} rounded-r-none border-r-0`} placeholder="Enter Pressure" />
                    <select value={pressureUnit} onChange={(e) => handlePressureUnitChange(e.target.value)} className={selectAddonStyle}><option value="PSIG">PSIG</option><option value="BAR">BAR</option></select>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#414042] mb-3 uppercase tracking-wide border-b border-gray-100 pb-1">Temperature</h4>
                  <div className="flex gap-2">
                    <input type="text" value={temperature} onChange={(e) => setTemperature(e.target.value)} className={inputStyle} placeholder="TEMPERATURE" />
                    <select value={tempUnit} onChange={(e) => handleTempUnitChange(e.target.value)} className={`${inputStyle} w-32`}><option value="°F">°F</option><option value="°C">°C</option></select>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#414042] mb-3 uppercase tracking-wide border-b border-gray-100 pb-1">Number of Cycles</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={subLabelStyle}>Cycles</label>
                      <input type="text" value={cyclesValue} onChange={(e) => setCyclesValue(e.target.value)} className={inputStyle} placeholder="0" />
                    </div>
                    <div>
                      <label className={subLabelStyle}>Format</label>
                      <select value={cycleType} onChange={(e) => setCycleType(e.target.value)} className={inputStyle}><option value="Non-concurrent">Non-concurrent</option><option value="Concurrent">Concurrent</option></select>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#414042] mb-3 uppercase tracking-wide border-b border-gray-100 pb-1">Bellows SPEC</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={subLabelStyle}>SPEC</label><input type="text" value={materialSpec} onChange={(e) => setMaterialSpec(e.target.value)} className={inputStyle} placeholder="Spec" /></div>
                    <div><label className={subLabelStyle}>GRADE</label><input type="text" value={materialGrade} onChange={(e) => setMaterialGrade(e.target.value)} className={inputStyle} placeholder="Grade" /></div>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-[#414042] mb-4 uppercase tracking-wide">Movement</h4>
                  <div className="space-y-3 mb-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="custom-checkbox" checked={axialEnabled} onChange={(e) => setAxialEnabled(e.target.checked)} />
                      <span className="text-sm font-semibold text-[#414042] group-hover:text-[#C80A37] transition-colors">Axial Movement</span>
                    </label>
                    {axialEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                        <div><label className={subLabelStyle}>Axial</label><div className="flex"><input type="text" readOnly value={displayAxialMove} className={`${inputStyle} rounded-r-none border-r-0 bg-gray-50`} /><select value={axialDistUnit} onChange={(e) => setAxialDistUnit(e.target.value as 'in' | 'mm')} className={selectAddonStyle}><option value="in">in</option><option value="mm">mm</option></select></div></div>
                        <div><label className={subLabelStyle}>Required Spring Rate</label><div className="flex"><input type="text" readOnly value={displayAxialSpring} className={`${inputStyle} rounded-r-none border-r-0 bg-gray-50`} /><select value={axialSpringUnit} onChange={(e) => setAxialSpringUnit(e.target.value as any)} className={selectAddonStyle}><option value="LBF/IN">LBF/IN</option><option value="N/mm">N/mm</option><option value="kg/mm">kg/mm</option><option value="kg/cm">kg/cm</option></select></div></div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 mb-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="custom-checkbox" checked={lateralEnabled} onChange={(e) => setLateralEnabled(e.target.checked)} />
                      <span className="text-sm font-semibold text-[#414042] group-hover:text-[#C80A37] transition-colors">Lateral Movement</span>
                    </label>
                    {lateralEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                        <div><label className={subLabelStyle}>Lateral</label><div className="flex"><input type="text" readOnly value={displayLateralMove} className={`${inputStyle} rounded-r-none border-r-0 bg-gray-50`} /><select value={lateralDistUnit} onChange={(e) => setLateralDistUnit(e.target.value as 'in' | 'mm')} className={selectAddonStyle}><option value="in">in</option><option value="mm">mm</option></select></div></div>
                        <div><label className={subLabelStyle}>Required Spring Rate</label><div className="flex"><input type="text" readOnly value={displayLateralSpring} className={`${inputStyle} rounded-r-none border-r-0 bg-gray-50`} /><select value={lateralSpringUnit} onChange={(e) => setLateralSpringUnit(e.target.value as any)} className={selectAddonStyle}><option value="LBF/IN">LBF/IN</option><option value="N/mm">N/mm</option><option value="kg/mm">kg/mm</option><option value="kg/cm">kg/cm</option></select></div></div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="custom-checkbox" checked={angularEnabled} onChange={(e) => setAngularEnabled(e.target.checked)} />
                      <span className="text-sm font-semibold text-[#414042] group-hover:text-[#C80A37] transition-colors">Angular Movement</span>
                    </label>
                    {angularEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                        <div><label className={subLabelStyle}>Angular (deg)</label><input type="text" readOnly value={baseAngularMove} className={`${inputStyle} bg-gray-50`} /></div>
                        <div><label className={subLabelStyle}>Required Spring Rate</label><div className="flex"><input type="text" readOnly value={displayAngularSpring} className={`${inputStyle} rounded-r-none border-r-0 bg-gray-50`} /><select value={angularSpringUnit} onChange={(e) => setAngularSpringUnit(e.target.value as any)} className={selectAddonStyle}><option value="FT. LBS/DEG">FT. LBS/DEG</option><option value="n-m/deg">n-m/deg</option></select></div></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Application */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#C80A37] text-white flex items-center justify-center font-bold mr-3 text-sm">3</div>
                  <h3 className="text-lg font-semibold text-[#414042]">Application</h3>
              </div>
              <div className="space-y-4">
                 <select value={application} onChange={(e) => setApplication(e.target.value)} className={inputStyle}>
                    <option value="">-- Select Application --</option>
                    {APPLICATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                 </select>
                 {application === 'Other' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className={subLabelStyle}>Specify Application</label>
                      <input type="text" value={customApplication} onChange={(e) => setCustomApplication(e.target.value)} className={inputStyle} placeholder="Please specify..." />
                    </div>
                 )}
              </div>
            </div>

            {/* Step 4: Contact Details - Organised Layout */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#C80A37] text-white flex items-center justify-center font-bold mr-3 text-sm">4</div>
                  <h3 className="text-lg font-semibold text-[#414042]">Contact Information</h3>
              </div>
              <div className="space-y-6">
                 {/* Row 1: Primary Identity */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Full Name</label>
                     <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputStyle} placeholder="e.g. John Doe" />
                   </div>
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Company Name</label>
                     <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputStyle} placeholder="e.g. Bellows Systems" />
                   </div>
                 </div>

                 {/* Row 2: Communication */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Email Address</label>
                     <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputStyle} placeholder="name@example.com" />
                   </div>
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Phone Number</label>
                     <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputStyle} placeholder="+1 (555) 000-0000" />
                   </div>
                 </div>

                 {/* Row 3: Street Address */}
                 <div className="space-y-1">
                    <label className={subLabelStyle}>Street Address</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputStyle} placeholder="123 Industrial Way" />
                 </div>

                 {/* Row 4: Geographic Location */}
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div className="space-y-1">
                     <label className={subLabelStyle}>City</label>
                     <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputStyle} placeholder="City" />
                   </div>
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Postal Code</label>
                     <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputStyle} placeholder="Zip / Postal" />
                   </div>
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Country</label>
                     <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputStyle} placeholder="Country" />
                   </div>
                 </div>
              </div>
            </div>

            <button 
                disabled={!selectedPart} 
                className={`w-full py-4 px-6 rounded shadow-sm text-base font-semibold text-white transition-all transform active:scale-[0.99] ${selectedPart ? 'bg-[#C80A37] hover:bg-[#a0082c] shadow-md' : 'bg-gray-300 cursor-not-allowed'}`} 
                onClick={handleDownloadPDF}
             >
                REQUEST QUOTE / DOWNLOAD PDF
             </button>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <Visualizer part={selectedPart} cuffType={cuffType} />
            <SpecsTable part={selectedPart} />
          </div>
        </div>
      </main>

      {showLogin && (
        <LoginModal 
          onClose={() => setShowLogin(false)} 
          onLogin={(success) => {
            if (success) {
              setIsAdmin(true);
              setShowLogin(false);
            }
          }}
        />
      )}

      <footer className="bg-white border-t border-gray-100 mt-auto"><div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8"><p className="text-center text-sm text-gray-400 font-light">&copy; {new Date().getFullYear()} Bellows Systems. All rights reserved.</p></div></footer>
    </div>
  );
}

export default App;