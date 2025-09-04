import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  createSupabaseClient, 
  authenticateUser, 
  callOpenAI, 
  parseAIResponse, 
  successResponse, 
  errorResponse, 
  handleCors,
  POWERFUL_MODEL
} from "../_shared/utils.ts";

// Generate custom topic with content
async function createCustomTopicWithContent(supabase: any, title: string, category: string, sourceNotes: string, userId: string) {
  try {
    // Generate slug from title
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Map category to icon and color
    const categoryMap: { [key: string]: { icon: string, color: string } } = {
      'Technical': { icon: 'code', color: 'purple' },
      'Behavioral': { icon: 'user', color: 'blue' },
      'Projects': { icon: 'target', color: 'green' },
      'Architecture': { icon: 'server', color: 'indigo' },
      'Leadership': { icon: 'users', color: 'orange' }
    };

    const { icon, color } = categoryMap[category] || { icon: 'brain', color: 'pink' };

    // Get current max sort order
    const { data: existingTopics } = await supabase
      .from('topics')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = existingTopics && existingTopics.length > 0 
      ? existingTopics[0].sort_order + 1 
      : 1;

    // Create topic
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .insert([{
        title,
        slug,
        category,
        icon_name: icon,
        color,
        sort_order: nextSortOrder,
        user_id: userId
      }])
      .select()
      .single();

    if (topicError) {
      throw topicError;
    }

    // Generate content for the topic
    const systemPrompt = `You are an interview coach for a senior data engineer. Write outputs that are concise, technically credible, and easy to speak aloud. Use simple sentences, minimal filler, and include concrete details (technologies, metrics, architecture). Maintain a confident but humble tone. Avoid buzzword fluff.`;

    const userPrompt = `GOAL:
Generate interview preparation content for the custom topic: "${title}" in category "${category}".

SOURCE NOTES:
${sourceNotes}

OUTPUT FORMAT (JSON only):
{
  "key_points": [
    "3-5 specific, actionable bullet points; 10-20 words each; include concrete technologies, metrics, or achievements when possible",
    "Focus on technical details, business impact, or leadership examples relevant to '${title}'",
    "Make each point interview-ready and easy to expand upon"
  ],
  "script": "A 60-120 second first-person narrative that tells a story. Start with context, explain the challenge, describe your approach with specific technologies/methods, and mention the impact. Be conversational but technical. Avoid buzzwords - use concrete examples.",
  "cross_questions": [
    "Follow-up question 1 that an interviewer would ask about '${title}'",
    "Technical deep-dive question about implementation details",
    "Situational question about challenges or trade-offs",
    "Follow-up about scale, performance, or optimization"
  ]
}

QUALITY STANDARDS:
- All content should be specific and actionable, not generic
- Cross-questions should be realistic follow-ups an interviewer would actually ask
- Create believable data engineer scenarios and solutions
- Focus on the data engineering domain: pipelines, databases, cloud platforms, scalability, data quality
- ALWAYS include exactly 4 cross_questions for each topic`;

    const rawContent = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], POWERFUL_MODEL, 2000);

    const parsedContent = parseAIResponse(rawContent, 'custom topic content generation');
    const { key_points, script, cross_questions } = parsedContent;

    // Ensure cross_questions is properly formatted
    let processedCrossQuestions = [];
    if (Array.isArray(cross_questions)) {
      processedCrossQuestions = cross_questions.filter(q => q && typeof q === 'string' && q.trim().length > 0);
    }
    
    if (processedCrossQuestions.length === 0) {
      processedCrossQuestions = [
        `Can you elaborate on your experience with ${title.toLowerCase()}?`,
        `What challenges did you face when working on ${title.toLowerCase()}?`,
        `How did you measure success in your ${title.toLowerCase()} projects?`,
        `What would you do differently if you had to approach ${title.toLowerCase()} again?`
      ];
    }

    // Create content version
    const { data: version, error: contentError } = await supabase
      .from('topic_content_versions')
      .insert([{
        topic_id: topic.id,
        user_id: userId,
        source_notes: sourceNotes,
        bullets: key_points || [],
        script: script || '',
        cross_questions: processedCrossQuestions,
        meta: { generated: true, custom: true }
      }])
      .select()
      .single();

    if (contentError) {
      throw contentError;
    }

    // Set as current version
    await supabase
      .from('topic_current_version')
      .upsert({ 
        topic_id: topic.id, 
        version_id: version.id, 
        user_id: userId 
      });

    return { topic, version };

  } catch (error) {
    console.error('Error creating custom topic with content:', error);
    throw error;
  }
}

// Main handler
serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { title, category, sourceNotes } = await req.json();
    
    if (!title || !category) {
      return errorResponse('Title and category are required', 400);
    }

    const supabase = createSupabaseClient();
    const user = await authenticateUser(req, supabase);
    
    const { topic, version } = await createCustomTopicWithContent(
      supabase, 
      title, 
      category, 
      sourceNotes || 'Custom topic for interview preparation', 
      user.id
    );
    
    return successResponse({ 
      success: true, 
      message: 'Custom topic created successfully with content',
      topic,
      version
    });

  } catch (error) {
    console.error('Error in create-custom-topic function:', error);
    return errorResponse(error.message);
  }
});