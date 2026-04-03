import { useState, useEffect, useCallback } from "react";
import { Camera, List, Settings, LogOut, User, ShoppingBasket, ChevronRight, Star, Package, ShoppingCart, Plus, X, Check, ArrowRight } from "lucide-react";
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

// ─── Step indicator shown at top of Inventory tab ───────────────────────────
const FlowSteps = ({ activeStep }: { activeStep: number }) => {
  const steps = [
    { label: "Staples", icon: Star },
    { label: "Pantry", icon: Package },
    { label: "Shop", icon: ShoppingCart },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === activeStep;
        const isDone = i < activeStep;
        return (
          <div key={step.label} className="flex items-center">
            <div className={`flex flex-col items-center gap-1`}>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
                  ${isActive ? "border-primary bg-primary text-primary-foreground shadow-md scale-110" : ""}
                  ${isDone ? "border-primary bg-primary/10 text-primary" : ""}
                  ${!isActive && !isDone ? "border-muted-foreground/30 text-muted-foreground" : ""}
                `}
              >
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 mb-4 mx-1 ${i < activeStep ? "bg-primary" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Staples section ─────────────────────────────────────────────────────────
const StaplesSection = ({
  weeklyStaples,
  onAdd,
  onRemove,
  onAddAllToShoppingList,
}: {
  weeklyStaples: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  onAddAllToShoppingList: () => void;
}) => {
  const [input, setInput] = useState("");
  const COMMON = ["apples", "bananas", "bread", "butter", "carrots", "cheese",
    "chicken", "eggs", "garlic", "milk", "oats", "olive oil", "onions",
    "pasta", "peanut butter", "pepper", "rice", "salt", "tomatoes"];
  const suggestions = COMMON.filter(c => !weeklyStaples.includes(c));

  const handleAdd = () => {
    if (input.trim()) { onAdd(input.trim()); setInput(""); }
  };

  return (
    <div className="space-y-4">
      {/* Your staples */}
      {weeklyStaples.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
            Your {weeklyStaples.length} staples
          </p>
          <div className="flex flex-wrap gap-2">
            {weeklyStaples.map(item => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium"
              >
                {item}
                <button onClick={() => onRemove(item)} className="hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No staples yet — add some below.</p>
      )}

      {/* Text input */}
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Type an item and press Add..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd} disabled={!input.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {/* Quick-add suggestions (only items not already in staples) */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Quick add</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 12).map(item => (
              <button
                key={item}
                onClick={() => onAdd(item)}
                className="px-2.5 py-1 text-xs border border-dashed border-muted-foreground/40 rounded-full text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                + {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {weeklyStaples.length > 0 && (
        <div className="pt-2 border-t border-border">
          <Button className="w-full" onClick={onAddAllToShoppingList}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Send all staples to Shopping List
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-1.5">
            Or scan your pantry first to only add what's missing →
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Shopping list summary strip ─────────────────────────────────────────────
const ShoppingStrip = ({
  shoppingList,
  onMarkAsBought,
}: {
  shoppingList: any[];
  onMarkAsBought: (id: string) => void;
}) => {
  const pending = shoppingList.filter(i => !i.bought);
  const bought = shoppingList.filter(i => i.bought);
  if (shoppingList.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          Shopping List
        </span>
        <span className="text-xs text-muted-foreground">
          {bought.length}/{shoppingList.length} got
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${shoppingList.length ? (bought.length / shoppingList.length) * 100 : 0}%` }}
        />
      </div>
      {/* Pending items */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {pending.map(item => (
          <div key={item.id} className="flex items-center justify-between py-1">
            <span className="text-sm">{item.name}</span>
            <button
              onClick={() => onMarkAsBought(item.id)}
              className="w-6 h-6 rounded-full border-2 border-muted-foreground/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
            >
              <Check className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ))}
        {bought.map(item => (
          <div key={item.id} className="flex items-center justify-between py-1 opacity-40">
            <span className="text-sm line-through">{item.name}</span>
            <Check className="h-4 w-4 text-primary" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const Index = () => {
  const [activeTab, setActiveTab] = useState("inventory");
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

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const loadWeeklyStaples = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('weekly_staples').select('name').eq('user_id', user.id);
    if (!error) setWeeklyStaples(data?.map(s => s.name) || []);
  }, [user?.id]);

  useEffect(() => { loadWeeklyStaples(); }, [loadWeeklyStaples]);

  const handleNewInventory = async (items: string[]) => {
    const result = await replaceInventory(items);
    if (!result) return;
    const { missingItems, hadPreviousInventory } = result;
    if (hadPreviousInventory && missingItems.length > 0) {
      const addedCount = await addMissingItemsToShoppingList(missingItems);
      toast({
        title: addedCount && addedCount > 0 ? "Missing items added to list!" : "All items already listed",
        description: addedCount && addedCount > 0
          ? `${addedCount} items added to your shopping list.`
          : "Your shopping list is already up to date.",
      });
    } else if (!hadPreviousInventory) {
      toast({ title: "Pantry scanned!", description: "Scan again later to detect what's missing." });
    } else {
      toast({ title: "Pantry looks great!", description: "No missing items detected." });
    }
    setActiveTab("inventory");
  };

  const addWeeklyStaple = async (item: string) => {
    if (!user?.id || weeklyStaples.includes(item)) return;
    const { error } = await supabase.from('weekly_staples').insert({ user_id: user.id, name: item });
    if (error) { toast({ title: "Error", description: "Failed to add staple.", variant: "destructive" }); return; }
    setWeeklyStaples(prev => [...prev, item]);
    toast({ title: `${item} added to staples` });
  };

  const removeWeeklyStaple = async (item: string) => {
    if (!user?.id) return;
    const { error } = await supabase.from('weekly_staples').delete().eq('user_id', user.id).eq('name', item);
    if (error) { toast({ title: "Error", description: "Failed to remove staple.", variant: "destructive" }); return; }
    setWeeklyStaples(prev => prev.filter(s => s !== item));
  };

  const addAllStaplesToShoppingList = async () => {
    if (!weeklyStaples.length) return;
    const addedCount = await addMissingItemsToShoppingList(weeklyStaples);
    toast({
      title: addedCount && addedCount > 0 ? `${addedCount} staples added!` : "Already on the list",
      description: addedCount && addedCount > 0
        ? "Head to the store — your list is ready."
        : "All staples are already on your shopping list.",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out" });
    navigate("/auth");
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="text-lg text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Derive which "step" is active for the flow indicator
  const flowStep = shoppingList.filter(i => !i.bought).length > 0 ? 2
    : inventoryItems.length > 0 ? 1
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-fresh text-primary-foreground shadow-glow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBasket className="h-7 w-7" />
              <div>
                <h1 className="text-xl font-bold leading-tight">Smart Pantry</h1>
                <p className="text-primary-foreground/70 text-xs">
                  Staples → Scan → Shop
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
                  <User className="h-4 w-4 mr-1.5" />
                  {user.email?.split('@')[0] || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled className="opacity-60">
                  <User className="h-4 w-4 mr-2" />{user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          {/* Tab nav */}
          <Card className="shadow-soft">
            <CardContent className="p-1.5">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="inventory" className="flex items-center gap-2 text-sm">
                  <List className="h-4 w-4" />
                  <span>Inventory</span>
                </TabsTrigger>
                <TabsTrigger value="camera" className="flex items-center gap-2 text-sm">
                  <Camera className="h-4 w-4" />
                  <span>Camera</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          {/* ── INVENTORY TAB ── */}
          <TabsContent value="inventory" className="space-y-4">

            {/* Flow indicator */}
            <FlowSteps activeStep={flowStep} />

            {/* Step 1: Staples */}
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</div>
                  <CardTitle className="text-base">Weekly Staples</CardTitle>
                </div>
                <CardDescription className="text-xs ml-8">
                  Items you buy every week. Set once, use forever.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StaplesSection
                  weeklyStaples={weeklyStaples}
                  onAdd={addWeeklyStaple}
                  onRemove={removeWeeklyStaple}
                  onAddAllToShoppingList={addAllStaplesToShoppingList}
                />
              </CardContent>
            </Card>

            {/* Step 2: Pantry scan nudge */}
            <Card className="shadow-soft border-dashed bg-muted/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</div>
                    <div>
                      <p className="text-sm font-medium">Scan your pantry</p>
                      <p className="text-xs text-muted-foreground">Camera detects what's missing vs. your staples</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("camera")}>
                    <Camera className="h-4 w-4 mr-1.5" />
                    Open Camera
                  </Button>
                </div>
                {inventoryItems.length > 0 && (
                  <p className="text-xs text-primary mt-2 ml-9">
                    ✓ {inventoryItems.length} items in pantry
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Shopping list */}
            <div>
              <div className="flex items-center gap-2 mb-2 ml-1">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</div>
                <span className="text-sm font-medium">Shopping List</span>
              </div>
              <ShoppingStrip shoppingList={shoppingList} onMarkAsBought={markAsBought} />
              {shoppingList.length === 0 && (
                <div className="rounded-xl border border-dashed border-muted-foreground/30 py-6 text-center">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Your shopping list is empty.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Add staples above or scan your pantry.</p>
                </div>
              )}
            </div>

            {/* Full inventory (collapsed context) */}
            {inventoryItems.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 list-none py-1">
                  <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                  View full inventory ({inventoryItems.length} items)
                </summary>
                <div className="mt-3">
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
                </div>
              </details>
            )}
          </TabsContent>

          {/* ── CAMERA TAB ── */}
          <TabsContent value="camera">
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="h-5 w-5 text-primary" />
                  Scan Your Pantry
                </CardTitle>
                <CardDescription className="text-xs">
                  Take a photo — we'll detect what's there and flag what's missing from your staples.
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

          {/* ── SETTINGS TAB ── */}
          <TabsContent value="settings">
            <CuisinePreferences />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
