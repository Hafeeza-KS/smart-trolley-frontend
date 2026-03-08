import React, { useState, useRef, useEffect } from "react";
import { ShoppingListItem, Product, Language } from "../types";
import { TRANSLATIONS } from "../constants";
const OCR_API_URL = import.meta.env.VITE_OCR_API_URL as string;

interface ShoppingListScreenProps {
  list: ShoppingListItem[];
  setList: React.Dispatch<React.SetStateAction<ShoppingListItem[]>>;
  lang: Language;
  products: Product[];
}

const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({
  list,
  setList,
  lang,
  products
}) => {
  const t = (TRANSLATIONS[lang] || TRANSLATIONS.en) as any;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<{
  lat: number;
  lng: number;
} | null>(null);


  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categoryColors: Record<string, string> = {
    Snacks: "bg-orange-100 text-orange-600",
    Dairy: "bg-blue-100 text-blue-600",
    Beverages: "bg-pink-100 text-pink-600",
    Pantry: "bg-emerald-100 text-emerald-600"
  };

  useEffect(() => {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    },
    (error) => {
      console.warn("GPS error:", error.message);
    }
  );
}, []);


  useEffect(() => {
    if (query.trim().length > 0) {
      const filtered = products.filter((p) => {
        const localizedName = t.products[p.barcode] || p.name;
        return (
          localizedName.toLowerCase().includes(query.toLowerCase()) &&
          !list.some((item) => item.productId === p.barcode)
        );
      });
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, list, t, products]);


  const addItemWithGPS = (name: string, productId?: string) => {

  const newItem = {
    id: Date.now().toString(),
    name,
    completed: false,
    productId,
    gps: currentLocation
  };

  setList(prev => [...prev, newItem]);

};

  const handleAddItem = (product: Product | string) => {
    const name =
      typeof product === "string"
        ? product
        : t.products[product.barcode] || product.name;

    const productId =
      typeof product === "string" ? undefined : product.barcode;
      console.log("Adding:", name);
    addItemWithGPS(name, productId);

    setQuery("");
    setShowSuggestions(false);
  };

  const removeItem = (id: string) =>
    setList((prev) => prev.filter((i) => i.id !== id));

  const toggleItem = (id: string) =>
    setList((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, completed: !i.completed } : i
      )
    );

  const findMatchingProduct = (ocrText: string): Product | undefined => {
  const normalized = ocrText.toLowerCase().replace(/[^a-z]/g, "");

  return products.find(p =>
    normalized.includes(p.name.toLowerCase().replace(/[^a-z]/g, ""))
  );
};


  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${OCR_API_URL}/ocr`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    console.log("OCR Response:", data);

    data.items.forEach((item: string) => {
      const matchedProduct = findMatchingProduct(item);

      addItemWithGPS(
        matchedProduct ? matchedProduct.name : item,
        matchedProduct?.barcode   // 🔥 THIS LINE FIXES NAVIGATION
      );
    });

   
  };

  return (
    <div className="p-6 animate-fade-in pb-32">
      {/* Header */}
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
          {t.list_title}
        </h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
          {t.personal_planner}
        </p>
      </div>

      {/* Search + OCR */}
      <div className="relative mb-10" ref={wrapperRef}>
        <div className="relative group">

          {/* Search input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length > 0 && setShowSuggestions(true)}
            placeholder={t.hunter_placeholder}
            className="w-full glass border-2 border-white/50 rounded-[2rem]
                       pl-14 pr-14 py-5 text-sm font-bold
                       focus:outline-none focus:ring-8 focus:ring-violet-500/10
                       focus:border-violet-500 shadow-2xl"
          />

          {/* Left sparkle icon */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-violet-500">
            <i className="fas fa-sparkles animate-glow"></i>
          </div>

          {/* Camera icon inside input */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute right-6 top-1/2 -translate-y-1/2
                       text-slate-400 hover:text-violet-600"
          >
            <i className="fas fa-camera text-lg"></i>
          </button>

          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
        </div>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-[100] mt-3 w-full glass rounded-3xl shadow-lg overflow-hidden border-2 border-white">
            {suggestions.map((p) => {
              const localizedName = t.products[p.barcode] || p.name;
              return (
                <button
                  key={p.barcode}
                  onClick={() => handleAddItem(p)}
                  className="w-full flex items-center gap-4 px-6 py-4
                             hover:bg-violet-50 transition-colors
                             text-left border-b border-white/40"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center
                                text-xs shadow-sm ${
                                  categoryColors[p.category] ||
                                  "bg-slate-100 text-slate-600"
                                }`}
                  >
                    <i className="fas fa-plus"></i>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">
                      {localizedName}
                    </p>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">
                      {p.category} • ₹{p.price}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {list.length === 0 ? (
          <div className="text-center py-20 glass rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-black text-sm uppercase tracking-widest opacity-40">
              {t.list_empty}
            </p>
          </div>
        ) : (
          list.map((item) => {
            const displayName = item.productId
              ? t.products[item.productId] || item.name
              : item.name;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-5 rounded-[2rem] transition-all ${
                  item.completed
                    ? "bg-emerald-50 opacity-60"
                    : "glass shadow-sm"
                }`}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    item.completed
                      ? "bg-emerald-500 text-white shadow-lg"
                      : "bg-slate-100 text-slate-300"
                  }`}
                >
                  <i
                    className={`fas ${
                      item.completed ? "fa-check" : "fa-circle-dot"
                    } text-xs`}
                  ></i>
                </button>

                <div className="flex-1">
                  <span
                    className={`text-base font-black block ${
                      item.completed
                        ? "line-through text-slate-400"
                        : "text-slate-800"
                    }`}
                  >
                    {displayName}
                  </span>

                  {item.gps && !item.completed && (
                    <span className="text-[9px] font-black uppercase text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                      {t.gps_linked}
                    </span>
                  )}

                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="text-slate-300 hover:text-rose-500 p-3"
                >
                  <i className="fas fa-trash-can text-sm"></i>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ShoppingListScreen;