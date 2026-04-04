// detectFood.ts
// Calls the existing Supabase edge function (detect-items) which proxies to Claude.
// The function expects { image: dataUrl } and returns { items: string[] }.

import { supabase } from "@/integrations/supabase/client";

export async function detectFoodItemsFromDataUrl(dataUrl: string): Promise<string[]> {
  if (!dataUrl || typeof dataUrl !== "string") {
    console.error("Invalid image data provided");
    return [];
  }

  try {
    const { data, error } = await supabase.functions.invoke("detect-items", {
      body: { image: dataUrl }, // full data URL — the function splits it server-side
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
