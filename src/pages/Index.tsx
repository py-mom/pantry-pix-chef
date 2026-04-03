import { useState, useEffect, useCallback } from "react";
import { Camera, List, Settings, LogOut, User, ShoppingBasket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CameraCapture from "@/components/CameraCapture";
import InventoryList from "@/components/InventoryList";
import CuisinePreferences from "@/components/CuisinePreferences";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useInventorySync } from "@/hooks/useInventorySync";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GroceryCategory } from "@/types/inventory";
import { supabase } from "@/integrations/supabase/client";

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

  // Load weekly staples from Supabase
  const loadWeeklyStaples = useCallback(async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('weekly_staples')
      .select('name')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error loading weekly staples:', error);
      return;
    }
    
    setWeeklyStaples(data?.map(s => s.name) || []);
  }, [user?.id]);

  useEffect(() => {
    loadWeeklyStaples();
  }, [loadWeeklyStaples]);

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

  const addWeeklyStaple = async (item: string) => {
    if (!user?.id || weeklyStaples.includes(item)) return;
    
    const { error } = await supabase
      .from('weekly_staples')
      .insert({ user_id: user.id, name: item });
    
    if (error) {
      console.error('Error adding weekly staple:', error);
      toast({
        title: "Error",
        description: "Failed to add weekly staple.",
        variant: "destructive",
      });
      return;
    }
    
    setWeeklyStaples([...weeklyStaples, item]);
    toast({
      title: "Staple Added!",
      description: `${item} is now a weekly staple.`,
    });
  };

  const removeWeeklyStaple = async (item: string) => {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from('weekly_staples')
      .delete()
      .eq('user_id', user.id)
      .eq('name', item);
    
    if (error) {
      console.error('Error removing weekly staple:', error);
      toast({
        title: "Error",
        description: "Failed to remove weekly staple.",
        variant: "destructive",
      });
      return;
    }
    
    setWeeklyStaples(weeklyStaples.filter(staple => staple !== item));
    toast({
      title: "Staple Removed",
      description: `${item} is no longer a weekly staple.`,
    });
  };

  const addAllStaplesToShoppingList = async () => {
    if (weeklyStaples.length === 0) return;
    
    const addedCount = await addMissingItemsToShoppingList(weeklyStaples);
    
    if (addedCount && addedCount > 0) {
      toast({
        title: "Weekly Staples Added!",
        description: `Added ${addedCount} staples to your shopping list.`,
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
                  shoppingList={shoppingList}
                  onMarkAsBought={markAsBought}
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
