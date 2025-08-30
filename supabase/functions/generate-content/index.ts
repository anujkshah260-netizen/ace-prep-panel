import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Model selection strategy
const POWERFUL_MODEL = 'gpt-4o';        // For initial generation (best quality)
const EFFICIENT_MODEL = 'gpt-4o-mini';  // For content editing (cost-effective)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define proper types for Supabase client
interface SupabaseClient {
  from: (table: string) => {
    insert: (data: unknown[]) => Promise<{ data: unknown; error: unknown }>;
    select: (columns: string) => Promise<{ data: unknown; error: unknown }>;
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
        temperature: 0.3,
        max_tokens: 3000
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

    // Create default topics in database
    const createdTopics = [];
    for (const topic of topics) {
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .insert([{
          user_id: userId,
          title: topic.title,
          slug: topic.slug,
          category: topic.category,
          icon_name: topic.icon_name,
          color: topic.color,
          sort_order: topic.sort_order,
          is_ai_generated: true,
          source_documents: [],
          meta: {
            description: topic.description,
            key_points: topic.key_points
          }
        }])
        .select()
        .single();

      if (topicError) {
        console.error('Error creating default topic:', topicError);
        continue;
      }

      createdTopics.push(topicData);

      // Generate initial content for each default topic
      await generateTopicContent(supabase, topicData.id, userId, "Default data engineering interview preparation content", topic.title);
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
        temperature: 0.3,
        max_tokens: 3000
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

    // Create topics in database
    const createdTopics = [];
    for (const topic of topics) {
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .insert([{
          user_id: userId,
          session_id: sessionId,
          title: topic.title,
          slug: topic.slug,
          category: topic.category,
          icon_name: topic.icon_name,
          color: topic.color,
          sort_order: topic.sort_order,
          is_ai_generated: true,
          source_documents: [], // Will be populated later
          meta: {
            description: topic.description,
            key_points: topic.key_points
          }
        }])
        .select()
        .single();

      if (topicError) {
        console.error('Error creating topic:', topicError);
        continue;
      }

      createdTopics.push(topicData);

      // Generate initial content for each topic
      await generateTopicContent(supabase, topicData.id, userId, content, topic.title);
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
      !sourceContent.toLowerCase().includes('placeholder') &&
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
    {"q": "Realistic follow-up question an interviewer would ask about '${topicTitle}'", "a": "Specific, detailed answer with concrete examples. Include technologies, processes, or metrics. Show deep understanding."},
    {"q": "Technical deep-dive question about implementation details", "a": "Technical answer demonstrating expertise. Mention specific tools, architecture decisions, or problem-solving approaches."},
    {"q": "Situational question about challenges or trade-offs", "a": "Balanced answer showing critical thinking. Discuss alternatives considered, trade-offs made, and lessons learned."},
    {"q": "Follow-up about scale, performance, or optimization", "a": "Quantitative answer with metrics, optimization strategies, or scaling approaches used or considered."}
  ]
}

QUALITY STANDARDS:
- All content should be specific and actionable, not generic
- Cross-questions should be realistic follow-ups an interviewer would actually ask
- Answers should demonstrate deep technical knowledge and real-world experience
- ${hasRealContent ? 'Incorporate details from the source content where relevant' : 'Create believable data engineer scenarios and solutions'}
- Focus on the data engineering domain: pipelines, databases, cloud platforms, scalability, data quality`;

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
        temperature: 0.4,
        max_tokens: 2000
      }),
    });

    if (!llmResponse.ok) {
      console.error('OpenAI API error for topic content:', llmResponse.status);
      return;
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content ?? '{}';
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response for topic content:', rawContent);
      return;
    }

    const { key_points, script, cross_questions } = parsedContent;

    // Save content to database
    const { data: version, error: insertError } = await supabase
      .from('topic_content_versions')
      .insert([{
        topic_id: topicId,
        user_id: userId,
        source_notes: sourceContent,
        bullets: key_points || [],
        script: script || '',
        cross_questions: cross_questions || [],
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
async function handleAutoGenerateTopicsAndContent(supabase: SupabaseClient, userId: string, content: string, documents: Array<{id: string, name: string, type: string, content: string}>) {
  try {
    console.log('Starting auto-generation for user:', userId);
    console.log('Documents to analyze:', documents.length);

    // System prompt for document-based topic generation
    const systemPrompt = `You are an expert interview preparation coach for data engineers. Analyze the uploaded documents (resume, job description, supporting documents) and automatically generate personalized interview topics with comprehensive content.`;

    // Analyze the documents for better content quality
    const hasValidContent = documents.some(doc => 
      doc.content && 
      doc.content.length > 50 && 
      !doc.content.toLowerCase().includes('placeholder') &&
      !doc.content.toLowerCase().includes('requires integration')
    );

    // User prompt for document analysis and topic generation
    const userPrompt = `GOAL:
Analyze the uploaded documents and automatically generate personalized interview topics with complete content for a data engineer interview.

DOCUMENTS TO ANALYZE:
${documents.map(doc => {
  const contentPreview = doc.content ? 
    (doc.content.length > 1000 ? doc.content.substring(0, 1000) + '...' : doc.content) : 
    `Document type: ${doc.type}, Name: ${doc.name}`;
  return `${doc.type.toUpperCase()}: ${doc.name}\nContent: ${contentPreview}`;
}).join('\n\n')}

CONTENT QUALITY NOTE: 
${hasValidContent ? 
  'Full document content is available - use specific details, skills, projects, and requirements mentioned.' : 
  'Document content extraction is limited - focus on document types and create relevant data engineer topics based on standard expectations for resumes, job descriptions, and supporting documents.'
}

REQUIREMENTS:
1. ${hasValidContent ? 'Extract specific skills, technologies, projects, and experience from the actual resume content' : 'Generate relevant data engineer skills and experience topics based on the resume document type'}
2. ${hasValidContent ? 'Extract specific requirements, technologies, and responsibilities from the job description content' : 'Generate relevant data engineer job requirements topics based on the job description document type'}
3. Create 6-8 highly relevant topics that combine resume experience with job requirements
4. Each topic MUST include:
   - Key points (3-5 specific, actionable bullet points)
   - Speaking script (60-120 second first-person narrative)
   - Cross questions & answers (3-4 realistic follow-up Q&A pairs)
5. Topics should be deeply personalized ${hasValidContent ? 'using the actual document content' : 'based on data engineer role expectations'}
6. Include technical topics covering: data pipelines, databases, cloud platforms, programming languages
7. Include behavioral topics: leadership, problem-solving, collaboration, project management
8. Ensure cross-questions are realistic follow-ups an interviewer would actually ask

OUTPUT FORMAT (JSON only):
{
  "topics": [
    {
      "title": "Specific Topic Title (e.g., 'Building Scalable Data Pipelines with Apache Spark')",
      "slug": "building-scalable-data-pipelines-with-apache-spark",
      "category": "Technical|Behavioral|Projects|Architecture|Leadership",
      "icon_name": "database|code|users|layers|target|briefcase|chart|settings",
      "color": "blue|green|red|yellow|purple|orange|pink|indigo",
      "sort_order": 1,
      "key_points": [
        "Specific technical achievement with metrics (e.g., 'Built real-time data pipeline processing 10TB daily using Spark and Kafka')",
        "Technology stack and architecture decisions (e.g., 'Implemented Delta Lake for ACID transactions and time travel queries')",
        "Problem solved and business impact (e.g., 'Reduced data processing latency from 4 hours to 15 minutes, enabling real-time analytics')"
      ],
      "speaking_script": "Start with context, then explain the technical challenge, describe your solution with specific technologies, mention the impact. Use first-person, be conversational but technical. Example: 'At my previous company, we were struggling with...'",
      "cross_questions": [
        {"q": "How did you handle schema evolution in your data pipeline?", "a": "Specific answer with technical details about schema registry, backward compatibility strategies, or versioning approaches used."},
        {"q": "What monitoring and alerting did you implement?", "a": "Detailed answer about specific monitoring tools, metrics tracked, alerting strategies, and incident response procedures."},
        {"q": "How did you ensure data quality and handle bad data?", "a": "Concrete examples of data validation rules, error handling strategies, dead letter queues, and data quality monitoring implemented."}
      ]
    }
  ]
}

CRITICAL: Generate topics that are specific, actionable, and interview-ready. Avoid generic content. ${hasValidContent ? 'Use the actual document content to create personalized topics.' : 'Create realistic data engineer scenarios even without full document content.'}`;

    // Call OpenAI API with powerful model for comprehensive generation
    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: POWERFUL_MODEL, // Use powerful model for comprehensive generation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
    });

    if (!llmResponse.ok) {
      const error = await llmResponse.text();
      console.error('OpenAI API error for auto-generation:', error);
      throw new Error(`OpenAI API error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content ?? '{}';
    
    console.log('Raw OpenAI response for auto-generation:', rawContent);

    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response for auto-generation:', rawContent);
      throw new Error('Invalid response format from AI');
    }

