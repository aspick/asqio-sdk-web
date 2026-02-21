import { useCallback, useEffect, useState } from 'react';
import { useAsqioClient } from '../context/AsqioContext';
import type { Topic } from '../types';

export interface UseTopicsResult {
  topics: Topic[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTopics(): UseTopicsResult {
  const client = useAsqioClient();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.getTopics();
      setTopics(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return { topics, loading, error, refetch: fetchTopics };
}
