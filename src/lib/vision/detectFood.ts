import { pipeline, env } from "@huggingface/transformers";

// Open-source, in-browser food detection using CLIP zero-shot classification.
// We constrain predictions to pantry/grocery items to avoid nonsense labels
// (e.g., "Komodo dragon"). Falls back to a lightweight ImageNet classifier.

env.allowLocalModels = false;
env.useBrowserCache = true;

let zslPromise: Promise<any> | null = null;
let imagenetPromise: Promise<any> | null = null;

// Extended vocabulary for specific products, brands, and detailed descriptions
const CANDIDATE_LABELS = [
  // Specific jams and spreads
  "strawberry jam","grape jam","raspberry jam","blueberry jam","apricot jam","peach jam","orange marmalade","peanut butter","almond butter","nutella","honey",
  // Branded products (common brands)
  "jif peanut butter","skippy peanut butter","welch's grape jelly","smuckers jam","kraft peanut butter","skippy natural","adams peanut butter",
  // Produce with varieties
  "red apple","green apple","gala apple","fuji apple","granny smith apple","banana","organic banana","yellow banana","ripe banana",
  "orange","navel orange","blood orange","valencia orange","mandarin orange","clementine","tangerine",
  "lemon","lime","key lime","persian lime","grapefruit","pink grapefruit",
  "grapes","red grapes","green grapes","purple grapes","seedless grapes","concord grapes",
  "strawberry","fresh strawberry","organic strawberry","blueberry","fresh blueberry","raspberry","blackberry",
  "tomato","roma tomato","cherry tomato","grape tomato","beefsteak tomato","heirloom tomato",
  "potato","russet potato","red potato","yukon potato","sweet potato","purple potato",
  "carrot","baby carrot","organic carrot","onion","yellow onion","white onion","red onion","sweet onion","vidalia onion",
  "garlic","garlic cloves","cucumber","english cucumber","persian cucumber","pickle cucumber",
  "broccoli","organic broccoli","cauliflower","lettuce","romaine lettuce","iceberg lettuce","butter lettuce","arugula",
  "spinach","baby spinach","organic spinach","kale","organic kale","cabbage","red cabbage","napa cabbage",
  "bell pepper","red bell pepper","yellow bell pepper","green bell pepper","orange bell pepper",
  // Bakery & grains with brands
  "bread","white bread","wheat bread","whole grain bread","sourdough bread","rye bread","pumpernickel bread",
  "wonder bread","pepperidge farm bread","dave's killer bread","ezekiel bread",
  "bagel","plain bagel","everything bagel","sesame bagel","cinnamon raisin bagel","onion bagel","poppy seed bagel","blueberry bagel","asiago bagel","thomas bagel",
  "tortilla","flour tortilla","corn tortilla","whole wheat tortilla","mission tortilla","old el paso tortilla",
  "pita","pita bread","naan","flatbread",
  "rice","white rice","brown rice","jasmine rice","basmati rice","wild rice","uncle ben's rice","minute rice",
  // Pasta varieties
  "pasta","spaghetti","penne","penne pasta","macaroni","linguine","fettuccine","angel hair pasta","rigatoni","rotini","farfalle","bow tie pasta","lasagna noodles","orzo","ziti","shells pasta","elbow macaroni",
  "barilla pasta","kraft mac and cheese","ronzoni pasta","de cecco pasta",
  "noodles","egg noodles","ramen noodles","rice noodles","instant noodles","udon noodles","soba noodles","lo mein noodles",
  "oats","rolled oats","steel cut oats","instant oats","quaker oats","oatmeal",
  // Cereal varieties and brands
  "cereal","cheerios","honey nut cheerios","frosted cheerios","apple cinnamon cheerios",
  "corn flakes","frosted flakes","kellogg's corn flakes",
  "lucky charms","fruit loops","froot loops","cocoa puffs","trix cereal",
  "cinnamon toast crunch","honey bunches of oats","raisin bran","frosted mini wheats","grape nuts",
  "special k","rice krispies","chex cereal","life cereal","cap'n crunch","captain crunch",
  "granola","granola cereal","muesli","oatmeal cereal","hot cereal","cold cereal",
  "kellogg's cereal","general mills cereal","post cereal","quaker cereal",
  "flour","all purpose flour","bread flour","whole wheat flour","king arthur flour",
  // Beverages - Soda and drinks
  "soda","cola","coca cola","coke","pepsi","sprite","7up","mountain dew","dr pepper","fanta","root beer",
  "ginger ale","club soda","tonic water","sparkling water","seltzer","la croix",
  "soda can","soda bottle","2 liter soda","diet soda","diet coke","diet pepsi","zero sugar soda",
  "juice","orange juice","apple juice","grape juice","cranberry juice","tomato juice","lemonade",
  "iced tea","sweet tea","green tea","energy drink","red bull","monster energy","gatorade","powerade",
  "water bottle","bottled water","spring water","mineral water",
  // Jello and desserts
  "jello","jell-o","gelatin","gelatin dessert","pudding","pudding cup","instant pudding","jello cups","fruit jello","jello mix",
  "cool whip","whipped cream","whipped topping",
  // Dairy & eggs with brands
  "milk","whole milk","2% milk","skim milk","almond milk","soy milk","oat milk","coconut milk",
  "organic milk","lactaid milk","horizon organic milk","silk almond milk","oatly oat milk",
  "yogurt","greek yogurt","vanilla yogurt","strawberry yogurt","plain yogurt","chobani yogurt","dannon yogurt","yoplait yogurt",
  "cheese","cheddar cheese","mozzarella cheese","swiss cheese","american cheese","provolone cheese","parmesan cheese",
  "kraft cheese","tillamook cheese","string cheese","cream cheese","philadelphia cream cheese",
  "butter","salted butter","unsalted butter","organic butter","land o lakes butter","kerrygold butter",
  "cream","heavy cream","half and half","whipping cream","sour cream","cottage cheese",
  "eggs","large eggs","organic eggs","free range eggs","brown eggs","white eggs","cage free eggs",
  // Snacks and pantry items
  "chips","potato chips","tortilla chips","doritos","lays chips","pringles","cheetos",
  "crackers","saltine crackers","graham crackers","ritz crackers","cheese crackers",
  "cookies","oreos","chocolate chip cookies","sandwich cookies",
  "popcorn","microwave popcorn","kettle corn",
  "pretzels","nuts","mixed nuts","peanuts","almonds","cashews","walnuts",
  // Canned goods
  "canned soup","soup can","chicken soup","tomato soup","campbell's soup",
  "canned beans","black beans","kidney beans","pinto beans","chickpeas","garbanzo beans",
  "canned vegetables","canned corn","canned peas","canned green beans",
  "canned fruit","fruit cocktail","peaches in syrup","pineapple chunks",
  "canned tuna","canned salmon","sardines",
  "tomato sauce","pasta sauce","marinara sauce","spaghetti sauce","prego sauce","ragu sauce",
  "salsa","picante sauce","taco sauce","enchilada sauce",
  // Condiments
  "ketchup","mustard","mayonnaise","ranch dressing","salad dressing","bbq sauce","hot sauce","sriracha","soy sauce","worcestershire sauce",
  // Frozen foods
  "ice cream","frozen pizza","frozen vegetables","frozen fruit","frozen waffles","frozen dinner","tv dinner"
] as const;