    const { topics } = parsedContent;
    
    if (!topics || !Array.isArray(topics)) {
      throw new Error('Invalid topics format from AI');
    }

    console.log(`Generated ${topics.length} topics`);

    // Create topics in the database
    const createdTopics = [];
    for (const topic of topics) {
      try {
        // Insert topic
        const { data: topicData, error: topicError } = await supabase
          .from('topics')
          .insert([{
            title: topic.title,
            slug: topic.slug,
            category: topic.category,
            icon_name: topic.icon_name,
            color: topic.color,
            sort_order: topic.sort_order,
            user_id: userId,
            is_active: true
          }])
          .select()
          .single();

        if (topicError) {
          console.error('Error creating topic:', topicError);
          continue;
        }

        console.log('Topic created successfully:', topicData);
        console.log('Topic ID:', topicData.id);

        // Insert topic content version
        const { data: contentData, error: contentError } = await supabase
          .from('topic_content_versions')
          .insert([{
            topic_id: topicData.id,
            user_id: userId,
            source_notes: `Auto-generated from uploaded documents: ${documents.map(d => d.name).join(', ')}`,
            bullets: topic.key_points || [],
            script: topic.speaking_script || '',
            cross_questions: topic.cross_questions || [],
            meta: { auto_generated: true, documents: documents.map(d => ({ id: d.id, name: d.name, type: d.type })) }
          }])
          .select()
          .single();

        if (contentError) {
          console.error('Error creating content version:', contentError);
          continue;
        }

        console.log('Content version created successfully:', contentData);

        // Set as current version
        const { error: currentVersionError } = await supabase
          .from('topic_current_version')
          .upsert({ 
            topic_id: topicData.id, 
            version_id: contentData.id, 
            user_id: userId 
          });

        if (currentVersionError) {
          console.error('Error setting current version:', currentVersionError);
        }

        createdTopics.push(topicData);
        console.log('Topic and content created successfully for:', topic.title);
        
      } catch (topicError) {
        console.error('Error processing topic:', topicError);
        continue;
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
    console.error('Error in auto-generation:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topicId, sourceNotes, topicTitle, options = {}, action, content, sessionId, userId, documents } = await req.json();
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different actions
    if (action === 'generate_default_tabs') {
      return await handleAutoGenerateTopicsAndContent(supabase, userId, content, documents);
    }
    
    if (action === 'generate_tabs') {
      return await handleGenerateTabs(supabase, content, sessionId, userId);
    }

    // Original topic content generation logic
    if (!topicId || !sourceNotes || !topicTitle) {
      throw new Error('Missing required parameters for topic content generation');
    }

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