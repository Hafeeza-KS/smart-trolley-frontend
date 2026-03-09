import React from 'react';
import { CartItem, ItemStatus, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface CartScreenProps {
  items:        CartItem[];
  isPending:    boolean;
  lang:         Language;
  onRemoveItem: (id: string) => void;
  liveWeight:   number;   // Raw ESP32 load cell reading (grams)
  fraudScore:   number;   // Cumulative session fraud score
}

const CartScreen: React.FC<CartScreenProps> = ({
  items,
  isPending,
  lang,
  onRemoveItem,
  liveWeight,
  fraudScore
}) => {

  const t = (TRANSLATIONS[lang] || TRANSLATIONS.en) as any;

  // Sum of all validated cart item weights from DB
  const validatedWeight = items.reduce((acc, item) => acc + item.weight, 0);
  const totalPrice      = items.reduce((acc, item) => acc + (item.price || 0), 0);
  const unscannedCount  = items.filter(i => i.status === ItemStatus.UNSCANNED).length;

  // ── Live weight display logic ──────────────────────────────────
  // Show real ESP32 reading when available, fall back to DB sum
  const displayWeight = liveWeight > 0 ? liveWeight : validatedWeight;

  // ── Unaccounted weight ─────────────────────────────────────────
  // Difference between what the scale sees and what's been validated
  // If > 100g, something unscanned is likely in the trolley
  const unaccountedWeight = liveWeight > 0
    ? Math.max(0, liveWeight - validatedWeight)
    : 0;
  const hasUnaccounted = unaccountedWeight > 100;

  // ── Fraud risk level ───────────────────────────────────────────
  const fraudLevel =
    fraudScore >= 70 ? 'critical' :
    fraudScore >= 40 ? 'high'     :
    fraudScore >= 20 ? 'medium'   : 'none';

  return (
    <div className="px-6 py-2 flex flex-col animate-fade-in">

      {/* ── Summary Header ─────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 rounded-[2.5rem] p-8 mb-4 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

        <div className="relative flex justify-between items-end">

          {/* LIVE LOAD — real ESP32 reading */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] text-white/60 uppercase font-black tracking-[0.2em]">
                {t.live_load}
              </p>
              {/* Live indicator dot — pulses when ESP32 is streaming */}
              {liveWeight > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              )}
            </div>
            <h2 className="text-4xl font-black">
              {displayWeight.toFixed(0)}
              <span className="text-sm font-medium opacity-60 ml-1">g</span>
            </h2>

            {/* Validated vs live breakdown */}
            {liveWeight > 0 && (
              <p className="text-[9px] text-white/50 font-bold mt-1">
                Validated: {validatedWeight.toFixed(0)}g
              </p>
            )}
          </div>

          {/* SUBTOTAL */}
          <div className="text-right">
            <p className="text-[10px] text-white/60 uppercase font-black tracking-[0.2em] mb-1">
              {t.subtotal}
            </p>
            <h2 className="text-4xl font-black">₹{totalPrice}</h2>
          </div>

        </div>

        {/* ── Weight progress bar ─────────────────────────────── */}
        {liveWeight > 0 && (
          <div className="relative mt-6">
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              {/* Validated portion — green */}
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (validatedWeight / Math.max(liveWeight, 1)) * 100)}%`
                }}
              />
            </div>
            {/* Unaccounted portion label */}
            {hasUnaccounted && (
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-emerald-300 font-bold">
                  ✓ Validated {validatedWeight.toFixed(0)}g
                </span>
                <span className="text-[8px] text-rose-300 font-bold animate-pulse">
                  ⚠ Unaccounted {unaccountedWeight.toFixed(0)}g
                </span>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Unaccounted Weight Warning ──────────────────────────── */}
      {hasUnaccounted && (
        <div className="bg-amber-500 text-white rounded-3xl p-5 shadow-xl mb-4
                        flex items-center gap-4 animate-scale-in">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-scale-unbalanced text-xl"></i>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wider">
              Unscanned Item Detected
            </p>
            <p className="text-[10px] opacity-90 font-bold">
              {unaccountedWeight.toFixed(0)}g in trolley not yet validated
            </p>
          </div>
        </div>
      )}

      {/* ── Fraud Score Badge ───────────────────────────────────── */}
      {fraudLevel !== 'none' && (
        <div className={`rounded-3xl p-5 shadow-xl mb-4 flex items-center gap-4 animate-scale-in ${
          fraudLevel === 'critical' ? 'bg-rose-600 text-white' :
          fraudLevel === 'high'     ? 'bg-orange-500 text-white' :
                                      'bg-yellow-400 text-slate-900'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-shield-halved text-xl"></i>
          </div>
          <div className="flex-1">
            <p className="text-sm font-black uppercase tracking-wider">
              {fraudLevel === 'critical' ? '🚨 Session Flagged' :
               fraudLevel === 'high'     ? '⚠️ High Fraud Risk' :
                                           '⚡ Fraud Risk Detected'}
            </p>
            <p className="text-[10px] opacity-90 font-bold">
              Risk score: {fraudScore}/100
              {fraudLevel === 'critical' ? ' — Staff alert sent' : ' — Monitor closely'}
            </p>
          </div>
          {/* Score pill */}
          <div className="bg-white/20 rounded-xl px-3 py-1 text-sm font-black">
            {fraudScore}
          </div>
        </div>
      )}

      <div className="space-y-4 mb-10">

        {/* ── Syncing indicator ─────────────────────────────────── */}
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

        {/* ── Security warning — unscanned items ───────────────── */}
        {unscannedCount > 0 && (
          <div className="bg-rose-500 text-white rounded-3xl p-5 shadow-xl shadow-rose-200 flex items-center gap-4 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <i className="fas fa-triangle-exclamation text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wider">{t.security_flag}</p>
              <p className="text-[10px] opacity-80 font-bold">
                {unscannedCount} {t.unscanned_detected}
              </p>
            </div>
          </div>
        )}

        {/* ── Items count header ────────────────────────────────── */}
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {t.items_count} ({items.length})
          </h3>
          {/* Live weight source indicator */}
          <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
            liveWeight > 0
              ? 'text-emerald-600 bg-emerald-50'
              : 'text-slate-400 bg-slate-100'
          }`}>
            {liveWeight > 0 ? '● ESP32 Live' : '○ DB Weight'}
          </span>
        </div>

        {/* ── Item List ─────────────────────────────────────────── */}
        <div className="space-y-3 pb-8">

          {items.length === 0 ? (
            <div className="text-center py-24 glass rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                <i className="fas fa-cart-shopping text-slate-300 text-3xl"></i>
              </div>
              <p className="text-slate-400 font-bold text-sm tracking-tight">
                {t.empty_cart}
              </p>
            </div>
          ) : (

            items.map(item => {

              const localizedName = item.barcode
                ? t.products[item.barcode] || item.name
                : t.products['unknown'];

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-[2rem] flex items-center gap-4 transition-all duration-300 animate-scale-in ${
                    item.status === ItemStatus.SCANNED
                      ? 'glass hover:shadow-xl'
                      : 'bg-rose-50 border border-rose-100 shadow-sm'
                  }`}
                >

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-xl shadow-inner ${
                    item.status === ItemStatus.SCANNED
                      ? 'bg-gradient-to-tr from-slate-50 to-white text-violet-600'
                      : 'bg-rose-100 text-rose-500'
                  }`}>
                    <i className={`fas ${item.status === ItemStatus.SCANNED ? 'fa-tag' : 'fa-fingerprint'}`}></i>
                  </div>

                  {/* Item Info */}
                  <div className="flex-1">
                    <p className={`font-black text-base ${
                      item.status === ItemStatus.SCANNED
                        ? 'text-slate-800'
                        : 'text-rose-600'
                    }`}>
                      {localizedName}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                        {item.weight}g
                      </span>

                      {item.status === ItemStatus.SCANNED && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1">
                          <i className="fas fa-check-circle text-[8px]"></i> {t.verified}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price + Remove */}
                  <div className="text-right flex flex-col items-end gap-2">

                    {item.status === ItemStatus.SCANNED ? (
                      <p className="text-xl font-black text-indigo-600 tracking-tight">
                        ₹{item.price}
                      </p>
                    ) : (
                      <div className="bg-rose-100 text-rose-500 px-2 py-1 rounded-lg text-[8px] font-black uppercase">
                        {t.scan_req}
                      </div>
                    )}

                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-rose-500 hover:text-rose-700 text-lg"
                    >
                      <i className="fas fa-trash"></i>
                    </button>

                    <p className="text-[9px] text-slate-400 font-bold uppercase opacity-50">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour:   '2-digit',
                        minute: '2-digit'
                      })}
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
