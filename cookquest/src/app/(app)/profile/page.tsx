import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DEFAULT_MASCOT } from '@/lib/constants'
import ProfileContent from './profile-content'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile + saved recipes + all skins in parallel.
  // Skins table is small (≤10 rows), and avoiding the dependent fetch saves a round-trip.
  const [{ data: profile }, { data: savedRecipes }, { data: skins }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('user_saved_recipes')
      .select('*, recipe:recipes(*)')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false }),
    supabase.from('skins').select('id, emoji'),
  ])

  const activeSkinEmoji = profile?.current_skin_id
    ? (skins || []).find(s => s.id === profile.current_skin_id)?.emoji || DEFAULT_MASCOT
    : DEFAULT_MASCOT

  return (
    <ProfileContent
      profile={{ ...profile, active_skin_emoji: activeSkinEmoji }}
      savedRecipes={savedRecipes || []}
    />
  )
}
