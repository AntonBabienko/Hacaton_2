'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Mascot from '@/components/mascot'
import { useActiveMascot } from '@/components/mascot-provider'

// Map dimensions
const MAP_WIDTH = 340
const NODE_SPACING_Y = 160
const MAP_PADDING_TOP = 110
const MAP_PADDING_BOTTOM = 140
const AMPLITUDE = 90 
const NODE_RADIUS = 42

const WEEK_THEMES = [
  { id: 'purple', from: '#a855f7', to: '#7c3aed', node: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/30' },
  { id: 'orange', from: '#f59e0b', to: '#ea580c', node: 'from-orange-500 to-amber-600', shadow: 'shadow-orange-500/30' },
  { id: 'emerald', from: '#10b981', to: '#059669', node: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/30' },
  { id: 'blue', from: '#3b82f6', to: '#2563eb', node: 'from-blue-500 to-blue-700', shadow: 'shadow-blue-500/30' },
  { id: 'rose', from: '#f43f5e', to: '#e11d48', node: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/30' },
]

interface Props {
  challenges: any[]
  completedIds: string[]
  today: string
}

function generateNodePositions(count: number) {
  const centerX = MAP_WIDTH / 2
  const nodes: { x: number; y: number }[] = []
  for (let i = 0; i < count; i++) {
    const x = centerX + Math.sin((i * Math.PI) / 1.8) * AMPLITUDE
    const y = MAP_PADDING_TOP + i * NODE_SPACING_Y
    nodes.push({ x, y })
  }
  return nodes
}

function generateSvgPath(nodes: { x: number; y: number }[]): string {
  if (nodes.length < 2) return ''
  let d = `M ${nodes[0].x} ${nodes[0].y}`
  for (let i = 0; i < nodes.length - 1; i++) {
    const curr = nodes[i]
    const next = nodes[i + 1]
    const midY = (curr.y + next.y) / 2
    d += ` C ${curr.x} ${midY}, ${next.x} ${midY}, ${next.x} ${next.y}`
  }
  return d
}

export default function QuestMap({ challenges, completedIds, today }: Props) {
  const activeMascot = useActiveMascot()
  const activeRef = useRef<HTMLDivElement>(null)
  const completedSet = new Set(completedIds)

  const nodes = generateNodePositions(challenges.length)
  const mapHeight = challenges.length > 0
    ? MAP_PADDING_TOP + (challenges.length - 1) * NODE_SPACING_Y + MAP_PADDING_BOTTOM
    : 300

  const svgPath = generateSvgPath(nodes)
  const activeIndex = challenges.findIndex((c: any) => c.date === today && !completedSet.has(c.id))
  
  const getCuisineFromDate = (dateStr: string) => {
    const d = new Date(dateStr)
    // A more stable week numbering
    const weekNumber = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000))
    const { CUISINES_SCHEDULE } = require('@/lib/constants')
    return CUISINES_SCHEDULE[weekNumber % CUISINES_SCHEDULE.length]
  }

  const currentCuisine = challenges.find(c => c.date === today)?.cuisine_type || getCuisineFromDate(today)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex])

  const completedCount = challenges.filter((c: any) => completedSet.has(c.id)).length
  const progressFraction = challenges.length > 0 ? completedCount / challenges.length : 0

  if (challenges.length === 0) {
    return (
      <div className="text-center py-12">
        <Mascot name={activeMascot as any} mood="sad" size={120} message="Квестів поки немає..." />
      </div>
    )
  }

  // Chunk challenges by 7 (weeks)
  const weeks: any[][] = []
  for (let i = 0; i < challenges.length; i += 7) {
    weeks.push(challenges.slice(i, i + 7))
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600/20 to-violet-600/20 border border-purple-500/20 rounded-2xl p-5 sticky top-4 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Mascot name={activeMascot as any} mood="happy" size={56} animation="idle" interactive={false} />
          <div>
            <h1 className="text-lg font-extrabold text-white">Мапа квестів</h1>
            <p className="text-xs text-gray-400">
              Сьогодні: <span className="text-purple-400 font-bold">{currentCuisine}</span> кухня
            </p>
          </div>
        </div>
      </div>

      <div className="relative overflow-visible" style={{ height: mapHeight }}>
        {/* SVG Paths */}
        <svg
          width={MAP_WIDTH}
          height={mapHeight}
          className="absolute inset-0 mx-auto"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        >
          {/* Base Path (Shadow) */}
          <path d={svgPath} fill="none" stroke="#222240" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
          {/* Base Path */}
          <path d={svgPath} fill="none" stroke="#2a2a4a" strokeWidth="6" strokeLinecap="round" />
          
          {/* Progress Path */}
          <motion.path
            d={svgPath}
            fill="none"
            stroke="url(#masterGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progressFraction }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />

          <defs>
            <linearGradient id="masterGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>

        {/* Week Separators and Labels */}
        {weeks.map((week, weekIdx) => {
          const firstNodeIdx = weekIdx * 7
          const pos = nodes[firstNodeIdx]
          const cuisine = week[0]?.cuisine_type || getCuisineFromDate(week[0]?.date)
          
          return (
            <div
              key={`week-label-${weekIdx}`}
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
              style={{ top: pos.y - 85, zIndex: 10 }}
            >
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1a1a2e]/95 border-2 border-white/10 px-6 py-2 rounded-[1.5rem] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center min-w-[180px]"
              >
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r ${WEEK_THEMES[weekIdx % WEEK_THEMES.length].node} text-[8px] font-black text-white uppercase tracking-tighter`}>
                  МАРШРУТ {weekIdx + 1}
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-0.5">Тиждень</span>
                <span className="text-base text-white font-black">{cuisine} кухня</span>
              </motion.div>
            </div>
          )
        })}

        {/* Nodes */}
        {challenges.map((challenge: any, index: number) => {
          const isToday = challenge.date === today
          const isCompleted = completedSet.has(challenge.id)
          const isActive = isToday && !isCompleted
          const isLocked = !isToday && !isCompleted
          const pos = nodes[index]
          const weekIdx = Math.floor(index / 7)
          const theme = WEEK_THEMES[weekIdx % WEEK_THEMES.length]
          
          const date = new Date(challenge.date)
          const dayLabel = date.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric' })

          // Construct clean parameters for the generator
          const cuisine = challenge.cuisine_type || getCuisineFromDate(challenge.date)
          const desc = challenge.description
          const generateUrl = `/generate?mode=random&challengeDescription=${encodeURIComponent(desc)}&cuisine=${encodeURIComponent(cuisine)}`

          return (
            <div
              key={challenge.id}
              ref={isActive ? activeRef : undefined}
              className="absolute"
              style={{
                left: `calc(50% + ${pos.x - MAP_WIDTH / 2}px)`,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
                zIndex: isActive ? 40 : 20,
              }}
            >
              {isActive ? (
                <ActiveNode 
                  theme={theme} 
                  challenge={challenge} 
                  dayLabel={dayLabel} 
                  mascotName={activeMascot} 
                  index={index} 
                  href={generateUrl}
                />
              ) : (
                <StaticNode 
                  theme={theme} 
                  challenge={challenge} 
                  dayLabel={dayLabel} 
                  mascotName={activeMascot} 
                  isCompleted={isCompleted} 
                  isLocked={isLocked} 
                  index={index} 
                  href={isCompleted ? undefined : generateUrl}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActiveNode({ theme, challenge, dayLabel, mascotName, index, href }: any) {
  return (
    <motion.div
      initial={{ scale: 0, y: 30 }}
      animate={{ scale: 1, y: 0 }}
      className="flex flex-col items-center"
    >
      <div className="mb-4 relative">
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Mascot name={mascotName} mood="happy" size={88} animation="bounce" interactive />
        </motion.div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_4px_10px_rgba(250,204,21,0.4)] whitespace-nowrap">
          АКТИВНЕ ЗАВДАННЯ
        </div>
      </div>

      <Link href={href || '#'}>
        <motion.div className="relative group">
          {/* Outer Glow */}
          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${theme.node} blur-2xl opacity-60`}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          {/* Orbit rings */}
          <motion.div
            className="absolute inset-[-12px] rounded-full border border-white/10"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/50"
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div
            className={`relative flex items-center justify-center rounded-full bg-gradient-to-br ${theme.node} border-[6px] border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-transform group-hover:scale-110 z-10`}
            style={{ width: NODE_RADIUS * 2, height: NODE_RADIUS * 2 }}
          >
            <span className="text-white font-black text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{index + 1}</span>
          </div>
        </motion.div>
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-6 bg-[#1a1a2e]/90 border-2 border-white/10 rounded-[2.5rem] p-6 w-64 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden backdrop-blur-xl"
      >
        <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${theme.node}`} />
        <p className="text-[10px] text-purple-400 uppercase font-black tracking-[0.2em] mb-2">{dayLabel}</p>
        <p className="text-base text-white font-bold leading-tight mb-4">{challenge.description}</p>
        <div className={`flex items-center justify-center gap-2 py-2 px-6 rounded-2xl bg-gradient-to-r ${theme.node} shadow-lg shadow-purple-500/30 ring-1 ring-white/20`}>
          <span className="text-white font-black text-xs uppercase tracking-wider">Отримати {challenge.bonus_points} XP</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StaticNode({ theme, challenge, dayLabel, mascotName, isCompleted, isLocked, index, href }: any) {
  const content = (
    <div
      className={`relative flex items-center justify-center rounded-full transition-all border-4 ${
        isCompleted 
          ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-white/30 shadow-lg shadow-green-500/20' 
          : isLocked 
            ? 'bg-[#222240] border-white/5 opacity-60' 
            : `bg-gradient-to-br ${theme.node} border-white/20 shadow-xl shadow-black/20`
      }`}
      style={{ 
        width: (isLocked ? NODE_RADIUS * 1.6 : NODE_RADIUS * 1.8), 
        height: (isLocked ? NODE_RADIUS * 1.6 : NODE_RADIUS * 1.8) 
      }}
    >
      {isCompleted ? (
        <img src={`/mascots/${mascotName}_happy.png`} alt="" className="w-12 h-12 drop-shadow-lg" />
      ) : (
        <span className={`font-black text-xl ${isLocked ? 'text-gray-700' : 'text-white'}`}>{index + 1}</span>
      )}

      {isCompleted && (
        <div className="absolute -top-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0f0f23] shadow-lg">
          <svg width="14" height="14" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      
      {isLocked && (
        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-[1px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="3.5">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
      )}
    </div>
  )

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex flex-col items-center"
    >
      {href && !isLocked ? (
        <Link href={href} className="group transition-transform hover:scale-110">
          {content}
        </Link>
      ) : (
        content
      )}
      {!isCompleted && (
        <p className={`text-[10px] font-black mt-2 tracking-widest ${isLocked ? 'text-gray-600' : 'text-gray-400'}`}>
          {dayLabel.toUpperCase()}
        </p>
      )}
    </motion.div>
  )
}
