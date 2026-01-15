import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dbvfnrlqdlmqfltoqghi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidmZucmxxZGxtcWZsdG9xZ2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzEyODMsImV4cCI6MjA3NTc0NzI4M30.26KEQZ_puwuyp0lGh823D2-KmtveT4UmQpS5yv7IRSA';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
