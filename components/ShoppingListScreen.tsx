import React, { useState, useRef, useEffect } from "react";
import { ShoppingListItem, Product, Language } from "../types";
import { MOCK_PRODUCTS, TRANSLATIONS } from "../constants";

interface ShoppingListScreenProps {
  list: ShoppingListItem[];
  setList: React.Dispatch<React.SetStateAction<ShoppingListItem[]>>;
  lang: Language;
}

const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({
  list,
  setList,
  lang,
}) => {
  const t = (TRANSLATIONS[lang] || TRANSLATIONS.en) as any;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categoryColors: Record<string, string> = {
    Snacks: "bg-orange-100 text-orange-600",
    Dairy: "bg-blue-100 text-blue-600",
    Beverages: "bg-pink-100 text-pink-600",
    Pantry: "bg-emerald-100 text-emerald-600",
  };

  /* ---------------- SEARCH SUGGESTIONS ---------------- */
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = MOCK_PRODUCTS.filter((p) => {
      const name = (t.products[p.barcode] || p.name).toLowerCase();
      return (
        name.includes(query.toLowerCase()) &&
        !list.some((i) => i.productId === p.barcode)
      );
    });

    setSuggestions(filtered);
    setShowSuggestions(true);
  }, [query, list, t]);

  /* ---------------- ADD ITEM ---------------- */
  const handleAddItem = (product: Product | string) => {
    const name =
      typeof product === "string"
        ? product
        : t.products[product.barcode] || product.name;

    const productId =
      typeof product === "string" ? undefined : product.barcode;

    setList((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name,
        completed: false,
        productId,
      },
    ]);

    setQuery("");
    setShowSuggestions(false);
  };

  const toggleItem = (id: string) =>
    setList((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, completed: !i.completed } : i
      )
    );

  const removeItem = (id: string) =>
    setList((prev) => prev.filter((i) => i.id !== id));

  /* ---------------- OCR IMAGE UPLOAD ---------------- */
const handleImageUpload = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  const OCR_API_URL = import.meta.env.VITE_OCR_API_URL as string;

  try {
    const response = await fetch(`${OCR_API_URL}/ocr`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error("OCR request failed");
      return;
    }

    const data = await response.json();

    setList((prev) => [
      ...prev,
      ...data.items.map((item: string) => ({
        id: Date.now().toString() + Math.random(),
        name: item,
        completed: false,
        productId: undefined,
      })),
    ]);
  } catch (err) {
    console.error("OCR error:", err);
  }
};


  /* ---------------- UI ---------------- */
  return (
    <div className="p-6 pb-32 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black">{t.list_title}</h2>
        <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">
          {t.personal_planner}
        </p>
      </div>

      {/* SEARCH INPUT */}
      <div className="relative mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.hunter_placeholder}
          className="w-full glass rounded-[2rem] pl-14 pr-14 py-5 font-bold shadow-2xl"
        />

        {/* Left icon */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-violet-500">
          <i className="fas fa-sparkles"></i>
        </div>

        {/* Camera icon */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600"
        >
          <i className="fas fa-camera text-lg"></i>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleImageUpload}
        />

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute w-full mt-3 bg-white rounded-2xl shadow-xl overflow-hidden z-50">
            {suggestions.map((p) => (
              <button
                key={p.barcode}
                onClick={() => handleAddItem(p)}
                className="w-full flex gap-4 p-4 hover:bg-violet-50"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    categoryColors[p.category]
                  }`}
                >
                  <i className="fas fa-plus"></i>
                </div>
                <div className="text-left">
                  <p className="font-black">
                    {t.products[p.barcode] || p.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {p.category} • ₹{p.price}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {list.length === 0 ? (
          <p className="text-center text-slate-400">{t.list_empty}</p>
        ) : (
          list.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 p-5 rounded-2xl ${
                item.completed ? "bg-emerald-50" : "glass"
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className={`w-10 h-10 rounded-xl ${
                  item.completed
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100"
                }`}
              >
                <i className="fas fa-check"></i>
              </button>

              <div className="flex-1">
                <p
                  className={`font-black ${
                    item.completed ? "line-through text-slate-400" : ""
                  }`}
                >
                  {item.name}
                </p>

                {item.productId && !item.completed && (
                  <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                    GPS LINKED
                  </span>
                )}
              </div>

              <button
                onClick={() => removeItem(item.id)}
                className="text-slate-300 hover:text-rose-500"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShoppingListScreen;
