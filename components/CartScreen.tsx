
import React from 'react';
import { CartItem, ItemStatus, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface CartScreenProps {
  items: CartItem[];
  isPending: boolean;
  lang: Language;
}

const CartScreen: React.FC<CartScreenProps> = ({ items, isPending, lang }) => {
  const t = (TRANSLATIONS[lang] || TRANSLATIONS.en) as any;
  const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);
  const totalPrice = items.reduce((acc, item) => acc + (item.price || 0), 0);
  const unscannedCount = items.filter(i => i.status === ItemStatus.UNSCANNED).length;

  return (
    <div className="px-6 py-2 flex flex-col animate-fade-in">
      {/* Dynamic Summary Header */}
      <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 rounded-[2.5rem] p-8 mb-8 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="relative flex justify-between items-end">
          <div>
            <p className="text-[10px] text-white/60 uppercase font-black tracking-[0.2em] mb-1">{t.live_load}</p>
            <h2 className="text-4xl font-black">{totalWeight}<span className="text-sm font-medium opacity-60 ml-1">g</span></h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/60 uppercase font-black tracking-[0.2em] mb-1">{t.subtotal}</p>
            <h2 className="text-4xl font-black">₹{totalPrice}</h2>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-10">
        {isPending && (
          <div className="glass-dark text-white rounded-3xl p-5 shadow-xl animate-pulse flex items-center gap-4 border border-violet-500/30">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <i className="fas fa-barcode text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wider">{t.syncing}</p>
              <p className="text-[10px] text-white/60 font-medium">{t.syncing_sub}</p>
            </div>
          </div>
        )}

        {unscannedCount > 0 && (
          <div className="bg-rose-500 text-white rounded-3xl p-5 shadow-xl shadow-rose-200 flex items-center gap-4 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <i className="fas fa-triangle-exclamation text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wider">{t.security_flag}</p>
              <p className="text-[10px] opacity-80 font-bold">{unscannedCount} {t.unscanned_detected}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center px-2">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.items_count} ({items.length})</h3>
           {items.length > 0 && (
             <button className="text-[10px] font-black text-rose-500 uppercase tracking-tighter hover:underline">{t.reset}</button>
           )}
        </div>

        <div className="space-y-3 pb-8">
          {items.length === 0 ? (
            <div className="text-center py-24 glass rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                <i className="fas fa-cart-shopping text-slate-300 text-3xl"></i>
              </div>
              <p className="text-slate-400 font-bold text-sm tracking-tight">{t.empty_cart}</p>
            </div>
          ) : (
            items.map(item => {
              const localizedName = item.barcode ? t.products[item.barcode] || item.name : t.products['unknown'];
              return (
                <div 
                  key={item.id} 
                  className={`p-5 rounded-[2rem] flex items-center gap-4 transition-all duration-300 animate-scale-in ${
                    item.status === ItemStatus.SCANNED 
                    ? 'glass hover:shadow-xl' 
                    : 'bg-rose-50 border border-rose-100 shadow-sm'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-xl shadow-inner ${
                    item.status === ItemStatus.SCANNED 
                    ? 'bg-gradient-to-tr from-slate-50 to-white text-violet-600' 
                    : 'bg-rose-100 text-rose-500'
                  }`}>
                    <i className={`fas ${item.status === ItemStatus.SCANNED ? 'fa-tag' : 'fa-fingerprint'}`}></i>
                  </div>
                  <div className="flex-1">
                    <p className={`font-black text-base ${item.status === ItemStatus.SCANNED ? 'text-slate-800' : 'text-rose-600'}`}>
                      {localizedName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{item.weight}g</span>
                      {item.status === ItemStatus.SCANNED && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1">
                          <i className="fas fa-check-circle text-[8px]"></i> {t.verified}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {item.status === ItemStatus.SCANNED ? (
                      <p className="text-xl font-black text-indigo-600 tracking-tight">₹{item.price}</p>
                    ) : (
                      <div className="bg-rose-100 text-rose-500 px-2 py-1 rounded-lg text-[8px] font-black uppercase">{t.scan_req}</div>
                    )}
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 opacity-50">
                      {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CartScreen;
