import React, { useState } from 'react';

interface InputFormProps {
  onSubmit: (desc: string, type: string) => void;
  isLoading: boolean;
}

const PRODUCT_TYPES = ["Physical Product", "Robotic System", "Mechanical Assembly", "Digital App/Tool"];

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [desc, setDesc] = useState('');
  const [type, setType] = useState(PRODUCT_TYPES[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (desc.trim()) {
      onSubmit(desc, type);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-3xl mx-auto mt-10">
      <h2 className="text-3xl font-bold mb-2 text-slate-800 tracking-tight">Describe Your Vision</h2>
      <p className="text-slate-500 mb-6">Our AI factory will generate specs, blueprints, and a validation report instantly.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Product Type</label>
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            disabled={isLoading}
          >
            {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="e.g., A smart coffee mug that keeps temperature constant using thermoelectric cooling, with a digital display for current temp..."
            className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !desc.trim()}
          className={`w-full py-4 rounded-lg text-white font-bold text-lg tracking-wide transition-all transform
            ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'}
          `}
        >
          {isLoading ? 'Factory Running...' : 'Generate Design Packet'}
        </button>
      </form>
    </div>
  );
};

export default InputForm;
