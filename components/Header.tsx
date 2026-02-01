
import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';

interface HeaderProps {
  lang: Language;
  setLang: (l: Language) => void;
}

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
];

const Header: React.FC<HeaderProps> = ({ lang, setLang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <header className="p-5 flex justify-between items-center z-[150] relative">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
          <i className="fas fa-cart-shopping text-white text-lg"></i>
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
            {currentLang.code === 'hi' ? 'स्मार्ट ट्रॉली' : 
             currentLang.code === 'ur' ? 'اسمارٹ ٹرالی' : 'SmartTrolley'}
          </h1>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full mt-1 inline-block">Pro Edition</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2" ref={dropdownRef}>
        {/* Multilingual Selector */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`glass h-10 px-3 rounded-xl flex items-center gap-2 text-[10px] font-black text-slate-700 transition-all border shadow-sm ${
              isOpen ? 'border-violet-500 bg-white' : 'border-white/50'
            }`}
          >
            <span className="uppercase">{lang}</span>
            <i className={`fas fa-chevron-down transition-transform duration-300 ${isOpen ? 'rotate-180 text-violet-500' : 'text-slate-400'}`}></i>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 glass rounded-2xl shadow-2xl border border-white/60 overflow-hidden animate-scale-in py-2 backdrop-blur-xl bg-white/90 z-[200]">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Select Language</p>
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-hide">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                      lang === l.code ? 'bg-violet-50 text-violet-600' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-black">{l.native}</span>
                      <span className="text-[9px] font-medium text-slate-400">{l.label}</span>
                    </div>
                    {lang === l.code && <i className="fas fa-check text-[10px]"></i>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-10 h-10 rounded-xl overflow-hidden glass border-2 border-white shadow-lg">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
        </div>
      </div>
    </header>
  );
};

export default Header;
