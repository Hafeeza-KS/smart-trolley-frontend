
import React from 'react';
import { Screen } from '../types';

interface NavbarProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
  cartCount: number;
}

const Navbar: React.FC<NavbarProps> = ({ activeScreen, setActiveScreen, cartCount }) => {
  const tabs: { id: Screen, icon: string, label: string, color: string }[] = [
    { id: 'list', icon: 'fa-list-ul', label: 'List', color: 'text-orange-500' },
    { id: 'cart', icon: 'fa-basket-shopping', label: 'Cart', color: 'text-violet-600' },
    { id: 'nav', icon: 'fa-compass', label: 'Guide', color: 'text-pink-500' },
    { id: 'offers', icon: 'fa-bolt', label: 'Deals', color: 'text-yellow-500' },
    { id: 'billing', icon: 'fa-credit-card', label: 'Pay', color: 'text-emerald-600' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-[100]">
      <nav className="glass rounded-[2.5rem] p-2 flex justify-between items-center shadow-2xl border border-white/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveScreen(tab.id)}
            className={`flex flex-col items-center justify-center h-14 w-14 rounded-[2rem] transition-all relative ${
              activeScreen === tab.id 
              ? `bg-white shadow-xl scale-110 ${tab.color}` 
              : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className={`fas ${tab.icon} text-lg`}></i>
            {tab.id === 'cart' && cartCount > 0 && (
              <span className="absolute top-2 right-2 bg-pink-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black animate-pulse shadow-lg shadow-pink-200">
                {cartCount}
              </span>
            )}
            {activeScreen === tab.id && (
               <span className="text-[7px] font-black uppercase tracking-tighter mt-1">{tab.label}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Navbar;
