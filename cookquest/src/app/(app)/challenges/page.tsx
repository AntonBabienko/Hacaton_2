import { createClient } from '@/lib/supabase/server'
import { getTodayDate } from '@/lib/utils'
import { CUISINES_SCHEDULE } from '@/lib/constants'
import { generateQuests } from '@/lib/challenges'
import { getLocale } from '@/lib/i18n'
import QuestMap from './quest-map'

/** Get Monday of the week containing the given date */
function getWeekStart(date: string | Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day // offset to Monday
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

/** Get Monday of the next week */
function getNextWeekStart(currentWeekStart: string): string {
  const d = new Date(currentWeekStart)
  d.setDate(d.getDate() + 7)
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
  const locale = await getLocale()

  const today = getTodayDate()
  const weekStart = getWeekStart(today)
  const nextWeekStart = getNextWeekStart(weekStart)
  
  const weekDates = getWeekDates(weekStart)
  const nextWeekDates = getWeekDates(nextWeekStart)
  
  const allDates = [...weekDates, ...nextWeekDates]

  // Fetch challenges for current and next week
  let { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .gte('date', weekStart)
    .lte('date', allDates[allDates.length - 1])
    .order('date', { ascending: true })

  // Ensure we have challenges for both weeks
  const ensureWeekQuests = async (startDate: string, dates: string[], currentLocale: string) => {
    const weekQuests = (challenges || []).filter(c => dates.includes(c.date))
    if (weekQuests.length < 7) {
      try {
        const d = new Date(startDate)
        const weekNumber = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000))
        const weekCuisine = CUISINES_SCHEDULE[weekNumber % CUISINES_SCHEDULE.length]
        
        const quests = await generateQuests(weekCuisine, startDate, currentLocale)

        if (quests?.length > 0) {
          // Only insert for missing dates
          const existingDates = weekQuests.map(q => q.date)
          const missingDates = dates.filter(d => !existingDates.includes(d))
          
          const rows = quests.slice(0, missingDates.length).map((q: any, i: number) => ({
            date: missingDates[i],
            description: q.description,
            bonus_points: q.bonus_points,
            cuisine_type: weekCuisine,
          }))

          if (rows.length > 0) {
            const { data: inserted } = await supabase
              .from('challenges')
              .insert(rows)
              .select()
            return inserted || []
          }
        }
      } catch (err) {
        console.error('Помилка автогенерації квестів:', err)
      }
    }
    return []
  }

  const newCurrent = await ensureWeekQuests(weekStart, weekDates, locale)
  const newNext = await ensureWeekQuests(nextWeekStart, nextWeekDates, locale)

  if (newCurrent.length > 0 || newNext.length > 0) {
    // Refresh challenges
    const { data: refreshed } = await supabase
      .from('challenges')
      .select('*')
      .gte('date', weekStart)
      .lte('date', allDates[allDates.length - 1])
      .order('date', { ascending: true })
    challenges = refreshed || []
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
    />
  )
}