const LABEL_MAP: Record<string, string> = {
  // Keep specific product names and brands as-is
  "strawberry jam": "strawberry jam",
  "grape jam": "grape jam", 
  "raspberry jam": "raspberry jam",
  "blueberry jam": "blueberry jam",
  "welch's grape jelly": "Welch's grape jelly",
  "smuckers jam": "Smucker's jam",
  "jif peanut butter": "Jif peanut butter",
  "skippy peanut butter": "Skippy peanut butter",
  "kraft peanut butter": "Kraft peanut butter",
  "wonder bread": "Wonder Bread",
  "pepperidge farm bread": "Pepperidge Farm bread",
  "dave's killer bread": "Dave's Killer Bread",
  "uncle ben's rice": "Uncle Ben's rice",
  "minute rice": "Minute Rice",
  "barilla pasta": "Barilla pasta",
  "ronzoni pasta": "Ronzoni pasta",
  "de cecco pasta": "De Cecco pasta",
  "kraft mac and cheese": "Kraft Mac & Cheese",
  "quaker oats": "Quaker Oats",
  // Cereal brands
  "cheerios": "Cheerios",
  "honey nut cheerios": "Honey Nut Cheerios",
  "frosted cheerios": "Frosted Cheerios",
  "apple cinnamon cheerios": "Apple Cinnamon Cheerios",
  "frosted flakes": "Frosted Flakes",
  "corn flakes": "Corn Flakes",
  "kellogg's corn flakes": "Kellogg's Corn Flakes",
  "lucky charms": "Lucky Charms",
  "fruit loops": "Froot Loops",
  "froot loops": "Froot Loops",
  "cocoa puffs": "Cocoa Puffs",
  "trix cereal": "Trix",
  "cinnamon toast crunch": "Cinnamon Toast Crunch",
  "honey bunches of oats": "Honey Bunches of Oats",
  "raisin bran": "Raisin Bran",
  "frosted mini wheats": "Frosted Mini Wheats",
  "grape nuts": "Grape Nuts",
  "special k": "Special K",
  "rice krispies": "Rice Krispies",
  "chex cereal": "Chex",
  "life cereal": "Life Cereal",
  "cap'n crunch": "Cap'n Crunch",
  "captain crunch": "Cap'n Crunch",
  "kellogg's cereal": "Kellogg's cereal",
  "general mills cereal": "General Mills cereal",
  "post cereal": "Post cereal",
  "quaker cereal": "Quaker cereal",
  "oatmeal cereal": "oatmeal",
  "granola cereal": "granola",
  // Soda brands
  "coca cola": "Coca-Cola",
  "coke": "Coca-Cola",
  "diet coke": "Diet Coke",
  "pepsi": "Pepsi",
  "diet pepsi": "Diet Pepsi",
  "sprite": "Sprite",
  "7up": "7UP",
  "mountain dew": "Mountain Dew",
  "dr pepper": "Dr Pepper",
  "fanta": "Fanta",
  "root beer": "root beer",
  "ginger ale": "ginger ale",
  "la croix": "LaCroix",
  "red bull": "Red Bull",
  "monster energy": "Monster Energy",
  "gatorade": "Gatorade",
  "powerade": "Powerade",
  // Jello
  "jello": "Jello",
  "jell-o": "Jell-O",
  "gelatin dessert": "Jello",
  "jello cups": "Jello cups",
  "jello mix": "Jello mix",
  "cool whip": "Cool Whip",
  // Bagels
  "thomas bagel": "Thomas' Bagel",
  "everything bagel": "everything bagel",
  "plain bagel": "plain bagel",
  "sesame bagel": "sesame bagel",
  "cinnamon raisin bagel": "cinnamon raisin bagel",
  // Pasta
  "penne pasta": "penne",
  "bow tie pasta": "farfalle",
  "angel hair pasta": "angel hair",
  "shells pasta": "pasta shells",
  "elbow macaroni": "elbow macaroni",
  // Soup brands
  "campbell's soup": "Campbell's soup",
  // Sauce brands
  "prego sauce": "Prego sauce",
  "ragu sauce": "Ragú sauce",
  // Generic fallbacks for common variations
  "jam": "jam",
  "jelly": "jelly",
  "preserves": "preserves",
  "spread": "spread",
  "soda can": "soda",
  "soda bottle": "soda",
  "2 liter soda": "soda",
  "diet soda": "diet soda",
  "zero sugar soda": "zero sugar soda"
};

