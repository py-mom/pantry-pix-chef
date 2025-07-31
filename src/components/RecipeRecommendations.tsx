import { useState, useEffect } from "react";
import { ChefHat, Clock, Users, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Recipe {
  id: string;
  name: string;
  description: string;
  cookTime: string;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  cuisine: string;
  ingredients: string[];
  availableIngredients: number;
  totalIngredients: number;
  rating: number;
}

interface RecipeRecommendationsProps {
  inventoryItems: string[];
}

const RecipeRecommendations = ({ inventoryItems }: RecipeRecommendationsProps) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);

  useEffect(() => {
    // Load cuisine preferences
    const saved = localStorage.getItem("cuisine-preferences");
    if (saved) {
      setCuisinePreferences(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Generate recipe recommendations based on inventory
    if (inventoryItems.length > 0) {
      const mockRecipes = generateMockRecipes(inventoryItems, cuisinePreferences);
      setRecipes(mockRecipes);
    }
  }, [inventoryItems, cuisinePreferences]);

  const generateMockRecipes = (inventory: string[], preferences: string[]): Recipe[] => {
    const allRecipes = [
      {
        id: "1",
        name: "Mediterranean Pasta Salad",
        description: "Fresh and healthy pasta salad with vegetables and olive oil",
        cookTime: "20 min",
        servings: 4,
        difficulty: "Easy" as const,
        cuisine: "Mediterranean",
        ingredients: ["Pasta", "Tomatoes", "Olive Oil", "Cheese", "Onions"],
        rating: 4.5,
      },
      {
        id: "2",
        name: "Chicken Fried Rice",
        description: "Classic Asian-style fried rice with chicken and vegetables",
        cookTime: "25 min",
        servings: 3,
        difficulty: "Medium" as const,
        cuisine: "Asian",
        ingredients: ["Rice", "Chicken Breast", "Eggs", "Onions", "Carrots"],
        rating: 4.3,
      },
      {
        id: "3",
        name: "Vegetable Stir Fry",
        description: "Quick and nutritious stir fry with fresh vegetables",
        cookTime: "15 min",
        servings: 2,
        difficulty: "Easy" as const,
        cuisine: "Asian",
        ingredients: ["Bell Peppers", "Carrots", "Onions", "Olive Oil"],
        rating: 4.1,
      },
      {
        id: "4",
        name: "Caprese Salad",
        description: "Simple Italian salad with fresh ingredients",
        cookTime: "10 min",
        servings: 2,
        difficulty: "Easy" as const,
        cuisine: "Italian",
        ingredients: ["Tomatoes", "Cheese", "Olive Oil"],
        rating: 4.4,
      },
      {
        id: "5",
        name: "Apple Cinnamon Yogurt Bowl",
        description: "Healthy breakfast bowl with fresh fruits",
        cookTime: "5 min",
        servings: 1,
        difficulty: "Easy" as const,
        cuisine: "American",
        ingredients: ["Yogurt", "Apples"],
        rating: 4.2,
      },
      {
        id: "6",
        name: "Herb-Crusted Chicken",
        description: "Juicy chicken breast with aromatic herbs",
        cookTime: "35 min",
        servings: 4,
        difficulty: "Medium" as const,
        cuisine: "American",
        ingredients: ["Chicken Breast", "Olive Oil", "Salt"],
        rating: 4.6,
      },
    ];

    return allRecipes
      .map(recipe => {
        const availableIngredients = recipe.ingredients.filter(ingredient =>
          inventory.some(item => 
            item.toLowerCase().includes(ingredient.toLowerCase()) ||
            ingredient.toLowerCase().includes(item.toLowerCase())
          )
        ).length;

        return {
          ...recipe,
          availableIngredients,
          totalIngredients: recipe.ingredients.length,
        };
      })
      .filter(recipe => recipe.availableIngredients > 0)
      .sort((a, b) => {
        // Sort by match percentage first, then by preferences
        const aMatchPercent = a.availableIngredients / a.totalIngredients;
        const bMatchPercent = b.availableIngredients / b.totalIngredients;
        
        if (aMatchPercent !== bMatchPercent) {
          return bMatchPercent - aMatchPercent;
        }
        
        // If match percentage is same, prefer cuisine preferences
        const aPreferred = preferences.includes(a.cuisine);
        const bPreferred = preferences.includes(b.cuisine);
        
        if (aPreferred && !bPreferred) return -1;
        if (!aPreferred && bPreferred) return 1;
        
        return b.rating - a.rating;
      });
  };

  const getMatchPercentage = (recipe: Recipe) => {
    return Math.round((recipe.availableIngredients / recipe.totalIngredients) * 100);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-primary/10 text-primary";
      case "Medium": return "bg-accent/10 text-accent";
      case "Hard": return "bg-destructive/10 text-destructive";
      default: return "bg-muted";
    }
  };

  if (inventoryItems.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardContent className="text-center py-12">
          <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Ingredients Yet</h3>
          <p className="text-muted-foreground mb-4">
            Take a photo of your pantry to get personalized recipe recommendations!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            Recipe Recommendations
          </CardTitle>
          <CardDescription>
            Based on your current inventory and preferences
          </CardDescription>
        </CardHeader>
      </Card>

      {recipes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="shadow-soft hover:shadow-glow transition-all">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{recipe.name}</CardTitle>
                  <Badge className={`${getMatchPercentage(recipe) === 100 ? 'bg-primary text-primary-foreground' : 'bg-accent/10 text-accent'}`}>
                    {getMatchPercentage(recipe)}% match
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  {recipe.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recipe Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {recipe.cookTime}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {recipe.servings}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    {recipe.rating}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{recipe.cuisine}</Badge>
                  <Badge className={getDifficultyColor(recipe.difficulty)}>
                    {recipe.difficulty}
                  </Badge>
                </div>

                {/* Ingredients */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Ingredients:</h4>
                  <div className="space-y-1">
                    {recipe.ingredients.map((ingredient, index) => {
                      const isAvailable = inventoryItems.some(item =>
                        item.toLowerCase().includes(ingredient.toLowerCase()) ||
                        ingredient.toLowerCase().includes(item.toLowerCase())
                      );
                      
                      return (
                        <div
                          key={index}
                          className={`text-sm px-2 py-1 rounded ${
                            isAvailable
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {ingredient}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  variant={getMatchPercentage(recipe) === 100 ? "fresh" : "warm"}
                >
                  <ChefHat className="h-4 w-4 mr-2" />
                  View Recipe
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-soft">
          <CardContent className="text-center py-8">
            <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No recipes match your current ingredients. Try adding more items to your inventory!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecipeRecommendations;