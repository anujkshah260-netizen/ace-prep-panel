import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Model constants
export const POWERFUL_MODEL = 'gpt-4o';
export const EFFICIENT_MODEL = 'gpt-4o-mini';

// CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client interface
export interface SupabaseClient {
  from: (table: string) => any;
  auth: {
    getUser: () => Promise<any>;
  };
}

// Create Supabase client
export function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Authenticate user from request
export async function authenticateUser(req: Request, supabase: SupabaseClient) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid token');
  }
  
  return user;
}

// Call OpenAI API
export async function callOpenAI(messages: any[], model: string = EFFICIENT_MODEL, maxTokens: number = 2000) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Parse AI response (JSON extraction)
export function parseAIResponse(rawContent: string, context: string = 'AI response') {
  try {
    // Try direct JSON parse first
    return JSON.parse(rawContent);
  } catch {
    // Extract JSON from markdown code blocks
    const jsonMatch = rawContent.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error(`Failed to parse JSON from ${context}:`, parseError);
        throw new Error(`Invalid JSON in ${context}`);
      }
    }
    
    console.error(`No valid JSON found in ${context}:`, rawContent);
    throw new Error(`No valid JSON found in ${context}`);
  }
}

// Success response helper
export function successResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Error response helper
export function errorResponse(error: string, status: number = 500) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Handle CORS preflight
export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}