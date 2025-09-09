import { supabase } from '@/integrations/supabase/client';

export interface GenerateTabsRequest {
  content: string;
  sessionId: string;
  userId: string;
}

export interface GenerateDefaultTabsRequest {
  userId: string;
}

export interface GenerateContentRequest {
  title: string;
  category: string;
  sourceNotes?: string;
}

export interface GenerateContentResponse {
  success: boolean;
  message?: string;
  content?: {
    bullets: string[];
    script: string;
    cross_questions: string[];
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
  message?: string;
  error?: string;
}

export const generateInterviewTabs = async (request: GenerateTabsRequest): Promise<GenerateTabsResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-documents', {
      body: {
        content: request.content,
        sessionId: request.sessionId
      }
    });

    if (error) {
      console.error('Error calling analyze-documents function:', error);
      throw new Error(error.message || 'Failed to analyze documents');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to analyze documents: Unknown error');
    }

    return {
      success: true,
      topicsCreated: data.topicsCreated || 0,
      topics: data.topics || [],
      message: data.message || 'Topics generated from documents successfully'
    };

  } catch (error) {
    console.error('Error in generateInterviewTabs:', error);
    throw error;
  }
};

export const generateDefaultTabs = async (request: GenerateDefaultTabsRequest): Promise<GenerateTabsResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-default-topics', {
      body: {
        userId: request.userId
      }
    });

    if (error) {
      console.error('Error calling create-default-topics function:', error);
      throw new Error(error.message || 'Failed to create default topics');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to create default topics: Unknown error');
    }

    return {
      success: true,
      topicsCreated: data.topicsCreated || 0,
      topics: data.topics || [],
      message: data.message || 'Default topics created successfully'
    };

  } catch (error) {
    console.error('Error in generateDefaultTabs:', error);
    throw error;
  }
};

export const generateContent = async (request: GenerateContentRequest): Promise<GenerateContentResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-custom-topic', {
      body: {
        title: request.title,
        category: request.category,
        sourceNotes: request.sourceNotes
      }
    });

    if (error) {
      console.error('Error calling create-custom-topic function:', error);
      throw new Error(error.message || 'Failed to create custom topic');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to create custom topic: Unknown error');
    }

    return {
      success: true,
      message: data.message || 'Custom topic created successfully'
    };

  } catch (error) {
    console.error('Error in generateContent:', error);
    throw error;
  }
};

export const generateSingleTopicContent = async (
  topicId: string, 
  topicTitle: string, 
  sourceNotes?: string
): Promise<GenerateContentResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-topic-content', {
      body: {
        topicId,
        topicTitle,
        sourceNotes
      }
    });

    if (error) {
      console.error('Error calling generate-topic-content function:', error);
      throw new Error(error.message || 'Failed to generate topic content');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate topic content: Unknown error');
    }

    return {
      success: true,
      message: data.message || 'Topic content generated successfully',
      versionId: data.version?.id
    };

  } catch (error) {
    console.error('Error in generateSingleTopicContent:', error);
    throw error;
  }
};