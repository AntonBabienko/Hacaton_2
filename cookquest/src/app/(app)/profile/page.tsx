import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DEFAULT_MASCOT } from '@/lib/constants'
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

  // Resolve active mascot key from current_skin_id
  let activeSkinEmoji = DEFAULT_MASCOT
  if (profile?.current_skin_id) {
    const { data: skin } = await supabase
      .from('skins')
      .select('emoji')
      .eq('id', profile.current_skin_id)
      .single()
    if (skin?.emoji) activeSkinEmoji = skin.emoji
  }

  return (
    <ProfileContent
      profile={{ ...profile, active_skin_emoji: activeSkinEmoji }}
      savedRecipes={savedRecipes || []}
    />
  )
}
