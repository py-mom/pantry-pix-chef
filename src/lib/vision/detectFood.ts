import { pipeline, env } from "@huggingface/transformers";

// Open-source, in-browser food detection using CLIP zero-shot classification.
// We constrain predictions to pantry/grocery items to avoid nonsense labels
// (e.g., "Komodo dragon"). Falls back to a lightweight ImageNet classifier.

env.allowLocalModels = false;
env.useBrowserCache = true;

let zslPromise: Promise<any> | null = null;
let imagenetPromise: Promise<any> | null = null;

// Curated pantry/grocery vocabulary (keep concise for latency)
const CANDIDATE_LABELS = [
  // Produce
  "apple","banana","orange","lemon","lime","grapes","pear","peach","plum","strawberry","blueberry","raspberry",
  "tomato","potato","carrot","onion","garlic","cucumber","broccoli","cauliflower","lettuce","spinach","kale","cabbage","bell pepper",
  // Bakery & grains
  "bread","bagel","tortilla","pita","rice","pasta","noodles","oats","cereal","flour",
  // Dairy & eggs
  "milk","yogurt","cheese","butter","cream","eggs",
  // Canned & packaged
  "beans","black beans","kidney beans","chickpeas","lentils","tomato sauce","canned tomatoes","tuna","salmon","sardines","corn","peas","broth",
  // Proteins
  "chicken","beef","pork","ham","bacon","sausage","tofu",
  // Oils, condiments, baking
  "olive oil","vegetable oil","salt","pepper","sugar","honey","vinegar","soy sauce","ketchup","mustard","mayonnaise","peanut butter","jam",
  // Snacks & misc
  "chocolate","coffee","tea","nuts","almonds","peanuts","walnuts","cashews","chips",
] as const;

const LABEL_MAP: Record<string, string> = {
  // Map variants to canonical names
  grapes: "grapes",
  "bell pepper": "bell pepper",
  "black beans": "black beans",
  "kidney beans": "kidney beans",
  chickpeas: "chickpeas",
  lentils: "lentils",
  "tomato sauce": "tomato sauce",
  "canned tomatoes": "canned tomatoes",
  tuna: "tuna",
  salmon: "salmon",
  sardines: "sardines",
  peas: "peas",
  broth: "broth",
  ham: "ham",
  bacon: "bacon",
  sausage: "sausage",
  tofu: "tofu",
  "olive oil": "olive oil",
  "vegetable oil": "vegetable oil",
  pepper: "pepper",
  sugar: "sugar",
  honey: "honey",
  vinegar: "vinegar",
  "soy sauce": "soy sauce",
  ketchup: "ketchup",
  mustard: "mustard",
  mayonnaise: "mayonnaise",
  "peanut butter": "peanut butter",
  jam: "jam",
  chocolate: "chocolate",
  coffee: "coffee",
  tea: "tea",
  nuts: "nuts",
  almonds: "almonds",
  peanuts: "peanuts",
  walnuts: "walnuts",
  cashews: "cashews",
  chips: "chips",
};

function normalize(label: string): string {
  const s = label.toLowerCase().trim();
  return LABEL_MAP[s] || s;
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
      .filter((r: any) => r.score >= 0.22) // tune threshold for precision vs recall
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
