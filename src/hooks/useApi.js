
import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const request = useCallback(async (apiFunc, params = null, successMessage = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFunc(params);
      if (successMessage) {
        toast({
          title: 'Success',
          description: successMessage,
          variant: 'default',
        });
      }
      return { data, error: null };
    } catch (err) {
      console.error('API Error:', err);
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { loading, error, request };
};
