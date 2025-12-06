import React, { useState, useEffect } from 'react';
import InputForm from './components/InputForm';
import DesignDisplay from './components/DesignDisplay';
import { DesignResponse, GenerationStatus } from './types';
import { generateDesignPacket } from './services/gemini';

// Define the AIStudio interface to merge with existing definition
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  // We assume Window interface already has aistudio: AIStudio based on the error message.
  // If not, we might need to verify, but usually strictly matching the type fixes the "Subsequent property" error.
}

const App: React.FC = () => {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [data, setData] = useState<DesignResponse | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState<boolean>(true);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
    setCheckingKey(false);
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Per instructions: Assume success to avoid race conditions
      setHasApiKey(true);
    }
  };

  const handleGenerate = async (description: string, productType: string) => {
    setStatus('spec');
    setData(null);

    try {
      // Create a fresh client instance inside the service is handled now
      const result = await generateDesignPacket(description, productType);
      
      setData(result);
      setStatus('complete');
    } catch (e) {
      console.error("Generation error:", e);
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!data) return;
    
    // Create a self-contained HTML packet
    const spec = data.selfCheck.correctedSpec || data.spec;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${spec.productName} - Design Packet</title>
        <style>
            body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }
            h1 { color: #1a56db; border-bottom: 2px solid #eee; padding-bottom: 1rem; }
            .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
            .section { margin-bottom: 2rem; background: #f8f9fa; padding: 1.5rem; border-radius: 8px; }
            .img-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
            img { width: 100%; border: 1px solid #ddd; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; }
            th { color: #555; }
        </style>
      </head>
      <body>
        <h1>${spec.productName}</h1>
        <div class="meta">
            <strong>Type:</strong> ${spec.productType}<br/>
            <strong>Generated:</strong> ${new Date().toLocaleDateString()}
        </div>

        <div class="section">
            <h2>Executive Summary</h2>
            <p>${spec.summary}</p>
        </div>

        <div class="section">
            <h2>Key Requirements</h2>
            <ul>${spec.keyRequirements.map(r => `<li>${r}</li>`).join('')}</ul>
        </div>

        <div class="section">
            <h2>Parts List</h2>
            <table>
                <thead><tr><th>Part</th><th>Desc</th><th>Material</th></tr></thead>
                <tbody>
                    ${spec.partsList.map(p => `<tr><td>${p.name}</td><td>${p.description}</td><td>${p.materialOrTech || '-'}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>Assembly Steps</h2>
            <ol>${spec.assemblyOrImplementationSteps.map(s => `<li>${s}</li>`).join('')}</ol>
        </div>

        <div class="section">
            <h2>Validation Report</h2>
            ${data.selfCheck.issues.length === 0 ? '<p>No issues found.</p>' : '<ul>' + data.selfCheck.issues.map(i => `<li>${i}</li>`).join('') + '</ul>'}
        </div>

        <div class="section">
            <h2>Blueprints & Visuals</h2>
            <div class="img-grid">
                ${data.images.map(img => `
                    <div>
                        <img src="${img.url}" alt="${img.title}"/>
                        <p align="center"><strong>${img.title}</strong><br/><small>${img.diagramType}</small></p>
                    </div>
                `).join('')}
            </div>
        </div>
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

  if (checkingKey) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Initializing...</div>;
  }

  // API Key Selection Screen
  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
           <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
             🔑
           </div>
           <div>
             <h2 className="text-2xl font-bold text-slate-800 mb-2">API Key Required</h2>
             <p className="text-slate-600">
               To generate high-quality engineering blueprints, you must select a paid Google Cloud Project API key.
             </p>
           </div>
           
           <button 
             onClick={handleSelectKey}
             className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all transform hover:scale-105"
           >
             Select API Key
           </button>

           <div className="text-xs text-slate-400">
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-blue-500">
               Billing Documentation
             </a>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Spec-to-Reality</span>
        </div>
        <div className="text-sm text-slate-500 font-medium">Hackathon Edition</div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        
        {status === 'idle' && (
           <div className="animate-fade-in-up">
              <InputForm onSubmit={handleGenerate} isLoading={false} />
           </div>
        )}

        {(status === 'spec' || status === 'images' || status === 'audit') && (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-slate-800">Designing your product...</h2>
                    <p className="text-slate-500">
                        {status === 'spec' && 'Drafting engineering specifications...'}
                        {status === 'images' && 'Rendering technical blueprints (this may take a moment)...'}
                        {status === 'audit' && 'Running AI verification & self-check...'}
                    </p>
                    <p className="text-xs text-slate-400 bg-slate-100 py-1 px-3 rounded-full inline-block">Please wait up to 60 seconds</p>
                </div>
            </div>
        )}

        {status === 'error' && (
            <div className="max-w-md mx-auto text-center mt-20">
                <div className="text-red-500 text-6xl mb-4">⚠</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Generation Failed</h3>
                <p className="text-slate-600 mb-6">The factory encountered an error connecting to the AI models. Please ensure your API key has access to Image Generation models.</p>
                <button onClick={() => setStatus('idle')} className="text-blue-600 font-semibold hover:underline">Try Again</button>
            </div>
        )}

        {status === 'complete' && data && (
            <DesignDisplay data={data} onDownload={handleDownload} />
        )}

      </main>
    </div>
  );
};

export default App;