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
  // Behavioral Topics
  {
    title: 'Introduction & Summary',
    slug: 'introduction-summary',
    category: 'Behavioral',
    icon_name: 'user',
    color: 'blue',
    sort_order: 1
  },
  {
    title: 'Recent Projects',
    slug: 'recent-projects',
    category: 'Behavioral', 
    icon_name: 'target',
    color: 'green',
    sort_order: 2
  },
  {
    title: 'Collaboration & Leadership',
    slug: 'collaboration-leadership',
    category: 'Behavioral',
    icon_name: 'users',
    color: 'purple',
    sort_order: 3
  },
  {
    title: 'Handling Pressure & Deadlines',
    slug: 'pressure-deadlines',
    category: 'Behavioral',
    icon_name: 'clock',
    color: 'red',
    sort_order: 4
  },

  // Technical Topics
  {
    title: 'Apache Kafka',
    slug: 'apache-kafka',
    category: 'Technical',
    icon_name: 'zap',
    color: 'orange',
    sort_order: 5
  },
  {
    title: 'Apache Spark',
    slug: 'apache-spark',
    category: 'Technical',
    icon_name: 'flame',
    color: 'red',
    sort_order: 6
  },
  {
    title: 'Python & Data Processing',
    slug: 'python-data-processing',
    category: 'Programming',
    icon_name: 'code',
    color: 'green',
    sort_order: 7
  },
  {
    title: 'Databases & SQL',
    slug: 'databases-sql',
    category: 'Technical',
    icon_name: 'database',
    color: 'purple',
    sort_order: 8
  },

  // Cloud & Architecture
  {
    title: 'AWS Services',
    slug: 'aws-services',
    category: 'Cloud',
    icon_name: 'cloud',
    color: 'yellow',
    sort_order: 9
  },
  {
    title: 'Azure Services',
    slug: 'azure-services',
    category: 'Cloud',
    icon_name: 'cloud',
    color: 'blue',
    sort_order: 10
  },
  {
    title: 'System Design & Architecture',
    slug: 'system-design-architecture',
    category: 'Architecture',
    icon_name: 'settings',
    color: 'indigo',
    sort_order: 11
  },
  {
    title: 'Real-time vs Batch Processing',
    slug: 'realtime-batch-processing',
    category: 'Architecture',
    icon_name: 'activity',
    color: 'pink',
    sort_order: 12
  },

  // Specialized Topics
  {
    title: 'Security & Compliance',
    slug: 'security-compliance',
    category: 'Technical',
    icon_name: 'shield',
    color: 'red',
    sort_order: 13
  },
  {
    title: 'CI/CD & DevOps',
    slug: 'cicd-devops',
    category: 'Technical',
    icon_name: 'git-branch',
    color: 'indigo',
    sort_order: 14
  },
  {
    title: 'Data Quality & Governance',
    slug: 'data-quality-governance',
    category: 'Technical',
    icon_name: 'check-circle',
    color: 'green',
    sort_order: 15
  },
  {
    title: 'Cost Optimization',
    slug: 'cost-optimization',
    category: 'Business',
    icon_name: 'dollar-sign',
    color: 'yellow',
    sort_order: 16
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