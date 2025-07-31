import { useState, useEffect } from "react";
import { Settings, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const availableCuisines = [
  "Italian", "Asian", "Mediterranean", "Mexican", "American", 
  "Indian", "French", "Thai", "Japanese", "Greek",
  "Middle Eastern", "Spanish", "Korean", "Chinese", "Vietnamese"
];

const CuisinePreferences = () => {
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem("cuisine-preferences");
    if (saved) {
      setSelectedCuisines(JSON.parse(saved));
    }
  }, []);

  const toggleCuisine = (cuisine: string) => {
    const newSelection = selectedCuisines.includes(cuisine)
      ? selectedCuisines.filter(c => c !== cuisine)
      : [...selectedCuisines, cuisine];
    
    setSelectedCuisines(newSelection);
  };

  const savePreferences = () => {
    localStorage.setItem("cuisine-preferences", JSON.stringify(selectedCuisines));
    toast({
      title: "Preferences Saved!",
      description: `Your ${selectedCuisines.length} cuisine preferences have been updated.`,
    });
  };

  const clearPreferences = () => {
    setSelectedCuisines([]);
    localStorage.removeItem("cuisine-preferences");
    toast({
      title: "Preferences Cleared",
      description: "All cuisine preferences have been removed.",
    });
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Cuisine Preferences
        </CardTitle>
        <CardDescription>
          Select your favorite cuisines to get better recipe recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cuisine Selection */}
        <div>
          <h3 className="font-medium mb-3">Choose Your Favorite Cuisines:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableCuisines.map((cuisine) => (
              <Button
                key={cuisine}
                variant={selectedCuisines.includes(cuisine) ? "default" : "outline"}
                onClick={() => toggleCuisine(cuisine)}
                className="justify-start h-auto p-3"
              >
                <div className="flex items-center gap-2 w-full">
                  {selectedCuisines.includes(cuisine) && (
                    <Check className="h-4 w-4" />
                  )}
                  <span className="text-sm">{cuisine}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Selected Count */}
        {selectedCuisines.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Selected:</span>
            <Badge variant="secondary">
              {selectedCuisines.length} cuisine{selectedCuisines.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={savePreferences}
            variant="fresh"
            disabled={selectedCuisines.length === 0}
            className="flex-1"
          >
            Save Preferences
          </Button>
          <Button 
            onClick={clearPreferences}
            variant="outline"
            disabled={selectedCuisines.length === 0}
          >
            Clear All
          </Button>
        </div>

        {/* Info */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">How this helps:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Recipes from your preferred cuisines will be prioritized</li>
            <li>• Better ingredient suggestions based on cooking styles</li>
            <li>• More personalized meal recommendations</li>
            <li>• You can change these preferences anytime</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CuisinePreferences;