// Extract base product word to deduplicate similar items (e.g., "strawberry jam" -> "jam")
function getBaseProductWord(label: string): string {
  const words = label.toLowerCase().split(' ');
  // Common product category words that indicate the same product type
  const categoryWords = [
    'jam', 'jelly', 'butter', 'milk', 'yogurt', 'cheese', 'bread', 'rice', 'pasta', 
    'cereal', 'eggs', 'apple', 'banana', 'orange', 'tomato', 'potato', 'onion', 
    'carrot', 'pepper', 'soda', 'cola', 'juice', 'bagel', 'jello', 'gelatin',
    'soup', 'beans', 'chips', 'crackers', 'cookies', 'noodles', 'sauce'
  ];
  
  for (const word of words) {
    if (categoryWords.includes(word)) {
      return word;
    }
  }
  // If no category word found, use the full label
  return label.toLowerCase();
}

function normalize(label: string): string {
  const s = label.toLowerCase().trim();
  // Return mapped value if exists, otherwise return original casing preserved for brands
  const mapped = LABEL_MAP[s];
  if (mapped) return mapped;
  
  // For unrecognized items, preserve some capitalization for brand-like terms
  if (s.includes("'s") || s.includes("&")) {
    return s.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  return s;
}

async function getZeroShot() {
  if (!zslPromise) {
    zslPromise = pipeline(
      "zero-shot-image-classification",
      // CLIP model available for browsers
      "Xenova/clip-vit-base-patch16",
      { device: "webgpu" }
    ).catch(() => pipeline("zero-shot-image-classification", "Xenova/clip-vit-base-patch16"));
  }
  return zslPromise;
}

async function getImagenet() {
  if (!imagenetPromise) {
    imagenetPromise = pipeline(
      "image-classification",
      "onnx-community/mobilenetv4_conv_small.e2400_r224_in1k",
      { device: "webgpu" }
    ).catch(() => pipeline("image-classification", "onnx-community/mobilenetv4_conv_small.e2400_r224_in1k"));
  }
  return imagenetPromise;
}

export async function detectFoodItemsFromDataUrl(dataUrl: string): Promise<string[]> {
  // 1) Try zero-shot with constrained food labels
  try {
    const zsl = await getZeroShot();
    const outputs = await zsl(dataUrl, CANDIDATE_LABELS as unknown as string[], {
      hypothesis_template: "a photo of {}",
    });

    // outputs is an array of {label, score}, already filtered to our labels
    const allResults = (Array.isArray(outputs) ? outputs : [])
      .filter((r: any) => typeof r?.label === "string" && typeof r?.score === "number")
      .sort((a: any, b: any) => b.score - a.score);

    // Take top result and any significantly different items
    // Avoid duplicate variations of the same product (e.g., multiple jam types for one jar)
    const seen = new Set<string>();
    const filtered: string[] = [];
    
    for (const r of allResults) {
      if (r.score < 0.05) continue;
      
      const label = normalize(r.label);
      const baseWord = getBaseProductWord(label);
      
      // Skip if we already have an item with the same base product
      if (seen.has(baseWord)) continue;
      
      seen.add(baseWord);
      filtered.push(label);
      
      // Limit to top 5 distinct products
      if (filtered.length >= 5) break;
    }

    // If no results above threshold, take just the top result
    if (filtered.length === 0 && allResults.length > 0) {
      filtered.push(normalize(allResults[0].label));
    }

    if (filtered.length) return filtered;
  } catch (err) {
    console.warn("Zero-shot classification failed, falling back to ImageNet:", err);
  }

  // 2) Fallback: generic classifier + food-word filter
  try {
    const clf = await getImagenet();
    const result = await clf(dataUrl, { topk: 10 });
    const foodNouns = new Set([
      "apple","banana","orange","lemon","lime","grapes","pear","peach","plum","strawberry","blueberry","raspberry",
      "tomato","potato","carrot","onion","garlic","cucumber","broccoli","cauliflower","lettuce","spinach","kale","cabbage","pepper",
      "bread","bagel","tortilla","pita","rice","pasta","spaghetti","penne","macaroni","linguine","fettuccine","rigatoni","rotini","noodles","oats","cereal","flour",
      "milk","yogurt","cheese","butter","cream","eggs",
      "beans","chickpeas","lentils","tomato sauce","canned tomatoes","tuna","salmon","sardines","corn","peas","broth",
      "chicken","beef","pork","ham","bacon","sausage","tofu",
      "olive oil","oil","salt","pepper","sugar","honey","vinegar","soy sauce","ketchup","mustard","mayonnaise","peanut butter","jam",
      "chocolate","coffee","tea","nuts","almonds","peanuts","walnuts","cashews","chips","crackers","cookies","pretzels",
      "soda","cola","juice","water","gatorade","energy drink",
      "jello","gelatin","pudding",
      "soup","salsa","sauce",
      "ice cream","frozen pizza",
    ]);

    const labels = (Array.isArray(result) ? result : [])
      .filter((r: any) => typeof r?.label === "string" && typeof r?.score === "number")
      .filter((r: any) => r.score >= 0.15)
      .map((r: any) => r.label.toLowerCase())
      .map((s: string) => s.split(",")[0]) // take first synonym
      .map((s: string) => s.replace(/\(.*?\)/g, "").replace(/_/g, " ").trim())
      .map((s: string) => {
        for (const noun of foodNouns) {
          if (new RegExp(`\\b${noun}\\b`).test(s)) return noun;
        }
        return "";
      })
      .filter(Boolean)
      .map(normalize);

    const uniq = Array.from(new Set(labels));
    return uniq.slice(0, 10);
  } catch (e) {
    console.error("Fallback ImageNet classification failed:", e);
    return [];
  }
}
