
import { BellowsPart } from '../types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibasglziaqxtywitwqwf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYXNnbHppYXF4dHl3aXR3cXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODQ5NzMsImV4cCI6MjA4MzE2MDk3M30.xrCJV1xxWAjb9u84dduiTenVVHLtaG1ubcaPMyN4FUg';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const db = {
  auth: {
    signIn: async (email: string, pass: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, error: null, user: data.user };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    getSession: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }
  },

  getAll: async (): Promise<BellowsPart[]> => {
    // Explicitly using lowercase 'part_number' for ordering
    const { data, error } = await supabase
      .from('bellows_parts')
      .select('*')
      .order('part_number', { ascending: true });

    if (error) {
      console.error("Cloud Database Fetch Error:", error.message, error.details, error.hint);
      // If you see 'column does not exist', ensure columns in Supabase are lowercase
      return [];
    }
    return data || [];
  },

  create: async (newPart: BellowsPart): Promise<{success: boolean, error?: string}> => {
    const { error } = await supabase
      .from('bellows_parts')
      .insert([newPart]);
    
    if (error) {
      console.error("Insert Error:", error);
      const msg = error.code === '42501' ? "RLS Policy Violation: Your account doesn't have permission to INSERT." : error.message;
      return { success: false, error: msg };
    }
    return { success: true };
  },

  update: async (partNumber: string, data: Partial<BellowsPart>): Promise<{success: boolean, error?: string}> => {
    const { error } = await supabase
      .from('bellows_parts')
      .update(data)
      .eq('part_number', partNumber);

    if (error) {
      console.error("Update Error:", error);
      const msg = error.code === '42501' ? "RLS Policy Violation: Your account doesn't have permission to UPDATE." : error.message;
      return { success: false, error: msg };
    }
    return { success: true };
  },

  delete: async (partNumber: string): Promise<{success: boolean, error?: string}> => {
    const { error } = await supabase
      .from('bellows_parts')
      .delete()
      .eq('part_number', partNumber);

    if (error) {
      console.error("Delete Error:", error);
      const msg = error.code === '42501' ? "RLS Policy Violation: Your account doesn't have permission to DELETE." : error.message;
      return { success: false, error: msg };
    }
    return { success: true };
  }
};
