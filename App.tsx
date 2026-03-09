import React, { useState, useEffect, useCallback } from 'react';
import { TRANSLATIONS } from './constants';
import {
  ItemStatus,
  CartItem,
  ShoppingListItem,
  Screen,
  ESP32Message,
  Product,
  Language
} from './types';
import { supabase } from './supabaseClient';

import ShoppingListScreen from './components/ShoppingListScreen';
import CartScreen from './components/CartScreen';
import NavigationScreen from './components/NavigationScreen';
import OffersScreen from './components/OffersScreen';
import BillingScreen from './components/BillingScreen';
import SimulationPanel from './components/SimulationPanel';
import Header from './components/Header';
import Navbar from './components/Navbar';

// ─── Backend URL from env ─────────────────────────────────────────
const API_URL      = import.meta.env.VITE_API_URL as string;
const TROLLEY_CODE = import.meta.env.VITE_TROLLEY_CODE as string || "TROLLEY_001";

const App: React.FC = () => {

  const [activeScreen, setActiveScreen]               = useState<Screen>('cart');
  const [lang, setLang]                               = useState<Language>('en');
  const [cartItems, setCartItems]                     = useState<CartItem[]>([]);
  const [shoppingList, setShoppingList]               = useState<ShoppingListItem[]>([]);
  const [pendingWeightChange, setPendingWeightChange] =
    useState<{ weight: number; timestamp: number } | null>(null);
  const [alerts, setAlerts] = useState<
    { id: string; message: string; type: 'success' | 'warning' | 'info' }[]
  >([]);
  const [products, setProducts]                       = useState<Product[]>([]);
  const [isValidating, setIsValidating]               = useState(false);
  const [fraudScore, setFraudScore]                   = useState(0);
  const [liveWeight, setLiveWeight]                   = useState(0);
  const [trolleyId, setTrolleyId]                     = useState<string | null>(null);

  const t = TRANSLATIONS[lang];

  // ══════════════════════════════════════════════════════════════════
  // STEP 1 — Resolve trolleyId from TROLLEY_CODE
  // Must run first — cart fetch + realtime both depend on this UUID
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {

    const resolveTrolley = async () => {
      const { data, error } = await supabase
        .from("trolleys")
        .select("id")
        .eq("trolley_code", TROLLEY_CODE)
        .single();

      if (error || !data) {
        console.error("Trolley not found for code:", TROLLEY_CODE, error);
        return;
      }

      setTrolleyId(data.id);
    };

    resolveTrolley();

  }, []);

  // ══════════════════════════════════════════════════════════════════
  // STEP 2 — Fetch cart for THIS trolley only
  // Waits for trolleyId. Filters by trolley_id so we never see
  // items from other trolleys on load.
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {

    if (!trolleyId) return;

    const fetchCart = async () => {
      const { data, error } = await supabase
        .from("cart")
        .select(`
          id,
          expected_weight,
          added_at,
          status,
          products (
            name,
            price,
            barcode
          )
        `)
        .eq("trolley_id", trolleyId)
        .order("added_at", { ascending: true });

      if (error) {
        console.error("Cart fetch error:", error);
        return;
      }

      setCartItems(data.map((item: any) => ({
        id:        item.id,
        barcode:   item.products?.barcode,
        name:      item.products?.name,
        price:     item.products?.price,
        weight:    item.expected_weight,
        status:    item.status === "SCANNED"
                     ? ItemStatus.SCANNED
                     : ItemStatus.UNSCANNED,
        timestamp: item.added_at
      })));
    };

    fetchCart();

  }, [trolleyId]);

  // ══════════════════════════════════════════════════════════════════
  // STEP 3 — Supabase Realtime: cart INSERT / UPDATE / DELETE
  // Filtered to this trolley only.
  // This is the ONLY place cartItems is updated after a scan.
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {

    if (!trolleyId) return;

    const channel = supabase
      .channel("cart-realtime")
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "cart",
          filter: `trolley_id=eq.${trolleyId}`
        },
        async (payload) => {

          const { data: product } = await supabase
            .from("products")
            .select("name, price, barcode")
            .eq("id", payload.new.product_id)
            .single();

          const newItem: CartItem = {
            id:        payload.new.id,
            barcode:   product?.barcode,
            name:      product?.name,
            price:     product?.price,
            weight:    payload.new.expected_weight,
            status:    payload.new.status === "SCANNED"
                         ? ItemStatus.SCANNED
                         : ItemStatus.UNSCANNED,
            timestamp: payload.new.added_at
          };

          setCartItems(prev => [...prev, newItem]);
          setIsValidating(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "cart",
          filter: `trolley_id=eq.${trolleyId}`
        },
        (payload) => {
          setCartItems(prev =>
            prev.map(item =>
              item.id === payload.new.id
                ? {
                    ...item,
                    weight: payload.new.expected_weight,
                    status: payload.new.status === "SCANNED"
                              ? ItemStatus.SCANNED
                              : ItemStatus.UNSCANNED
                  }
                : item
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event:  "DELETE",
          schema: "public",
          table:  "cart",
          filter: `trolley_id=eq.${trolleyId}`
        },
        (payload) => {
          setCartItems(prev => prev.filter(item => item.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [trolleyId]);

  // ══════════════════════════════════════════════════════════════════
  // SUPABASE REALTIME — FRAUD LOG → UI ALERT
  // ══════════════════════════════════════════════════════════════════
useEffect(() => {

  if (!trolleyId) return;

  const fraudChannel = supabase
    .channel("fraud-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "fraud_logs",
        filter: `trolley_id=eq.${trolleyId}`
      },
      (payload) => {
        const score   = payload.new.fraud_score;
        const pattern = payload.new.pattern;

        setFraudScore(score);
        addAlert(`🚨 Fraud detected: ${pattern} (score: ${score})`, 'warning');
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(fraudChannel);
  };

}, [trolleyId]);

  // ══════════════════════════════════════════════════════════════════
  // FETCH PRODUCTS
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*");

      if (error) {
        console.error("Error fetching products:", error);
        return;
      }

      setProducts(data.map((p: any) => ({
        barcode:  p.barcode,
        name:     p.name,
        price:    p.price,
        weight:   p.weight,
        category: p.category,
        location: {
          x:    p.location_x,
          y:    p.location_y,
          zone: p.zone
        }
      })));
    };

    fetchProducts();

  }, []);

  // ══════════════════════════════════════════════════════════════════
  // LIVE WEIGHT POLLING — every 500ms
  // Fetches raw ESP32 load cell reading from FastAPI memory store.
  // Silent fail — keeps last known value if ESP32 is offline.
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {

    const pollLiveWeight = async () => {
      try {
        const res  = await fetch(
          `${API_URL}/live-weight?trolley_code=${TROLLEY_CODE}`
        );
        const data = await res.json();
        setLiveWeight(data.weight ?? 0);
      } catch {
        // Silent fail
      }
    };

    pollLiveWeight();
    const interval = setInterval(pollLiveWeight, 500);
    return () => clearInterval(interval);

  }, []);

  // ══════════════════════════════════════════════════════════════════
  // CALL /validate — Intelligence entry point
  // barcode + weight → FastAPI → DB INSERT → realtime → UI
  // ══════════════════════════════════════════════════════════════════
  const callValidate = useCallback(async (
    barcode: string,
    deltaWeight: number,
    weightCurve: number[]
  ) => {

    setIsValidating(true);

    try {
      const res = await fetch(`${API_URL}/validate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode,
          trolley_code: TROLLEY_CODE,
          delta_weight: deltaWeight,
          weight_curve: weightCurve
        })
      });

      if (!res.ok) {
        const err = await res.json();
        addAlert(`Error: ${err.detail || "Validation failed"}`, 'warning');
        setIsValidating(false);
        return;
      }

      const result = await res.json();

      if (result.verdict === "ACCEPTED") {
        addAlert(`✅ ${result.product} Added — ₹${result.price}`, 'success');
        setFraudScore(result.fraud_score);
        // cartItems update comes via Supabase realtime — NOT here

      } else if (result.verdict === "REJECTED") {
        addAlert(`❌ Rejected: ${result.reasons?.join(", ") || "Weight mismatch"}`, 'warning');
        setFraudScore(result.fraud_score);
        setIsValidating(false);

      } else if (result.verdict === "FLAGGED") {
        addAlert(`🚨 Session Flagged! Score: ${result.fraud_score} — Staff alert sent`, 'warning');
        setFraudScore(result.fraud_score);
        setIsValidating(false);
      }

    } catch (err) {
      console.error("Validate error:", err);
      addAlert("Validation failed — check connection", 'warning');
      setIsValidating(false);
    }

  }, []);

  // ══════════════════════════════════════════════════════════════════
  // CLEAR CART — called by BillingScreen after payment + receipt
  // 1. Clears React state instantly (UI responds immediately)
  // 2. Deletes rows from Supabase DB (so next load is also empty)
  // Without step 2, old items reappear when user returns to cart
  // ══════════════════════════════════════════════════════════════════
  const clearCart = useCallback(async () => {

    setCartItems([]);
    setFraudScore(0);

    if (trolleyId) {
      const { error } = await supabase
        .from("cart")
        .delete()
        .eq("trolley_id", trolleyId);

      if (error) {
        console.error("Cart clear error:", error);
      }
    }

  }, [trolleyId]);

  // ══════════════════════════════════════════════════════════════════
  // MANUAL REMOVE ITEM — trash button in CartScreen
  // ══════════════════════════════════════════════════════════════════
  const removeItem = (id: string) => {
    setCartItems(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      addAlert(`${item.name} Removed`, "info");
      return prev.filter(i => i.id !== id);
    });
  };

  // ══════════════════════════════════════════════════════════════════
  // REMOVE ITEM BY WEIGHT — ESP32 sends negative weight_change
  // ══════════════════════════════════════════════════════════════════
  const handleItemRemoval = (weight: number) => {
    setCartItems(prev => {
      let index = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (Math.abs(prev[i].weight - weight) < 50) { index = i; break; }
      }
      if (index > -1) {
        const removed = prev[index];
        const newList = [...prev];
        newList.splice(index, 1);
        addAlert(`${removed.name} Removed`, 'info');
        return newList;
      }
      addAlert(`Item of ${weight}g removed`, 'warning');
      return prev;
    });
  };

  // ══════════════════════════════════════════════════════════════════
  // ESP32 MESSAGE HANDLER
  // Pattern A: negative weight   → remove item
  // Pattern B: weight + barcode  → validate immediately
  // Pattern C: weight only       → store as pending
  // Pattern D: barcode only      → match pending → validate
  // ══════════════════════════════════════════════════════════════════
  const handleESP32Message = useCallback((msg: ESP32Message) => {

    const { barcode, weight_change } = msg;

    if (weight_change < 0) {
      handleItemRemoval(Math.abs(weight_change));
      return;
    }

    if (weight_change > 0 && barcode) {
      callValidate(barcode, weight_change, Array(15).fill(weight_change));
      return;
    }

    if (weight_change > 0 && !barcode) {
      setPendingWeightChange({ weight: weight_change, timestamp: Date.now() });
      addAlert("Weight detected — waiting for barcode scan...", 'info');
      return;
    }

    if (barcode && !weight_change) {
      if (pendingWeightChange) {
        callValidate(
          barcode,
          pendingWeightChange.weight,
          Array(15).fill(pendingWeightChange.weight)
        );
        setPendingWeightChange(null);
      } else {
        addAlert("Scan detected — please place item first", 'warning');
      }
    }

  }, [pendingWeightChange, callValidate]);

  // ══════════════════════════════════════════════════════════════════
  // ALERT HELPER
  // ══════════════════════════════════════════════════════════════════
  const addAlert = (message: string, type: 'success' | 'warning' | 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 3500);
  };

  // ══════════════════════════════════════════════════════════════════
  // UI
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative border-x border-slate-200">

      <Header lang={lang} setLang={setLang} />

      {/* Alert toasts */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-sm space-y-2">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`px-4 py-3 rounded-2xl shadow-lg text-sm font-bold text-white animate-scale-in ${
              alert.type === 'success' ? 'bg-emerald-500' :
              alert.type === 'warning' ? 'bg-rose-500'    : 'bg-indigo-500'
            }`}
          >
            {alert.message}
          </div>
        ))}
      </div>

      {/* Validating spinner */}
      {isValidating && (
        <div className="fixed top-20 right-4 z-[300] bg-violet-600 text-white
                        text-xs font-bold px-3 py-2 rounded-xl shadow-lg
                        flex items-center gap-2 animate-pulse">
          <i className="fas fa-spinner fa-spin"></i>
          Validating...
        </div>
      )}

      <main className="flex-1 pb-48">

        {activeScreen === 'cart' && (
          <CartScreen
            items={cartItems}
            isPending={!!pendingWeightChange}
            lang={lang}
            onRemoveItem={removeItem}
            fraudScore={fraudScore}
            liveWeight={liveWeight}
          />
        )}

        {activeScreen === 'list' && (
          <ShoppingListScreen
            list={shoppingList}
            setList={setShoppingList}
            lang={lang}
            products={products}
          />
        )}

        {activeScreen === 'nav' && (
          <NavigationScreen
            shoppingList={shoppingList}
            lang={lang}
            products={products}
          />
        )}

        {activeScreen === 'offers' && (
          <OffersScreen lang={lang} />
        )}

        {activeScreen === 'billing' && (
          <BillingScreen
            items={cartItems}
            clearCart={clearCart}
            lang={lang}
          />
        )}

      </main>

      <SimulationPanel
        onSendMessage={handleESP32Message}
        products={products}
      />

      <Navbar
        activeScreen={activeScreen}
        setActiveScreen={(s) => {
          setActiveScreen(s);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        cartCount={cartItems.length}
      />

    </div>
  );
};

export default App;
