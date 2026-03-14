import { createClient } from '@/lib/supabase/server'
import { getCurrentCuisine, getTodayDate } from '@/lib/utils'
import QuestMap from './quest-map'

/** Monday of the current week (YYYY-MM-DD) */
function getWeekStart(today: string): string {
  const d = new Date(today)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day // offset to Monday
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

/** Generate 7 dates starting from weekStart */
function getWeekDates(weekStart: string): string[] {
  const dates: string[] = []
  const base = new Date(weekStart)
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export default async function ChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = getTodayDate()
  const cuisine = getCurrentCuisine()
  const weekStart = getWeekStart(today)
  const weekDates = getWeekDates(weekStart)

  // Fetch challenges for this week
  let { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .gte('date', weekStart)
    .lte('date', weekDates[6])
    .order('date', { ascending: true })

  // If no challenges this week — generate via AI and save to DB
  if (!challenges || challenges.length === 0) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/generate-quests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuisine, startDate: weekStart }),
      })

      if (res.ok) {
        const { quests } = await res.json()
        if (quests?.length > 0) {
          const rows = quests.map((q: any, i: number) => ({
            date: weekDates[i] || weekDates[weekDates.length - 1],
            description: q.description,
            bonus_points: q.bonus_points,
            cuisine_type: cuisine,
          }))

          const { data: inserted } = await supabase
            .from('challenges')
            .insert(rows)
            .select()

          challenges = inserted || []
        }
      }
    } catch (err) {
      console.error('Помилка автогенерації квестів:', err)
    }
  }

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
