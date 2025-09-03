import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Model selection strategy
const POWERFUL_MODEL = 'gpt-5-2025-08-07';        // For initial generation (best quality)
const EFFICIENT_MODEL = 'gpt-5-mini-2025-08-07';  // For content editing (cost-effective)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define proper types for Supabase client
interface SupabaseClient {
  from: (table: string) => any;
  auth: {
    getUser: () => Promise<{ data: { user: any }; error: any }>;
  };
}

// Function to generate default tabs for new users
async function handleGenerateDefaultTabs(supabase: SupabaseClient, userId: string) {
  try {
    // System prompt for default tab generation
    const systemPrompt = `You are an expert interview preparation coach for data engineers. Generate a comprehensive set of default interview preparation topics that would be valuable for any data engineer interview. These should be foundational topics that cover the essential areas.`;

    // User prompt for default tab generation
    const userPrompt = `GOAL:
Generate 8 default interview preparation topics for a data engineer. These should be foundational topics that would be valuable for any data engineer interview.

REQUIREMENTS:
1. Create exactly 8 specific topics that cover essential interview areas
2. Each topic should be focused and actionable
3. Include a mix of technical, behavioral, and project-based topics
4. Topics should be relevant to data engineering roles
5. Use appropriate technologies and concepts commonly found in data engineering

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

DEFAULT TOPICS TO INCLUDE:
- "Introduction & Summary" (Behavioral)
- "Recent Projects & Experience" (Projects)
- "Technical Skills & Technologies" (Technical)
- "Data Pipeline Architecture" (Architecture)
- "Problem-Solving & Troubleshooting" (Technical)
- "Leadership & Collaboration" (Leadership)
- "Performance Optimization" (Technical)
- "Industry Knowledge & Trends" (Behavioral)

Make these topics specific and actionable for data engineers.`;

    // Call OpenAI API with powerful model for initial generation
    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: POWERFUL_MODEL, // Use powerful model for initial generation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 3000
      }),
    });

    if (!llmResponse.ok) {
      const error = await llmResponse.text();
      console.error('OpenAI API error for default tabs:', error);
      throw new Error(`OpenAI API error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content ?? '{}';
    
    console.log('Raw OpenAI response for default tabs:', rawContent);

    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response for default tabs:', rawContent);
      throw new Error('Invalid response format from AI for default tab generation');
    }

    const { topics } = parsedContent;

    if (!topics || !Array.isArray(topics)) {
      throw new Error('Invalid topics format from AI');
    }

    // Create default topics in database, checking for duplicates first
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
        // Create new topic
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
          console.error('Error creating default topic:', topicError);
          continue;
        }
        
        topicData = newTopic;
      }

      createdTopics.push(topicData);

      // Check if content already exists for this topic
      const { data: existingContent } = await supabase
        .from('topic_content_versions')
        .select('id')
        .eq('topic_id', topicData.id)
        .eq('user_id', userId)
        .single();

      // Only generate content if it doesn't exist
      if (!existingContent) {
        await generateTopicContent(supabase, topicData.id, userId, "Default data engineering interview preparation content", topic.title);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      topicsCreated: createdTopics.length,
      topics: createdTopics
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleGenerateDefaultTabs:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Function to generate interview preparation tabs
async function handleGenerateTabs(supabase: SupabaseClient, content: string, sessionId: string, userId: string) {
  try {
    // System prompt for tab generation
    const systemPrompt = `You are an expert interview preparation coach for data engineers. Analyze the provided documents (resume, job description, supporting documents) and generate structured interview preparation topics. Each topic should be specific, relevant, and actionable.`;

    // User prompt for tab generation
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

    // Call OpenAI API for tab generation with powerful model
    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: POWERFUL_MODEL, // Use powerful model for document-based generation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 3000
      }),
    });

    if (!llmResponse.ok) {
      const error = await llmResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content ?? '{}';
    
    console.log('Raw OpenAI response for tabs:', rawContent);

    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response for tabs:', rawContent);
      throw new Error('Invalid response format from AI for tab generation');
    }

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
        // Create new topic
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

      // Check if content already exists for this topic
      const { data: existingContent } = await supabase
        .from('topic_content_versions')
        .select('id')
        .eq('topic_id', topicData.id)
        .eq('user_id', userId)
        .single();

      // Only generate content if it doesn't exist
      if (!existingContent) {
        await generateTopicContent(supabase, topicData.id, userId, content, topic.title);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      topicsCreated: createdTopics.length,
      topics: createdTopics
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleGenerateTabs:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Function to generate initial content for a topic
async function generateTopicContent(supabase: SupabaseClient, topicId: string, userId: string, sourceContent: string, topicTitle: string) {
  try {
    // System prompt for topic content generation
    const systemPrompt = `You are an interview coach for a senior data engineer. Write outputs that are concise, technically credible, and easy to speak aloud. Use simple sentences, minimal filler, and include concrete details (technologies, metrics, architecture). Maintain a confident but humble tone. Avoid buzzword fluff.`;

    // Check if source content is meaningful
    const hasRealContent = sourceContent && 
      sourceContent.length > 50 && 
      !sourceContent.toLowerCase().includes('note:') &&
      !sourceContent.toLowerCase().includes('error extracting') &&
      !sourceContent.toLowerCase().includes('requires integration');

    // User prompt for topic content
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

    // Call OpenAI API for content generation with efficient model
    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EFFICIENT_MODEL, // Use efficient model for content editing
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 2000
      }),
    });

    if (!llmResponse.ok) {
      console.error('OpenAI API error for topic content:', llmResponse.status);
      return;
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content ?? '{}';
    
    console.log('Raw OpenAI response for topic content:', rawContent);
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response for topic content:', rawContent);
      console.error('Parse error details:', parseError);
      
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          parsedContent = JSON.parse(jsonMatch[1]);
          console.log('Successfully extracted JSON from markdown code block');
        } catch (secondParseError) {
          console.error('Failed to parse extracted JSON:', secondParseError);
          return;
        }
      } else {
        return;
      }
    }

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
      return;
    }

    // Update current version pointer
    await supabase
      .from('topic_current_version')
      .upsert({ 
        topic_id: topicId, 
        version_id: version.id, 
        user_id: userId 
      });

  } catch (error) {
    console.error('Error generating topic content:', error);
  }
}

// Function to auto-generate topics and content based on uploaded documents
const handleAutoGenerateTopicsAndContent = async (supabase: SupabaseClient, content: string) => {
  console.log('Starting auto-generation of topics and content...');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get user profile for context
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, experience_years')
    .eq('id', user.id)
    .single();

  const userContext = profile ? 
    `User: ${profile.full_name}, Role: ${profile.role}, Experience: ${profile.experience_years} years` : 
    'User: Data Engineer';

  // Analyze the content to determine if we have real document content or placeholders
  const hasRealContent = !content.toLowerCase().includes('note:') && 
                        !content.toLowerCase().includes('error extracting') &&
                        !content.toLowerCase().includes('requires integration') &&
                        content.length > 500;

  const contextualPrompt = hasRealContent ? 
    `REAL DOCUMENT CONTENT DETECTED - Use the specific details below to create highly personalized topics:

${content}

INSTRUCTIONS: Create topics that directly reference and utilize the specific information from these documents. Mention actual projects, companies, skills, and experiences found in the documents.` :
    `DOCUMENT CONTENT NOT FULLY EXTRACTED - Creating general but comprehensive topics:

${content}

INSTRUCTIONS: Since the document content wasn't fully extracted, create comprehensive data engineering interview topics that cover common areas. Still try to use any meaningful information available from the document names and types.`;

  const prompt = `You are an AI interview preparation specialist. ${contextualPrompt}

${userContext}

Create exactly 6 interview preparation topics that are:
1. ${hasRealContent ? 'Directly based on the specific content in the documents' : 'Comprehensive and cover key data engineering areas'}
2. Tailored to the user's experience level and role
3. Include both technical and behavioral aspects
4. ${hasRealContent ? 'Reference actual projects, skills, and experiences mentioned' : 'Cover essential data engineering concepts and scenarios'}

For each topic, provide:
- A descriptive title (max 4 words) 
- An appropriate icon name from lucide-react (use: database, code, server, chart-bar, settings, brain, users, target, etc.)
- Key talking points (4-6 bullet points)
- A natural speaking script (3-4 paragraphs)
- Cross-questions that an interviewer might ask (4-5 follow-up questions)

${hasRealContent ? 
  'CRITICAL: Reference specific details from the documents in your content. Mention actual company names, project details, technologies, and achievements found in the documents.' :
  'CRITICAL: Create comprehensive content that covers essential data engineering topics like data pipelines, ETL processes, database design, big data technologies, etc.'
}

Format your response as a JSON object with this structure:
{
  "topics": [
    {
      "title": "Topic Title",
      "slug": "topic-slug",
      "icon_name": "icon-name",
      "color": "blue",
      "category": "Technical",
      "bullets": ["Point 1", "Point 2", "Point 3", "Point 4"],
      "script": "Natural speaking paragraph with specific examples...",
      "cross_questions": ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]
    }
  ]
}

IMPORTANT: 
- ${hasRealContent ? 'Use specific details from the documents' : 'Create comprehensive, interview-ready content'}
- ALWAYS include exactly 4-5 cross_questions for each topic
- Keep titles concise and actionable
- Make the script sound natural and conversational
- Include specific examples and scenarios in the content`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: POWERFUL_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert interview preparation coach specializing in creating personalized content based on user documents. Always include cross-questions for every topic.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 4000,
      }),
    });

    const data = await response.json();
    console.log('OpenAI API Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    const generatedContent = data.choices[0].message.content;
    console.log('Generated content:', generatedContent);

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      throw new Error('Failed to parse AI response');
    }

    if (!parsedResponse.topics || !Array.isArray(parsedResponse.topics)) {
      throw new Error('Invalid response format from AI');
    }

    const createdTopics = [];

    // Create topics and their content
    for (const topicData of parsedResponse.topics) {
      // Ensure cross_questions exist
      if (!topicData.cross_questions || !Array.isArray(topicData.cross_questions) || topicData.cross_questions.length === 0) {
        topicData.cross_questions = [
          "Can you provide more details about this?",
          "How would you handle challenges in this area?",
          "What would be your approach if requirements changed?",
          "How do you ensure quality in this process?"
        ];
      }

      // Insert topic
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .insert({
          title: topicData.title,
          slug: topicData.slug,
          icon_name: topicData.icon_name || 'code',
          color: topicData.color || 'blue',
          category: topicData.category || 'Technical',
          user_id: user.id,
        })
        .select()
        .single();

      if (topicError) {
        console.error('Error creating topic:', topicError);
        continue;
      }

      // Create content version
      const { data: contentVersion, error: contentError } = await supabase
        .from('topic_content_versions')
        .insert({
          topic_id: topic.id,
          user_id: user.id,
          bullets: topicData.bullets || [],
          script: topicData.script || '',
          cross_questions: topicData.cross_questions || [],
        })
        .select()
        .single();

      if (contentError) {
        console.error('Error creating content version:', contentError);
        continue;
      }

      // Set as current version
      await supabase
        .from('topic_current_version')
        .insert({
          topic_id: topic.id,
          version_id: contentVersion.id,
          user_id: user.id,
        });

      createdTopics.push(topic);
    }

    console.log(`Successfully created ${createdTopics.length} topics with content`);
    return { topics: createdTopics };

  } catch (error) {
    console.error('Error in auto-generation:', error);
    throw error;
  }
};

