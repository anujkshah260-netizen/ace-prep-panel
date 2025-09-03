import { supabase } from '@/integrations/supabase/client';

export interface GenerateTabsRequest {
  action: 'generate_tabs';
  content: string;
  sessionId: string;
  userId: string;
}

export interface GenerateDefaultTabsRequest {
  action: 'generate_default_tabs';
  userId: string;
  content: string;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    content: string;
  }>;
}

export interface GenerateContentRequest {
  action: 'generate_content' | 'create_custom_topic';
  topicId?: string;
  topicTitle?: string;
  sourceNotes?: string;
  category?: string;
  userId: string;
  options?: Record<string, unknown>;
}

export interface GenerateContentResponse {
  success: boolean;
  content?: {
    bullets: string[];
    script: string;
    cross_questions: Array<{ q: string; a: string; }>;
  };
  versionId?: string;
  error?: string;
}

export interface GenerateTabsResponse {
  success: boolean;
  topicsCreated?: number;
  topics?: Array<{
    id: string;
    title: string;
    slug: string;
    category: string;
    icon_name: string;
    color: string;
    sort_order: number;
  }>;
  error?: string;
}

export const generateInterviewTabs = async (
  request: GenerateTabsRequest
): Promise<GenerateTabsResponse> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    // Call the Supabase Edge Function
    const response = await fetch(
      `https://xzvalmxbbozhbiamsnzy.supabase.co/functions/v1/generate-content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error calling generate-content function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const generateDefaultTabs = async (
  request: GenerateDefaultTabsRequest
): Promise<GenerateTabsResponse> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    // Call the Supabase Edge Function
    const response = await fetch(
      `https://xzvalmxbbozhbiamsnzy.supabase.co/functions/v1/generate-content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error calling generate-content function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const generateContent = async (
  request: GenerateContentRequest
): Promise<GenerateContentResponse> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    // Call the Supabase Edge Function
    const response = await fetch(
      `https://xzvalmxbbozhbiamsnzy.supabase.co/functions/v1/generate-content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error calling generate-content function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const generateSingleTopicContent = async (
  topicId: string, 
  topicTitle: string, 
  sourceNotes?: string
): Promise<GenerateContentResponse> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    // Call the Supabase Edge Function for single topic content generation
    const response = await fetch(
      `https://xzvalmxbbozhbiamsnzy.supabase.co/functions/v1/generate-content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'generate_single_topic_content',
          topicId,
          topicTitle,
          sourceNotes: sourceNotes || ''
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error calling generate-single-topic-content function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
