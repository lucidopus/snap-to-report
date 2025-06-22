import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = "https://tfsizanwrxgkuhtddxed.supabase.co";
// const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc2l6YW53cnhna3VodGRkeGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NDQ2MDksImV4cCI6MjA2NjEyMDYwOX0.StIlWL49j7vRwnefrcW53yoJLsgKm2C1vJYCMtFC3NI";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
