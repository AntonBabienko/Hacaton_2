import { createAdminClient } from '@/lib/supabase/admin'
import { BATTLE_MULTIPLIER } from '@/lib/constants'

export async function POST(req: Request) {
  const supabase = createAdminClient()
  try {
    const { battleId } = await req.json()

    // 1. Get battle data with recipe
    const { data: b, error: fetchErr } = await supabase
      .from('battles')
      .select('*, recipe:recipes(*)')
      .eq('id', battleId)
      .single()

    if (fetchErr || !b) {
      console.error('[Complete Battle] Fetch error:', fetchErr)
      return Response.json({ error: 'Battle not found' }, { status: 404 })
    }

    // 2. Security check: both must be finished
    if (!b.challenger_finished_at || !b.opponent_finished_at) {
      return Response.json({ status: 'waiting', message: 'Waiting for other player' })
    }

    // 3. Skip if already completed
    if (b.status === 'completed') {
      return Response.json({ status: 'completed', message: 'Already completed' })
    }

    // 4. Calculate results
    const totalPool = Math.round(b.recipe.points * BATTLE_MULTIPLIER)
    const cTime = b.challenger_time || 99999
    const oTime = b.opponent_time || 99999
    const cQuality = b.challenger_quality || 50
    const oQuality = b.opponent_quality || 50

    const cSpeedScore = oTime > cTime ? 100 : Math.round((oTime / cTime) * 100)
    const oSpeedScore = cTime > oTime ? 100 : Math.round((cTime / oTime) * 100)
    
    // Total score: 60% quality, 40% speed
    const cTotal = Math.round(cQuality * 0.6 + cSpeedScore * 0.4)
    const oTotal = Math.round(oQuality * 0.6 + oSpeedScore * 0.4)

    const sum = cTotal + oTotal || 1
    const cPoints = Math.round((cTotal / sum) * totalPool)
    const oPoints = totalPool - cPoints

    // 5. Update battle
    const { error: updateErr } = await supabase.from('battles').update({
      status: 'completed',
      challenger_score: cPoints,
      opponent_score: oPoints,
    }).eq('id', b.id)

    if (updateErr) throw updateErr

    // 6. Award points to both profiles safely (bypassing RLS)
    const award = async (uid: string, pts: number) => {
      const { data: p } = await supabase.from('profiles').select('balance, xp, rating_score').eq('id', uid).single()
      if (p) {
        // Calculate new level
        const newXp = p.xp + pts
        let newLevel = 1
        if (newXp >= 4000) newLevel = 8
        else if (newXp >= 2500) newLevel = 7
        else if (newXp >= 1500) newLevel = 6
        else if (newXp >= 1000) newLevel = 5
        else if (newXp >= 600) newLevel = 4
        else if (newXp >= 300) newLevel = 3
        else if (newXp >= 100) newLevel = 2

        await supabase.from('profiles').update({
          balance: p.balance + pts,
          xp: newXp,
          rating_score: p.rating_score + pts,
          level: newLevel
        }).eq('id', uid)
      }
    }

    await Promise.all([
      award(b.challenger_id, cPoints),
      award(b.opponent_id, oPoints),
    ])

    // 7. Insert notifications
    await supabase.from('notifications').insert([
      { user_id: b.challenger_id, type: 'battle_result', data: { battle_id: b.id, points: cPoints, opponent: b.opponent_id }, read: false },
      { user_id: b.opponent_id, type: 'battle_result', data: { battle_id: b.id, points: oPoints, opponent: b.challenger_id }, read: false },
    ])

    return Response.json({ status: 'success', cPoints, oPoints })

  } catch (error) {
    console.error('[Complete Battle] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
