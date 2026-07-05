import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./_shared-index.ts";

type PlanType = "pro" | "class";
const DEFAULT_GUMROAD_PRO_FULL_URL = "https://myaide.gumroad.com/l/sceqs";
const DEFAULT_GUMROAD_CLASS_FULL_URL = "https://myaide.gumroad.com/l/xtldur";

const isHttpUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https?:\/\//i.test(value);

const getProductFromPayload = (payload: any): any | null => {
  if (payload?.product && typeof payload.product === "object") return payload.product;
  if (Array.isArray(payload?.products) && payload.products.length > 0) return payload.products[0];
  if (payload?.result?.product && typeof payload.result.product === "object") return payload.result.product;
  if (Array.isArray(payload?.result?.products) && payload.result.products.length > 0) return payload.result.products[0];
  return null;
};

const extractProductUrl = (product: any): string | null => {
  const directCandidates = [
    product?.short_url,
    product?.url,
    product?.product_url,
    product?.long_url,
    product?.checkout_url,
  ];

  for (const candidate of directCandidates) {
    if (isHttpUrl(candidate)) return candidate;
  }

  const permalinkCandidates = [
    product?.custom_permalink,
    product?.permalink,
    product?.product_permalink,
    product?.slug,
  ];
  for (const candidate of permalinkCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return `https://gumroad.com/l/${candidate.trim()}`;
    }
  }

  return null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const gumroadAccessToken = Deno.env.get("GUMROAD_ACCESS_TOKEN");
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Missing environment configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan === "class" ? "class" : "pro";
    const planType: PlanType = plan;
    const productId = planType === "class"
      ? Deno.env.get("GUMROAD_CLASS_ID")
      : Deno.env.get("GUMROAD_PRODUCT_ID");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prefer explicit public product URL env if configured.
    const configuredUrl = planType === "class"
      ? Deno.env.get("GUMROAD_CLASS_FULL_URL") || Deno.env.get("GUMROAD_CLASS_URL") || DEFAULT_GUMROAD_CLASS_FULL_URL
      : Deno.env.get("GUMROAD_PRO_FULL_URL") || Deno.env.get("GUMROAD_PRO_URL") || DEFAULT_GUMROAD_PRO_FULL_URL;

    let baseUrl: string | null = isHttpUrl(configuredUrl) ? configuredUrl : null;

    if (!baseUrl) {
      if (!gumroadAccessToken || !productId) {
        return new Response(JSON.stringify({
          error: `Missing Gumroad credentials for resolving product URL for plan ${planType}`,
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const productByIdResp = await fetch(`https://api.gumroad.com/v2/products/${productId}`, {
        headers: { Authorization: `Bearer ${gumroadAccessToken}` },
      });

      if (productByIdResp.ok) {
        const payload = await productByIdResp.json().catch(() => null);
        baseUrl = extractProductUrl(getProductFromPayload(payload));
      }

      if (!baseUrl) {
        const productsResp = await fetch("https://api.gumroad.com/v2/products", {
          headers: { Authorization: `Bearer ${gumroadAccessToken}` },
        });

        if (!productsResp.ok) {
          const details = await productsResp.text();
          return new Response(JSON.stringify({ error: "Unable to query Gumroad products", details }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const payload = await productsResp.json().catch(() => null);
        const products = Array.isArray(payload?.products)
          ? payload.products
          : Array.isArray(payload?.result?.products)
            ? payload.result.products
            : [];

        const targetProduct = products.find((product: any) =>
          String(product?.id || product?.product_id || "") === String(productId)
        );

        baseUrl = extractProductUrl(targetProduct);
      }
    }

    if (!baseUrl) {
      return new Response(JSON.stringify({
        error: "Checkout URL could not be resolved for configured product",
        plan: planType,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productUrl = new URL(baseUrl);
    if (user.email) {
      productUrl.searchParams.set("email", user.email);
    }

    const origin = req.headers.get("origin");
    if (origin && /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/i.test(origin)) {
      productUrl.searchParams.set("success_url", `${origin}/billing?status=success`);
    }

    return new Response(JSON.stringify({
      product_url: productUrl.toString(),
      checkout_url: productUrl.toString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const err = error as Error;
    return new Response(JSON.stringify({ error: err.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
