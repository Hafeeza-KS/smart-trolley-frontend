
import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface OffersScreenProps {
  lang: Language;
}

const OffersScreen: React.FC<OffersScreenProps> = ({ lang }) => {
  const t = (TRANSLATIONS[lang] || TRANSLATIONS.en) as any;
  const offers = t.offers || [];

  return (
    <div className="p-6 pb-32 animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter">{t.deals_title}</h2>
      <div className="space-y-6">
        {offers.map((offer: any) => (
          <div key={offer.id} className="group relative glass rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-white/50">
            <div className={`bg-gradient-to-r ${offer.gradient} h-3 w-full`}></div>
            <div className="p-6 flex justify-between items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl bg-gradient-to-br ${offer.gradient} shadow-lg`}>
                <i className={`fas ${offer.icon}`}></i>
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-800 text-lg leading-tight">{offer.title}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">{offer.desc}</p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 glass rounded-full border border-slate-200 text-[10px] font-black text-slate-600">
                  <span className="opacity-50">{t.code_label}:</span> {offer.code}
                </div>
              </div>
              <button className={`bg-gradient-to-r ${offer.gradient} text-white text-[10px] px-5 py-3 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all`}>
                {t.claim}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OffersScreen;
