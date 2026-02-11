// Re-export the portal's supabase client to share the same session
export { supabase } from '../supabaseClient';

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          full_name: string;
          company_name: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          company_name?: string;
          role?: string;
        };
        Update: {
          full_name?: string;
          company_name?: string;
          role?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
      };
      apps: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          long_description: string;
          category_id: string | null;
          features: string[];
          thumbnail_url: string;
          is_featured: boolean;
          is_active: boolean;
          demo_url: string;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
      };
      assessments: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          data: Record<string, any>;
          weights: Record<string, number>;
          analysis: Record<string, any> | null;
          analysis_generated_at: string | null;
          is_shared: boolean;
          share_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          data?: Record<string, any>;
          weights?: Record<string, number>;
          analysis?: Record<string, any> | null;
          analysis_generated_at?: string | null;
          is_shared?: boolean;
          share_token?: string | null;
        };
        Update: {
          name?: string;
          data?: Record<string, any>;
          weights?: Record<string, number>;
          analysis?: Record<string, any> | null;
          analysis_generated_at?: string | null;
          is_shared?: boolean;
          share_token?: string | null;
        };
      };
      demo_requests: {
        Insert: {
          app_id: string;
          user_id?: string | null;
          full_name: string;
          email: string;
          company_name?: string;
          message?: string;
        };
      };
      technology_vendors: {
        Row: {
          id: string;
          vendor_name: string;
          category: string;
          technology_type: string;
          description: string;
          website: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
