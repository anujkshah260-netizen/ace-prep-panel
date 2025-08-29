import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TopicCard } from './TopicCard';
import { ContentViewer } from './ContentViewer';
import { ContentEditor } from './ContentEditor';
import { 
  Search, Plus, LogOut, User, Settings,
  Filter, Grid, List
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Topic {
  id: string;
  title: string;
  slug: string;
  category: string;
  icon_name: string;
  color: string;
  sort_order: number;
}

interface ContentVersion {
  id: string;
  bullets: string[];
  script: string;
  cross_questions: Array<{ q: string; a: string; }>;
  source_notes: string;
  is_favorite: boolean;
  created_at: string;
}

export const Dashboard = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [currentContent, setCurrentContent] = useState<ContentVersion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load topics on mount
  useEffect(() => {
    loadTopics();
  }, []);

  // Create default topics for new users
  useEffect(() => {
    const createDefaultTopicsIfNeeded = async () => {
      try {
        const { data: existingTopics } = await supabase
          .from('topics')
          .select('id')
          .limit(1);
        
        if (!existingTopics || existingTopics.length === 0) {
          const { createDefaultTopics } = await import('@/utils/defaultTopics');
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await createDefaultTopics(user.id);
            loadTopics(); // Reload topics after creation
          }
        }
      } catch (error) {
        console.error('Error setting up default topics:', error);
      }
    };
    
    createDefaultTopicsIfNeeded();
  }, []);

  const loadTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('sort_order');
      
      if (error) {
        console.error('Error loading topics:', error);
        toast({
          title: "Error",
          description: "Failed to load topics",
          variant: "destructive"
        });
        return;
      }
      
      setTopics(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopicContent = async (topic: Topic) => {
    try {
      // Get current version
      const { data: currentVersion, error } = await supabase
        .from('topic_current_version')
        .select(`
          version_id,
          topic_content_versions (
            id,
            bullets,
            script,
            cross_questions,
            source_notes,
            is_favorite,
            created_at
          )
        `)
        .eq('topic_id', topic.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading content:', error);
        return;
      }

      if (currentVersion?.topic_content_versions) {
        setCurrentContent(currentVersion.topic_content_versions as ContentVersion);
      } else {
        setCurrentContent(null);
      }
    } catch (error) {
      console.error('Error loading topic content:', error);
    }
  };

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);
    setShowEditor(false);
    loadTopicContent(topic);
  };

  const handleEditTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setShowEditor(true);
    loadTopicContent(topic);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  const filteredTopics = topics.filter(topic =>
    topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedTopics = filteredTopics.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = [];
    }
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, Topic[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-variant/5">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary-variant text-primary-foreground shadow-lg">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Interview Preparation Dashboard</h1>
              <p className="text-primary-foreground/90 mt-1">
                Data Engineer | Real-time Processing | Cloud Architecture
              </p>
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
          
          <div className="flex items-center gap-4 mt-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search technologies, projects, or topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
              />
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Topics Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {Object.entries(groupedTopics).map(([category, categoryTopics]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryTopics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      onClick={handleTopicClick}
                      onEdit={handleEditTopic}
                      hasContent={false} // TODO: Check if topic has content
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {selectedTopic ? (
              showEditor ? (
                <ContentEditor
                  topic={selectedTopic}
                  currentContent={currentContent}
                  onContentSaved={(newContent) => {
                    setCurrentContent(newContent);
                    setShowEditor(false);
                    toast({
                      title: "Success",
                      description: "Content generated and saved!"
                    });
                  }}
                  onCancel={() => setShowEditor(false)}
                />
              ) : (
                <ContentViewer
                  topic={selectedTopic}
                  content={currentContent}
                  onEdit={() => setShowEditor(true)}
                />
              )
            ) : (
              <div className="text-center py-20">
                <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a Topic</h3>
                <p className="text-muted-foreground">
                  Choose a topic from the sidebar to view or edit your interview preparation content.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 pt-8 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">7+</div>
            <div className="text-sm text-muted-foreground">Years Experience</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">3</div>
            <div className="text-sm text-muted-foreground">Cloud Platforms</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">25+</div>
            <div className="text-sm text-muted-foreground">Technologies</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">12+</div>
            <div className="text-sm text-muted-foreground">Key Projects</div>
          </div>
        </div>
      </div>
    </div>
  );
};