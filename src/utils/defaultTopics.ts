import { supabase } from '@/integrations/supabase/client';

export interface DefaultTopic {
  title: string;
  slug: string;
  category: string;
  icon_name: string;
  color: string;
  sort_order: number;
}

export const defaultTopics: DefaultTopic[] = [
  // Core 4 Topics for Initial Setup (No Timeout Issues)
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

export const createDefaultTopics = async (userId: string) => {
  try {
    const topicsWithUserId = defaultTopics.map(topic => ({
      ...topic,
      user_id: userId
    }));

    const { data, error } = await supabase
      .from('topics')
      .insert(topicsWithUserId)
      .select();

    if (error) {
      console.error('Error creating default topics:', error);
      throw error;
    }

    console.log(`Created ${data.length} default topics for user ${userId}`);
    return data;
  } catch (error) {
    console.error('Failed to create default topics:', error);
    throw error;
  }
};