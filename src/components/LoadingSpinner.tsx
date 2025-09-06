import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6', 
  lg: 'w-8 h-8'
};

export const LoadingSpinner = ({ size = 'md', className, text }: LoadingSpinnerProps) => {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
};

export const LoadingOverlay = ({ text = 'Loading...' }: { text?: string }) => (
  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
    <LoadingSpinner size="lg" text={text} />
  </div>
);