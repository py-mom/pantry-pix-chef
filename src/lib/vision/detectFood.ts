import { pipeline, env } from "@huggingface/transformers";

// Lightweight, in-browser food item detection using image classification
// Models are downloaded at runtime and cached by the browser.
// We try WebGPU first for speed and fall back gracefully.

let classifierPromise: Promise<any> | null = null;

env.allowLocalModels = false;
env.useBrowserCache = true;

async function buildClassifier(preferWebGPU = true) {
  try {
    return await pipeline(
      "image-classification",
      // Small, fast ImageNet model available for browsers
      "onnx-community/mobilenetv4_conv_small.e2400_r224_in1k",
      preferWebGPU ? { device: "webgpu" } : undefined,
    );
  } catch (e) {
    if (preferWebGPU) {
      // Fallback to default device if WebGPU isn't available
      return await buildClassifier(false);
    }
    throw e;
  }
}

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = buildClassifier(true);
  }
  return classifierPromise;
}

function normalizeLabel(label: string): string {
  // Lowercase and strip common punctuation / descriptors
  let s = label.toLowerCase();
  // Remove everything after a comma (e.g., "granny smith, apple")
  if (s.includes(",")) s = s.split(",")[0];
  s = s.replace(/\(.*\)/g, "");
  s = s.replace(/_/g, " ").replace(/[^a-z\s-]/g, "").trim();

  // Map some frequent ImageNet labels to pantry-friendly names
  const mappings: Record<string, string> = {
    "granny smith": "apple",
    "bell pepper": "bell pepper",
    "sweet pepper": "bell pepper",
    "hotdog": "hot dog",
    "hamburger": "burger",
    "baguette": "bread",
    "loaf of bread": "bread",
    "edam": "cheese",
    "parmigiano": "cheese",
    "brie": "cheese",
    "cheddar": "cheese",
    "gouda": "cheese",
    "egg": "eggs",
  };

  if (mappings[s]) return mappings[s];

  // If label contains a known food noun, reduce to that noun
  const foodNouns = [
    "apple","banana","orange","lemon","lime","grape","pear","peach","plum","pineapple","mango","strawberry","blueberry","raspberry",
    "tomato","potato","carrot","onion","garlic","cucumber","pepper","chili","broccoli","cauliflower","lettuce","spinach","kale","cabbage",
    "bread","bagel","bun","pasta","noodle","rice","oat","cereal","flour","tortilla",
    "milk","yogurt","cheese","butter","cream","egg","eggs",
    "chicken","beef","pork","fish","shrimp","salmon","tuna","sausage","ham","bacon",
    "oil","olive","salt","sugar","honey","chocolate","coffee","tea","bean","lentil","nut","almond","peanut","walnut","cashew"
  ];

  for (const noun of foodNouns) {
    const re = new RegExp(`\\b${noun}\\b`);
    if (re.test(s)) return noun === "egg" ? "eggs" : noun;
  }

  return s;
}

export async function detectFoodItemsFromDataUrl(dataUrl: string): Promise<string[]> {
  const classifier = await getClassifier();
  const result = await classifier(dataUrl, { topk: 8 });

  const labels = (Array.isArray(result) ? result : [])
    .filter((r: any) => typeof r?.label === "string" && typeof r?.score === "number")
    .filter((r: any) => r.score >= 0.12)
    .map((r: any) => normalizeLabel(r.label))
    .filter(Boolean);

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique = labels.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));

  // Keep a reasonable number of items
  return unique.slice(0, 10);
}
