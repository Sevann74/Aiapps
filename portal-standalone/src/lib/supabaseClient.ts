// Supabase Client Configuration
// This file initializes the Supabase client for authentication and storage

import { createClient } from '@supabase/supabase-js';

// Environment variables - these will be set in Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Auth features will be disabled.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Global auth state change handler - catches auth errors early (fixes Chrome blank page)
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state change:', event);
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed successfully');
  }
  
  // Clear stale local session when signed out or no initial session
  if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
    console.log('Clearing stale local session data');
    localStorage.removeItem('coursebuilder_session');
  }
});

// Immediately check for stale sessions on module load (before React mounts)
(async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Stale session detected on load, clearing:', error.message);
      localStorage.removeItem('coursebuilder_session');
    } else if (!data.session) {
      // No valid session - ensure localStorage is cleared
      const stored = localStorage.getItem('coursebuilder_session');
      if (stored) {
        console.log('No Supabase session but localStorage has data - clearing stale data');
        localStorage.removeItem('coursebuilder_session');
      }
    }
  } catch (err) {
    console.error('Auth check failed, clearing session:', err);
    localStorage.removeItem('coursebuilder_session');
  }
})();

// Export types for use in components
export type { User, Session } from '@supabase/supabase-js';
