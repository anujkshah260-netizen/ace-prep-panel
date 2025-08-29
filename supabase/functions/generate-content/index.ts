import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topicId, sourceNotes, topicTitle, options = {} } = await req.json();
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // System prompt for interview coaching
    const systemPrompt = `You are an interview coach for a senior data engineer. Write outputs that are concise, technically credible, and easy to speak aloud. Use simple sentences, minimal filler, and include concrete details (technologies, metrics, architecture). Maintain a confident but humble tone. Avoid buzzword fluff.`;

    // User prompt template
    const userPrompt = `GOAL:
Turn the notes into three outputs for the topic: "${topicTitle}".

CONTEXT:
- Candidate background: data engineer; Kafka, Spark, Redshift, Airflow; GCP/AWS; privacy-aware; adtech + fintech exposure.
- Target company context: high-growth startup; business-focused; wants clarity & ownership.

SOURCE NOTES (raw, messy—clean them):
<<<
${sourceNotes}
>>>

OUTPUT FORMAT (JSON only):
{
  "bullets": [
    "3–6 bullets; crisp; each 8–18 words; mention specific tech, design choices, metrics"
  ],
  "script": "A 60–120 second speakable paragraph; simple, confident, first-person; no headings.",
  "cross_questions": [
    {"q": "Likely follow-up question #1", "a": "Concise but specific answer with concrete examples."},
    {"q": "Likely follow-up question #2", "a": "…"},
    {"q": "Likely follow-up question #3", "a": "…"}
  ]
}

STYLE REQUIREMENTS:
- Prefer STAR framing implicitly (Situation→Action→Impact) without labeling it.
- Include at least 2 concrete numbers (e.g., performance %, latency, $ impact) when plausible.
- Use the candidate's stack where possible: Kafka, Spark, Redshift, Airflow, dbt, Looker.
- Keep the language natural to speak. No corporate clichés.`;

    console.log('Calling OpenAI API...');
    
    // Call OpenAI API
    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 2000
      }),
    });

    if (!llmResponse.ok) {
      const error = await llmResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content ?? '{}';
    
    console.log('Raw OpenAI response:', rawContent);

    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', rawContent);
      throw new Error('Invalid response format from AI');
    }

    const { bullets, script, cross_questions } = parsedContent;

    // Get user ID from JWT token
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Invalid auth token');
    }

    // Save to database
    const { data: version, error: insertError } = await supabase
      .from('topic_content_versions')
      .insert([{
        topic_id: topicId,
        user_id: user.id,
        source_notes: sourceNotes,
        bullets: bullets || [],
        script: script || '',
        cross_questions: cross_questions || [],
        meta: { options }
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save content to database');
    }

    // Update current version pointer
    const { error: upsertError } = await supabase
      .from('topic_current_version')
      .upsert({ 
        topic_id: topicId, 
        version_id: version.id, 
        user_id: user.id 
      });

    if (upsertError) {
      console.error('Failed to update current version:', upsertError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      versionId: version.id,
      content: {
        bullets,
        script,
        cross_questions
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-content function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});