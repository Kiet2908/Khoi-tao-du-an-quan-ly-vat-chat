import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bjgitcavyuqqfjmezgbz.supabase.co' // Lấy từ Project Settings -> API
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZ2l0Y2F2eXVxcWZqbWV6Z2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjA2OTYsImV4cCI6MjA4OTQzNjY5Nn0.CDq78VhWhshPsSZkr0Ks16GTbUcn8k1oRIZgpB3K2OU' 
export const supabase = createClient(supabaseUrl, supabaseKey)