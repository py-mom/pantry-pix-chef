import { useState, useMemo } from "react";
import { Plus, Trash2, Check, ShoppingCart, Package, Star, ChevronDown, ChevronRight, Minus, Pencil, ArrowUpDown, Store, Filter, Share2, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { InventoryItem, ShoppingItem, GroceryCategory, GROCERY_CATEGORIES } from "@/types/inventory";

type SortOption = "name" | "category" | "quantity";

interface InventoryListProps {
  inventoryItems: InventoryItem[];
  shoppingList: ShoppingItem[];
  weeklyStaples: string[];
  onAddToShoppingList: (item: string, quantity?: number, category?: GroceryCategory) => void;
  onRemoveFromShoppingList: (index: number) => void;
  onUpdateShoppingItem: (index: number, updates: Partial<ShoppingItem>) => void;
  onRemoveFromInventory: (index: number) => void;
  onAddToInventory: (item: string, quantity?: number, category?: GroceryCategory) => void;
  onUpdateInventoryItem: (index: number, updates: Partial<InventoryItem>) => void;
  onMarkAsBought: (index: number) => void;
  onAddWeeklyStaple: (item: string) => void;
  onRemoveWeeklyStaple: (item: string) => void;
  onAddAllStaplesToShoppingList: () => void;
}

const InventoryList = ({
  inventoryItems,
  shoppingList,
  weeklyStaples,
  onAddToShoppingList,
  onRemoveFromShoppingList,
  onUpdateShoppingItem,
  onRemoveFromInventory,
  onAddToInventory,
  onUpdateInventoryItem,
  onMarkAsBought,
  onAddWeeklyStaple,
  onRemoveWeeklyStaple,
  onAddAllStaplesToShoppingList,
}: InventoryListProps) => {
  const { toast } = useToast();
  const [newItem, setNewItem] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<GroceryCategory>("other");
  const [newInventoryItem, setNewInventoryItem] = useState("");
  const [newInventoryCategory, setNewInventoryCategory] = useState<GroceryCategory>("other");
  const [newStaple, setNewStaple] = useState("");
  const [staplesOpen, setStaplesOpen] = useState(false);
  const [editingShoppingIndex, setEditingShoppingIndex] = useState<number | null>(null);
  const [editingShoppingValue, setEditingShoppingValue] = useState("");
  const [inventorySortBy, setInventorySortBy] = useState<SortOption>("name");
  const [shoppingSortBy, setShoppingSortBy] = useState<SortOption>("category");
  const [inventoryFilter, setInventoryFilter] = useState<GroceryCategory | "all">("all");
  const [shoppingFilter, setShoppingFilter] = useState<GroceryCategory | "all">("all");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Common weekly staples that users can quickly add
  const commonStaples = [
    "milk", "bread", "eggs", "bananas", "chicken", "rice", "pasta", "onions",
    "tomatoes", "cheese", "yogurt", "butter", "olive oil", "salt", "pepper",
    "garlic", "carrots", "apples", "oats", "peanut butter"
  ];

  const handleAddItem = () => {
    if (newItem.trim()) {
      onAddToShoppingList(newItem.trim(), 1, newItemCategory);
      setNewItem("");
      setNewItemCategory("other");
    }
  };

  const handleAddInventoryItem = () => {
    if (newInventoryItem.trim()) {
      onAddToInventory(newInventoryItem.trim(), 1, newInventoryCategory);
      setNewInventoryItem("");
      setNewInventoryCategory("other");
    }
  };

  const getCategoryLabel = (category?: GroceryCategory) => {
    if (!category) return "Other";
    return GROCERY_CATEGORIES.find(c => c.value === category)?.label || "Other";
  };

  const getCategoryStore = (category?: GroceryCategory) => {
    if (!category) return null;
    return GROCERY_CATEGORIES.find(c => c.value === category)?.store || null;
  };

  const sortItems = <T extends InventoryItem | ShoppingItem>(items: T[], sortBy: SortOption): T[] => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "category":
          return (a.category || "other").localeCompare(b.category || "other");
        case "quantity":
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });
  };

  const filteredInventory = useMemo(() => {
    if (inventoryFilter === "all") return inventoryItems;
    return inventoryItems.filter(item => (item.category || "other") === inventoryFilter);
  }, [inventoryItems, inventoryFilter]);

  const filteredShopping = useMemo(() => {
    if (shoppingFilter === "all") return shoppingList;
    return shoppingList.filter(item => (item.category || "other") === shoppingFilter);
  }, [shoppingList, shoppingFilter]);

  const sortedInventory = useMemo(() => sortItems(filteredInventory, inventorySortBy), [filteredInventory, inventorySortBy]);
  const sortedShopping = useMemo(() => sortItems(filteredShopping, shoppingSortBy), [filteredShopping, shoppingSortBy]);

  // Group shopping items by store for better planning
  const shoppingByStore = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    shoppingList.forEach(item => {
      const store = getCategoryStore(item.category) || "Regular grocery store";
      if (!groups[store]) groups[store] = [];
      groups[store].push(item);
    });
    return groups;
  }, [shoppingList]);

  // Get unique categories in use for filter options
  const usedInventoryCategories = useMemo(() => {
    const cats = new Set<GroceryCategory>();
    inventoryItems.forEach(item => cats.add(item.category || "other"));
    return Array.from(cats);
  }, [inventoryItems]);

  const usedShoppingCategories = useMemo(() => {
    const cats = new Set<GroceryCategory>();
    shoppingList.forEach(item => cats.add(item.category || "other"));
    return Array.from(cats);
  }, [shoppingList]);

  // Generate shareable shopping list text
  const generateShareText = () => {
    if (shoppingList.length === 0) return "Shopping list is empty";
    
    const groupedByStore: Record<string, ShoppingItem[]> = {};
    shoppingList.forEach(item => {
      const store = getCategoryStore(item.category) || "Regular grocery store";
      if (!groupedByStore[store]) groupedByStore[store] = [];
      groupedByStore[store].push(item);
    });

    let text = "🛒 Shopping List\n\n";
    Object.entries(groupedByStore).forEach(([store, items]) => {
      text += `📍 ${store}\n`;
      items.forEach(item => {
        text += `  • ${item.name} (x${item.quantity})\n`;
      });
      text += "\n";
    });
    return text.trim();
  };

  const handleCopyToClipboard = async () => {
    const text = generateShareText();
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Shopping list copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const text = generateShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Shopping List",
          text: text,
        });
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== "AbortError") {
          handleCopyToClipboard();
        }
      }
    } else {
      handleCopyToClipboard();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  const handleInventoryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddInventoryItem();
    }
  };

  const handleAddStaple = () => {
    if (newStaple.trim() && !weeklyStaples.includes(newStaple.trim())) {
      onAddWeeklyStaple(newStaple.trim());
      setNewStaple("");
    }
  };

  const handleStapleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddStaple();
    }
  };

  const addCommonStaple = (staple: string) => {
    if (!weeklyStaples.includes(staple)) {
      onAddWeeklyStaple(staple);
    }
  };

  const startEditingShopping = (index: number, currentName: string) => {
    setEditingShoppingIndex(index);
    setEditingShoppingValue(currentName);
  };

  const saveShoppingEdit = () => {
    if (editingShoppingIndex !== null && editingShoppingValue.trim()) {
      onUpdateShoppingItem(editingShoppingIndex, { name: editingShoppingValue.trim() });
    }
    setEditingShoppingIndex(null);
    setEditingShoppingValue("");
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveShoppingEdit();
    } else if (e.key === 'Escape') {
      setEditingShoppingIndex(null);
      setEditingShoppingValue("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Weekly Staples Section */}
      <Card className="shadow-soft">
        <Collapsible open={staplesOpen} onOpenChange={setStaplesOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-accent" />
                Weekly Staples
                {weeklyStaples.length > 0 && (
                  <Badge variant="outline" className="ml-auto mr-2">
                    {weeklyStaples.length} items
                  </Badge>
                )}
                {staplesOpen ? (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronRight className="h-4 w-4 ml-auto" />
                )}
              </CardTitle>
              <CardDescription>
                Items that should always be on your shopping list
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Add custom staple */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom weekly staple..."
                  value={newStaple}
                  onChange={(e) => setNewStaple(e.target.value)}
                  onKeyPress={handleStapleKeyPress}
                  className="flex-1"
                />
                <Button onClick={handleAddStaple} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Common staples - quick add */}
              <div>
                <h4 className="font-medium text-sm mb-3">Quick Add Common Staples:</h4>
                <div className="flex flex-wrap gap-2">
                  {commonStaples
                    .filter(staple => !weeklyStaples.includes(staple))
                    .map((staple) => (
                    <Button
                      key={staple}
                      size="sm"
                      variant="outline"
                      onClick={() => addCommonStaple(staple)}
                      className="h-8 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {staple}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Current weekly staples */}
              {weeklyStaples.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Your Weekly Staples:</h4>
                    <Button
                      onClick={onAddAllStaplesToShoppingList}
                      size="sm"
                      className="h-8 text-xs"
                      variant="default"
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Add All to Shopping List
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {weeklyStaples.map((staple, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-accent/10 rounded-lg"
                      >
                        <span className="text-sm font-medium">{staple}</span>
                        <Button
                          onClick={() => onRemoveWeeklyStaple(staple)}
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Main inventory grid */}
      <div className="grid gap-6 md:grid-cols-2">
      {/* Current Inventory */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Current Inventory
          </CardTitle>
          <CardDescription className="flex items-center justify-between flex-wrap gap-2">
            <span>Items in your pantry</span>
            <div className="flex items-center gap-2">
              <Select value={inventoryFilter} onValueChange={(v) => setInventoryFilter(v as GroceryCategory | "all")}>
                <SelectTrigger className="w-28 h-7 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {usedInventoryCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={inventorySortBy} onValueChange={(v) => setInventorySortBy(v as SortOption)}>
                <SelectTrigger className="w-28 h-7 text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">By Name</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                  <SelectItem value="quantity">By Quantity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardDescription>
          {inventoryFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInventoryFilter("all")}
              className="h-6 text-xs mt-1"
            >
              <X className="h-3 w-3 mr-1" />
              Clear filter: {getCategoryLabel(inventoryFilter)}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual add inventory item */}
          <div className="flex gap-2">
            <Input
              placeholder="Add item..."
              value={newInventoryItem}
              onChange={(e) => setNewInventoryItem(e.target.value)}
              onKeyPress={handleInventoryKeyPress}
              className="flex-1"
            />
            <Select value={newInventoryCategory} onValueChange={(v) => setNewInventoryCategory(v as GroceryCategory)}>
              <SelectTrigger className="w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROCERY_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddInventoryItem} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {sortedInventory.length > 0 ? (
            <div className="space-y-2">
              {sortedInventory.map((item, index) => {
                const originalIndex = inventoryItems.findIndex(i => i.name === item.name && i.quantity === item.quantity);
                const isInShoppingList = shoppingList.some(
                  listItem => listItem.name.toLowerCase() === item.name.toLowerCase()
                );
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryLabel(item.category)}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => onUpdateInventoryItem(originalIndex, { quantity: Math.max(1, item.quantity - 1) })}
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Badge variant="outline" className="min-w-[2rem] justify-center">
                          {item.quantity}
                        </Badge>
                        <Button
                          onClick={() => onUpdateInventoryItem(originalIndex, { quantity: item.quantity + 1 })}
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={item.category || "other"} 
                        onValueChange={(v) => onUpdateInventoryItem(originalIndex, { category: v as GroceryCategory })}
                      >
                        <SelectTrigger className="w-24 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GROCERY_CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => onAddToShoppingList(item.name, 1, item.category)}
                        size="sm"
                        variant="ghost"
                        disabled={isInShoppingList}
                        className="h-8 text-xs hover:bg-accent hover:text-accent-foreground"
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {isInShoppingList ? "Added" : "Add"}
                      </Button>
                      <Button
                        onClick={() => onRemoveFromInventory(originalIndex)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No inventory yet. Take a photo or add items manually!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shopping List */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-accent" />
            Shopping List
            {shoppingList.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {shoppingList.length} items
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="flex items-center justify-between flex-wrap gap-2">
            <span>Items you need to buy</span>
            <div className="flex items-center gap-2">
              <Select value={shoppingFilter} onValueChange={(v) => setShoppingFilter(v as GroceryCategory | "all")}>
                <SelectTrigger className="w-28 h-7 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {usedShoppingCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={shoppingSortBy} onValueChange={(v) => setShoppingSortBy(v as SortOption)}>
                <SelectTrigger className="w-28 h-7 text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">By Name</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                  <SelectItem value="quantity">By Quantity</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={shoppingList.length === 0}>
                    <Share2 className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Shopping List</DialogTitle>
                    <DialogDescription>
                      Copy or share your shopping list organized by store
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    readOnly
                    value={generateShareText()}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={handleCopyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardDescription>
          {shoppingFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShoppingFilter("all")}
              className="h-6 text-xs mt-1"
            >
              <X className="h-3 w-3 mr-1" />
              Clear filter: {getCategoryLabel(shoppingFilter)}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new item */}
          <div className="flex gap-2">
            <Input
              placeholder="Add item..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Select value={newItemCategory} onValueChange={(v) => setNewItemCategory(v as GroceryCategory)}>
              <SelectTrigger className="w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROCERY_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddItem} size="icon" variant="warm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Store grouping summary */}
          {Object.keys(shoppingByStore).length > 1 && (
            <div className="p-3 bg-accent/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-4 w-4 text-accent" />
                <span className="font-medium text-sm">Stores to visit:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(shoppingByStore).map(([store, items]) => (
                  <Badge key={store} variant="outline" className="text-xs">
                    {store} ({items.length})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Shopping list items */}
          {sortedShopping.length > 0 ? (
            <div className="space-y-2">
              {sortedShopping.map((item, index) => {
                const originalIndex = shoppingList.findIndex(i => i.name === item.name && i.quantity === item.quantity);
                const storeHint = getCategoryStore(item.category);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-card border rounded-lg hover:shadow-soft transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 flex-wrap">
                      {editingShoppingIndex === originalIndex ? (
                        <Input
                          value={editingShoppingValue}
                          onChange={(e) => setEditingShoppingValue(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          onBlur={saveShoppingEdit}
                          autoFocus
                          className="h-8 flex-1"
                        />
                      ) : (
                        <>
                          <span className="font-medium">{item.name}</span>
                          <Button
                            onClick={() => startEditingShopping(originalIndex, item.name)}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-50 hover:opacity-100"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryLabel(item.category)}
                      </Badge>
                      {storeHint && (
                        <Badge variant="outline" className="text-xs bg-accent/10">
                          <Store className="h-3 w-3 mr-1" />
                          {storeHint}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => onUpdateShoppingItem(originalIndex, { quantity: Math.max(1, item.quantity - 1) })}
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Badge variant="outline" className="min-w-[2rem] justify-center">
                          {item.quantity}
                        </Badge>
                        <Button
                          onClick={() => onUpdateShoppingItem(originalIndex, { quantity: item.quantity + 1 })}
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Select 
                        value={item.category || "other"} 
                        onValueChange={(v) => onUpdateShoppingItem(originalIndex, { category: v as GroceryCategory })}
                      >
                        <SelectTrigger className="w-24 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GROCERY_CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => onMarkAsBought(originalIndex)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => onRemoveFromShoppingList(originalIndex)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Your shopping list is empty
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default InventoryList;
