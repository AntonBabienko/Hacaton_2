import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileContent from './profile-content'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: savedRecipes } = await supabase
    .from('user_saved_recipes')
    .select('*, recipe:recipes(*)')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  return (
    <ProfileContent
      profile={profile}
      savedRecipes={savedRecipes || []}
    />
  )
}
