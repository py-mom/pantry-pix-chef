import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InventoryItem, ShoppingItem, GroceryCategory } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";

export const useInventorySync = (userId: string | undefined) => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch inventory items from Supabase
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

  // Fetch shopping list from Supabase
  const fetchShoppingList = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("shopping_list_items")
      .select("*")
      .eq("user_id", userId)
      .eq("bought", false)
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
        bought: item.bought,
      }))
    );
  }, [userId]);

  // Load data on mount
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

  // Add to inventory
  const addToInventory = async (
    name: string,
    quantity: number = 1,
    category?: GroceryCategory
  ) => {
    if (!userId) return;

    // Check if item exists
    const existingIndex = inventoryItems.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );

    if (existingIndex >= 0) {
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
      updated[existingIndex] = { ...existing, quantity: newQuantity, category: category || existing.category };
      setInventoryItems(updated);
    } else {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert({
          user_id: userId,
          name,
          quantity,
          category: category || "produce",
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding to inventory:", error);
        return;
      }

      setInventoryItems([
        { id: data.id, name: data.name, quantity: data.quantity, category: data.category as GroceryCategory },
        ...inventoryItems,
      ]);
    }
  };

  // Update inventory item
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

    setInventoryItems(
      inventoryItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  // Remove from inventory
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

    setInventoryItems(inventoryItems.filter((item) => item.id !== id));
  };

  // Add to shopping list
  const addToShoppingList = async (
    name: string,
    quantity: number = 1,
    category?: GroceryCategory
  ) => {
    if (!userId) return;

    const existingIndex = shoppingList.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );

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
          category: category || "produce",
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding to shopping list:", error);
        return;
      }

      setShoppingList([
        { id: data.id, name: data.name, quantity: data.quantity, category: data.category as GroceryCategory },
        ...shoppingList,
      ]);
    }
  };

  // Update shopping item
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

    setShoppingList(
      shoppingList.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  // Remove from shopping list
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

    setShoppingList(shoppingList.filter((item) => item.id !== id));
  };

  // Mark as bought (delete from shopping list)
  const markAsBought = async (id: string) => {
    await removeFromShoppingList(id);
    toast({
      title: "Item purchased!",
      description: "Item removed from shopping list.",
    });
  };

  // Bulk add to shopping list (for missing items detection)
  const addMissingItemsToShoppingList = async (items: string[]) => {
    if (!userId || items.length === 0) return;

    const currentNames = shoppingList.map((i) => i.name.toLowerCase());
    const newItems = items.filter(
      (item) => !currentNames.includes(item.toLowerCase())
    );

    if (newItems.length === 0) return;

    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert(
        newItems.map((name) => ({
          user_id: userId,
          name,
          quantity: 1,
          category: "produce",
        }))
      )
      .select();

    if (error) {
      console.error("Error adding missing items:", error);
      return;
    }

    const newShoppingItems = data.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      category: item.category as GroceryCategory,
    }));

    setShoppingList([...newShoppingItems, ...shoppingList]);

    return newItems.length;
  };

  // Replace entire inventory (for camera scan)
  const replaceInventory = async (items: string[]) => {
    if (!userId) return;

    // Get previous inventory for comparison
    const previousNames = inventoryItems.map((i) => i.name.toLowerCase());

    // Delete all existing inventory
    await supabase.from("inventory_items").delete().eq("user_id", userId);

    // Insert new items
    if (items.length > 0) {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert(
          items.map((name) => ({
            user_id: userId,
            name,
            quantity: 1,
            category: "produce",
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

    // Find missing items
    const missingItems = previousNames.filter(
      (prev) =>
        !items.some(
          (curr) =>
            curr.toLowerCase().includes(prev) ||
            prev.includes(curr.toLowerCase())
        )
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
    replaceInventory,
    refetch: () => Promise.all([fetchInventory(), fetchShoppingList()]),
  };
};
