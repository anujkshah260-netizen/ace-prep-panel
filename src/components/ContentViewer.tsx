import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Edit2, Copy, Star, Clock, 
  MessageSquare, Target, FileText
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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

interface ContentViewerProps {
  topic: Topic;
  content: ContentVersion | null;
  onEdit: () => void;
}

export const ContentViewer = ({ topic, content, onEdit }: ContentViewerProps) => {
  const [scriptLength, setScriptLength] = useState<'short' | 'long'>('long');
  const { toast } = useToast();

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
    });
  };

  const estimateReadingTime = (text: string) => {
    const wordsPerMinute = 150;
    const wordCount = text.split(' ').length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Updated ${dateStr} at ${timeStr}`;
  };

  const highlightKeywords = (text: string | null | undefined) => {
    // Handle null/undefined safely
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // Common technical keywords to highlight
    const keywords = [
      'Python', 'SQL', 'Apache Spark', 'Apache Kafka', 'AWS', 'GCP', 'Azure',
      'Data Pipeline', 'ETL', 'Data Warehouse', 'Machine Learning', 'Big Data',
      'Real-time', 'Streaming', 'Batch Processing', 'Data Modeling', 'Architecture',
      'Performance', 'Scalability', 'Monitoring', 'Testing', 'Deployment',
      'Team Leadership', 'Project Management', 'Stakeholder', 'Communication'
    ];
    
    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, `**${keyword}**`);
    });
    
    // Convert markdown bold to HTML
    return highlightedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  if (!content) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Content Generated Yet</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md mx-auto">
            This topic is ready for content generation. Use the <strong>"Generate Content"</strong> button on the topic card to create personalized interview preparation materials.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground max-w-lg mx-auto">
            <p>💡 <strong>Tip:</strong> Generate content individually for each topic to avoid timeouts and get faster results.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{topic.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{topic.category}</Badge>
            <span className="text-sm text-muted-foreground">
              {formatDateTime(content.created_at)}
            </span>
            {content.is_favorite && (
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
            )}
          </div>
        </div>
        <Button onClick={onEdit} variant="outline" className="gap-2">
          <Edit2 className="w-4 h-4" />
          Edit Content
        </Button>
      </div>

      {/* Bullet Points */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Key Points
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(
                (content.bullets || []).map(bullet => `• ${bullet}`).join('\n'),
                'Key points'
              )}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {content.bullets?.map((bullet, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span 
                  className="text-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: highlightKeywords(bullet) }}
                />
              </li>
            )) || []}
          </ul>
        </CardContent>
      </Card>

      {/* Speaking Script */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Speaking Script
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {estimateReadingTime(content.script || '')}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(content.script, 'Script')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div 
              className="leading-relaxed whitespace-pre-wrap text-foreground"
              dangerouslySetInnerHTML={{ __html: highlightKeywords(content.script) }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cross Questions */}
      {content.cross_questions?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Cross-Questions & Answers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.cross_questions?.map((question, index) => {
              return (
                <div key={index} className="space-y-2">
                  <div className="font-medium text-foreground">
                    <span className="text-primary">Q{index + 1}:</span> 
                    <span dangerouslySetInnerHTML={{ __html: highlightKeywords(question) }} />
                  </div>
                  <div className="text-muted-foreground leading-relaxed pl-6">
                    <strong>A:</strong> 
                    <span dangerouslySetInnerHTML={{ __html: highlightKeywords('This is a follow-up question that would be answered during the interview based on your response.') }} />
                  </div>
                  {index < content.cross_questions.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              );
            }) || []}
          </CardContent>
        </Card>
      )}

      {/* Source Notes */}
      {content.source_notes && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              Original Source Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {content.source_notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};