const SUPABASE_URL = "https://xjqrwcsxiaybpztzestb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqcXJ3Y3N4aWF5YnB6dHplc3RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc3NDEwOSwiZXhwIjoyMDk0MzUwMTA5fQ.AAKLa2QN7vjRJivwlOz0W9z2kWnHwrMamAjvMVbhr4s";   // service-role — bypasses RLS

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
