import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Code, Zap, Flame, Cloud, Database, Shield, 
  GitBranch, Activity, User, Settings, Edit2 
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
};

const colorMap = {
  blue: 'topic-blue',
  purple: 'topic-purple', 
  green: 'topic-green',
  orange: 'topic-orange',
  red: 'topic-red',
  yellow: 'topic-yellow',
  pink: 'topic-pink',
  indigo: 'topic-indigo',
};

export const TopicCard = ({ 
  topic, 
  onClick, 
  onEdit, 
  hasContent = false,
  className 
}: TopicCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const IconComponent = iconMap[topic.icon_name as keyof typeof iconMap] || Code;
  const colorClass = colorMap[topic.color as keyof typeof colorMap] || 'topic-blue';

  return (
    <Card 
      className={cn(
        "group relative cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
        "border-0 bg-card/80 backdrop-blur-sm",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(topic)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
              `bg-${colorClass}/10 text-${colorClass}`
            )}>
              <IconComponent className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {topic.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {topic.category}
                </Badge>
                {hasContent && (
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                )}
              </div>
            </div>
          </div>

          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "opacity-0 group-hover:opacity-100 transition-opacity",
                isHovered && "opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(topic);
              }}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};