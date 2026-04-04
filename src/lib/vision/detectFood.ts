// detectFood.ts
// Replaces the on-device CLIP/HuggingFace model with a Claude Haiku vision API call.
// Claude Haiku is fast, cheap, and significantly more accurate at identifying
// real-world pantry items than an in-browser zero-shot classifier.

export async function detectFoodItemsFromDataUrl(dataUrl: string): Promise<string[]> {
  if (!dataUrl || typeof dataUrl !== "string") {
    console.error("Invalid image data provided");
    return [];
  }

  // dataUrl is "data:<mediaType>;base64,<data>"
  // We need to split out the media type and the raw base64 string for the API.
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    console.error("Could not parse data URL");
    return [];
  }

  const mediaType = matches[1] as
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";
  const base64Data = matches[2];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The Anthropic client in Lovable handles auth automatically via the
        // configured API key — no explicit key needed here.
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: `You are a pantry inventory assistant. Look carefully at this image and identify ALL food items, grocery products, beverages, and household consumables you can see.

Be thorough and list every distinct item — include items that are partially visible or in the background. Aim for 10-20 items if they are present.

Rules:
- List each item only once
- Use common grocery store names (e.g. "whole milk", "cheddar cheese", "sourdough bread")
- Include brand names if clearly visible (e.g. "Kirkland olive oil", "Tillamook cheddar")
- Do NOT include non-consumable items (furniture, appliances, people)
- Do NOT include generic descriptions like "food item" or "unknown product"

Return ONLY a JSON array of strings. No explanation, no markdown, no extra text.
Example: ["whole milk", "eggs", "cheddar cheese", "sourdough bread", "orange juice"]`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", response.status, error);
      return [];
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? "";

    // Parse the JSON array from the response
    // Strip any accidental markdown fences just in case
    const cleaned = text.replace(/```json|```/g, "").trim();

    let items: string[] = [];
    try {
      items = JSON.parse(cleaned);
    } catch {
      // If JSON parse fails, try to extract array-like content
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        items = JSON.parse(match[0]);
      }
    }

    if (!Array.isArray(items)) {
      console.error("Unexpected response format:", text);
      return [];
    }

    // Sanitize: ensure all items are non-empty strings
    return items
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  } catch (err) {
    console.error("detectFoodItemsFromDataUrl failed:", err);
    return [];
  }
}
