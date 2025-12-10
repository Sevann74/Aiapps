// Authentication Service
// Handles all authentication operations with Supabase

import { supabase } from './supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

// User profile type (extends Supabase user with custom fields)
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: 'admin' | 'client';
  createdAt: string;
}

// Auth response type
export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key);
};

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  // If Supabase not configured, fall back to mock auth
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, using mock auth');
    return mockSignIn(email, password);
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'No user returned' };
    }

    // Fetch user profile from profiles table
    const profile = await getUserProfile(data.user.id);
    
    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    return { success: true, user: profile };
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
  
  await supabase.auth.signOut();
}

// Get current session
export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Get current user
export async function getCurrentUser(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data } = await supabase.auth.getUser();
  
  if (!data.user) {
    return null;
  }

  return getUserProfile(data.user.id);
}

// Get user profile from database
async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    organization: data.organization,
    role: data.role,
    createdAt: data.created_at
  };
}

// Create new user (admin only)
export async function createUser(
  email: string, 
  password: string, 
  name: string, 
  organization: string,
  role: 'admin' | 'client' = 'client'
): Promise<AuthResponse> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user' };
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email,
        name,
        organization,
        role
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return { success: false, error: 'User created but profile failed' };
    }

    const profile = await getUserProfile(authData.user.id);
    return { success: true, user: profile || undefined };
  } catch (err) {
    console.error('Create user error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Password reset request
export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Listen for auth state changes
export function onAuthStateChange(callback: (user: UserProfile | null) => void): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const profile = await getUserProfile(session.user.id);
      callback(profile);
    } else {
      callback(null);
    }
  });

  return () => subscription.unsubscribe();
}

// ============================================
// MOCK AUTH (for development without Supabase)
// ============================================

const mockUsers: Record<string, { password: string; profile: UserProfile }> = {
  'sarah@abcpharma.com': {
    password: 'demo123',
    profile: {
      id: 'client-001',
      email: 'sarah@abcpharma.com',
      name: 'Sarah Johnson',
      organization: 'ABC Pharma',
      role: 'client',
      createdAt: '2025-01-01T00:00:00Z'
    }
  },
  'david.dergazarian@navigantlearning.com': {
    password: 'admin123',
    profile: {
      id: 'admin-001',
      email: 'david.dergazarian@navigantlearning.com',
      name: 'David Dergazarian',
      organization: 'Navigant Learning',
      role: 'admin',
      createdAt: '2025-01-01T00:00:00Z'
    }
  }
};

function mockSignIn(email: string, password: string): AuthResponse {
  const user = mockUsers[email.toLowerCase()];
  
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  if (user.password !== password) {
    return { success: false, error: 'Invalid password' };
  }
  
  return { success: true, user: user.profile };
}
