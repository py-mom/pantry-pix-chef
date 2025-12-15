import { useState } from "react";
import { Plus, Trash2, Check, ShoppingCart, Package, Star, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface InventoryListProps {
  inventoryItems: string[];
  shoppingList: string[];
  weeklyStaples: string[];
  onAddToShoppingList: (item: string) => void;
  onRemoveFromShoppingList: (index: number) => void;
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
  onMarkAsBought,
  onAddWeeklyStaple,
  onRemoveWeeklyStaple,
  onAddAllStaplesToShoppingList,
}: InventoryListProps) => {
  const [newItem, setNewItem] = useState("");
  const [newStaple, setNewStaple] = useState("");
  const [staplesOpen, setStaplesOpen] = useState(false);

  // Common weekly staples that users can quickly add
  const commonStaples = [
    "milk", "bread", "eggs", "bananas", "chicken", "rice", "pasta", "onions",
    "tomatoes", "cheese", "yogurt", "butter", "olive oil", "salt", "pepper",
    "garlic", "carrots", "apples", "oats", "peanut butter"
  ];

  const handleAddItem = () => {
    if (newItem.trim()) {
      onAddToShoppingList(newItem.trim());
      setNewItem("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
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
          <CardDescription>
            Items detected in your latest photo scan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inventoryItems.length > 0 ? (
            <div className="space-y-2">
              {inventoryItems.map((item, index) => {
                const isInShoppingList = shoppingList.some(
                  listItem => listItem.toLowerCase() === item.toLowerCase()
                );
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <span className="font-medium">{item}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => onAddToShoppingList(item)}
                        size="sm"
                        variant="ghost"
                        disabled={isInShoppingList}
                        className="h-8 text-xs hover:bg-accent hover:text-accent-foreground"
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {isInShoppingList ? "Added" : "Add to List"}
                      </Button>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        In Stock
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No inventory yet. Take a photo to get started!
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
          <CardDescription>
            Items you need to buy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new item */}
          <div className="flex gap-2">
            <Input
              placeholder="Add item to shopping list..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleAddItem} size="icon" variant="warm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Shopping list items */}
          {shoppingList.length > 0 ? (
            <div className="space-y-2">
              {shoppingList.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-card border rounded-lg hover:shadow-soft transition-all"
                >
                  <span className="font-medium">{item}</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onMarkAsBought(index)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => onRemoveFromShoppingList(index)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
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