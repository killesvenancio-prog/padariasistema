import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://hpyaacohpjfjyehtgtfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhweWFhY29ocGpmanllaHRndGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODkwMTIsImV4cCI6MjA5NjE2NTAxMn0.dR4KAhOOGJHp12tl5MePDa6SbN5-AbWpbnisv_mwZfc'
)
