import { createClient } from '@/lib/supabase/server'
import { DEFAULT_MASCOT } from '@/lib/constants'
import ShopContent from './shop-content'

export default async function ShopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profile },
    { data: skins },
    { data: userSkins },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('balance, current_skin_id')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('skins')
      .select('*')
      .order('price', { ascending: true }),
    supabase
      .from('user_skins')
      .select('skin_id')
      .eq('user_id', user!.id),
  ])

  const ownedIds = new Set((userSkins || []).map(s => s.skin_id))

  // Derive active mascot: find the emoji (mascot key) of the active skin
  const activeSkin = (skins || []).find(s => s.id === profile?.current_skin_id)
  const activeMascot = activeSkin?.emoji || DEFAULT_MASCOT

  return (
    <ShopContent
      userId={user!.id}
      activeSkinId={profile?.current_skin_id || null}
      activeMascot={activeMascot}
      skins={skins || []}
      ownedSkinIds={Array.from(ownedIds)}
    />
  )
}
