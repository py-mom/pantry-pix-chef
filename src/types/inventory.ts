export type GroceryCategory = 
  | "produce"
  | "dairy"
  | "meat"
  | "bakery"
  | "frozen"
  | "pantry"
  | "beverages"
  | "snacks"
  | "asian"
  | "indian"
  | "mexican"
  | "mediterranean"
  | "other";

export const GROCERY_CATEGORIES: { value: GroceryCategory; label: string; store?: string }[] = [
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "meat", label: "Meat & Seafood" },
  { value: "bakery", label: "Bakery" },
  { value: "frozen", label: "Frozen" },
  { value: "pantry", label: "Pantry Staples" },
  { value: "beverages", label: "Beverages" },
  { value: "snacks", label: "Snacks" },
  { value: "asian", label: "Asian Groceries", store: "Asian grocery store" },
  { value: "indian", label: "Indian Groceries", store: "Indian grocery store" },
  { value: "mexican", label: "Mexican Groceries", store: "Mexican grocery store" },
  { value: "mediterranean", label: "Mediterranean", store: "Mediterranean store" },
  { value: "other", label: "Other" },
];

export interface InventoryItem {
  name: string;
  quantity: number;
  category?: GroceryCategory;
}

export interface ShoppingItem {
  name: string;
  quantity: number;
  category?: GroceryCategory;
}
