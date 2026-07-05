import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting map (in-memory, resets on cold starts)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // Max requests per window
const RATE_WINDOW_MS = 60000; // 1 minute window

// Allowed form fields (whitelist)
const ALLOWED_FIELDS = ['email', 'sale_id', 'product_id', 'event', 'seller_id', 'product_name', 'permalink', 'product_permalink', 'short_product_id', 'full_name', 'purchaser_id', 'subscription_id', 'variants', 'offer_code', 'test', 'ip_country', 'recurrence', 'is_gift_receiver_purchase', 'refunded', 'disputed', 'dispute_won', 'discover_fee_charged', 'can_contact', 'referrer', 'card', 'order_number', 'sale_timestamp', 'license_key', 'is_recurring_charge', 'is_preorder_authorization', 'affiliate', 'affiliate_email', 'is_gift_sender_purchase', 'gift_price', 'resource_name', 'quantity', 'shipping_information', 'url_params', 'custom_fields', 'price', 'gumroad_fee', 'currency'];

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return false;
  }
  
  record.count++;
  return record.count > RATE_LIMIT;
}

// Robust email validation
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Validate sale ID format (alphanumeric with common separators)
function isValidSaleId(saleId: string): boolean {
  if (!saleId || typeof saleId !== 'string') return false;
  // Gumroad sale IDs are typically alphanumeric, 8-50 chars
  const saleIdRegex = /^[a-zA-Z0-9_-]{6,60}$/;
  return saleIdRegex.test(saleId);
}

// Validate product ID format
function isValidProductId(productId: string): boolean {
  if (!productId || typeof productId !== 'string') return false;
  // Gumroad product IDs are alphanumeric, reasonable length
  const productIdRegex = /^[a-zA-Z0-9_-]{1,50}$/;
  return productIdRegex.test(productId);
}

// Validate text fields (names, etc.) - allow safe characters only
function isValidTextField(text: string): boolean {
  if (!text || typeof text !== 'string') return true; // Optional fields
  // Allow letters, numbers, spaces, and common punctuation
  const safeTextRegex = /^[a-zA-Z0-9\s\-_.,'@#&()]+$/;
  return safeTextRegex.test(text) && text.length <= 200;
}

// Sanitize string input
function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, 500); // Limit length and trim
}

// Verify sale with Gumroad API
async function verifySaleWithGumroad(saleId: string, accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.gumroad.com/v2/sales/${saleId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      console.error(`Gumroad API verification failed with status ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    return data.success === true && data.sale != null;
  } catch (error) {
    console.error("Gumroad API verification error");
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const gumroadProductId = Deno.env.get("GUMROAD_PRODUCT_ID");
    const gumroadAccessToken = Deno.env.get("GUMROAD_ACCESS_TOKEN");

    if (!supabaseUrl || !supabaseServiceKey || !gumroadProductId || !gumroadAccessToken) {
      console.error("Missing required environment configuration");
      return new Response("Service unavailable", {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data with whitelist filtering
    const formData = await req.formData();
    const webhookData: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      if (ALLOWED_FIELDS.includes(key)) {
        webhookData[key] = sanitizeString(value.toString());
      }
    }

    const email = webhookData.email?.toLowerCase().trim();
    const saleId = webhookData.sale_id;
    const productId = webhookData.product_id;
    const event = webhookData.event;

    // Rate limiting by IP or email
    const clientIdentifier = email || req.headers.get('x-forwarded-for') || 'unknown';
    if (isRateLimited(clientIdentifier)) {
      console.warn("Rate limit exceeded");
      return new Response("Too many requests", {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    // Log webhook attempt (excluding sensitive data)
    console.log("Webhook received:", {
      product_id: productId,
      has_sale_id: !!saleId,
      event: event,
      has_email: !!email
    });

    // Validate sale ID format
    if (!isValidSaleId(saleId)) {
      console.warn("Invalid sale_id format");
      return new Response("Invalid request", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    // Validate product ID format
    if (!isValidProductId(productId)) {
      console.warn("Invalid product_id format");
      return new Response("Invalid request", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    // Validate text fields if present
    const fullName = webhookData.full_name;
    const productName = webhookData.product_name;
    if ((fullName && !isValidTextField(fullName)) || (productName && !isValidTextField(productName))) {
      console.warn("Invalid text field format");
      return new Response("Invalid request", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    // Verify product ID matches our Aide Pro plan
    if (productId !== gumroadProductId) {
      console.log("Product mismatch, ignoring");
      return new Response("OK", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    // CRITICAL: Verify the sale is legitimate by checking with Gumroad API
    const isValidSale = await verifySaleWithGumroad(saleId, gumroadAccessToken);
    if (!isValidSale) {
      console.error("Sale verification failed");
      return new Response("Verification failed", {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    console.log("Sale verified successfully");

    // Handle sale event
    if (event === 'sale' || event === 'subscription_payment_succeeded') {
      // Validate email format
      if (!isValidEmail(email || '')) {
        console.error("Invalid email format");
        return new Response("Invalid request", {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }

      // Find user by email
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("User lookup failed");
        return new Response("Processing error", {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }

      const user = authUsers.users.find(u => u.email?.toLowerCase() === email);

      if (!user) {
        console.log("User not found, recording for later");
        // Store the sale for later when user signs up
        await supabase
          .from('subscriptions')
          .insert({
            gumroad_sale_id: saleId,
            gumroad_email: email,
            status: 'pending',
            plan_type: 'pro',
            purchased_at: new Date().toISOString(),
          });
        
        return new Response("OK", {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }

      // Calculate expiration (1 month subscription)
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // Update or create subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          gumroad_sale_id: saleId,
          gumroad_email: email,
          status: 'active',
          plan_type: 'pro',
          purchased_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (subError) {
        console.error("Subscription update failed");
        return new Response("Processing error", {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }

      console.log("User upgraded successfully");
    }

    // Handle refund/cancellation
    if (event === 'refund' || event === 'subscription_cancelled') {
      if (isValidEmail(email || '')) {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const user = authUsers?.users.find(u => u.email?.toLowerCase() === email);

        if (user) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
            })
            .eq('user_id', user.id);
        }
      }
    }

    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  } catch (error) {
    console.error("Webhook processing error");
    return new Response("Processing error", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }
});
