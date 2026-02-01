
import React, { useMemo } from 'react';
import { ShoppingListItem, Product, Language } from '../types';
import { MOCK_PRODUCTS, TRANSLATIONS } from '../constants';

interface NavigationScreenProps {
  shoppingList: ShoppingListItem[];
  lang: Language;
}

const NavigationScreen: React.FC<NavigationScreenProps> = ({ shoppingList, lang }) => {
  const t = (TRANSLATIONS[lang] || TRANSLATIONS.en) as any;
  const trolleyPos = { x: 50, y: 92 }; 

  // Filter and prioritize items
  const prioritizedItems = useMemo(() => {
    const pending = shoppingList
      .filter(i => !i.completed)
      .map(i => MOCK_PRODUCTS.find(p => p.barcode === i.productId || p.name.toLowerCase().includes(i.name.toLowerCase())))
      .filter(p => p !== undefined) as Product[];

    return [...pending].sort((a, b) => {
      const distA = Math.abs(a.location.x - trolleyPos.x) + Math.abs(a.location.y - trolleyPos.y);
      const distB = Math.abs(b.location.x - trolleyPos.x) + Math.abs(b.location.y - trolleyPos.y);
      return distA - distB;
    });
  }, [shoppingList]);

  const targetItem = prioritizedItems[0] || null;
  const nextTarget = prioritizedItems[1] || null;

  const pathD = useMemo(() => {
    if (!targetItem) return '';
    // Simple L-shaped path (vertical then horizontal)
    return `M ${trolleyPos.x} ${trolleyPos.y} V ${targetItem.location.y} H ${targetItem.location.x}`;
  }, [targetItem, trolleyPos.y, trolleyPos.x]);

  const distanceInMeters = useMemo(() => {
    if (!targetItem) return 0;
    const units = Math.abs(trolleyPos.x - targetItem.location.x) + Math.abs(trolleyPos.y - targetItem.location.y);
    return (units * 0.5).toFixed(1);
  }, [targetItem, trolleyPos.x, trolleyPos.y]);

  return (
    <div className="flex flex-col animate-fade-in px-4 w-full">
      {/* Header Section */}
      <div className="pt-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{t.guide_title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
              </span>
              <p className="text-[10px] text-violet-600 font-extrabold uppercase tracking-widest">{t.optimized_path}</p>
            </div>
          </div>
          <div className="glass px-3 py-1.5 rounded-xl border border-white/50 shadow-sm text-[9px] font-black text-slate-500 uppercase">
            {t.north_facing}
          </div>
        </div>
      </div>
      
      {/* MAP CONTAINER */}
      <div className="relative aspect-square glass rounded-[3.5rem] border-4 border-white shadow-[0_50px_100px_rgba(0,0,0,0.1)] overflow-hidden bg-white w-full">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 0)', backgroundSize: '40px 40px' }}></div>

        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 p-0 pointer-events-none">
          {[...Array(16)].map((_, i) => {
            const aisleLabel = `A-${i+1}`;
            const isTargetAisle = targetItem?.location.zone === aisleLabel;
            return (
              <div key={i} className={`border border-slate-100/50 flex items-center justify-center relative transition-colors duration-500 ${isTargetAisle ? 'bg-violet-50/50' : ''}`}>
                <span className={`text-[9px] font-black absolute top-2 left-2.5 tracking-tighter transition-all ${
                  isTargetAisle ? 'text-violet-600 scale-110' : 'text-slate-500'
                }`}>
                  {aisleLabel}
                </span>
              </div>
            );
          })}
        </div>

        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {targetItem && (
            <>
              <path d={pathD} stroke="#f8fafc" strokeWidth="8" fill="none" strokeLinecap="round" />
              <path d={pathD} stroke="#8b5cf6" strokeWidth="4" fill="none" strokeOpacity="0.1" strokeLinecap="round" />
              <path d={pathD} stroke="url(#pathGradient)" strokeWidth="2" fill="none" strokeDasharray="5,5" className="animate-dash" strokeLinecap="round" />
              <defs>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#db2777" />
                </linearGradient>
              </defs>
              <circle cx={targetItem.location.x} cy={targetItem.location.y} r="10" className="fill-fuchsia-500/10 animate-pulse" />
              <circle cx={targetItem.location.x} cy={targetItem.location.y} r="4" className="fill-fuchsia-600 shadow-xl" style={{ filter: 'drop-shadow(0 0 8px rgba(192, 38, 211, 0.6))' }} />
            </>
          )}

          {nextTarget && (
            <circle cx={nextTarget.location.x} cy={nextTarget.location.y} r="3" className="fill-slate-300 opacity-60" />
          )}
          
          <g transform={`translate(${trolleyPos.x}, ${trolleyPos.y})`}>
             <circle r="6" className="fill-white shadow-lg" />
             <circle r="4.5" className="fill-slate-900" />
             <circle r="2" className="fill-white" />
          </g>
        </svg>

        {!targetItem && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-md">
            <div className="glass p-12 rounded-[3.5rem] shadow-2xl border-2 border-white text-center max-w-[85%] animate-scale-in">
               <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                 <i className="fas fa-check-double text-4xl"></i>
               </div>
               <p className="text-xl font-black text-slate-800 leading-tight">All Set!</p>
               <p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-[0.2em]">{t.list_empty}</p>
            </div>
          </div>
        )}
      </div>

      {targetItem && (
        <div className="mt-8 pb-32 space-y-4 animate-slide-up">
           <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 rounded-[2.5rem] p-6 shadow-2xl">
              <div className="relative flex items-center gap-6">
                <div className="w-20 h-20 glass border-white/10 rounded-[1.8rem] flex flex-col items-center justify-center text-white shadow-inner bg-white/5">
                  <span className="text-[8px] font-black uppercase opacity-40 mb-1">{t.walking}</span>
                  <span className="text-2xl font-black">{distanceInMeters}</span>
                  <span className="text-[9px] font-black uppercase opacity-40">{t.meters}</span>
                </div>
                <div className="flex-1 text-white">
                  <span className="bg-violet-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase mb-2 inline-block">Aisle {targetItem.location.zone}</span>
                  <h3 className="text-xl font-black leading-none mb-1">{t.products[targetItem.barcode] || targetItem.name}</h3>
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">{t.main_dest}</p>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                   <i className="fas fa-location-arrow text-slate-900 text-sm"></i>
                </div>
              </div>
           </div>

           {nextTarget && (
             <div className="bg-white border-2 border-slate-50 rounded-[2rem] p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <i className="fas fa-forward-step"></i>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{t.up_next}</p>
                    <p className="text-sm font-black text-slate-800">{t.products[nextTarget.barcode] || nextTarget.name}</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">Location: Zone {nextTarget.location.zone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-violet-500 bg-violet-50 px-3 py-1 rounded-full">{t.optimized_path}</span>
                </div>
             </div>
           )}

           <div className="glass rounded-[1.5rem] p-4 flex items-center gap-3 opacity-60">
              <i className="fas fa-circle-info text-slate-400 text-xs"></i>
              <p className="text-[10px] font-bold text-slate-500">{t.scan_tip}</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default NavigationScreen;
