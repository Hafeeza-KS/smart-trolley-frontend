
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ItemStatus, 
  CartItem, 
  ShoppingListItem, 
  Screen, 
  ESP32Message, 
  Product,
  Language
} from './types';
import { MOCK_PRODUCTS, WAIT_WINDOW_MS, TRANSLATIONS } from './constants';
import ShoppingListScreen from './components/ShoppingListScreen';
import CartScreen from './components/CartScreen';
import NavigationScreen from './components/NavigationScreen';
import OffersScreen from './components/OffersScreen';
import BillingScreen from './components/BillingScreen';
import SimulationPanel from './components/SimulationPanel';
import Header from './components/Header';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('cart');
  const [lang, setLang] = useState<Language>('en');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([
    { id: '1', name: 'Fresh Milk 1L', completed: false, productId: '89056789' },
    { id: '2', name: 'Premium Biscuits', completed: false, productId: '89012345' }
  ]);
  const [pendingWeightChange, setPendingWeightChange] = useState<{ weight: number, timestamp: number } | null>(null);
  const [alerts, setAlerts] = useState<{ id: string, message: string, type: 'success' | 'warning' | 'info' }[]>([]);

  const t = TRANSLATIONS[lang];

  const handleESP32Message = useCallback((msg: ESP32Message) => {
    const { barcode, weight_change } = msg;

    if (weight_change > 0) {
      const now = Date.now();
      if (barcode) {
        const product = MOCK_PRODUCTS.find(p => p.barcode === barcode);
        addScannedItem(product, weight_change);
      } else {
        setPendingWeightChange({ weight: weight_change, timestamp: now });
        addAlert(lang === 'en' ? "Weight detected. Waiting for scan..." : "वजन मिला। स्कैन का इंतज़ार है...", 'info');
      }
    } 
    else if (weight_change < 0) {
      handleItemRemoval(Math.abs(weight_change));
    } 
    else if (barcode && !weight_change) {
      if (pendingWeightChange) {
        const product = MOCK_PRODUCTS.find(p => p.barcode === barcode);
        addScannedItem(product, pendingWeightChange.weight);
        setPendingWeightChange(null);
      } else {
        addAlert(lang === 'en' ? "Scan detected. Place item in trolley." : "स्कैन हुआ। कृपया सामान ट्रॉली में रखें।", "warning");
      }
    }
  }, [pendingWeightChange, lang]);

  const addScannedItem = (product: Product | undefined, actualWeight: number) => {
    if (!product) {
      addAlert("Product not found!", "warning");
      return;
    }

    const newItem: CartItem = {
      id: Math.random().toString(36).substr(2, 9),
      barcode: product.barcode,
      name: product.name,
      weight: actualWeight,
      price: product.price,
      status: ItemStatus.SCANNED,
      timestamp: new Date().toISOString()
    };
    
    setCartItems(prev => [...prev, newItem]);
    addAlert(`${product.name} ${lang === 'en' ? 'Verified' : 'सत्यापित'}`, 'success');

    setShoppingList(prev => prev.map(item => 
      product.barcode === item.productId || product.name.toLowerCase().includes(item.name.toLowerCase()) 
      ? { ...item, completed: true } 
      : item
    ));
  };

  const handleItemRemoval = (weight: number) => {
    setCartItems(prev => {
      let index = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (Math.abs(prev[i].weight - weight) < 50) {
          index = i;
          break;
        }
      }
      
      if (index > -1) {
        const removed = prev[index];
        const newList = [...prev];
        newList.splice(index, 1);
        addAlert(`${removed.name} ${lang === 'en' ? 'Removed' : 'हटा दिया गया'}`, 'info');
        return newList;
      }
      addAlert(`Item of ${weight}g removed.`, 'warning');
      return prev;
    });
  };

  const addAlert = (message: string, type: 'success' | 'warning' | 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 3500);
  };

  useEffect(() => {
    if (pendingWeightChange) {
      const timer = setTimeout(() => {
        const newItem: CartItem = {
          id: Math.random().toString(36).substr(2, 9),
          barcode: null,
          name: lang === 'en' ? "Unscanned Item Detected" : "अनजान वस्तु मिली",
          weight: pendingWeightChange.weight,
          price: null,
          status: ItemStatus.UNSCANNED,
          timestamp: new Date().toISOString()
        };
        setCartItems(prev => [...prev, newItem]);
        setPendingWeightChange(null);
        addAlert(lang === 'en' ? "Security Alert: Unscanned item!" : "सुरक्षा चेतावनी: बिना स्कैन किया सामान!", "warning");
      }, WAIT_WINDOW_MS);
      return () => clearTimeout(timer);
    }
  }, [pendingWeightChange, lang]);

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative border-x border-slate-200">
      <Header lang={lang} setLang={setLang} />
      
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-md z-[110] px-6 space-y-3 pointer-events-none">
        {alerts.map(alert => (
          <div key={alert.id} className={`p-4 rounded-2xl shadow-2xl border-l-4 flex items-center gap-3 animate-slide-in pointer-events-auto backdrop-blur-md bg-white/90 ${
            alert.type === 'success' ? 'border-green-500 text-green-800' :
            alert.type === 'warning' ? 'border-red-500 text-red-800' :
            'border-indigo-500 text-indigo-800'
          }`}>
            <i className={`fas ${alert.type === 'success' ? 'fa-check-circle text-green-500' : alert.type === 'warning' ? 'fa-triangle-exclamation text-red-500' : 'fa-info-circle text-indigo-500'}`}></i>
            <span className="text-xs font-black tracking-tight">{alert.message}</span>
          </div>
        ))}
      </div>

      <main className="flex-1 pb-48">
        {activeScreen === 'list' && (
          <ShoppingListScreen list={shoppingList} setList={setShoppingList} lang={lang} />
        )}
        {activeScreen === 'cart' && (
          <CartScreen items={cartItems} isPending={!!pendingWeightChange} lang={lang} />
        )}
        {activeScreen === 'nav' && (
          <NavigationScreen shoppingList={shoppingList} lang={lang} />
        )}
        {activeScreen === 'offers' && (
          <OffersScreen lang={lang} />
        )}
        {activeScreen === 'billing' && (
          <BillingScreen items={cartItems} clearCart={() => setCartItems([])} lang={lang} />
        )}
      </main>

      <SimulationPanel onSendMessage={handleESP32Message} />
      <Navbar activeScreen={activeScreen} setActiveScreen={(s) => { setActiveScreen(s); window.scrollTo({top: 0, behavior: 'smooth'}); }} cartCount={cartItems.length} />
    </div>
  );
};

export default App;
