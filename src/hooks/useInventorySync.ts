import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InventoryItem, ShoppingItem, GroceryCategory } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";

// ─── Shared fuzzy match (mirrors logic in Index.tsx) ─────────────────────────
// Returns true if a and b are close enough to be considered the same item.
// e.g. "Whole Milk" matches "milk", "olive oil" matches "Olive Oil (extra virgin)"
const fuzzyMatch = (a: string, b: string): boolean =>
  a.toLowerCase().includes(b.toLowerCase()) ||
  b.toLowerCase().includes(a.toLowerCase());

export const useInventorySync = (userId: string | undefined) => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // ── Fetch inventory ─────────────────────────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching inventory:", error);
      return;
    }

    setInventoryItems(
      data.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        category: item.category as GroceryCategory,
      }))
    );
  }, [userId]);

  // ── Fetch shopping list ─────────────────────────────────────────────────────
  const fetchShoppingList = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("shopping_list_items")
      .select("*")
      .eq("user_id", userId)
      .order("bought", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching shopping list:", error);
      return;
    }

    setShoppingList(
      data.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        category: item.category as GroceryCategory,
        bought: item.bought ?? false,
      }))
    );
  }, [userId]);

  // ── Load on mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInventory(), fetchShoppingList()]);
      setLoading(false);
    };

    loadData();
  }, [userId, fetchInventory, fetchShoppingList]);

  // ── Add to inventory (safe: fuzzy dedup, never deletes) ─────────────────────
  // Used by both manual adds and the "Build Inventory" camera mode.
  // If an item fuzzy-matches an existing one, quantity is incremented instead.
  const addToInventory = async (
    name: string,
    quantity: number = 1,
    category?: GroceryCategory
  ) => {
    if (!userId) return;

    const existingIndex = inventoryItems.findIndex((i) => fuzzyMatch(i.name, name));

    if (existingIndex >= 0) {
      // Item already exists — bump quantity
      const existing = inventoryItems[existingIndex];
      const newQuantity = existing.quantity + quantity;

      const { error } = await supabase
        .from("inventory_items")
        .update({ quantity: newQuantity, category: category || existing.category })
        .eq("id", existing.id);

      if (error) {
        console.error("Error updating inventory:", error);
        return;
      }

      const updated = [...inventoryItems];
      updated[existingIndex] = {
        ...existing,
        quantity: newQuantity,
        category: category || existing.category,
      };
      setInventoryItems(updated);
    } else {
      // New item — insert
      const { data, error } = await supabase
        .from("inventory_items")
        .insert({
          user_id: userId,
          name,
          quantity,
          category: category || "Other",
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding to inventory:", error);
        return;
      }

      setInventoryItems((prev) => [
        { id: data.id, name: data.name, quantity: data.quantity, category: data.category as GroceryCategory },
        ...prev,
      ]);
    }
  };

  // ── Update inventory item ───────────────────────────────────────────────────
  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    if (!userId) return;

    const { error } = await supabase
      .from("inventory_items")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Error updating inventory item:", error);
      return;
    }

    setInventoryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // ── Remove from inventory ───────────────────────────────────────────────────
  const removeFromInventory = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing from inventory:", error);
      return;
    }

    setInventoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  // ── Add to shopping list ────────────────────────────────────────────────────
  const addToShoppingList = async (
    name: string,
    quantity: number = 1,
    category?: GroceryCategory
  ) => {
    if (!userId) return;

    const existingIndex = shoppingList.findIndex((i) => fuzzyMatch(i.name, name));

    if (existingIndex >= 0) {
      const existing = shoppingList[existingIndex];
      const newQuantity = existing.quantity + quantity;

      const { error } = await supabase
        .from("shopping_list_items")
        .update({ quantity: newQuantity, category: category || existing.category })
        .eq("id", existing.id);

      if (error) {
        console.error("Error updating shopping list:", error);
        return;
      }

      const updated = [...shoppingList];
      updated[existingIndex] = { ...existing, quantity: newQuantity, category: category || existing.category };
      setShoppingList(updated);
    } else {
      const { data, error } = await supabase
        .from("shopping_list_items")
        .insert({
          user_id: userId,
          name,
          quantity,
          category: category || "Other",
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding to shopping list:", error);
        return;
      }

      setShoppingList((prev) => [
        {
          id: data.id,
          name: data.name,
          quantity: data.quantity,
          category: data.category as GroceryCategory,
          bought: false,
        },
        ...prev,
      ]);
    }
  };

  // ── Update shopping item ────────────────────────────────────────────────────
  const updateShoppingItem = async (id: string, updates: Partial<ShoppingItem>) => {
    if (!userId) return;

    const { error } = await supabase
      .from("shopping_list_items")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Error updating shopping item:", error);
      return;
    }

    setShoppingList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // ── Remove from shopping list ───────────────────────────────────────────────
  const removeFromShoppingList = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing from shopping list:", error);
      return;
    }

    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  };

  // ── Toggle bought ───────────────────────────────────────────────────────────
  const markAsBought = async (id: string) => {
    if (!userId) return;

    const item = shoppingList.find((i) => i.id === id);
    if (!item) return;

    const newBoughtStatus = !item.bought;

    const { error } = await supabase
      .from("shopping_list_items")
      .update({ bought: newBoughtStatus })
      .eq("id", id);

    if (error) {
      console.error("Error toggling bought status:", error);
      return;
    }

    setShoppingList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, bought: newBoughtStatus } : i))
    );

    toast({
      title: newBoughtStatus ? "Item checked off!" : "Item unchecked",
      description: newBoughtStatus ? "Tap again to uncheck." : "Item restored to list.",
    });
  };

  // ── Bulk add missing items to shopping list (fuzzy dedup) ──────────────────
  // Called after the user confirms the missing items modal in Index.tsx,
  // and by "Send all staples to shopping list".
  //
  // Logic:
  //   - If item fuzzy-matches a BOUGHT item → uncheck it (bought = false)
  //   - If item fuzzy-matches an UNBOUGHT item → skip (already active on list)
  //   - If item doesn't exist at all → insert as new
  const addMissingItemsToShoppingList = async (items: string[]) => {
    if (!userId || items.length === 0) return 0;

    let addedOrRestored = 0;

    // ── Step 1: uncheck any bought items that match ────────────────────────
    const boughtMatches = shoppingList.filter(
      (existing) => existing.bought && items.some((item) => fuzzyMatch(existing.name, item))
    );

    for (const match of boughtMatches) {
      const { error } = await supabase
        .from("shopping_list_items")
        .update({ bought: false })
        .eq("id", match.id);

      if (!error) {
        setShoppingList((prev) =>
          prev.map((i) => (i.id === match.id ? { ...i, bought: false } : i))
        );
        addedOrRestored++;
      }
    }

    // ── Step 2: insert items that aren't on the list at all ───────────────
    const newItems = items.filter(
      (item) => !shoppingList.some((existing) => fuzzyMatch(existing.name, item))
    );

    if (newItems.length === 0) return addedOrRestored;

    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert(
        newItems.map((name) => ({
          user_id: userId,
          name,
          quantity: 1,
          category: "Other",
        }))
      )
      .select();

    if (error) {
      console.error("Error adding missing items:", error);
      return addedOrRestored;
    }

    const newShoppingItems: ShoppingItem[] = data.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      category: item.category as GroceryCategory,
      bought: false, // ← was missing before, caused undefined bought status
    }));

    setShoppingList((prev) => [...newShoppingItems, ...prev]);

    return addedOrRestored + newItems.length;
  };

  // 25002500 Reset shopping list (delete all items) 25002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500
  const resetShoppingList = async () => {
    if (!userId) return false;
    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("user_id", userId);
    if (error) { console.error("Error resetting shopping list:", error); return false; }
    setShoppingList([]);
    return true;
  };

  };

  // ── replaceInventory: DEPRECATED ───────────────────────────────────────────
  // Kept so nothing breaks if called elsewhere, but no longer called by the
  // main flow. Build mode uses addToInventory() incrementally instead.
  // Weekly scan diff is handled in Index.tsx using inventoryItems state directly.
  const replaceInventory = async (items: string[]) => {
    if (!userId) return;

    const previousNames = inventoryItems.map((i) => i.name.toLowerCase());

    await supabase.from("inventory_items").delete().eq("user_id", userId);

    if (items.length > 0) {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert(
          items.map((name) => ({
            user_id: userId,
            name,
            quantity: 1,
            category: "Other",
          }))
        )
        .select();

      if (error) {
        console.error("Error replacing inventory:", error);
        return { missingItems: [] };
      }

      setInventoryItems(
        data.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          category: item.category as GroceryCategory,
        }))
      );
    } else {
      setInventoryItems([]);
    }

    const missingItems = previousNames.filter(
      (prev) => !items.some((curr) => fuzzyMatch(curr, prev))
    );

    return { missingItems, hadPreviousInventory: previousNames.length > 0 };
  };

  return {
    inventoryItems,
    shoppingList,
    loading,
    addToInventory,
    updateInventoryItem,
    removeFromInventory,
    addToShoppingList,
    updateShoppingItem,
    removeFromShoppingList,
    markAsBought,
    addMissingItemsToShoppingList,
    replaceInventory, // deprecated but kept for safety
    resetShoppingList,
    refetch: () => Promise.all([fetchInventory(), fetchShoppingList()]),
  };
};
