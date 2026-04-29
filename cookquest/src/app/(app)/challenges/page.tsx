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

async function ensureWeekQuests(
  supabase: Awaited<ReturnType<typeof createClient>>,
  startDate: string,
  dates: string[],
  existingForWeek: any[],
  currentLocale: string,
) {
  if (existingForWeek.length >= 7) return []
  try {
    const d = new Date(startDate)
    const weekNumber = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000))
    const weekCuisine = CUISINES_SCHEDULE[weekNumber % CUISINES_SCHEDULE.length]

    const quests = await generateQuests(weekCuisine, startDate, currentLocale)
    if (!quests?.length) return []

    const existingDates = existingForWeek.map(q => q.date)
    const missingDates = dates.filter(d => !existingDates.includes(d))

    const rows = quests.slice(0, missingDates.length).map((q: any, i: number) => ({
      date: missingDates[i],
      description: q.description,
      bonus_points: q.bonus_points,
      cuisine: weekCuisine,
    }))

    if (!rows.length) return []
    const { data: inserted, error: insertErr } = await supabase
      .from('challenges')
      .insert(rows)
      .select()
    if (insertErr) console.error('Insert challenges error:', insertErr)
    return inserted || []
  } catch (err) {
    console.error('Помилка автогенерації квестів:', err)
    return []
  }
}

export default async function ChallengesPage() {
  const supabase = await createClient()
  const [{ data: { user } }, locale] = await Promise.all([
    supabase.auth.getUser(),
    getLocale(),
  ])

  const today = getTodayDate()
  const weekStart = getWeekStart(today)
  const nextWeekStart = getNextWeekStart(weekStart)

  const weekDates = getWeekDates(weekStart)
  const nextWeekDates = getWeekDates(nextWeekStart)

  const allDates = [...weekDates, ...nextWeekDates]

  // Fetch existing challenges + completions in parallel
  const [{ data: existingChallenges }, { data: completions }] = await Promise.all([
    supabase
      .from('challenges')
      .select('*')
      .gte('date', weekStart)
      .lte('date', allDates[allDates.length - 1])
      .order('date', { ascending: true }),
    supabase
      .from('user_challenge_completions')
      .select('challenge_id')
      .eq('user_id', user!.id),
  ])

  let challenges = existingChallenges || []

  // Only block on AI generation when the CURRENT week is missing quests.
  // Next week is generated lazily (fire-and-forget) so the page renders immediately.
  const currentWeekQuests = challenges.filter(c => weekDates.includes(c.date))
  if (currentWeekQuests.length < 7) {
    const newCurrent = await ensureWeekQuests(
      supabase,
      weekStart,
      weekDates,
      currentWeekQuests,
      locale,
    )
    if (newCurrent.length > 0) {
      challenges = [...challenges, ...newCurrent].sort((a, b) => a.date.localeCompare(b.date))
    }
  }

  // Background-fill next week (do not await — page can render now).
  const nextWeekQuests = challenges.filter(c => nextWeekDates.includes(c.date))
  if (nextWeekQuests.length < 7) {
    void ensureWeekQuests(supabase, nextWeekStart, nextWeekDates, nextWeekQuests, locale)
  }

  const completedIds = (completions || []).map(c => c.challenge_id)

  return (
    <QuestMap
      challenges={challenges}
      completedIds={completedIds}
      today={today}
    />
  )
}
