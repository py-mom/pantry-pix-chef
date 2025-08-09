import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not set in Supabase" }),
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

    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract visible grocery/food items from images. Respond ONLY with a JSON object like {\"items\":[\"apple\",\"milk\"]}.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Detect and list the pantry/grocery items clearly visible in this photo. Be concise. Output strictly: {\"items\":[...]} with common item names.",
            },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    } as const;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", errText);
      return new Response(
        JSON.stringify({ error: "OpenAI request failed", details: errText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";

    let parsed: { items?: string[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // Best effort: try to extract JSON
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {}
      }
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("detect-items error:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});