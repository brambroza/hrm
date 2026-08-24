
import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const getErrorMessage = (err) => {
    if (!err) return 'An unexpected error occurred';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    if (err.error_description) return err.error_description;
    if (err.details) return err.details;
    if (err.hint) return err.hint;
    if (err.code) return `Error code: ${err.code}`;
    try {
      return JSON.stringify(err);
    } catch (stringifyError) {
      return 'An unexpected error occurred';
    }
  };

  const request = useCallback(async (apiFunc, params = null, successMessage = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc(params);
      if (result && typeof result === 'object' && result.error) {
        throw result.error;
      }
      const data = result && typeof result === 'object' && 'data' in result ? result.data : result;
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
      const errorMessage = getErrorMessage(err);
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
