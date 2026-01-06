
import React from 'react';
import { BellowsPart, CuffEndType } from '../types';

interface VisualizerProps {
  part: BellowsPart | null;
  cuffType: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ part, cuffType }) => {
  const viewWidth = 800;
  const viewHeight = 600;
  
  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;

  // Geometry Setup
  const numConvolutions = 7;
  const bellowsWidth = 440;
  const innerRadius = 110; 
  const convHeight = 55;
  const outerRadius = innerRadius + convHeight;
  const meanRadius = (innerRadius + outerRadius) / 2;
  
  const convWidth = bellowsWidth / numConvolutions;
  const startX = centerX - (bellowsWidth / 2);
  const endX = centerX + (bellowsWidth / 2);
  const cuffLength = 90;

  const isUCuff = cuffType.includes("U CUFF") || cuffType === CuffEndType.U_CUFF;

  const renderBellowsBody = () => {
    if (!part) return null;

    const segments = [];
    for (let i = 0; i < numConvolutions; i++) {
      const xStart = startX + i * convWidth;
      const xMid = xStart + convWidth / 2;
      const xEnd = xStart + convWidth;

      segments.push(
        <g key={`segment-${i}`}>
          <rect 
            x={xStart} 
            y={centerY - innerRadius} 
            width={convWidth} 
            height={innerRadius * 2} 
            fill="url(#bodyShading)" 
          />
          <path
            d={`M ${xStart} ${centerY - innerRadius} 
               C ${xStart} ${centerY - outerRadius - 15}, ${xEnd} ${centerY - outerRadius - 15}, ${xEnd} ${centerY - innerRadius}`}
            fill="url(#metalGradientTop)"
            stroke="#1a1a1a"
            strokeWidth="1"
          />
          <path
            d={`M ${xStart + 8} ${centerY - outerRadius + 6} Q ${xMid} ${centerY - outerRadius - 4}, ${xEnd - 8} ${centerY - outerRadius + 6}`}
            fill="none"
            stroke="white"
            strokeWidth="4"
            opacity="0.4"
            strokeLinecap="round"
          />
          <path
            d={`M ${xStart} ${centerY + innerRadius} 
               C ${xStart} ${centerY + outerRadius + 15}, ${xEnd} ${centerY + outerRadius + 15}, ${xEnd} ${centerY + innerRadius}`}
            fill="url(#metalGradientBottom)"
            stroke="#1a1a1a"
            strokeWidth="1"
          />
          <path
            d={`M ${xStart + 8} ${centerY + outerRadius - 6} Q ${xMid} ${centerY + outerRadius + 4}, ${xEnd - 8} ${centerY + outerRadius - 6}`}
            fill="none"
            stroke="white"
            strokeWidth="4"
            opacity="0.3"
            strokeLinecap="round"
          />
        </g>
      );
    }

    return (
      <g>
        {segments}
        {renderCuffs()}
        {renderAnnotations()}
      </g>
    );
  };

  const renderCuffs = () => {
    const isNone = cuffType.includes("WITHOUT") || cuffType.includes("TRUNCATED");
    if (isNone) return null;

    const cuffY = isUCuff ? centerY - outerRadius : centerY - innerRadius;
    const cuffH = isUCuff ? outerRadius * 2 : innerRadius * 2;

    return (
      <g>
        <rect 
          x={startX - cuffLength} 
          y={cuffY} 
          width={cuffLength} 
          height={cuffH} 
          fill="url(#bodyShading)" 
          stroke="#1a1a1a" 
          strokeWidth="1.5"
        />
        <rect 
          x={endX} 
          y={cuffY} 
          width={cuffLength} 
          height={cuffH} 
          fill="url(#bodyShading)" 
          stroke="#1a1a1a" 
          strokeWidth="1.5"
        />
        {isUCuff && (
            <g>
                <line x1={startX} y1={centerY - outerRadius} x2={startX} y2={centerY + outerRadius} stroke="#000" strokeWidth="1" strokeDasharray="5,3" opacity="0.4" />
                <line x1={endX} y1={centerY - outerRadius} x2={endX} y2={centerY + outerRadius} stroke="#000" strokeWidth="1" strokeDasharray="5,3" opacity="0.4" />
            </g>
        )}
      </g>
    );
  };

  const renderAnnotations = () => {
    if (!part) return null;
    return (
      <g className="annotations pointer-events-none">
        <line x1={startX - 140} y1={centerY} x2={endX + 140} y2={centerY} stroke="#C80A37" strokeWidth="3" strokeDasharray="12,6" />
        <text x={startX - 150} y={centerY} fill="#C80A37" fontSize="16" fontWeight="bold" textAnchor="end" dominantBaseline="middle">Mean Diameter</text>

        <g transform={`translate(${startX + convWidth}, ${centerY - outerRadius - 60})`}>
             <line x1={0} y1={0} x2={convWidth} y2={0} stroke="#C80A37" strokeWidth="2" markerStart="url(#arrowhead)" markerEnd="url(#arrowhead)" />
             <text x={convWidth/2} y={-12} textAnchor="middle" fontSize="14" fontWeight="bold">Pitch</text>
        </g>

        <g transform={`translate(${endX + 80}, ${centerY - outerRadius})`}>
            <line x1={0} y1={0} x2={0} y2={convHeight} stroke="#000" strokeWidth="2" markerStart="url(#arrowheadBlack)" markerEnd="url(#arrowheadBlack)" />
            <text x={12} y={convHeight/2} fontSize="13" fontWeight="bold" dominantBaseline="middle">Conv. Height</text>
        </g>

        <g transform={`translate(${startX + convWidth * 1.5}, ${centerY - outerRadius - 100})`}>
            <text x="0" y="0" textAnchor="middle" fontWeight="bold" fontSize="15">Crest</text>
            <path d="M 0 5 L 0 35" stroke="#000" strokeWidth="1.5" markerEnd="url(#arrowheadBlack)" fill="none" />
        </g>
        <g transform={`translate(${startX + convWidth * 0.5}, ${centerY - innerRadius + 20})`}>
            <text x="0" y="-35" textAnchor="middle" fontWeight="bold" fontSize="15">Root</text>
            <path d="M 0 -30 L 0 -10" stroke="#000" strokeWidth="1.5" markerEnd="url(#arrowheadBlack)" fill="none" />
        </g>

        <g transform={`translate(${endX + cuffLength/2}, ${centerY + (isUCuff ? outerRadius : innerRadius) + 40})`}>
            <text x="0" y="0" textAnchor="middle" fontWeight="bold" fontSize="14">Cuff / Skirt / Tangent</text>
            <line x1={-cuffLength/2} y1={-15} x2={cuffLength/2} y2={-15} stroke="#C80A37" strokeWidth="2.5" markerStart="url(#arrowhead)" markerEnd="url(#arrowhead)" />
        </g>
      </g>
    );
  };

  return (
    <div className="w-full h-[600px] bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center p-8 relative overflow-hidden shadow-inner">
      <div className="absolute top-6 left-8 z-10">
         <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_10px_#C80A37]"></span>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">Engineering Render Engine v2.5</span>
         </div>
      </div>
      
      {!part ? (
         <div className="text-center opacity-30 scale-90">
            <div className="w-24 h-24 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            </div>
            <p className="text-gray-600 font-bold tracking-widest text-[10px] uppercase">Select Entry to Start Physical Rendering</p>
         </div>
      ) : (
        <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewWidth} ${viewHeight}`} 
            preserveAspectRatio="xMidYMid meet"
            className="drop-shadow-2xl"
        >
            <defs>
                <linearGradient id="metalGradientTop" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#414a4c" />
                    <stop offset="20%" stopColor="#d1d5db" />
                    <stop offset="50%" stopColor="#f3f4f6" />
                    <stop offset="80%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#111827" />
                </linearGradient>
                <linearGradient id="metalGradientBottom" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#111827" />
                    <stop offset="20%" stopColor="#d1d5db" />
                    <stop offset="50%" stopColor="#f3f4f6" />
                    <stop offset="80%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#414a4c" />
                </linearGradient>
                <linearGradient id="bodyShading" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1a202c" />
                    <stop offset="10%" stopColor="#e2e8f0" />
                    <stop offset="35%" stopColor="#94a3b8" />
                    <stop offset="50%" stopColor="#f1f5f9" />
                    <stop offset="65%" stopColor="#94a3b8" />
                    <stop offset="90%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#1a202c" />
                </linearGradient>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#C80A37" />
                </marker>
                <marker id="arrowheadBlack" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
                </marker>
            </defs>
            {renderBellowsBody()}
        </svg>
      )}

      {part && (
        <div className="absolute bottom-8 right-8 flex flex-col items-end gap-3 scale-90 md:scale-100">
            <div className="bg-[#C80A37] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest shadow-lg">REAL-TIME CAD RENDER</div>
            <div className="bg-white/95 backdrop-blur-xl p-5 rounded-2xl border border-gray-100 shadow-2xl border-l-[6px] border-l-[#C80A37] min-w-[220px]">
                <div className="text-sm font-black text-gray-800 mb-1">{part.part_number}</div>
                <div className="text-[#C80A37] font-bold text-[9px] uppercase tracking-widest mb-3">{cuffType}</div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-50 pt-3">
                    <span className="font-bold">OD: {part.bellows_od_in}"</span>
                    <span className="font-bold">ID: {part.bellows_id_in}"</span>
                    <span className="font-bold">L: {part.overall_length_oal_in}"</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Visualizer;