// Main handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, content, sessionId, userId, topicId, prompt, documents } = await req.json();
    
    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Authenticate user from the authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    switch (action) {
      case 'generate_default_tabs':
        // Create only topic structure, no AI content generation (FAST)
        try {
          const { data: existingTopics, error: checkError } = await supabase
            .from('topics')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

          if (existingTopics && existingTopics.length > 0) {
            return new Response(JSON.stringify({ 
              success: true, 
              message: 'Topics already exist' 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Create 4 core topic structures without AI content generation
          const coreTopics = [
            {
              title: 'Introduction & Summary',
              slug: 'introduction-summary',
              category: 'Behavioral',
              icon_name: 'user',
              color: 'blue',
              sort_order: 1,
              user_id: userId
            },
            {
              title: 'Recent Projects & Experience',
              slug: 'recent-projects-experience', 
              category: 'Projects',
              icon_name: 'target',
              color: 'green',
              sort_order: 2,
              user_id: userId
            },
            {
              title: 'Technical Skills & Technologies',
              slug: 'technical-skills-technologies',
              category: 'Technical', 
              icon_name: 'code',
              color: 'purple',
              sort_order: 3,
              user_id: userId
            },
            {
              title: 'Problem-Solving & Troubleshooting',
              slug: 'problem-solving-troubleshooting',
              category: 'Technical',
              icon_name: 'settings', 
              color: 'orange',
              sort_order: 4,
              user_id: userId
            }
          ];

          // Insert topics into database (fast operation, no AI calls)
          const { data: insertedTopics, error: insertError } = await supabase
            .from('topics')
            .insert(coreTopics)
            .select();

          if (insertError) {
            throw insertError;
          }

          console.log(`Successfully created ${insertedTopics.length} topic structures for user ${userId}`);
          
          return new Response(JSON.stringify({ 
            success: true, 
            topicsCreated: insertedTopics.length,
            topics: insertedTopics,
            message: `Successfully created ${insertedTopics.length} topics. Generate content for each topic individually.`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('Error creating default topics:', error);
          return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

      case 'generate_single_topic_content':
        // New action for individual topic content generation
        try {
          const { topicId, topicTitle, sourceNotes } = await req.json();
          
          if (!topicId || !topicTitle) {
            throw new Error('topicId and topicTitle are required for single topic content generation');
          }

          // Get user from auth header
          const authHeaderSingle = req.headers.get('Authorization');
          const token = authHeaderSingle?.replace('Bearer ', '');
          const { data: { user }, error: userError } = await supabase.auth.getUser(token);
          
          if (userError || !user) {
            throw new Error('Unauthorized');
          }
          
          await generateTopicContent(
            supabase, 
            topicId, 
            user.id, 
            sourceNotes || 'Generate content for this interview preparation topic.', 
            topicTitle
          );
          
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Topic content generated successfully' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('Error generating single topic content:', error);
          return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

      case 'generate_tabs':
        return await handleGenerateTabs(supabase, content, sessionId, userId);

      case 'auto_generate_topics_and_content':
        const result = await handleAutoGenerateTopicsAndContent(supabase, content);
        return new Response(JSON.stringify({ 
          success: true, 
          topicsCreated: result.topics.length,
          topics: result.topics
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        // Handle direct topic content generation (legacy support)
        if (!topicId || !prompt) {
          return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get user from auth header for direct topic generation
        const authHeaderDirect = req.headers.get('Authorization');
        const token = authHeaderDirect?.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate content for the specific topic
        await generateTopicContent(supabase, topicId, user.id, prompt, 'Custom Topic');
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in generate-content function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});