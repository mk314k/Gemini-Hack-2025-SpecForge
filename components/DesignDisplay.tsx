import React from 'react';
import { DesignResponse, ProductSpec } from '../types';

interface DesignDisplayProps {
  data: DesignResponse;
  onDownload: () => void;
}

const DesignDisplay: React.FC<DesignDisplayProps> = ({ data, onDownload }) => {
  const { spec, images, selfCheck } = data;
  
  // Use corrected spec if available, otherwise original
  const finalSpec = selfCheck.correctedSpec || spec;

  // Safe guards for displaying arrays/objects if they are somehow missing
  const constraints = finalSpec.constraints || {};
  const requirements = finalSpec.keyRequirements || [];
  const parts = finalSpec.partsList || [];
  const steps = finalSpec.assemblyOrImplementationSteps || [];
  const issues = selfCheck.issues || [];

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8 animate-fade-in">
      
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-10 bg-opacity-95 backdrop-blur">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">{finalSpec.productName || "Untitled Product"}</h1>
            <p className="text-sm text-slate-500 font-mono uppercase tracking-widest">{finalSpec.productType || "SPECIFICATION"}</p>
        </div>
        <button 
            onClick={onDownload}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold shadow-md transition-colors flex items-center gap-2"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Download Packet
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Spec Details */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Summary */}
            <section className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                <h3 className="text-lg font-bold text-slate-800 mb-3">Executive Summary</h3>
                <p className="text-slate-600 leading-relaxed">{finalSpec.summary || "No summary generated."}</p>
            </section>

            {/* Constraints & Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">Constraints</h3>
                    <ul className="space-y-2 text-sm text-slate-700">
                        {Object.entries(constraints).map(([k, v]) => (
                            <li key={k}><span className="font-semibold capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span> {v}</li>
                        ))}
                        {Object.keys(constraints).length === 0 && <li className="text-slate-400 italic">No specific constraints listed.</li>}
                    </ul>
                </section>
                <section className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">Key Requirements</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
                        {requirements.map((r, i) => <li key={i}>{r}</li>)}
                        {requirements.length === 0 && <li className="text-slate-400 italic">No specific requirements listed.</li>}
                    </ul>
                </section>
            </div>

            {/* Parts List */}
            <section className="bg-white p-6 rounded-xl shadow-sm overflow-hidden">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Bill of Materials / Components</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="p-3">Component</th>
                                <th className="p-3">Description</th>
                                <th className="p-3">Material/Tech</th>
                                <th className="p-3">Role</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {parts.map((part, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-3 font-semibold text-slate-800">{part.name || "-"}</td>
                                    <td className="p-3 text-slate-600">{part.description || "-"}</td>
                                    <td className="p-3 text-slate-500 italic">{part.materialOrTech || "-"}</td>
                                    <td className="p-3 text-slate-600">{part.roleInSystem || "-"}</td>
                                </tr>
                            ))}
                             {parts.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-3 text-center text-slate-400 italic">No parts listed.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

             {/* Assembly */}
             <section className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Assembly / Implementation</h3>
                <ol className="list-decimal list-inside space-y-3 text-slate-700">
                    {steps.map((step, i) => (
                        <li key={i} className="pl-2 border-l-2 border-slate-100">{step}</li>
                    ))}
                    {steps.length === 0 && <li className="text-slate-400 italic">No steps listed.</li>}
                </ol>
            </section>

        </div>

        {/* Right Column: Visuals & Audit */}
        <div className="space-y-8">
            
            {/* Diagrams */}
            <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Blueprints & Mockups</h3>
                {images.length > 0 ? (
                    images.map((img, idx) => (
                        <div key={idx} className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 group">
                            <div className="relative aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden mb-2">
                                <img src={img.url} alt={img.title} className="w-full h-full object-contain" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {img.diagramType}
                                </div>
                            </div>
                            <p className="text-center font-semibold text-slate-700 text-sm">{img.title}</p>
                        </div>
                    ))
                ) : (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center text-slate-400 italic">
                        No diagrams generated.
                    </div>
                )}
            </section>

            {/* Self-Check Report */}
            <section className="bg-slate-800 text-slate-200 p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Verification Report
                </h3>
                
                {issues.length === 0 ? (
                    <p className="text-green-400">No critical issues found. Spec is consistent with diagrams.</p>
                ) : (
                    <div className="space-y-4">
                        <p className="text-yellow-400 text-sm font-semibold">Issues Detected & Resolved:</p>
                        <ul className="space-y-2 text-sm">
                            {issues.map((issue, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <span className="text-yellow-500 mt-0.5">⚠</span>
                                    <span className="opacity-90">{issue}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400">
                            * The spec displayed on the left has been automatically corrected based on these findings.
                        </div>
                    </div>
                )}
            </section>
        </div>

      </div>
    </div>
  );
};

export default DesignDisplay;