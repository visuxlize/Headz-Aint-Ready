import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function POST() {
  const supabase = await createClient()
  
  // Sign out the user
  await supabase.auth.signOut()
  
  // Revalidate the cache for the homepage
  revalidatePath('/', 'layout')
  
  // Redirect to homepage
  redirect('/')
}
