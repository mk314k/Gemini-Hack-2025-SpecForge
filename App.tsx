
import React, { useState, useEffect } from 'react';
import InputForm from './components/InputForm';
import DesignDisplay from './components/DesignDisplay';
import { DesignResponse, GenerationStatus, RecentDesign } from './types';
import { generateDesignPacket } from './services/gemini';
import { getRecentDesigns, saveRecentDesign } from './services/db';

// Define the AIStudio interface
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

const App: React.FC = () => {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [data, setData] = useState<DesignResponse | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState<boolean>(true);
  const [recents, setRecents] = useState<RecentDesign[]>([]);

  useEffect(() => {
    checkApiKey();
    loadRecents();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } catch (e) {
        console.warn("AI Studio API check failed", e);
      }
    }
    setCheckingKey(false);
  };

  const loadRecents = async () => {
    try {
      // Load from IndexedDB instead of localStorage
      const designs = await getRecentDesigns();
      setRecents(designs);
    } catch (e) {
      console.error("Failed to load recents", e);
    }
  };

  const handleSaveRecent = async (response: DesignResponse) => {
    const spec = response.selfCheck.correctedSpec || response.spec;
    const newItem: RecentDesign = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      productName: spec.productName || "Untitled Project",
      type: spec.productType,
      data: response
    };
    
    try {
      // Save to IndexedDB (async)
      await saveRecentDesign(newItem);
      // Reload from DB to ensure sync and correct ordering
      await loadRecents();
    } catch (e) {
      console.error("Error saving recent design", e);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleGenerate = async (description: string, productType: string) => {
    setStatus('spec');
    setData(null);

    try {
      // Pass the setStatus callback to the service to update UI during steps
      const result = await generateDesignPacket(description, productType, (s) => setStatus(s));
      setData(result);
      setStatus('complete');
      handleSaveRecent(result);
    } catch (e) {
      console.error("Generation error:", e);
      setStatus('error');
    }
  };

  const handleLoadRecent = (item: RecentDesign) => {
    setData(item.data);
    setStatus('complete');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHome = () => {
    setStatus('idle');
    setData(null);
  };

  const handleDownload = () => {
    if (!data) return;
    const spec = data.selfCheck.correctedSpec || data.spec;
    
    // Minimal HTML Template for Download
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${spec.productName} - Design Packet</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; color: #1e293b; line-height: 1.6; }
            h1 { color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
            h2 { margin-top: 32px; color: #334155; }
            .badge { background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .card { border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }
            img { width: 100%; border-radius: 4px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; }
            th { background: #f8fafc; font-weight: 600; }
            pre { background: #1e293b; color: #cbd5e1; padding: 16px; border-radius: 8px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>${spec.productName}</h1>
        <p><strong>Type:</strong> ${spec.productType} | <strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h2>Executive Summary</h2>
        <p>${spec.summary}</p>

        <h2>Visual Blueprints</h2>
        <div class="grid">
            ${data.images.map(img => `
                <div class="card">
                    <img src="${img.url}" alt="${img.title}"/>
                    <p><strong>${img.title}</strong><br/><small>${img.diagramType}</small></p>
                </div>
            `).join('')}
        </div>

        ${data.videoUrl ? `
           <h2>Concept Video</h2>
           <p><a href="${data.videoUrl}" target="_blank">Download Generated Veo Video</a></p>
        ` : ''}

        ${data.implementationCode ? `
            <h2>Generated Implementation (${data.implementationCode.language})</h2>
            <pre>${data.implementationCode.code}</pre>
        ` : ''}

        <h2>Parts List</h2>
        <table>
            <thead><tr><th>Part</th><th>Description</th><th>Material</th></tr></thead>
            <tbody>
                ${spec.partsList.map(p => `<tr><td>${p.name}</td><td>${p.description}</td><td>${p.materialOrTech || '-'}</td></tr>`).join('')}
            </tbody>
        </table>

        <h2>Validation Checks</h2>
        <ul>${data.selfCheck.issues.length ? data.selfCheck.issues.map(i => `<li>${i}</li>`).join('') : '<li>No critical issues found.</li>'}</ul>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.productName.replace(/\s+/g, '_')}_DesignPacket.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (checkingKey) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Initializing Factory...</div>;

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
           <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl">🔑</div>
           <div>
             <h2 className="text-2xl font-bold text-slate-800 mb-2">API Key Required</h2>
             <p className="text-slate-600">To start the Product Factory, please select a Google Cloud Project API Key. This enables <strong>Gemini 3</strong>, <strong>Nano Banana Pro</strong>, and <strong>Veo</strong>.</p>
           </div>
           <button onClick={handleSelectKey} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl">Select API Key</button>
           <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block text-xs text-blue-500 underline">View Billing Documentation</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sticky Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleHome}
                >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">S</div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">Spec-to-Reality</span>
                </div>
                <div className="flex items-center gap-6">
                    <button 
                        onClick={handleHome} 
                        className={`text-sm font-medium transition-colors ${status === 'idle' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
                    >
                        Factory Home
                    </button>
                    <span className="text-sm font-medium text-slate-400 cursor-help" title="Check the examples folder in the source code">Examples</span>
                </div>
            </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-32">
        
        {status === 'idle' && (
           <div className="animate-fade-in-up space-y-16">
              <InputForm onSubmit={handleGenerate} isLoading={false} />
              
              {/* Recent Designs Grid */}
              {recents.length > 0 && (
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-3">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Recent Productions</h3>
                        <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{recents.length}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {recents.map((item) => (
                            <div 
                                key={item.id} 
                                onClick={() => handleLoadRecent(item)}
                                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 cursor-pointer transition-all duration-200 group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                </div>
                                <div className="flex flex-col h-full">
                                    <div className="mb-3">
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                                            {item.type.split(" ")[0]}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 group-hover:text-blue-600 leading-tight mb-1 line-clamp-2">
                                        {item.productName}
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-auto pt-4 flex items-center gap-1">
                                        <span>🕒</span> {item.date}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}
           </div>
        )}

        {(status === 'spec' || status === 'images' || status === 'code' || status === 'video' || status === 'audit') && (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-8 animate-pulse">
                <div className="relative w-32 h-32">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">
                        {status === 'spec' && '📝'}
                        {status === 'images' && '🎨'}
                        {status === 'code' && '💻'}
                        {status === 'video' && '🎥'}
                        {status === 'audit' && '🔍'}
                    </div>
                </div>
                <div className="text-center space-y-3">
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                        {status === 'spec' && 'Drafting Specifications...'}
                        {status === 'images' && 'Rendering Blueprints...'}
                        {status === 'code' && 'Writing Firmware & Pitch...'}
                        {status === 'video' && 'Filming Product Commercial (Veo)...'}
                        {status === 'audit' && 'Verifying Integrity...'}
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        {status === 'spec' && 'Gemini 3 is structuring your requirements into an engineering format.'}
                        {status === 'images' && 'Nano Banana Pro is generating technical views based on the spec.'}
                        {status === 'code' && 'Writing the code logic and generating a voiceover pitch.'}
                        {status === 'video' && 'Generating a cinematic 5-second video preview using Veo.'}
                        {status === 'audit' && 'Running a self-correction loop to ensure the diagrams match the requirements.'}
                    </p>
                </div>
            </div>
        )}

        {status === 'error' && (
            <div className="max-w-md mx-auto text-center mt-20 p-8 bg-white rounded-2xl shadow-lg border border-red-100">
                <div className="text-red-500 text-6xl mb-4">⚠</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Factory Halted</h3>
                <p className="text-slate-600 mb-6">We encountered an error connecting to the AI models. Please check your API key permissions and try again.</p>
                <button onClick={() => setStatus('idle')} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors">Return Home</button>
            </div>
        )}

        {status === 'complete' && data && (
            <div className="animate-fade-in">
                 <div className="max-w-6xl mx-auto mb-6">
                    <button onClick={handleHome} className="text-slate-500 hover:text-blue-600 flex items-center gap-2 text-sm font-medium transition-colors pl-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to Factory Floor
                    </button>
                 </div>
                <DesignDisplay data={data} onDownload={handleDownload} />
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
