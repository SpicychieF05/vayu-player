
// Initialize Supabase Client
// You will need to replace these with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://awpackuenhohghvymaia.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YIOxIx8uTvD4O6mfP7aQyA_RoeZB1bI';

let supabaseClient = null;

if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase initialized");
} else {
    console.error("Supabase library not loaded!");
}

export const supabase = supabaseClient;
