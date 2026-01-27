// Authentication Service for Course Builder
// Only allows admin users to access

import { supabase } from './supabase';

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  error?: string;
}

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};

// Sign in with email and password - admin only
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  // If Supabase not configured, fall back to mock auth
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, using mock auth');
    return mockSignIn(email, password);
  }

  try {
    const { data, error } = await supabase!.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'No user returned' };
    }

    // Fetch user profile from user_profiles table
    const { data: profile, error: profileError } = await supabase!
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      // Check if it's the admin email
      if (email === 'david.dergazarian@navigantlearning.com') {
        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email || email,
            name: 'David Dergazarian',
            role: 'admin'
          }
        };
      }
      return { success: false, error: 'Access denied. Admin only.' };
    }

    // Only allow admin users
    if (profile.role !== 'admin') {
      await supabase!.auth.signOut();
      return { success: false, error: 'Access denied. Admin only.' };
    }

    return {
      success: true,
      user: {
        id: profile.id,
        email: profile.email || data.user.email || email,
        name: profile.name || profile.full_name || 'Admin',
        role: profile.role
      }
    };
  } catch (err) {
    console.error('Sign in error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Sign out
export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }
  await supabase!.auth.signOut();
}

// Get current session
export async function getSession() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const { data } = await supabase!.auth.getSession();
  return data.session;
}

// Mock sign in for development without Supabase
function mockSignIn(email: string, password: string): AuthResponse {
  // Only allow admin
  if (email === 'david.dergazarian@navigantlearning.com' && password === 'admin123') {
    return {
      success: true,
      user: {
        id: 'admin-001',
        email: 'david.dergazarian@navigantlearning.com',
        name: 'David Dergazarian',
        role: 'admin'
      }
    };
  }
  return { success: false, error: 'Invalid credentials or access denied' };
}
