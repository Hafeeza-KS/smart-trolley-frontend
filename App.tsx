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

const App: React.FC = () => {

  const [activeScreen, setActiveScreen] = useState<Screen>('cart');
  const [lang, setLang] = useState<Language>('en');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [pendingWeightChange, setPendingWeightChange] =
    useState<{ weight: number, timestamp: number } | null>(null);
  const [alerts, setAlerts] = useState<
    { id: string, message: string, type: 'success' | 'warning' | 'info' }[]
  >([]);
  const [products, setProducts] = useState<Product[]>([]);

  const t = TRANSLATIONS[lang];

  // ----------------------------------
  // FETCH CART FROM SUPABASE
  // ----------------------------------
  useEffect(() => {

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
        .order("added_at", { ascending: true });

      if (error) {
        console.error("Cart fetch error:", error);
        return;
      }

      const formatted: CartItem[] = data.map((item: any) => ({
        id: item.id,
        barcode: item.products?.barcode,
        name: item.products?.name,
        price: item.products?.price,
        weight: item.expected_weight,
        status: item.status === "SCANNED"
          ? ItemStatus.SCANNED
          : ItemStatus.UNSCANNED,
        timestamp: item.added_at
      }));

      setCartItems(formatted);
    };

    fetchCart();

  }, []);

  // ----------------------------------
  // REALTIME CART UPDATE
  // ----------------------------------
  useEffect(() => {

    const channel = supabase
      .channel("cart-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cart" },
        async (payload) => {

          const { data: product } = await supabase
            .from("products")
            .select("name, price, barcode")
            .eq("id", payload.new.product_id)
            .single();

          const newItem: CartItem = {
            id: payload.new.id,
            barcode: product?.barcode,
            name: product?.name,
            price: product?.price,
            weight: payload.new.expected_weight,
            status: payload.new.status === "SCANNED"
              ? ItemStatus.SCANNED
              : ItemStatus.UNSCANNED,
            timestamp: payload.new.added_at
          };

          setCartItems(prev => [...prev, newItem]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, []);

  // ----------------------------------
  // MANUAL REMOVE ITEM
  // ----------------------------------
  const removeItem = (id: string) => {

    setCartItems(prev => {

      const item = prev.find(i => i.id === id);

      if (!item) return prev;

      addAlert(`${item.name} Removed`, "info");

      return prev.filter(i => i.id !== id);

    });

  };

  // ----------------------------------
  // REMOVE ITEM BY WEIGHT
  // ----------------------------------
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

        addAlert(`${removed.name} Removed`, 'info');

        return newList;
      }

      addAlert(`Item of ${weight}g removed.`, 'warning');

      return prev;

    });

  };

  // ----------------------------------
  // ADD SCANNED ITEM
  // ----------------------------------
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

    addAlert(`${product.name} Verified`, 'success');

  };

  // ----------------------------------
  // ESP MESSAGE HANDLER
  // ----------------------------------
  const handleESP32Message = useCallback((msg: ESP32Message) => {

    const { barcode, weight_change } = msg;

    if (weight_change > 0) {

      if (barcode) {

        const product = products.find(p => p.barcode === barcode);

        addScannedItem(product, weight_change);

      } else {

        setPendingWeightChange({
          weight: weight_change,
          timestamp: Date.now()
        });

        addAlert("Weight detected. Waiting for scan...", 'info');

      }

    }
    else if (weight_change < 0) {

      handleItemRemoval(Math.abs(weight_change));

    }
    else if (barcode && !weight_change) {

      if (pendingWeightChange) {

        const product = products.find(p => p.barcode === barcode);

        addScannedItem(product, pendingWeightChange.weight);

        setPendingWeightChange(null);

      } else {

        addAlert("Scan detected. Place item in trolley.", "warning");

      }

    }

  }, [pendingWeightChange, products]);

  // ----------------------------------
  // ALERT HANDLER
  // ----------------------------------
  const addAlert = (
    message: string,
    type: 'success' | 'warning' | 'info'
  ) => {

    const id = Math.random().toString(36).substr(2, 9);

    setAlerts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 3500);

  };

  // ----------------------------------
  // FETCH PRODUCTS
  // ----------------------------------
  useEffect(() => {

    const fetchProducts = async () => {

      const { data, error } = await supabase
        .from("products")
        .select("*");

      if (error) {
        console.error("Error fetching products:", error);
        return;
      }

      const formattedProducts = data.map((p: any) => ({
        barcode: p.barcode,
        name: p.name,
        price: p.price,
        weight: p.weight,
        category: p.category,
        location: {
          x: p.location_x,
          y: p.location_y,
          zone: p.zone
        }
      }));

      setProducts(formattedProducts);

    };

    fetchProducts();

  }, []);

  // ----------------------------------
  // UI
  // ----------------------------------
  return (

    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative border-x border-slate-200">

      <Header lang={lang} setLang={setLang} />

      <main className="flex-1 pb-48">

        {activeScreen === 'cart' && (
          <CartScreen
            items={cartItems}
            isPending={!!pendingWeightChange}
            lang={lang}
            onRemoveItem={removeItem}
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
            clearCart={() => setCartItems([])}
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
