import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nennmcalsjxphhztyyla.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lbm5tY2Fsc2p4cGhoenR5eWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDk3MzUsImV4cCI6MjA5NTE4NTczNX0.EyXdcdz6OU0GIfBUFc26YsIK_8eUQyD_NYsYj8FZEFM";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);