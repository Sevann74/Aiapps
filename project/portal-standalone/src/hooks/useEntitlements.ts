import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface Entitlement {
  module_key: string;
  enabled: boolean;
}

export interface UseEntitlementsResult {
  entitlements: Entitlement[];
  loading: boolean;
  error: string | null;
  hasAccess: (moduleKey: string) => boolean;
  refetch: () => Promise<void>;
}

export function useEntitlements(organizationId: string | null): UseEntitlementsResult {
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = async () => {
    if (!organizationId) {
      setEntitlements([{ module_key: 'conversion', enabled: true }]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('org_entitlements')
        .select('module_key, enabled')
        .eq('organization_id', organizationId);

      if (fetchError) {
        console.error('Error fetching entitlements:', fetchError);
        setEntitlements([{ module_key: 'conversion', enabled: true }]);
        setError(fetchError.message);
      } else if (data && data.length > 0) {
        setEntitlements(data);
      } else {
        setEntitlements([{ module_key: 'conversion', enabled: true }]);
      }
    } catch (err) {
      console.error('Entitlements fetch error:', err);
      setEntitlements([{ module_key: 'conversion', enabled: true }]);
      setError('Failed to load entitlements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntitlements();
  }, [organizationId]);

  const hasAccess = (moduleKey: string): boolean => {
    if (moduleKey === 'conversion') {
      const found = entitlements.find(e => e.module_key === 'conversion');
      return found ? found.enabled : true;
    }
    
    const entitlement = entitlements.find(e => e.module_key === moduleKey);
    return entitlement?.enabled ?? false;
  };

  return {
    entitlements,
    loading,
    error,
    hasAccess,
    refetch: fetchEntitlements
  };
}
