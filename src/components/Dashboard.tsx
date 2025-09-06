import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TopicCard } from './TopicCard';
import { ContentViewer } from './ContentViewer';
import { ContentEditor } from './ContentEditor';
import { DocumentManager } from './DocumentManager';
import { 
  Search, Plus, LogOut, User, Settings,
  Filter, Grid, List, FileText, Sparkles,
  X, Loader2
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { ErrorBoundary, SimpleErrorFallback } from '@/components/ErrorBoundary';
import { LoadingSpinner, LoadingOverlay } from '@/components/LoadingSpinner';

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
  const [showDocumentManager, setShowDocumentManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Custom topic creation state
  const [showCustomTopicModal, setShowCustomTopicModal] = useState(false);
  const [customTopicTitle, setCustomTopicTitle] = useState('');
  const [customTopicCategory, setCustomTopicCategory] = useState('');
  const [customTopicSourceNotes, setCustomTopicSourceNotes] = useState('');
  const [isCreatingCustomTopic, setIsCreatingCustomTopic] = useState(false);
  
  // Individual topic content generation state
  const [topicsWithContent, setTopicsWithContent] = useState<Set<string>>(new Set());
  const [generatingTopics, setGeneratingTopics] = useState<Set<string>>(new Set());
  
  const { showSuccess, showError, showInfo } = useNotifications();

  const loadTopics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('sort_order');
      
      if (error) {
        console.error('Error loading topics:', error);
        showError("Failed to load topics", "Please refresh the page to try again.");
        return;
      }
      
      setTopics(data || []);
      
      // Check which topics have content
      if (data && data.length > 0) {
        const topicIds = data.map(t => t.id);
        const { data: contentVersions } = await supabase
          .from('topic_current_version')
          .select('topic_id')
          .in('topic_id', topicIds);
          
        if (contentVersions) {
          setTopicsWithContent(new Set(contentVersions.map(cv => cv.topic_id)));
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Check authentication and load topics on mount
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        setIsAuthenticated(true);
        await loadTopics();
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setLoading(false);
      }
    };
    
    checkAuthAndLoad();
  }, [loadTopics]);

  // Create default topics for new users using AI
  useEffect(() => {
    const createDefaultTopicsIfNeeded = async () => {
      try {
        const { data: existingTopics } = await supabase
          .from('topics')
          .select('id')
          .limit(1);
        
        if (!existingTopics || existingTopics.length === 0) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Create default topic structures (fast, no AI content generation)
            const { generateDefaultTabs } = await import('@/api/generate-content');
            const result = await generateDefaultTabs({
              userId: user.id
            });
            
            if (result.success) {
              console.log('Default topic structures created successfully');
              showInfo(
                "Welcome!",
                "4 core interview topics created. Generate content for each topic individually to avoid timeouts."
              );
              loadTopics(); // Reload topics after creation
            } else {
              console.error('Failed to create default topics:', result.error);
            }
          }
        }
      } catch (error) {
        console.error('Error setting up default topics:', error);
      }
    };
    
    createDefaultTopicsIfNeeded();
  }, [loadTopics]);



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
      showError("Failed to sign out", "Please try again.");
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

  const createCustomTopic = async () => {
    if (!customTopicTitle.trim() || !customTopicCategory || !customTopicSourceNotes.trim()) {
      showError("Validation Error", "Please fill in all fields");
      return;
    }

    setIsCreatingCustomTopic(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Call the Edge Function to create custom topic
      const { generateContent } = await import('@/api/generate-content');
      const result = await generateContent({
        title: customTopicTitle,
        category: customTopicCategory,
        sourceNotes: customTopicSourceNotes
      });

      if (result.success) {
        showSuccess("Custom topic created successfully!");
        
        // Reset form and close modal
        setCustomTopicTitle('');
        setCustomTopicCategory('');
        setCustomTopicSourceNotes('');
        setShowCustomTopicModal(false);
        
        // Reload topics to show the new one
        await loadTopics();
      } else {
        throw new Error(result.error || 'Failed to create custom topic');
      }
    } catch (error) {
      console.error('Error creating custom topic:', error);
      showError(
        "Failed to create topic",
        error instanceof Error ? error.message : "Please try again or contact support if the problem persists."
      );
    } finally {
      setIsCreatingCustomTopic(false);
    }
  };

  const openCustomTopicModal = (category: string) => {
    setCustomTopicCategory(category);
    setShowCustomTopicModal(true);
  };

  // Generate content for individual topic
  const handleGenerateTopicContent = async (topic: Topic) => {
    setGeneratingTopics(prev => new Set(prev).add(topic.id));
    
    try {
      const { generateSingleTopicContent } = await import('@/api/generate-content');
      const result = await generateSingleTopicContent(topic.id, topic.title);
      
      if (result.success) {
        showSuccess(
          "Content generated successfully",
          `Generated fresh content for ${topic.title}`
        );
        
        // Update the topics with content set
        setTopicsWithContent(prev => new Set(prev).add(topic.id));
        
        // If this topic is currently selected, reload its content
        if (selectedTopic?.id === topic.id) {
          await loadTopicContent(topic);
        }
      } else {
        throw new Error(result.error || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content for topic:', error);
      showError(
        "Failed to generate content",
        "Please try again. If the problem persists, try refreshing the page."
      );
    } finally {
      setGeneratingTopics(prev => {
        const newSet = new Set(prev);
        newSet.delete(topic.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to access the Interview Preparation Dashboard.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Sign In
          </Button>
        </div>
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
              onClick={() => setShowDocumentManager(!showDocumentManager)}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              {showDocumentManager ? 'Hide Documents' : 'Manage Documents'}
            </Button>
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
        {/* Document Manager Section */}
        {showDocumentManager && (
          <div className="mb-8">
            <DocumentManager />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Topics Grid */}
          <div className="lg:col-span-1 space-y-6">
            {Object.entries(groupedTopics).map(([category, categoryTopics]) => (
              <div key={category} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    {category}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openCustomTopicModal(category)}
                    className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                    title={`Add custom ${category.toLowerCase()} topic`}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 pb-8">
                  {categoryTopics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      onClick={handleTopicClick}
                      onEdit={topicsWithContent.has(topic.id) ? handleEditTopic : undefined}
                      hasContent={topicsWithContent.has(topic.id)}
                      onGenerateContent={!topicsWithContent.has(topic.id) ? handleGenerateTopicContent : undefined}
                      isGenerating={generatingTopics.has(topic.id)}
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
                    showSuccess("Content generated and saved!");
                  }}
                  onCancel={() => setShowEditor(false)}
                  onTopicRename={async (newTitle) => {
                    try {
                      const { error } = await supabase
                        .from('topics')
                        .update({ title: newTitle })
                        .eq('id', selectedTopic.id);
                      
                      if (error) throw error;
                      
                      // Update local state
                      setSelectedTopic({ ...selectedTopic, title: newTitle });
                      setTopics(topics.map(t => 
                        t.id === selectedTopic.id ? { ...t, title: newTitle } : t
                      ));
                      
                      showSuccess("Topic renamed successfully!");
                    } catch (error) {
                      console.error('Error renaming topic:', error);
                      showError("Failed to rename topic", "Please try again.");
                    }
                  }}
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

      {/* Custom Topic Creation Modal */}
      {showCustomTopicModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Create Custom Topic</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomTopicModal(false)}
                disabled={isCreatingCustomTopic}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Topic Title</label>
                <Input
                  placeholder="e.g., Machine Learning Projects"
                  value={customTopicTitle}
                  onChange={(e) => setCustomTopicTitle(e.target.value)}
                  disabled={isCreatingCustomTopic}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={customTopicCategory}
                  onChange={(e) => setCustomTopicCategory(e.target.value)}
                  disabled={isCreatingCustomTopic}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select category...</option>
                  <option value="Technical">Technical</option>
                  <option value="Behavioral">Behavioral</option>
                  <option value="Projects">Projects</option>
                  <option value="Leadership">Leadership</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Source Notes</label>
                <Textarea
                  placeholder="Describe your experience, projects, or skills related to this topic..."
                  value={customTopicSourceNotes}
                  onChange={(e) => setCustomTopicSourceNotes(e.target.value)}
                  rows={4}
                  disabled={isCreatingCustomTopic}
                />
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCustomTopicModal(false)}
                disabled={isCreatingCustomTopic}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={createCustomTopic}
                disabled={isCreatingCustomTopic || !customTopicTitle.trim() || !customTopicCategory || !customTopicSourceNotes.trim()}
                className="flex-1 gap-2"
              >
                {isCreatingCustomTopic ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Content
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};