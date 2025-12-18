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
  "strawberry jam","grape jam","raspberry jam","blueberry jam","apricot jam","peach jam","orange marmalade","peanut butter","almond butter","nutella",
  // Honey varieties and brands
  "honey","honey bottle","honey jar","honey bear","honey bear bottle","clover honey","raw honey","organic honey","manuka honey","raw manuka honey",
  "lavender honey","wildflower honey","pure honey","raw unfiltered honey","local honey",
  "good & gather honey","kirkland honey","kirkland organic honey","golden blossom honey","nature nate's honey","gefen honey",
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
  // Bagel varieties and brands
  "bagel","bagels","bagel bag","plain bagel","everything bagel","sesame bagel","cinnamon raisin bagel","onion bagel","poppy seed bagel","blueberry bagel","asiago bagel",
  "thomas bagel","thomas' bagels","thomas plain bagel","sara lee bagels","sara lee blueberry bagels","dave's killer bread bagels","dave's killer bread cinnamon raisin bagels",
  "mini bagels","whole wheat bagel","multigrain bagel","egg bagel",
  "tortilla","flour tortilla","corn tortilla","whole wheat tortilla","mission tortilla","old el paso tortilla",
  "pita","pita bread","naan","flatbread",
  "rice","white rice","brown rice","jasmine rice","basmati rice","wild rice","uncle ben's rice","minute rice",
  // Pasta varieties
  "pasta","spaghetti","penne","penne pasta","macaroni","linguine","fettuccine","angel hair pasta","rigatoni","rotini","farfalle","bow tie pasta","lasagna noodles","orzo","ziti","shells pasta","elbow macaroni",
  "barilla pasta","barilla spaghetti","barilla penne","kraft mac and cheese","ronzoni pasta","de cecco pasta",
  "noodles","egg noodles","ramen noodles","rice noodles","instant noodles","udon noodles","soba noodles","lo mein noodles",
  "oats","rolled oats","steel cut oats","instant oats","quaker oats","oatmeal","quaker oatmeal","quaker instant oatmeal","quaker oatmeal cereal",
  // Cereal varieties and brands
  "cereal","cereal box","breakfast cereal",
  // Quaker
  "quaker oats","quaker quick oats","quaker 1 minute oats","quaker old fashioned oats","quaker instant oatmeal",
  // Cheerios (General Mills)
  "cheerios","cheerios cereal","original cheerios","honey nut cheerios","frosted cheerios","apple cinnamon cheerios","multigrain cheerios",
  // Kellogg's cereals
  "corn flakes","kellogg's corn flakes","frosted flakes","kellogg's frosted flakes",
  "froot loops","fruit loops","kellogg's froot loops",
  "frosted mini wheats","kellogg's frosted mini wheats","mini wheats","frosted mini wheats original",
  "raisin bran","kellogg's raisin bran","special k","kellogg's special k",
  "rice krispies","kellogg's rice krispies",
  // General Mills cereals
  "lucky charms","lucky charms cereal","lucky charms marshmallows",
  "cinnamon toast crunch","cocoa puffs","trix cereal","golden grahams","wheaties","total cereal","reese's puffs",
  // Post cereals
  "honey bunches of oats","honey bunches of oats with almonds","honey bunches of oats with honey roasted",
  "cocoa pebbles","fruity pebbles","grape nuts","post grape nuts","raisin bran post",
  "shredded wheat","post shredded wheat","great grains",
  // Other cereals
  "chex cereal","life cereal","cap'n crunch","captain crunch","quaker life cereal",
  "granola","granola cereal","muesli","oatmeal cereal","hot cereal","cold cereal",
  "kellogg's cereal","general mills cereal","post cereal","quaker cereal",
  "flour","all purpose flour","bread flour","whole wheat flour","king arthur flour",
  // Beverages - Soda and drinks
  "soda","cola","coca cola","coke","pepsi","sprite","7up","7 up","seven up","mountain dew","dr pepper","fanta","root beer",
  "ginger ale","club soda","tonic water","sparkling water","seltzer","la croix",
  "soda can","soda bottle","2 liter soda","diet soda","diet coke","diet pepsi","zero sugar soda",
  "juice","orange juice","apple juice","grape juice","cranberry juice","tomato juice","lemonade",
  "iced tea","sweet tea","green tea","energy drink","red bull","monster energy","gatorade","powerade",
  "water bottle","bottled water","spring water","mineral water","voss water","fiji water","evian water","dasani water","aquafina water","smart water",
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
  "ice cream","frozen pizza","frozen vegetables","frozen fruit","frozen waffles","frozen dinner","tv dinner",
  // Household items
  "paper towels","kitchen towels","paper towel roll","bounty paper towels","viva paper towels",
  "toilet paper","toilet tissue","charmin toilet paper","scott toilet paper",
  "napkins","paper napkins","tissues","kleenex tissues","facial tissues",
  "trash bags","garbage bags","glad trash bags","hefty trash bags",
  "aluminum foil","plastic wrap","saran wrap","ziploc bags","storage bags","sandwich bags",
  "dish soap","dishwashing liquid","dawn dish soap","palmolive dish soap",
  "laundry detergent","tide detergent","all detergent","fabric softener",
  "cleaning spray","all purpose cleaner","clorox wipes","lysol wipes","disinfectant wipes",
  "sponge","kitchen sponge","scrub brush",
  "candles","scented candles","batteries","light bulbs"
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
  "barilla spaghetti": "Barilla spaghetti",
  "barilla penne": "Barilla penne",
  "ronzoni pasta": "Ronzoni pasta",
  "de cecco pasta": "De Cecco pasta",
  "kraft mac and cheese": "Kraft Mac & Cheese",
  // Cereal brands - Quaker
  "quaker oats": "Quaker Oats",
  "quaker oatmeal": "Quaker Oatmeal",
  "quaker oatmeal cereal": "Quaker Oatmeal",
  "quaker quick oats": "Quaker Quick Oats",
  "quaker 1 minute oats": "Quaker Quick Oats",
  "quaker old fashioned oats": "Quaker Old Fashioned Oats",
  "quaker instant oatmeal": "Quaker Instant Oatmeal",
  // Honey brands
  "honey": "honey",
  "honey bottle": "honey",
  "honey jar": "honey",
  "honey bear": "honey",
  "honey bear bottle": "honey",
  "clover honey": "clover honey",
  "raw honey": "raw honey",
  "organic honey": "organic honey",
  "manuka honey": "Manuka honey",
  "raw manuka honey": "Manuka honey",
  "lavender honey": "lavender honey",
  "wildflower honey": "wildflower honey",
  "pure honey": "honey",
  "raw unfiltered honey": "raw honey",
  "local honey": "honey",
  "good & gather honey": "Good & Gather honey",
  "kirkland honey": "Kirkland honey",
  "kirkland organic honey": "Kirkland Organic honey",
  "golden blossom honey": "Golden Blossom honey",
  "nature nate's honey": "Nature Nate's honey",
  "gefen honey": "Gefen honey",
  // Cereal brands - Cheerios
  "cheerios": "Cheerios",
  "cheerios cereal": "Cheerios",
  "original cheerios": "Cheerios",
  "honey nut cheerios": "Honey Nut Cheerios",
  "frosted cheerios": "Frosted Cheerios",
  "apple cinnamon cheerios": "Apple Cinnamon Cheerios",
  "multigrain cheerios": "Multigrain Cheerios",
  // Cereal brands - Kellogg's
  "frosted flakes": "Frosted Flakes",
  "kellogg's frosted flakes": "Kellogg's Frosted Flakes",
  "corn flakes": "Corn Flakes",
  "kellogg's corn flakes": "Kellogg's Corn Flakes",
  "froot loops": "Froot Loops",
  "fruit loops": "Froot Loops",
  "kellogg's froot loops": "Kellogg's Froot Loops",
  "frosted mini wheats": "Frosted Mini Wheats",
  "kellogg's frosted mini wheats": "Kellogg's Frosted Mini Wheats",
  "mini wheats": "Frosted Mini Wheats",
  "frosted mini wheats original": "Frosted Mini Wheats",
  "raisin bran": "Raisin Bran",
  "kellogg's raisin bran": "Kellogg's Raisin Bran",
  "special k": "Special K",
  "kellogg's special k": "Kellogg's Special K",
  "rice krispies": "Rice Krispies",
  "kellogg's rice krispies": "Kellogg's Rice Krispies",
  // Cereal brands - General Mills
  "lucky charms": "Lucky Charms",
  "lucky charms cereal": "Lucky Charms",
  "lucky charms marshmallows": "Lucky Charms",
  "cinnamon toast crunch": "Cinnamon Toast Crunch",
  "cocoa puffs": "Cocoa Puffs",
  "trix cereal": "Trix",
  "golden grahams": "Golden Grahams",
  "wheaties": "Wheaties",
  "total cereal": "Total",
  "reese's puffs": "Reese's Puffs",
  // Cereal brands - Post
  "honey bunches of oats": "Honey Bunches of Oats",
  "honey bunches of oats with almonds": "Honey Bunches of Oats with Almonds",
  "honey bunches of oats with honey roasted": "Honey Bunches of Oats",
  "cocoa pebbles": "Cocoa Pebbles",
  "fruity pebbles": "Fruity Pebbles",
  "grape nuts": "Grape Nuts",
  "post grape nuts": "Post Grape Nuts",
  "raisin bran post": "Post Raisin Bran",
  "shredded wheat": "Shredded Wheat",
  "post shredded wheat": "Post Shredded Wheat",
  "great grains": "Great Grains",
  // Other cereals
  "chex cereal": "Chex",
  "life cereal": "Life Cereal",
  "cap'n crunch": "Cap'n Crunch",
  "captain crunch": "Cap'n Crunch",
  "quaker life cereal": "Quaker Life Cereal",
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
  "7 up": "7UP",
  "seven up": "7UP",
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
  // Water brands
  "voss water": "Voss water",
  "fiji water": "Fiji water",
  "evian water": "Evian water",
  "dasani water": "Dasani water",
  "aquafina water": "Aquafina water",
  "smart water": "Smartwater",
  // Jello
  "jello": "Jello",
  "jell-o": "Jell-O",
  "gelatin dessert": "Jello",
  "jello cups": "Jello cups",
  "jello mix": "Jello mix",
  "cool whip": "Cool Whip",
  // Bagels
  "bagel": "bagels",
  "bagels": "bagels",
  "bagel bag": "bagels",
  "thomas bagel": "Thomas' Bagels",
  "thomas' bagels": "Thomas' Bagels",
  "thomas plain bagel": "Thomas' Plain Bagels",
  "sara lee bagels": "Sara Lee Bagels",
  "sara lee blueberry bagels": "Sara Lee Blueberry Bagels",
  "dave's killer bread bagels": "Dave's Killer Bread Bagels",
  "dave's killer bread cinnamon raisin bagels": "Dave's Killer Bread Cinnamon Raisin Bagels",
  "everything bagel": "everything bagel",
  "plain bagel": "plain bagel",
  "sesame bagel": "sesame bagel",
  "cinnamon raisin bagel": "cinnamon raisin bagel",
  "blueberry bagel": "blueberry bagel",
  "mini bagels": "mini bagels",
  "whole wheat bagel": "whole wheat bagel",
  "multigrain bagel": "multigrain bagel",
  "egg bagel": "egg bagel",
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
  // Household items
  "paper towels": "paper towels",
  "kitchen towels": "paper towels",
  "paper towel roll": "paper towels",
  "bounty paper towels": "Bounty paper towels",
  "viva paper towels": "Viva paper towels",
  "toilet paper": "toilet paper",
  "toilet tissue": "toilet paper",
  "charmin toilet paper": "Charmin toilet paper",
  "scott toilet paper": "Scott toilet paper",
  "kleenex tissues": "Kleenex tissues",
  "facial tissues": "tissues",
  "glad trash bags": "Glad trash bags",
  "hefty trash bags": "Hefty trash bags",
  "saran wrap": "plastic wrap",
  "ziploc bags": "Ziploc bags",
  "dawn dish soap": "Dawn dish soap",
  "palmolive dish soap": "Palmolive dish soap",
  "tide detergent": "Tide detergent",
  "all detergent": "All detergent",
  "clorox wipes": "Clorox wipes",
  "lysol wipes": "Lysol wipes",
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
    'soup', 'beans', 'chips', 'crackers', 'cookies', 'noodles', 'sauce',
    'water', 'honey', 'oatmeal', 'towels', 'tissues', 'detergent', 'soap', 'wipes'
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
      "bread","bagel","tortilla","pita","rice","pasta","spaghetti","penne","macaroni","linguine","fettuccine","rigatoni","rotini","noodles","oats","oatmeal","cereal","flour",
      "milk","yogurt","cheese","butter","cream","eggs",
      "beans","chickpeas","lentils","tomato sauce","canned tomatoes","tuna","salmon","sardines","corn","peas","broth",
      "chicken","beef","pork","ham","bacon","sausage","tofu",
      "olive oil","oil","salt","pepper","sugar","honey","vinegar","soy sauce","ketchup","mustard","mayonnaise","peanut butter","jam",
      "chocolate","coffee","tea","nuts","almonds","peanuts","walnuts","cashews","chips","crackers","cookies","pretzels",
      "soda","cola","juice","water","gatorade","energy drink",
      "jello","gelatin","pudding",
      "soup","salsa","sauce",
      "ice cream","frozen pizza",
      // Household items
      "towel","towels","paper towels","tissue","tissues","toilet paper","napkins",
      "soap","detergent","sponge","foil","wrap","bags",
      "candle","candles","batteries","bulb","bulbs",
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
