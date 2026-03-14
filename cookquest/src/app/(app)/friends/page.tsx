import { createClient } from '@/lib/supabase/server'
import FriendsContent from './friends-content'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: friends }, { data: incomingRequests }, { data: outgoingRequests }, { data: skins }] = await Promise.all([
    supabase
      .from('friendships')
      .select('id, addressee_id, friend:profiles!friendships_addressee_id_fkey(id, username, level, rating_score, current_skin_id)')
      .eq('requester_id', user!.id)
      .eq('status', 'accepted'),
    supabase
      .from('friendships')
      .select('id, requester:profiles!friendships_requester_id_fkey(id, username)')
      .eq('addressee_id', user!.id)
      .eq('status', 'pending'),
    supabase
      .from('friendships')
      .select('id, friend:profiles!friendships_addressee_id_fkey(id, username)')
      .eq('requester_id', user!.id)
      .eq('status', 'pending'),
    supabase.from('skins').select('id, emoji'),
  ])

  const skinMap = Object.fromEntries((skins || []).map(s => [s.id, s.emoji]))

  return (
    <FriendsContent
      userId={user!.id}
      friends={friends || []}
      incomingRequests={incomingRequests || []}
      outgoingRequests={outgoingRequests || []}
      skinMap={skinMap}
    />
  )
}
