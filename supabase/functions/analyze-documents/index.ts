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

// Analyze documents and generate topics based on content
async function generateTopicsFromDocuments(supabase: any, content: string, userId: string) {
  try {
    const systemPrompt = `You are an expert interview preparation coach for data engineers. Analyze the provided documents (resume, job description, supporting documents) and generate structured interview preparation topics. Each topic should be specific, relevant, and actionable.`;

    const userPrompt = `GOAL:
Generate interview preparation topics based on the following documents:

DOCUMENTS:
${content}

REQUIREMENTS:
1. Create 8-12 specific topics that would be valuable for interview preparation
2. Each topic should be focused and actionable
3. Include a mix of technical, behavioral, and project-based topics
4. Topics should be relevant to the specific role and company mentioned in the documents
5. Use specific technologies, frameworks, and concepts mentioned in the documents

OUTPUT FORMAT (JSON only):
{
  "topics": [
    {
      "title": "Topic Title",
      "slug": "topic-slug",
      "category": "Technical|Behavioral|Projects|Architecture|Leadership",
      "icon_name": "appropriate-icon-name",
      "color": "blue|green|red|yellow|purple|orange|pink|indigo",
      "sort_order": 1,
      "description": "Brief description of what this topic covers",
      "key_points": ["Key point 1", "Key point 2", "Key point 3"]
    }
  ]
}

EXAMPLES OF GOOD TOPICS:
- "Introduction & Summary" (Behavioral)
- "Apache Kafka Stream Processing" (Technical)
- "Real-time Data Pipeline Architecture" (Architecture)
- "Team Leadership & Mentoring" (Leadership)
- "AWS Redshift Performance Optimization" (Technical)
- "Cross-functional Collaboration" (Behavioral)

Make topics specific to the technologies, projects, and experiences mentioned in the documents.`;

    const rawContent = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], POWERFUL_MODEL, 3000);
    
    console.log('Raw OpenAI response for document analysis:', rawContent);

    const parsedContent = parseAIResponse(rawContent, 'document analysis');
    const { topics } = parsedContent;

    if (!topics || !Array.isArray(topics)) {
      throw new Error('Invalid topics format from AI');
    }

    // Create topics in database, checking for duplicates first
    const createdTopics = [];
    for (const topic of topics) {
      // Check if topic already exists for this user
      const { data: existingTopic } = await supabase
        .from('topics')
        .select('id, title')
        .eq('user_id', userId)
        .eq('slug', topic.slug)
        .single();

      let topicData;
      if (existingTopic) {
        console.log(`Topic ${topic.slug} already exists for user, skipping creation`);
        topicData = existingTopic;
      } else {
        // Create new topic (structure only, no content)
        const { data: newTopic, error: topicError } = await supabase
          .from('topics')
          .insert([{
            user_id: userId,
            title: topic.title,
            slug: topic.slug,
            category: topic.category,
            icon_name: topic.icon_name,
            color: topic.color,
            sort_order: topic.sort_order,
          }])
          .select()
          .single();

        if (topicError) {
          console.error('Error creating topic:', topicError);
          continue;
        }
        
        topicData = newTopic;
      }

      createdTopics.push(topicData);
    }

    return createdTopics;

  } catch (error) {
    console.error('Error in generateTopicsFromDocuments:', error);
    throw error;
  }
}

// Main handler
serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { content, sessionId } = await req.json();
    
    if (!content) {
      return errorResponse('Document content is required', 400);
    }

    const supabase = createSupabaseClient();
    const user = await authenticateUser(req, supabase);
    
    const createdTopics = await generateTopicsFromDocuments(supabase, content, user.id);
    
    return successResponse({ 
      success: true, 
      topicsCreated: createdTopics.length,
      topics: createdTopics,
      sessionId
    });

  } catch (error) {
    console.error('Error in analyze-documents function:', error);
    return errorResponse(error.message);
  }
});