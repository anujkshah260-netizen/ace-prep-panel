import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Save, Loader2, Sparkles, ArrowLeft,
  FileText, Wand2, Edit2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateSingleTopicContent } from '@/api/generate-content';

interface Topic {
  id: string;
  title: string;
  category: string;
}

interface ContentVersion {
  id: string;
  bullets: string[];
  script: string;
  cross_questions: string[];
  source_notes: string;
  is_favorite: boolean;
  created_at: string;
}

interface ContentEditorProps {
  topic: Topic;
  currentContent: ContentVersion | null;
  onContentSaved: (content: ContentVersion) => void;
  onCancel: () => void;
  onTopicRename?: (newTitle: string) => void;
}

export const ContentEditor = ({ 
  topic, 
  currentContent, 
  onContentSaved, 
  onCancel,
  onTopicRename
}: ContentEditorProps) => {
  const [sourceNotes, setSourceNotes] = useState(
    currentContent?.source_notes || ''
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(topic.title);
  const [editedBullets, setEditedBullets] = useState<string[]>(
    currentContent?.bullets || []
  );
  const [editedScript, setEditedScript] = useState(
    currentContent?.script || ''
  );
  const [editedCrossQuestions, setEditedCrossQuestions] = useState<string[]>(
    currentContent?.cross_questions || []
  );
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!sourceNotes.trim()) {
      toast({
        title: "Missing Content",
        description: "Please add your source notes before generating content.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await generateSingleTopicContent(
        topic.id,
        topic.title,
        sourceNotes.trim()
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate content');
      }

      // Fetch the generated content from database
      const { data: contentData, error: fetchError } = await supabase
        .from('topic_content_versions')
        .select('*')
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch generated content');
      }

      // Create the new content object
      const newContent: ContentVersion = {
        id: contentData.id,
        bullets: Array.isArray(contentData.bullets) ? contentData.bullets as string[] : [],
        script: contentData.script || '',
        cross_questions: Array.isArray(contentData.cross_questions) ? contentData.cross_questions as string[] : [],
        source_notes: contentData.source_notes || sourceNotes.trim(),
        is_favorite: contentData.is_favorite || false,
        created_at: contentData.created_at
      };

      onContentSaved(newContent);
      
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent border-b-2 border-primary/30 focus:border-primary focus:outline-none px-2 py-1"
                placeholder="Enter topic title..."
              />
              <Button
                size="sm"
                onClick={() => {
                  if (onTopicRename && editedTitle.trim() !== topic.title) {
                    onTopicRename(editedTitle.trim());
                  }
                  setIsEditing(false);
                }}
                className="gap-1"
              >
                <Save className="w-3 h-3" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditedTitle(topic.title);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">
                {currentContent ? 'Edit' : 'Create'} Content
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="gap-1"
              >
                <Edit2 className="w-4 h-4" />
                Rename
              </Button>
            </div>
          )}
          <p className="text-muted-foreground mt-1">
            Generate AI-powered content for <strong>{topic.title}</strong>
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onCancel}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* Instructions */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-primary">How it works</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Paste your rough notes, job descriptions, or bullet points below. 
                The AI will transform them into professional talking points, 
                a speakable script, and potential cross-questions for your interview.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Source Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">
              Your notes, experience, or talking points for {topic.title}
            </Label>
            <Textarea
              id="notes"
              placeholder={`Example for ${topic.title}:
• 5+ years experience with real-time data streaming
• Built fraud detection pipeline processing 1M+ events/day
• Used Kafka, Spark Streaming, and Redshift
• Reduced latency from 4 minutes to <30 seconds
• Handled GDPR compliance and data privacy requirements
• Collaborated with ML team on feature engineering

Paste any notes, experiences, or key points you want to discuss...`}
              value={sourceNotes}
              onChange={(e) => setSourceNotes(e.target.value)}
              rows={12}
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              {sourceNotes.length} characters
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !sourceNotes.trim()}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Content
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Content Display/Edit */}
      {currentContent && (
        <div className="space-y-6">
          {/* Key Bullets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Key Bullets</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  className="gap-1"
                >
                  {isEditing ? 'View' : 'Edit'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  {editedBullets.map((bullet, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => {
                          const newBullets = [...editedBullets];
                          newBullets[index] = e.target.value;
                          setEditedBullets(newBullets);
                        }}
                        className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Enter bullet point..."
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditedBullets(editedBullets.filter((_, i) => i !== index));
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedBullets([...editedBullets, ''])}
                    className="gap-1"
                  >
                    + Add Bullet
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {currentContent.bullets.map((bullet, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary font-semibold">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Speaking Script */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Speaking Script</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  className="gap-1"
                >
                  {isEditing ? 'View' : 'Edit'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  rows={4}
                  className="resize-none"
                  placeholder="Enter your speaking script..."
                />
              ) : (
                <p className="text-muted-foreground leading-relaxed">
                  {currentContent.script}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cross Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cross Questions & Answers</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  className="gap-1"
                >
                  {isEditing ? 'View' : 'Edit'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  {editedCrossQuestions.map((question, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => {
                          const newQuestions = [...editedCrossQuestions];
                          newQuestions[index] = e.target.value;
                          setEditedCrossQuestions(newQuestions);
                        }}
                        className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Enter cross question..."
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditedCrossQuestions(editedCrossQuestions.filter((_, i) => i !== index));
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedCrossQuestions([...editedCrossQuestions, ''])}
                    className="gap-1"
                  >
                    + Add Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentContent.cross_questions.map((question, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-primary font-semibold">Q{index + 1}:</span>
                      <span>{question}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Changes Button */}
          {isEditing && (
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEditedBullets(currentContent.bullets);
                  setEditedScript(currentContent.script);
                  setEditedCrossQuestions(currentContent.cross_questions);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Save changes to database
                  const updatedContent = {
                    ...currentContent,
                    bullets: editedBullets,
                    script: editedScript,
                    cross_questions: editedCrossQuestions
                  };
                  onContentSaved(updatedContent);
                  setIsEditing(false);
                  toast({
                    title: "Changes Saved",
                    description: "Your content has been updated successfully!"
                  });
                }}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          )}

          {/* Improve with AI Button */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-primary">Improve with AI</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use AI to enhance your current content based on your edits
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Improving...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Improve with AI
                    </>
                )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tips */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">💡 Tips for better results</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Include specific technologies, metrics, and achievements</li>
            <li>• Mention concrete numbers (performance improvements, scale, etc.)</li>
            <li>• Add context about challenges faced and how you solved them</li>
            <li>• Include collaboration examples and business impact</li>
            <li>• Use STAR format implicitly (Situation → Task → Action → Result)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};