import { useState } from "react";
import { Plus, Trash2, Check, ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface InventoryListProps {
  inventoryItems: string[];
  shoppingList: string[];
  onAddToShoppingList: (item: string) => void;
  onRemoveFromShoppingList: (index: number) => void;
  onMarkAsBought: (index: number) => void;
}

const InventoryList = ({
  inventoryItems,
  shoppingList,
  onAddToShoppingList,
  onRemoveFromShoppingList,
  onMarkAsBought,
}: InventoryListProps) => {
  const [newItem, setNewItem] = useState("");

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

  return (
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
              {inventoryItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="font-medium">{item}</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    In Stock
                  </Badge>
                </div>
              ))}
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
  );
};

export default InventoryList;