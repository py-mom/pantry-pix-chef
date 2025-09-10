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
  "bagel","everything bagel","sesame bagel","plain bagel","cinnamon raisin bagel",
  "tortilla","flour tortilla","corn tortilla","whole wheat tortilla","mission tortilla","old el paso tortilla",
  "pita","pita bread","naan","flatbread",
  "rice","white rice","brown rice","jasmine rice","basmati rice","wild rice","uncle ben's rice","minute rice",
  "pasta","spaghetti","penne pasta","macaroni","linguine","fettuccine","angel hair pasta","barilla pasta","kraft mac and cheese",
  "noodles","egg noodles","ramen noodles","rice noodles","instant noodles",
  "oats","rolled oats","steel cut oats","instant oats","quaker oats","oatmeal",
  "cereal","cheerios","corn flakes","frosted flakes","lucky charms","fruit loops","granola","kellogg's cereal",
  "flour","all purpose flour","bread flour","whole wheat flour","king arthur flour",
  // Dairy & eggs with brands
  "milk","whole milk","2% milk","skim milk","almond milk","soy milk","oat milk","coconut milk",
  "organic milk","lactaid milk","horizon organic milk","silk almond milk","oatly oat milk",
  "yogurt","greek yogurt","vanilla yogurt","strawberry yogurt","plain yogurt","chobani yogurt","dannon yogurt","yoplait yogurt",
  "cheese","cheddar cheese","mozzarella cheese","swiss cheese","american cheese","provolone cheese","parmesan cheese",
  "kraft cheese","tillamook cheese","string cheese","cream cheese","philadelphia cream cheese",
  "butter","salted butter","unsalted butter","organic butter","land o lakes butter","kerrygold butter",
  "cream","heavy cream","half and half","whipping cream","sour cream","cottage cheese",
  "eggs","large eggs","organic eggs","free range eggs","brown eggs","white eggs","cage free eggs"
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
  "kraft mac and cheese": "Kraft Mac & Cheese",
  "quaker oats": "Quaker Oats",
  "cheerios": "Cheerios",
  "frosted flakes": "Frosted Flakes",
  "lucky charms": "Lucky Charms",
  "fruit loops": "Fruit Loops",
  "kellogg's cereal": "Kellogg's cereal",
  "horizon organic milk": "Horizon Organic milk",
  "silk almond milk": "Silk almond milk",
  "oatly oat milk": "Oatly oat milk",
  "chobani yogurt": "Chobani yogurt",
  "dannon yogurt": "Dannon yogurt",
  "yoplait yogurt": "Yoplait yogurt",
  "kraft cheese": "Kraft cheese",
  "tillamook cheese": "Tillamook cheese",
  "philadelphia cream cheese": "Philadelphia cream cheese",
  "land o lakes butter": "Land O'Lakes butter",
  "kerrygold butter": "Kerrygold butter",
  // Generic fallbacks for common variations
  "jam": "jam",
  "jelly": "jelly",
  "preserves": "preserves",
  "spread": "spread"
};

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
    const filtered = (Array.isArray(outputs) ? outputs : [])
      .filter((r: any) => typeof r?.label === "string" && typeof r?.score === "number")
      .filter((r: any) => r.score >= 0.15) // Lower threshold to catch more specific items
      .sort((a: any, b: any) => b.score - a.score)
      .map((r: any) => normalize(r.label));

    const uniq = Array.from(new Set(filtered));
    if (uniq.length) return uniq.slice(0, 10);
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
      "bread","bagel","tortilla","pita","rice","pasta","noodles","oats","cereal","flour",
      "milk","yogurt","cheese","butter","cream","eggs",
      "beans","chickpeas","lentils","tomato sauce","canned tomatoes","tuna","salmon","sardines","corn","peas","broth",
      "chicken","beef","pork","ham","bacon","sausage","tofu",
      "olive oil","oil","salt","pepper","sugar","honey","vinegar","soy sauce","ketchup","mustard","mayonnaise","peanut butter","jam",
      "chocolate","coffee","tea","nuts","almonds","peanuts","walnuts","cashews","chips",
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
