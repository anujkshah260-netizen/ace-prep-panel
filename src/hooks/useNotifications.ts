import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const { toast } = useToast();

  const showSuccess = (title: string, description?: string) => {
    toast({
      title,
      description,
      className: 'border-green-200 bg-green-50 text-green-900',
    });
  };

  const showError = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'destructive',
    });
  };

  const showLoading = (title: string, description?: string) => {
    toast({
      title,
      description,
      className: 'border-blue-200 bg-blue-50 text-blue-900',
    });
  };

  const showInfo = (title: string, description?: string) => {
    toast({
      title,
      description,
      className: 'border-blue-200 bg-blue-50 text-blue-900',
    });
  };

  return {
    showSuccess,
    showError,
    showLoading,
    showInfo,
  };
};