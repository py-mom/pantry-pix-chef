import { useState, useEffect, useCallback } from "react";
import {
  Camera, List, LogOut, User, ShoppingBasket,
  ChevronRight, Star, Package, ShoppingCart, Plus, X,
  Check, ArrowRight, AlertCircle, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CameraCapture from "@/components/CameraCapture";
import InventoryList from "@/components/InventoryList";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useInventorySync } from "@/hooks/useInventorySync";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fuzzyMatch = (a: string, b: string) =>
  a.toLowerCase().includes(b.toLowerCase()) ||
  b.toLowerCase().includes(a.toLowerCase());

// ─── First-time setup banner ──────────────────────────────────────────────────

const SetupBanner = ({ onBuildNow, onDismiss }: { onBuildNow: () => void; onDismiss: () => void }) => (
  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
    <div className="flex items-start gap-3">
      <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold">Build your baseline inventory</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Photograph your fully stocked pantry once. Weekly scans will diff against it to find what's missing.
        </p>
      </div>
    </div>
    <div className="flex gap-2">
      <Button size="sm" className="flex-1" onClick={onBuildNow}>
        <Camera className="h-4 w-4 mr-1.5" /> Start scanning
      </Button>
      <Button size="sm" variant="ghost" onClick={onDismiss} className="text-muted-foreground">
        Skip for now
      </Button>
    </div>
  </div>
);

// ─── Missing items modal ──────────────────────────────────────────────────────

