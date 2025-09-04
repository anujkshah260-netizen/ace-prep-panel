// Shared utilities for Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Model selection strategy
export const POWERFUL_MODEL = 'gpt-5-2025-08-07';        // For initial generation (best quality)
export const EFFICIENT_MODEL = 'gpt-5-mini-2025-08-07';  // For content editing (cost-effective)

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define proper types for Supabase client
export interface SupabaseClient {
  from: (table: string) => any;
  auth: {
    getUser: (token?: string) => Promise<{ data: { user: any }; error: any }>;
  };
}

// Initialize Supabase client with service role key
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
    throw new Error('Unauthorized');
  }

  return user;
}

// OpenAI API wrapper
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
      max_completion_tokens: maxTokens
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '{}';
}

// Parse JSON with error handling and markdown extraction
export function parseAIResponse(rawContent: string, context: string = 'AI response') {
  try {
    return JSON.parse(rawContent);
  } catch (parseError) {
    console.error(`Failed to parse ${context}:`, rawContent);
    
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        console.log(`Successfully extracted JSON from markdown code block for ${context}`);
        return parsed;
      } catch (secondParseError) {
        console.error(`Failed to parse extracted JSON for ${context}:`, secondParseError);
      }
    }
    
    throw new Error(`Invalid response format from AI for ${context}`);
  }
}

// Standard response helpers
export function successResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(error: string, status: number = 500) {
  return new Response(JSON.stringify({ success: false, error }), {
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