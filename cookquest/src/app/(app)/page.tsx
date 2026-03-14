import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getLevelInfo, getXpProgress, getCurrentCuisine, getTodayDate } from '@/lib/utils'
import { Camera, Shuffle, Swords, Target, Trophy, Zap } from 'lucide-react'
import { MascotStatic } from '@/components/mascot'
import { DEFAULT_MASCOT } from '@/lib/constants'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const { data: todayChallenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('date', getTodayDate())
    .single()

  const { data: pendingBattles } = await supabase
    .from('battles')
    .select('id, recipe:recipes(name), challenger:profiles!battles_challenger_id_fkey(username)')
    .eq('opponent_id', user!.id)
    .eq('status', 'pending')

  const { data: completedToday } = await supabase
    .from('user_challenge_completions')
    .select('id')
    .eq('user_id', user!.id)

  const { data: savedRecipes } = await supabase
    .from('saved_recipes')
    .select('id')
    .eq('user_id', user!.id)

  const totalCooked = savedRecipes?.length || 0
  const totalCompleted = completedToday?.length || 0

  const levelInfo = getLevelInfo(profile?.xp || 0)
  const xpProgress = getXpProgress(profile?.xp || 0)
  const cuisine = getCurrentCuisine()
  const userMascot = profile?.active_mascot || DEFAULT_MASCOT
  const mascotMood = totalCooked >= 3 ? 'happy' : totalCooked >= 1 ? 'neutral' : 'happy'

  // Greeting messages
  const greetings = [
    `Вітаю, ${profile?.username || 'Кухарю'}!`,
    `Готовий до пригод?`,
    `Що приготуємо сьогодні?`,
    `Шеф на кухні!`,
  ]
  const greeting = greetings[Math.floor(Date.now() / 86400000) % greetings.length]

  // XP ring calculations (SVG circle)
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (xpProgress / 100) * circumference

  return (
    <div className="space-y-5">
      {/* Mascot greeting */}
      <div className="flex justify-center animate-slide-up">
        <MascotStatic
          name={userMascot}
          mood={mascotMood}
          size={100}
          message={greeting}
        />
      </div>

      {/* Player HUD */}
      <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-3xl p-5 border border-white/5 animate-slide-up">
        <div className="flex items-center gap-4">
          {/* XP Ring with Mascot Avatar */}
          <div className="relative flex-shrink-0">
            <svg width="100" height="100" className="rotate-[-90deg]">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#2a2a4a" strokeWidth="6" />
              <circle
                cx="50" cy="50" r={radius} fill="none"
                stroke="#58cc02" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="animate-xp-fill"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/mascots/${userMascot}_happy.png`} alt="" width={60} height={60} className="drop-shadow-md" />
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-lg">
              LVL {profile?.level || 1}
            </div>
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold text-white truncate">
              {profile?.username || 'Кухарю'}
            </h1>
            <p className="text-xs text-gray-400 font-medium">{levelInfo.name}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <Zap size={12} className="text-green-400" />
              <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full transition-all"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-green-400 font-bold">{profile?.xp || 0} XP</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <p className="text-lg font-extrabold text-yellow-400">{totalCooked}</p>
            <p className="text-[10px] text-gray-500 font-medium">Рецептів</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <p className="text-lg font-extrabold text-purple-400">{totalCompleted}</p>
            <p className="text-[10px] text-gray-500 font-medium">Квестів</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <p className="text-lg font-extrabold text-orange-400">{profile?.rating_score || 0}</p>
            <p className="text-[10px] text-gray-500 font-medium">Рейтинг</p>
          </div>
        </div>
      </div>

      {/* Pending battles */}
      {pendingBattles && pendingBattles.length > 0 && (
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {pendingBattles.map((battle: any) => (
            <Link
              key={battle.id}
              href={`/battle/${battle.id}`}
              className="block bg-red-500/10 border border-red-500/20 rounded-2xl p-4 hover:bg-red-500/15 transition-all animate-pulse-glow"
              style={{ '--accent-glow': 'rgba(239,68,68,0.3)' } as React.CSSProperties}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Swords size={20} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-300 text-sm">
                    {battle.challenger?.username} кидає виклик!
                  </p>
                  <p className="text-xs text-red-400/60">{battle.recipe?.name}</p>
                </div>
                <span className="text-xs text-red-400 font-bold bg-red-500/20 px-2 py-1 rounded-lg">
                  БАТЛ
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Daily Quest */}
      <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
        {todayChallenge ? (
          <Link href="/challenges" className="block group">
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-600/20 to-violet-600/20 border border-purple-500/20 rounded-2xl p-5 hover:border-purple-500/40 transition-all">
              <div className="absolute top-2 right-2 bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                +{todayChallenge.bonus_points} XP
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Квест дня</p>
                  <p className="text-xs text-gray-500">{cuisine} кухня</p>
                </div>
              </div>
              <p className="text-sm font-bold text-white mt-1">{todayChallenge.description}</p>
              <div className="mt-3 bg-purple-500 hover:bg-purple-400 text-white text-center font-bold py-2 rounded-xl text-sm transition-colors">
                Виконати квест
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-gradient-to-br from-purple-600/10 to-violet-600/10 border border-purple-500/10 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Target size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Тиждень {cuisine} кухні</p>
                <p className="text-xs text-gray-500">Готуй та отримуй бонусні бали</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions - Game style */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <Link
          href="/generate?mode=photo"
          className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-4 hover:border-orange-500/30 hover:bg-[#1a1a2e]/80 transition-all group"
        >
          <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-orange-500/20 transition-all">
            <Camera className="text-orange-400" size={22} />
          </div>
          <h3 className="font-bold text-white text-sm">Скан фото</h3>
          <p className="text-[11px] text-gray-500 mt-1 leading-tight">AI визначить інгредієнти</p>
        </Link>

        <Link
          href="/generate?mode=random"
          className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-4 hover:border-amber-500/30 hover:bg-[#1a1a2e]/80 transition-all group"
        >
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
            <Shuffle className="text-amber-400" size={22} />
          </div>
          <h3 className="font-bold text-white text-sm">Генератор</h3>
          <p className="text-[11px] text-gray-500 mt-1 leading-tight">AI підбере рецепт</p>
        </Link>
      </div>

      {/* Leaderboard teaser */}
      <Link
        href="/leaderboard"
        className="block bg-[#1a1a2e] border border-white/5 rounded-2xl p-4 hover:border-yellow-500/20 transition-all animate-slide-up"
        style={{ animationDelay: '0.25s' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
            <Trophy className="text-yellow-400" size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white text-sm">Таблиця лідерів</p>
            <p className="text-xs text-gray-500">Твій рейтинг: #{profile?.rating_score || '?'}</p>
          </div>
          <span className="text-xs text-yellow-400 font-bold">→</span>
        </div>
      </Link>
    </div>
  )
}
