import { useState, useEffect } from "react";
import { Camera, List, ChefHat, Settings, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CameraCapture from "@/components/CameraCapture";
import InventoryList from "@/components/InventoryList";
import RecipeRecommendations from "@/components/RecipeRecommendations";
import CuisinePreferences from "@/components/CuisinePreferences";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useInventorySync } from "@/hooks/useInventorySync";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GroceryCategory } from "@/types/inventory";

const Index = () => {
  const [activeTab, setActiveTab] = useState("camera");
  const [weeklyStaples, setWeeklyStaples] = useState<string[]>([]);
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const {
    inventoryItems,
    shoppingList,
    loading: dataLoading,
    addToInventory,
    updateInventoryItem,
    removeFromInventory,
    addToShoppingList,
    updateShoppingItem,
    removeFromShoppingList,
    markAsBought,
    addMissingItemsToShoppingList,
    replaceInventory,
  } = useInventorySync(user?.id);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Load weekly staples from localStorage (keeping local for now)
    const savedWeeklyStaples = localStorage.getItem("pantry-weekly-staples");
    if (savedWeeklyStaples) {
      setWeeklyStaples(JSON.parse(savedWeeklyStaples));
    }
  }, []);

  const saveToStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const handleNewInventory = async (items: string[]) => {
    const result = await replaceInventory(items);
    
    if (!result) return;
    
    const { missingItems, hadPreviousInventory } = result;
    
    if (hadPreviousInventory && missingItems.length > 0) {
      const addedCount = await addMissingItemsToShoppingList(missingItems);
      
      if (addedCount && addedCount > 0) {
        toast({
          title: "Missing Items Detected!",
          description: `Found ${addedCount} items from your previous inventory that are now missing.`,
        });
      } else {
        toast({
          title: "Inventory Updated!",
          description: "All missing items are already on your shopping list.",
        });
      }
    } else if (hadPreviousInventory) {
      toast({
        title: "Inventory Updated!",
        description: "No missing items detected. Your pantry looks well-stocked!",
      });
    } else {
      toast({
        title: "First Inventory Scan!",
        description: "Take another photo later to detect missing items automatically.",
      });
    }
    
    setActiveTab("inventory");
  };

  const addWeeklyStaple = (item: string) => {
    if (!weeklyStaples.includes(item)) {
      const newStaples = [...weeklyStaples, item];
      setWeeklyStaples(newStaples);
      saveToStorage("pantry-weekly-staples", newStaples);
      toast({
        title: "Staple Added!",
        description: `${item} is now a weekly staple.`,
      });
    }
  };

  const removeWeeklyStaple = (item: string) => {
    const newStaples = weeklyStaples.filter(staple => staple !== item);
    setWeeklyStaples(newStaples);
    saveToStorage("pantry-weekly-staples", newStaples);
    toast({
      title: "Staple Removed",
      description: `${item} is no longer a weekly staple.`,
    });
  };

  const addAllStaplesToShoppingList = async () => {
    if (weeklyStaples.length === 0) return;
    
    const currentShoppingNames = shoppingList.map(item => item.name.toLowerCase());
    const itemsToAdd = weeklyStaples.filter(staple => 
      !currentShoppingNames.some(listItem => 
        listItem.includes(staple.toLowerCase()) ||
        staple.toLowerCase().includes(listItem)
      )
    );
    
    if (itemsToAdd.length > 0) {
      for (const item of itemsToAdd) {
        await addToShoppingList(item, 1);
      }
      toast({
        title: "Weekly Staples Added!",
        description: `Added ${itemsToAdd.length} staples to your shopping list.`,
      });
    } else {
      toast({
        title: "All Staples Already Listed",
        description: "All your weekly staples are already on the shopping list.",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/auth");
  };

  // Show loading spinner while checking authentication or loading data
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-fresh text-primary-foreground shadow-glow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Smart Pantry</h1>
                <p className="text-primary-foreground/80">AI-powered inventory & recipes</p>
              </div>
            </div>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
                  <User className="h-4 w-4 mr-2" />
                  {user.email?.split('@')[0] || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled className="opacity-60">
                  <User className="h-4 w-4 mr-2" />
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <CameraCapture 
                  onItemsDetected={handleNewInventory}
                  onAddToShoppingList={(item, qty, cat) => addToShoppingList(item, qty, cat)} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <InventoryList
              inventoryItems={inventoryItems}
              shoppingList={shoppingList}
              weeklyStaples={weeklyStaples}
              onAddToShoppingList={addToShoppingList}
              onRemoveFromShoppingList={removeFromShoppingList}
              onUpdateShoppingItem={updateShoppingItem}
              onRemoveFromInventory={removeFromInventory}
              onAddToInventory={addToInventory}
              onUpdateInventoryItem={updateInventoryItem}
              onMarkAsBought={markAsBought}
              onAddWeeklyStaple={addWeeklyStaple}
              onRemoveWeeklyStaple={removeWeeklyStaple}
              onAddAllStaplesToShoppingList={addAllStaplesToShoppingList}
            />
          </TabsContent>

          {/* Recipes Tab */}
          <TabsContent value="recipes">
            <RecipeRecommendations inventoryItems={inventoryItems.map(i => i.name)} />
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
