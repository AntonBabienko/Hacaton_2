import { createClient } from '@/lib/supabase/server'
import FriendsContent from './friends-content'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // My friends (accepted)
  const { data: friends } = await supabase
    .from('friendships')
    .select('id, addressee_id, friend:profiles!friendships_addressee_id_fkey(id, username, level, rating_score)')
    .eq('requester_id', user!.id)
    .eq('status', 'accepted')

  // Incoming requests
  const { data: incomingRequests } = await supabase
    .from('friendships')
    .select('id, requester:profiles!friendships_requester_id_fkey(id, username)')
    .eq('addressee_id', user!.id)
    .eq('status', 'pending')

  // Outgoing pending
  const { data: outgoingRequests } = await supabase
    .from('friendships')
    .select('id, friend:profiles!friendships_addressee_id_fkey(id, username)')
    .eq('requester_id', user!.id)
    .eq('status', 'pending')

  return (
    <FriendsContent
      userId={user!.id}
      friends={friends || []}
      incomingRequests={incomingRequests || []}
      outgoingRequests={outgoingRequests || []}
    />
  )
}