const MissingSummaryModal = ({
  missingItems, onConfirm, onDismiss,
}: {
  missingItems: string[];
  onConfirm: (selected: string[]) => void;
  onDismiss: () => void;
}) => {
  const [selected, setSelected] = useState<string[]>(missingItems);
  const toggle = (item: string) =>
    setSelected(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-sm space-y-4 p-5">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold text-base">Items missing from pantry</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          These were in your baseline but not seen in today's scan. Select which to add to your shopping list.
        </p>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {missingItems.map(item => (
            <button key={item} onClick={() => toggle(item)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors
                ${selected.includes(item) ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                ${selected.includes(item) ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                {selected.includes(item) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>
              {item}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button className="flex-1" onClick={() => onConfirm(selected)} disabled={selected.length === 0}>
            <ShoppingCart className="h-4 w-4 mr-1.5" /> Add {selected.length} to list
          </Button>
          <Button variant="outline" onClick={onDismiss}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Staples section ──────────────────────────────────────────────────────────

const StaplesSection = ({ weeklyStaples, onAdd, onRemove, onAddAllToShoppingList }: {
  weeklyStaples: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  onAddAllToShoppingList: () => void;
}) => {
  const [input, setInput] = useState("");
  const COMMON = ["apples", "bananas", "bread", "butter", "carrots", "cheese",
    "chicken", "eggs", "garlic", "milk", "oats", "olive oil", "onions",
    "pasta", "peanut butter", "pepper", "rice", "salt", "tomatoes"];
  const suggestions = COMMON.filter(c => !weeklyStaples.some(s => fuzzyMatch(s, c)));

  const handleAdd = () => { if (input.trim()) { onAdd(input.trim()); setInput(""); } };

  return (
    <div className="space-y-4">
      {weeklyStaples.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
            Your {weeklyStaples.length} staples
          </p>
          <div className="flex flex-wrap gap-2">
            {weeklyStaples.map(item => (
              <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
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

      {suggestions.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Quick add</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 12).map(item => (
              <button key={item} onClick={() => onAdd(item)}
                className="px-2.5 py-1 text-xs border border-dashed border-muted-foreground/40 rounded-full text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                + {item}
              </button>
            ))}
          </div>
        </div>
      )}

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

// ─── Shopping list tab (full screen, no scroll to find it) ───────────────────

const ShoppingListTab = ({ shoppingList, onMarkAsBought, onReset }: {
  shoppingList: any[];
  onMarkAsBought: (id: string) => void;
  onReset: () => void;
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const pending = shoppingList.filter(i => !i.bought);
  const bought = shoppingList.filter(i => i.bought);

  if (shoppingList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <ShoppingCart className="h-14 w-14 text-muted-foreground/30 mb-4" />
        <p className="font-medium text-muted-foreground">Your shopping list is empty</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add staples from the Staples tab, or scan your pantry from the Camera tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1 mr-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{bought.length} of {shoppingList.length} items got</span>
            <span>{Math.round((bought.length / shoppingList.length) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(bought.length / shoppingList.length) * 100}%` }} />
          </div>
        </div>
        {/* Reset */}
        {confirmReset ? (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => { onReset(); setConfirmReset(false); }}
              className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
              Confirm
            </button>
            <button onClick={() => setConfirmReset(false)}
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0">
            Reset list
          </button>
        )}
      </div>

      {/* Pending items */}
      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map(item => (
            <div key={item.id}
              className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl">
              <span className="text-sm font-medium">{item.name}</span>
              <button onClick={() => onMarkAsBought(item.id)}
                className="w-7 h-7 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors">
                <Check className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bought items */}
      {bought.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
            Got it ✓
          </p>
          <div className="space-y-1.5">
            {bought.map(item => (
              <div key={item.id}
                className="flex items-center justify-between px-4 py-2.5 bg-muted/30 rounded-xl opacity-50">
                <span className="text-sm line-through">{item.name}</span>
                <button onClick={() => onMarkAsBought(item.id)}>
                  <Check className="h-4 w-4 text-primary" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Camera tab ───────────────────────────────────────────────────────────────

type CameraMode = "build" | "weekly";

const CameraTab = ({ inventoryItems, onBuildInventory, onWeeklyScan, onAddToShoppingList, shoppingList, onMarkAsBought }: {
  inventoryItems: any[];
  onBuildInventory: (items: string[]) => void;
  onWeeklyScan: (items: string[]) => void;
  onAddToShoppingList: (item: string, qty: number, cat: any) => void;
  shoppingList: any[];
  onMarkAsBought: (id: string) => void;
}) => {
  const [mode, setMode] = useState<CameraMode>(inventoryItems.length === 0 ? "build" : "weekly");

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button onClick={() => setMode("build")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all
            ${mode === "build" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          📦 Build Inventory
        </button>
        <button onClick={() => setMode("weekly")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all
            ${mode === "weekly" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          🔍 Weekly Scan
        </button>
      </div>

      <p className="text-xs text-muted-foreground px-1">
        {mode === "build"
          ? "Photograph your fully stocked pantry. Take as many pictures as needed — items are added incrementally, no duplicates."
          : "Photograph your current pantry. We'll show you what's missing before adding anything to your list."}
      </p>

      {mode === "build" && inventoryItems.length > 0 && (
        <p className="text-xs text-primary px-1">✓ {inventoryItems.length} items in baseline — keep scanning to add more</p>
      )}

      {mode === "weekly" && inventoryItems.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Build your baseline inventory first so we have something to diff against.
        </div>
      )}

      <CameraCapture
        onItemsDetected={mode === "build" ? onBuildInventory : onWeeklyScan}
        onAddToShoppingList={onAddToShoppingList}
        shoppingList={shoppingList}
        onMarkAsBought={onMarkAsBought}
      />
    </div>
  );
};

// ─── Bottom nav ───────────────────────────────────────────────────────────────

type Tab = "staples" | "camera" | "shop";

const BottomNav = ({ active, onSelect, shoppingCount }: {
  active: Tab;
  onSelect: (tab: Tab) => void;
  shoppingCount: number;
}) => {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "staples", label: "Staples", icon: <Star className="h-5 w-5" /> },
    { id: "camera", label: "Camera", icon: <Camera className="h-5 w-5" /> },
    { id: "shop", label: "Shop", icon: <ShoppingCart className="h-5 w-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => onSelect(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors relative
              ${active === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {tab.icon}
            <span className="text-xs font-medium">{tab.label}</span>
            {/* Badge for pending shopping items */}
            {tab.id === "shop" && shoppingCount > 0 && (
              <span className="absolute top-2 right-1/4 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {shoppingCount > 9 ? "9+" : shoppingCount}
              </span>
            )}
            {/* Active indicator */}
            {active === tab.id && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("staples");
  const [weeklyStaples, setWeeklyStaples] = useState<string[]>([]);
  const [showSetupBanner, setShowSetupBanner] = useState(false);
  const [missingSummary, setMissingSummary] = useState<string[] | null>(null);
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
    resetShoppingList,
  } = useInventorySync(user?.id);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!dataLoading && inventoryItems.length === 0) {
      setShowSetupBanner(true);
    } else {
      setShowSetupBanner(false);
    }
  }, [dataLoading, inventoryItems.length]);

  const loadWeeklyStaples = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase.from('weekly_staples').select('name').eq('user_id', user.id);
    if (!error) setWeeklyStaples(data?.map(s => s.name) || []);
  }, [user?.id]);

  useEffect(() => { loadWeeklyStaples(); }, [loadWeeklyStaples]);

  // ── Build inventory ───────────────────────────────────────────────────────
  const handleBuildInventory = async (detectedItems: string[]) => {
    const existingNames = inventoryItems.map(i => i.name);
    const newItems = detectedItems.filter(item => !existingNames.some(e => fuzzyMatch(e, item)));

    if (newItems.length === 0) {
      toast({ title: "No new items found", description: "Everything scanned is already in your inventory." });
      return;
    }

    for (const item of newItems) await addToInventory(item, 1, "Other");

    toast({
      title: `${newItems.length} item${newItems.length > 1 ? "s" : ""} added to inventory`,
      description: newItems.length <= 4 ? newItems.join(", ") : `${newItems.slice(0, 3).join(", ")} and ${newItems.length - 3} more`,
    });
  };

  // ── Weekly scan → diff → modal ────────────────────────────────────────────
  const handleWeeklyScan = async (detectedItems: string[]) => {
    if (inventoryItems.length === 0) {
      toast({ title: "No baseline yet", description: "Switch to 'Build Inventory' mode first.", variant: "destructive" });
      return;
    }

    const missing = inventoryItems
      .map(i => i.name)
      .filter(name => !detectedItems.some(d => fuzzyMatch(name, d)));

    if (missing.length === 0) {
      toast({ title: "Pantry looks great! 🎉", description: "Nothing missing from your baseline." });
      return;
    }

    setMissingSummary(missing);
  };

  const handleConfirmMissing = async (selectedItems: string[]) => {
    const addedCount = await addMissingItemsToShoppingList(selectedItems);
    setMissingSummary(null);
    toast({ title: `${addedCount ?? selectedItems.length} items added to shopping list` });
    setActiveTab("shop");
  };

  // ── Staples ───────────────────────────────────────────────────────────────
  const addWeeklyStaple = async (item: string) => {
    if (!user?.id || weeklyStaples.some(s => fuzzyMatch(s, item))) return;
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
      description: addedCount && addedCount > 0 ? "Head to the store — your list is ready." : "All staples are already on your shopping list.",
    });
    if (addedCount && addedCount > 0) setActiveTab("shop");
  };

  const handleResetShoppingList = async () => {
    const success = await resetShoppingList();
    if (success) toast({ title: "Shopping list cleared", description: "All items have been removed." });
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

  const pendingCount = shoppingList.filter(i => !i.bought).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Missing items modal */}
      {missingSummary && (
        <MissingSummaryModal
          missingItems={missingSummary}
          onConfirm={handleConfirmMissing}
          onDismiss={() => setMissingSummary(null)}
        />
      )}

      {/* Header */}
      <header className="bg-gradient-fresh text-primary-foreground shadow-glow sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBasket className="h-6 w-6" />
              <h1 className="text-lg font-bold leading-tight">Smart Pantry</h1>
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

      {/* Main — padded bottom so content clears the fixed nav */}
      <main className="container mx-auto px-4 pt-5 pb-28 max-w-2xl">

        {/* ── STAPLES TAB ── */}
        {activeTab === "staples" && (
          <div className="space-y-4">
            {showSetupBanner && (
              <SetupBanner
                onBuildNow={() => { setShowSetupBanner(false); setActiveTab("camera"); }}
                onDismiss={() => setShowSetupBanner(false)}
              />
            )}

            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Weekly Staples</CardTitle>
                </div>
                <CardDescription className="text-xs">
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

            {/* Pantry scan nudge */}
            <Card className="shadow-soft border-dashed bg-muted/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {inventoryItems.length === 0 ? "Build your baseline inventory" : "Scan your pantry"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {inventoryItems.length === 0
                          ? "Photograph your stocked pantry to set a baseline"
                          : `${inventoryItems.length} items in baseline — scan to find what's missing`}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("camera")}>
                    <Camera className="h-4 w-4 mr-1.5" />
                    {inventoryItems.length === 0 ? "Build" : "Scan"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Full inventory collapsible */}
            {inventoryItems.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 list-none py-1">
                  <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                  View full baseline inventory ({inventoryItems.length} items)
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
          </div>
        )}

        {/* ── CAMERA TAB ── */}
        {activeTab === "camera" && (
          <CameraTab
            inventoryItems={inventoryItems}
            onBuildInventory={handleBuildInventory}
            onWeeklyScan={handleWeeklyScan}
            onAddToShoppingList={(item, qty, cat) => addToShoppingList(item, qty, cat)}
            shoppingList={shoppingList}
            onMarkAsBought={markAsBought}
          />
        )}

        {/* ── SHOP TAB ── */}
        {activeTab === "shop" && (
          <ShoppingListTab
            shoppingList={shoppingList}
            onMarkAsBought={markAsBought}
            onReset={handleResetShoppingList}
          />
        )}
      </main>

      {/* Fixed bottom nav */}
      <BottomNav
        active={activeTab}
        onSelect={setActiveTab}
        shoppingCount={pendingCount}
      />
    </div>
  );
};

export default Index;
