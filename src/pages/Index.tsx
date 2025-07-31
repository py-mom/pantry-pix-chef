import { useState, useEffect } from "react";
import { Camera, List, ChefHat, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CameraCapture from "@/components/CameraCapture";
import InventoryList from "@/components/InventoryList";
import RecipeRecommendations from "@/components/RecipeRecommendations";
import CuisinePreferences from "@/components/CuisinePreferences";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [activeTab, setActiveTab] = useState("camera");
  const [inventoryItems, setInventoryItems] = useState<string[]>([]);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load data from localStorage on mount
    const savedInventory = localStorage.getItem("pantry-inventory");
    const savedShoppingList = localStorage.getItem("pantry-shopping-list");
    
    if (savedInventory) {
      setInventoryItems(JSON.parse(savedInventory));
    }
    if (savedShoppingList) {
      setShoppingList(JSON.parse(savedShoppingList));
    }
  }, []);

  const saveToStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const handleNewInventory = (items: string[]) => {
    // Get the previous inventory to compare
    const previousInventory = JSON.parse(localStorage.getItem("pantry-previous-inventory") || "[]");
    
    // Save current inventory as the new inventory
    setInventoryItems(items);
    saveToStorage("pantry-inventory", items);
    
    // Save current inventory as previous for next comparison
    saveToStorage("pantry-previous-inventory", items);
    
    if (previousInventory.length > 0) {
      // Find items that were in previous inventory but are missing from current inventory
      const missingItems = previousInventory.filter((prevItem: string) => 
        !items.some(currentItem => 
          currentItem.toLowerCase().includes(prevItem.toLowerCase()) ||
          prevItem.toLowerCase().includes(currentItem.toLowerCase())
        )
      );
      
      if (missingItems.length > 0) {
        // Add missing items to shopping list (avoid duplicates)
        const currentShoppingList = [...shoppingList];
        const newItemsToAdd = missingItems.filter((item: string) => 
          !currentShoppingList.some(listItem => 
            listItem.toLowerCase().includes(item.toLowerCase()) ||
            item.toLowerCase().includes(listItem.toLowerCase())
          )
        );
        
        if (newItemsToAdd.length > 0) {
          const updatedShoppingList = [...currentShoppingList, ...newItemsToAdd];
          setShoppingList(updatedShoppingList);
          saveToStorage("pantry-shopping-list", updatedShoppingList);
          
          toast({
            title: "Missing Items Detected!",
            description: `Found ${newItemsToAdd.length} items from your previous inventory that are now missing.`,
          });
        } else {
          toast({
            title: "Inventory Updated!",
            description: "All missing items are already on your shopping list.",
          });
        }
      } else {
        toast({
          title: "Inventory Updated!",
          description: "No missing items detected. Your pantry looks well-stocked!",
        });
      }
    } else {
      toast({
        title: "First Inventory Scan!",
        description: "Take another photo later to detect missing items automatically.",
      });
    }
    
    setActiveTab("inventory");
  };

  const addToShoppingList = (item: string) => {
    const newList = [...shoppingList, item];
    setShoppingList(newList);
    saveToStorage("pantry-shopping-list", newList);
  };

  const removeFromShoppingList = (index: number) => {
    const newList = shoppingList.filter((_, i) => i !== index);
    setShoppingList(newList);
    saveToStorage("pantry-shopping-list", newList);
  };

  const markAsBought = (index: number) => {
    removeFromShoppingList(index);
    toast({
      title: "Item purchased!",
      description: "Item removed from shopping list.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-fresh text-primary-foreground shadow-glow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Smart Pantry</h1>
              <p className="text-primary-foreground/80">AI-powered inventory & recipes</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Navigation */}
          <Card className="shadow-soft">
            <CardContent className="p-2">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="camera" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Camera</span>
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Inventory</span>
                </TabsTrigger>
                <TabsTrigger value="recipes" className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  <span className="hidden sm:inline">Recipes</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          {/* Camera Tab */}
          <TabsContent value="camera">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Capture Your Pantry
                </CardTitle>
                <CardDescription>
                  Take photos of your pantry, fridge, or storage areas to automatically detect items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CameraCapture onItemsDetected={handleNewInventory} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <InventoryList
              inventoryItems={inventoryItems}
              shoppingList={shoppingList}
              onAddToShoppingList={addToShoppingList}
              onRemoveFromShoppingList={removeFromShoppingList}
              onMarkAsBought={markAsBought}
            />
          </TabsContent>

          {/* Recipes Tab */}
          <TabsContent value="recipes">
            <RecipeRecommendations inventoryItems={inventoryItems} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <CuisinePreferences />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;