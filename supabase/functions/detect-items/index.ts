import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

function dataUrlToParts(dataUrl: string): { mediaType: string; base64: string } {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) throw new Error("Invalid data URL");
  return { mediaType: match[1] || "image/jpeg", base64: match[2] };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not set in Supabase" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    const { image } = await req.json();
    if (!image) {
      return new Response(
        JSON.stringify({ error: "Missing required field: image (data URL)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const { mediaType, base64 } = dataUrlToParts(image);

    const body = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text:
                "Identify the grocery and household PRODUCTS visible in this image. Return the product name only — not the container, packaging, or physical description. Examples: a glass jar of Smuckers strawberry jam → 'Smuckers strawberry jam', a cardboard carton of milk → 'milk', a plastic bottle of olive oil → 'Kirkland olive oil'. Return ONLY valid JSON in this format: {\"items\":[\"item1\",\"item2\",...]}. List each distinct product once. Exclude people, pets, appliances, and furniture.",
            },
          ],
        },
      ],
    } as const;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", errText);
      console.error("Anthropic error status:", response.status);  // ← add this
      console.error("Anthropic error body:", errText);            // ← add this
      
      return new Response(
        JSON.stringify({ error: "Anthropic request failed", details: errText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text ?? "{}";

    let parsed: { items?: string[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = String(content).match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {}
      }
    }

    const items = Array.isArray(parsed.items)
      ? parsed.items.filter((s) => typeof s === "string").map((s) => s.trim()).filter(Boolean)
      : [];

    console.log("Detected items:", items);

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("detect-items (Claude) error:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
