import { createClient } from '@/lib/supabase/server'
import { DEFAULT_MASCOT } from '@/lib/constants'
import ShopContent from './shop-content'

export default async function ShopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('balance, active_mascot')
    .eq('id', user!.id)
    .single()

  // Get list of mascots user already owns
  const { data: ownedMascots } = await supabase
    .from('user_mascots')
    .select('mascot_key')
    .eq('user_id', user!.id)

  return (
    <ShopContent
      userId={user!.id}
      balance={profile?.balance || 0}
      activeMascot={profile?.active_mascot || DEFAULT_MASCOT}
      ownedMascotKeys={(ownedMascots || []).map(m => m.mascot_key)}
    />
  )
}
