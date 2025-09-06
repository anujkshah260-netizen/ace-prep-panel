import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Code, Zap, Flame, Cloud, Database, Shield, 
  GitBranch, Activity, User, Settings, Edit2,
  Sparkles, Target, Clock, Users, CheckCircle,
  DollarSign, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Topic {
  id: string;
  title: string;
  slug: string;
  category: string;
  icon_name: string;
  color: string;
  sort_order: number;
}

interface TopicCardProps {
  topic: Topic;
  onClick: (topic: Topic) => void;
  onEdit?: (topic: Topic) => void;
  hasContent?: boolean;
  onGenerateContent?: (topic: Topic) => void;
  isGenerating?: boolean;
  className?: string;
}

const iconMap = {
  code: Code,
  zap: Zap,
  flame: Flame,
  cloud: Cloud,
  database: Database,
  shield: Shield,
  'git-branch': GitBranch,
  activity: Activity,
  user: User,
  settings: Settings,
  target: Target,
  clock: Clock,
  users: Users,
  'check-circle': CheckCircle,
  'dollar-sign': DollarSign,
};

const colorVariants = {
  blue: {
    bg: 'bg-[hsl(var(--color-blue)_/_0.1)]',
    text: 'text-[hsl(var(--color-blue))]',
    border: 'border-[hsl(var(--color-blue)_/_0.2)]'
  },
  purple: {
    bg: 'bg-[hsl(var(--color-purple)_/_0.1)]', 
    text: 'text-[hsl(var(--color-purple))]',
    border: 'border-[hsl(var(--color-purple)_/_0.2)]'
  },
  green: {
    bg: 'bg-[hsl(var(--color-green)_/_0.1)]',
    text: 'text-[hsl(var(--color-green))]',
    border: 'border-[hsl(var(--color-green)_/_0.2)]'
  },
  orange: {
    bg: 'bg-[hsl(var(--color-orange)_/_0.1)]',
    text: 'text-[hsl(var(--color-orange))]',
    border: 'border-[hsl(var(--color-orange)_/_0.2)]'
  },
  red: {
    bg: 'bg-[hsl(var(--color-red)_/_0.1)]',
    text: 'text-[hsl(var(--color-red))]',
    border: 'border-[hsl(var(--color-red)_/_0.2)]'
  },
  yellow: {
    bg: 'bg-[hsl(var(--color-yellow)_/_0.1)]',
    text: 'text-[hsl(var(--color-yellow))]',
    border: 'border-[hsl(var(--color-yellow)_/_0.2)]'
  },
  pink: {
    bg: 'bg-[hsl(var(--color-pink)_/_0.1)]',
    text: 'text-[hsl(var(--color-pink))]',
    border: 'border-[hsl(var(--color-pink)_/_0.2)]'
  },
  indigo: {
    bg: 'bg-[hsl(var(--color-indigo)_/_0.1)]',
    text: 'text-[hsl(var(--color-indigo))]',
    border: 'border-[hsl(var(--color-indigo)_/_0.2)]'
  }
};

export const TopicCard = ({ 
  topic, 
  onClick, 
  onEdit, 
  hasContent = false,
  onGenerateContent,
  isGenerating = false,
  className 
}: TopicCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const IconComponent = iconMap[topic.icon_name as keyof typeof iconMap] || Code;
  const colorVariant = colorVariants[topic.color as keyof typeof colorVariants] || colorVariants.blue;

  return (
    <Card 
      className={cn(
        "group relative cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
        "border-0 bg-card/80 backdrop-blur-sm w-[150px] h-[150px]",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(topic)}
    >
      <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
        {/* Icon centered at top */}
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-lg transition-colors mb-3",
          colorVariant.bg,
          colorVariant.text
        )}>
          <IconComponent className="w-6 h-6" />
        </div>
        
        {/* Title below icon */}
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm leading-tight mb-2">
          {topic.title}
        </h3>
        
        {/* Category badge */}
        <Badge variant="secondary" className="text-xs">
          {topic.category}
        </Badge>
        
        {/* Content status indicator */}
        {hasContent && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500" title="Content generated"></div>
        )}
        
        {/* Generate Content button - shows when no content */}
        {!hasContent && onGenerateContent && !isGenerating && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300",
              "text-xs whitespace-nowrap bg-background border-primary/20 hover:bg-primary/10",
              isHovered && "opacity-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onGenerateContent(topic);
            }}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Generate Content
          </Button>
        )}
        
        {/* Loading state during generation */}
        {isGenerating && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
            <Button
              variant="outline"
              size="sm"
              disabled
              className="text-xs bg-background border-primary/20"
            >
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Generating...
            </Button>
          </div>
        )}
        
        {/* Edit button - appears on hover for topics with content */}
        {hasContent && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0",
              isHovered && "opacity-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(topic);
            }}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};