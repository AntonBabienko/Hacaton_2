import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BattlePage from './battle-page'

export default async function BattleRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: battle } = await supabase
    .from('battles')
    .select(`
      *,
      recipe:recipes(*),
      challenger:profiles!battles_challenger_id_fkey(id, username),
      opponent:profiles!battles_opponent_id_fkey(id, username)
    `)
    .eq('id', id)
    .single()

  if (!battle) notFound()

  const isChallenger = battle.challenger_id === user!.id
  const isOpponent = battle.opponent_id === user!.id

  if (!isChallenger && !isOpponent) notFound()

  return (
    <BattlePage
      battle={battle}
      userId={user!.id}
      isChallenger={isChallenger}
    />
  )
}
