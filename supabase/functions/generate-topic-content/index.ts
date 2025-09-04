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
  EFFICIENT_MODEL
} from "../_shared/utils.ts";

// Generate content for a single topic
async function generateTopicContent(supabase: any, topicId: string, userId: string, sourceContent: string, topicTitle: string) {
  try {
    const systemPrompt = `You are an interview coach for a senior data engineer. Write outputs that are concise, technically credible, and easy to speak aloud. Use simple sentences, minimal filler, and include concrete details (technologies, metrics, architecture). Maintain a confident but humble tone. Avoid buzzword fluff.`;

    // Check if source content is meaningful
    const hasRealContent = sourceContent && 
      sourceContent.length > 50 && 
      !sourceContent.toLowerCase().includes('note:') &&
      !sourceContent.toLowerCase().includes('error extracting') &&
      !sourceContent.toLowerCase().includes('requires integration');

    const userPrompt = `GOAL:
Generate interview preparation content for the topic: "${topicTitle}".

SOURCE CONTENT:
${sourceContent}

CONTENT GUIDANCE:
${hasRealContent ? 
  'Use the specific details from the source content above to create personalized, relevant responses.' : 
  'Source content is limited. Generate realistic data engineer responses for this topic using industry best practices and common scenarios.'
}

OUTPUT FORMAT (JSON only):
{
  "key_points": [
    "3-5 specific, actionable bullet points; 10-20 words each; include concrete technologies, metrics, or achievements when possible",
    "Focus on technical details, business impact, or leadership examples relevant to '${topicTitle}'",
    "Make each point interview-ready and easy to expand upon"
  ],
  "script": "A 60-120 second first-person narrative that tells a story. Start with context, explain the challenge, describe your approach with specific technologies/methods, and mention the impact. Be conversational but technical. Avoid buzzwords - use concrete examples.",
  "cross_questions": [
    "Follow-up question 1 that an interviewer would ask about '${topicTitle}'",
    "Technical deep-dive question about implementation details",
    "Situational question about challenges or trade-offs",
    "Follow-up about scale, performance, or optimization"
  ]
}

QUALITY STANDARDS:
- All content should be specific and actionable, not generic
- Cross-questions should be realistic follow-ups an interviewer would actually ask
- ${hasRealContent ? 'Incorporate details from the source content where relevant' : 'Create believable data engineer scenarios and solutions'}
- Focus on the data engineering domain: pipelines, databases, cloud platforms, scalability, data quality
- ALWAYS include exactly 4 cross_questions for each topic`;

    const rawContent = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], EFFICIENT_MODEL, 2000);
    
    console.log('Raw OpenAI response for topic content:', rawContent);
    
    const parsedContent = parseAIResponse(rawContent, 'topic content generation');
    const { key_points, script, cross_questions } = parsedContent;

    // Ensure cross_questions is an array of strings and validate format
    let processedCrossQuestions = [];
    if (Array.isArray(cross_questions)) {
      processedCrossQuestions = cross_questions.filter(q => q && typeof q === 'string' && q.trim().length > 0);
    }
    
    // Ensure we always have some cross questions for better user experience
    if (processedCrossQuestions.length === 0) {
      processedCrossQuestions = [
        `Can you elaborate on your experience with ${topicTitle.toLowerCase()}?`,
        `What challenges did you face when working on ${topicTitle.toLowerCase()}?`,
        `How did you measure success in your ${topicTitle.toLowerCase()} projects?`,
        `What would you do differently if you had to approach ${topicTitle.toLowerCase()} again?`
      ];
    }

    // Save content to database
    const { data: version, error: insertError } = await supabase
      .from('topic_content_versions')
      .insert([{
        topic_id: topicId,
        user_id: userId,
        source_notes: sourceContent,
        bullets: key_points || [],
        script: script || '',
        cross_questions: processedCrossQuestions,
        meta: { generated: true }
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error for topic content:', insertError);
      throw insertError;
    }

    // Update current version pointer
    await supabase
      .from('topic_current_version')
      .upsert({ 
        topic_id: topicId, 
        version_id: version.id, 
        user_id: userId 
      });

    return version;

  } catch (error) {
    console.error('Error generating topic content:', error);
    throw error;
  }
}

// Main handler
serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { topicId, topicTitle, sourceNotes } = await req.json();
    
    if (!topicId || !topicTitle) {
      return errorResponse('topicId and topicTitle are required', 400);
    }

    const supabase = createSupabaseClient();
    const user = await authenticateUser(req, supabase);
    
    const version = await generateTopicContent(
      supabase, 
      topicId, 
      user.id, 
      sourceNotes || 'Generate content for this interview preparation topic.', 
      topicTitle
    );
    
    return successResponse({ 
      success: true, 
      message: 'Topic content generated successfully',
      version
    });

  } catch (error) {
    console.error('Error in generate-topic-content function:', error);
    return errorResponse(error.message);
  }
});