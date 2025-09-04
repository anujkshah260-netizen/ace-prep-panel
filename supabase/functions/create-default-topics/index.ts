import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  createSupabaseClient, 
  authenticateUser, 
  successResponse, 
  errorResponse, 
  handleCors
} from "../_shared/utils.ts";

// Core topics to create (fast, no AI calls)
const CORE_TOPICS = [
  {
    title: 'Introduction & Summary',
    slug: 'introduction-summary',
    category: 'Behavioral',
    icon_name: 'user',
    color: 'blue',
    sort_order: 1
  },
  {
    title: 'Recent Projects & Experience',
    slug: 'recent-projects-experience', 
    category: 'Projects',
    icon_name: 'target',
    color: 'green',
    sort_order: 2
  },
  {
    title: 'Technical Skills & Technologies',
    slug: 'technical-skills-technologies',
    category: 'Technical', 
    icon_name: 'code',
    color: 'purple',
    sort_order: 3
  },
  {
    title: 'Problem-Solving & Troubleshooting',
    slug: 'problem-solving-troubleshooting',
    category: 'Technical',
    icon_name: 'settings', 
    color: 'orange',
    sort_order: 4
  }
];

// Main handler
serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return errorResponse('userId is required', 400);
    }

    const supabase = createSupabaseClient();
    const user = await authenticateUser(req, supabase);
    
    // Verify userId matches authenticated user
    if (user.id !== userId) {
      return errorResponse('Unauthorized: userId mismatch', 401);
    }

    // Check if user already has topics
    const { data: existingTopics, error: checkError } = await supabase
      .from('topics')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (checkError) {
      throw checkError;
    }

    if (existingTopics && existingTopics.length > 0) {
      return successResponse({ 
        success: true, 
        message: 'Topics already exist',
        topicsCreated: 0
      });
    }

    // Create core topics (no AI content generation - fast!)
    const topicsWithUserId = CORE_TOPICS.map(topic => ({
      ...topic,
      user_id: userId
    }));

    const { data: insertedTopics, error: insertError } = await supabase
      .from('topics')
      .insert(topicsWithUserId)
      .select();

    if (insertError) {
      throw insertError;
    }

    console.log(`Successfully created ${insertedTopics.length} topic structures for user ${userId}`);
    
    return successResponse({ 
      success: true, 
      topicsCreated: insertedTopics.length,
      topics: insertedTopics,
      message: `Successfully created ${insertedTopics.length} topics. Generate content for each topic individually.`
    });

  } catch (error) {
    console.error('Error in create-default-topics function:', error);
    return errorResponse(error.message);
  }
});