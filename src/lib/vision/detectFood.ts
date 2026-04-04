// detectFood.ts
// Calls a Supabase Edge Function (detect-food-items) which proxies to Claude Haiku.
// Direct browser → Anthropic API calls are blocked by CORS, so we route through
// Supabase the same way identify-staples already works.

import { supabase } from "@/integrations/supabase/client";

export async function detectFoodItemsFromDataUrl(dataUrl: string): Promise<string[]> {
  if (!dataUrl || typeof dataUrl !== "string") {
    console.error("Invalid image data provided");
    return [];
  }

  // Split data URL into media type + raw base64
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    console.error("Could not parse data URL");
    return [];
  }

  const mediaType = matches[1];
  const base64Data = matches[2];

  try {
    const { data, error } = await supabase.functions.invoke("detect-food-items", {
      body: { imageBase64: base64Data, mediaType },
    });

    if (error) {
      console.error("Edge function error:", error);
      return [];
    }

    const items: string[] = data?.items ?? [];

    if (!Array.isArray(items)) {
      console.error("Unexpected response format:", data);
      return [];
    }

    return items
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  } catch (err) {
    console.error("detectFoodItemsFromDataUrl failed:", err);
    return [];
  }
}
