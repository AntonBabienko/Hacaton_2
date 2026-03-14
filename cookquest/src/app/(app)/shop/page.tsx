import { createClient } from '@/lib/supabase/server'
import { DEFAULT_MASCOT } from '@/lib/constants'
import ShopContent from './shop-content'

export default async function ShopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('balance, current_skin_id')
    .eq('id', user!.id)
    .single()

  // Fetch mascot skins ordered by price
  const { data: skins } = await supabase
    .from('skins')
    .select('*')
    .order('price', { ascending: true })

  // Fetch what user already owns
  const { data: userSkins } = await supabase
    .from('user_skins')
    .select('skin_id')
    .eq('user_id', user!.id)

  const ownedIds = new Set((userSkins || []).map(s => s.skin_id))

  // Derive active mascot: find the emoji (mascot key) of the active skin
  const activeSkin = (skins || []).find(s => s.id === profile?.current_skin_id)
  const activeMascot = activeSkin?.emoji || DEFAULT_MASCOT

  return (
    <ShopContent
      userId={user!.id}
      balance={profile?.balance || 0}
      activeSkinId={profile?.current_skin_id || null}
      activeMascot={activeMascot}
      skins={skins || []}
      ownedSkinIds={Array.from(ownedIds)}
    />
  )
}
