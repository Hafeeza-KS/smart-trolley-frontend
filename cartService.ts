import { supabase } from "../supabaseClient"
import { CartItem, ItemStatus } from "../types"

export async function fetchCartItems(): Promise<CartItem[]> {

  const { data, error } = await supabase
    .from("cart")
    .select("*")
    .order("added_at", { ascending: true })

  if (error) {
    console.error("Error fetching cart:", error)
    return []
  }

  // Convert DB fields → CartScreen fields
  return data.map(item => ({
    id: item.id,
    barcode: item.product_id,
    name: item.product_id,
    price: 45, // demo price
    weight: item.expected_weight,
    status: item.status === "SCANNED" ? ItemStatus.SCANNED : ItemStatus.UNSCANNED,
    timestamp: item.added_at
  }))
}