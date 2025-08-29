import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Save, Loader2, Sparkles, ArrowLeft,
  FileText, Wand2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Topic {
  id: string;
  title: string;
  category: string;
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

interface ContentEditorProps {
  topic: Topic;
  currentContent: ContentVersion | null;
  onContentSaved: (content: ContentVersion) => void;
  onCancel: () => void;
}

export const ContentEditor = ({ 
  topic, 
  currentContent, 
  onContentSaved, 
  onCancel 
}: ContentEditorProps) => {
  const [sourceNotes, setSourceNotes] = useState(
    currentContent?.source_notes || ''
  );
  const [isGenerating, setIsGenerating] = useState(false);
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('generate-content', {
        body: {
          topicId: topic.id,
          sourceNotes: sourceNotes.trim(),
          topicTitle: topic.title,
          options: {
            tone: 'confident',
            length: '90s'
          }
        }
      });

      if (response.error) {
        console.error('Function error:', response.error);
        throw new Error(response.error.message || 'Failed to generate content');
      }

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to generate content');
      }

      // Create the new content object
      const newContent: ContentVersion = {
        id: response.data.versionId,
        bullets: response.data.content.bullets || [],
        script: response.data.content.script || '',
        cross_questions: response.data.content.cross_questions || [],
        source_notes: sourceNotes.trim(),
        is_favorite: false,
        created_at: new Date().toISOString()
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
        <div>
          <h2 className="text-2xl font-bold">
            {currentContent ? 'Edit' : 'Create'} Content
          </h2>
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