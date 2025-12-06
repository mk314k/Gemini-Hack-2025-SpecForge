import React, { useState } from 'react';

interface InputFormProps {
  onSubmit: (desc: string, type: string) => void;
  isLoading: boolean;
}

const PRODUCT_TYPES = [
  { id: "Physical Product", label: "📦 Physical Product" },
  { id: "Robotic System", label: "🤖 Robotic System" },
  { id: "Mechanical Assembly", label: "⚙️ Mechanical Assembly" },
  { id: "Digital App/Tool", label: "📱 Digital App/Tool" }
];

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [desc, setDesc] = useState('');
  const [selectedType, setSelectedType] = useState(PRODUCT_TYPES[0].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (desc.trim()) {
      onSubmit(desc, selectedType);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4">
      {/* Hero Header */}
      <div className="text-center mb-10 space-y-4">
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
          Turn your Spec into <span className="text-blue-600">Reality</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Describe a product, and our AI factory will generate engineering specs, technical blueprints, and a validation report instantly.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="relative z-10 group">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transition-all focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500 focus-within:shadow-2xl">
          
          {/* Top Bar: Type Selection Pills */}
          <div className="bg-slate-50 border-b border-slate-100 p-3 flex flex-wrap gap-2 justify-center sm:justify-start">
            {PRODUCT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedType === type.id
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Main Input Area */}
          <div className="relative">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Write your spec as a prompt here... (e.g. 'A wearable wrist device that helps blind people navigate by vibrating when obstacles are near')"
              className="w-full h-48 p-6 text-lg text-slate-800 placeholder-slate-400 bg-white outline-none resize-none leading-relaxed"
              disabled={isLoading}
            />
            
            {/* Action Bar */}
            <div className="absolute bottom-4 right-4 flex items-center gap-3">
               <span className="text-xs text-slate-400 hidden sm:inline-block font-medium">Powered by Gemini 3 & Nano Banana Pro</span>
               <button
                type="submit"
                disabled={isLoading || !desc.trim()}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform ${
                  isLoading || !desc.trim()
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-1 hover:shadow-blue-500/30'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Design</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InputForm;