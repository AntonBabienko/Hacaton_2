import { createClient } from '@/lib/supabase/server'
import { getCurrentCuisine, getTodayDate } from '@/lib/utils'
import QuestMap from './quest-map'

export default async function ChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = getTodayDate()
  const cuisine = getCurrentCuisine()

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(7)

  const { data: completions } = await supabase
    .from('user_challenge_completions')
    .select('challenge_id')
    .eq('user_id', user!.id)

  const completedIds = (completions || []).map(c => c.challenge_id)

  return (
    <QuestMap
      challenges={challenges || []}
      completedIds={completedIds}
      today={today}
      cuisine={cuisine}
    />
  )
}
