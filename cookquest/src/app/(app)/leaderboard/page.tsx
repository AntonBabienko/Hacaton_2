import { createClient } from '@/lib/supabase/server'
import { Trophy } from 'lucide-react'
import { DEFAULT_MASCOT } from '@/lib/constants'
import { getDictionary } from '@/lib/i18n'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getDictionary()

  const [{ data: leaders }, { data: skins }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, rating_score, level, current_skin_id, xp')
      .order('rating_score', { ascending: false })
      .limit(50),
    supabase.from('skins').select('id, emoji'),
  ])

  // skinId → mascot key
  const skinMap: Record<string, string> = Object.fromEntries(
    (skins || []).map(s => [s.id, s.emoji])
  )

  function getMascotSrc(leader: any) {
    const key = leader.current_skin_id ? (skinMap[leader.current_skin_id] || DEFAULT_MASCOT) : DEFAULT_MASCOT
    return `/mascots/${key}_happy.png`
  }

  const myRank = leaders?.findIndex(l => l.id === user!.id) ?? -1

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
            <Trophy size={20} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">{t.leaderboard.title}</h1>
            {myRank >= 0 && (
              <p className="text-xs text-gray-400">
                {t.leaderboard.your_place} <span className="text-yellow-400 font-bold">#{myRank + 1}</span> {t.leaderboard.out_of.replace('{total}', leaders?.length.toString() || '0')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Top 3 podium */}
      {leaders && leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-2">
          {/* 2nd place */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-gray-500/10 border-2 border-gray-400/30 rounded-2xl flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getMascotSrc(leaders[1])} alt="" width={44} height={44} className="drop-shadow-sm" />
            </div>
            <p className="text-xs font-bold text-white mt-1.5 truncate max-w-[70px]">{leaders[1].username}</p>
            <div className="bg-gray-500/20 text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full mt-1">
              🥈 {leaders[1].rating_score}
            </div>
          </div>
          {/* 1st place */}
          <div className="flex flex-col items-center -mt-4">
            <div className="w-[72px] h-[72px] bg-yellow-500/10 border-2 border-yellow-400/50 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(255,200,0,0.15)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getMascotSrc(leaders[0])} alt="" width={56} height={56} className="drop-shadow-md" />
            </div>
            <p className="text-sm font-extrabold text-yellow-400 mt-1.5 truncate max-w-[80px]">{leaders[0].username}</p>
            <div className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full mt-1">
              🥇 {leaders[0].rating_score}
            </div>
          </div>
          {/* 3rd place */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-amber-700/10 border-2 border-amber-600/30 rounded-2xl flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getMascotSrc(leaders[2])} alt="" width={44} height={44} className="drop-shadow-sm" />
            </div>
            <p className="text-xs font-bold text-white mt-1.5 truncate max-w-[70px]">{leaders[2].username}</p>
            <div className="bg-amber-600/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full mt-1">
              🥉 {leaders[2].rating_score}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 overflow-hidden">
        {leaders && leaders.length === 0 && (
          <p className="text-center text-gray-600 py-8 text-sm">{t.leaderboard.no_participants}</p>
        )}
        {leaders?.slice(leaders.length >= 3 ? 3 : 0).map((leader, i) => (
          <div
            key={leader.id}
            className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-colors ${leader.id === user!.id ? 'bg-orange-500/10' : 'hover:bg-white/[0.02]'
              }`}
          >
            <div className="w-7 text-center text-xs font-bold text-gray-600">
              #{(leaders.length >= 3 ? i + 4 : i + 1)}
            </div>
            <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getMascotSrc(leader)} alt="" width={32} height={32} className="drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">{leader.username}</p>
              <p className="text-[10px] text-gray-600">{t.leaderboard.level.replace('{level}', leader.level.toString())}</p>
            </div>
            <div className="font-bold text-orange-400 text-sm">{leader.rating_score}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
