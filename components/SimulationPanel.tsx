
import React, { useState } from 'react';
import { ESP32Message } from '../types';
import { MOCK_PRODUCTS } from '../constants';

interface SimulationPanelProps {
  onSendMessage: (msg: ESP32Message) => void;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ onSendMessage }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const simulateWeightAdd = (weight: number) => {
    onSendMessage({
      barcode: null,
      weight_change: weight,
      timestamp: new Date().toISOString()
    });
  };

  const simulateBarcodeScan = (barcode: string) => {
    onSendMessage({
      barcode: barcode,
      weight_change: 0,
      timestamp: new Date().toISOString()
    });
  };

  const simulateRemoval = (weight: number) => {
    onSendMessage({
      barcode: null,
      weight_change: -weight,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-gray-900 text-white rounded-2xl shadow-2xl transition-all duration-300 z-[60] overflow-hidden ${
      isExpanded ? 'h-80' : 'h-12'
    }`}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-12 flex items-center justify-between px-4 cursor-pointer hover:bg-gray-800 border-b border-gray-700"
      >
        <div className="flex items-center gap-2">
          <i className="fas fa-microchip text-green-400"></i>
          <span className="text-xs font-bold uppercase tracking-widest">ESP32 Hardware Sim</span>
        </div>
        <i className={`fas ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-up'} text-[10px]`}></i>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Simulate Hardware Event</p>
          <div className="grid grid-cols-2 gap-2">
             <button 
               onClick={() => simulateWeightAdd(200)}
               className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg text-xs flex items-center justify-center gap-2 border border-gray-700"
             >
               <i className="fas fa-weight-hanging text-yellow-500"></i>
               Add 200g
             </button>
             <button 
               onClick={() => simulateWeightAdd(1000)}
               className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg text-xs flex items-center justify-center gap-2 border border-gray-700"
             >
               <i className="fas fa-weight-hanging text-yellow-500"></i>
               Add 1000g
             </button>
             <button 
               onClick={() => simulateRemoval(200)}
               className="bg-red-900/40 hover:bg-red-900/60 p-2 rounded-lg text-xs flex items-center justify-center gap-2 border border-red-800"
             >
               <i className="fas fa-minus-circle"></i>
               Remove 200g
             </button>
             <button 
               onClick={() => simulateRemoval(1000)}
               className="bg-red-900/40 hover:bg-red-900/60 p-2 rounded-lg text-xs flex items-center justify-center gap-2 border border-red-800"
             >
               <i className="fas fa-minus-circle"></i>
               Remove 1000g
             </button>
          </div>
        </div>

        <div>
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Simulate Barcode Scan</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {MOCK_PRODUCTS.map(p => (
              <button 
                key={p.barcode}
                onClick={() => simulateBarcodeScan(p.barcode)}
                className="whitespace-nowrap bg-indigo-600/30 hover:bg-indigo-600/50 px-3 py-1.5 rounded-full text-[10px] font-bold border border-indigo-500/50"
              >
                Scan {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-black/40 p-2 rounded border border-gray-800">
           <p className="text-[9px] font-mono text-green-400">
             // JSON Exchange Log <br/>
             {`{"barcode": "...", "weight_change": "...", "timestamp": "..."}`}
           </p>
        </div>
      </div>
    </div>
  );
};

export default SimulationPanel;
