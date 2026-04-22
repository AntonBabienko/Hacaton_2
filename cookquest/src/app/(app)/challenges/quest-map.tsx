'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Mascot from '@/components/mascot'
import { useActiveMascot } from '@/components/mascot-provider'
import { useTranslation } from '@/lib/i18n/client'

// Map dimensions — larger nodes with more spacing for 3D effect
const MAP_WIDTH = 340
const NODE_SPACING_Y = 200
const MAP_PADDING_TOP = 100
const MAP_PADDING_BOTTOM = 100
const AMPLITUDE = 80
const NODE_RADIUS = 32
const DISC_THICKNESS = 10

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
  const { t, locale } = useTranslation()
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
    const weekNumber = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000))
    const { CUISINES_SCHEDULE } = require('@/lib/constants')
    return CUISINES_SCHEDULE[weekNumber % CUISINES_SCHEDULE.length]
  }

  const currentCuisine = challenges.find(c => c.date === today)?.cuisine || getCuisineFromDate(today)

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
        <Mascot name={activeMascot as any} mood="sad" size={120} message={t.challenges.no_quests} />
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
      <div className="bg-gradient-to-br from-purple-600/20 to-violet-600/20 border border-purple-500/20 rounded-2xl p-4 sticky top-4 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Mascot name={activeMascot as any} mood="happy" size={48} animation="idle" interactive={false} />
          <div>
            <h1 className="text-lg font-extrabold text-white">{t.challenges.map}</h1>
            <p className="text-xs text-gray-400">
              {t.challenges.today}: <span className="text-purple-400 font-bold">{currentCuisine}</span> {t.challenges.cuisine}
            </p>
          </div>
        </div>
      </div>

      {/* Isometric map — camera parallel to road, no perspective shrink */}
      <div className="overflow-visible">
        <div
          className="relative mx-auto"
          style={{
            width: MAP_WIDTH,
            height: mapHeight,
          }}
        >
          {/* SVG Paths */}
          <svg
            width={MAP_WIDTH}
            height={mapHeight}
            className="absolute inset-0"
          >
            {/* Road shadow */}
            <path d={svgPath} fill="none" stroke="#111128" strokeWidth="32" strokeLinecap="round" opacity="0.5" />
            {/* Road base */}
            <path d={svgPath} fill="none" stroke="#1e1e3a" strokeWidth="20" strokeLinecap="round" />
            {/* Road dashes */}
            <path d={svgPath} fill="none" stroke="#2a2a50" strokeWidth="3" strokeLinecap="round" strokeDasharray="12 16" />

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

          {/* Nodes */}
          {challenges.map((challenge: any, index: number) => {
            const isActive = index === activeIndex
            const isToday = challenge.date === today
            const isCompleted = completedSet.has(challenge.id)
            const isLocked = !isCompleted && index > activeIndex
            const pos = nodes[index]
            const weekIdx = Math.floor(index / 7)
            const theme = WEEK_THEMES[weekIdx % WEEK_THEMES.length]

            const date = new Date(challenge.date)
            const dateLocale = locale === 'en' ? 'en-US' : 'uk-UA'
            const dayLabel = date.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric' })

            const cuisine = challenge.cuisine || getCuisineFromDate(challenge.date)
            const desc = challenge.description
            const generateUrl = `/generate?mode=random&challengeDescription=${encodeURIComponent(desc)}&cuisine=${encodeURIComponent(cuisine)}`
            const isFirstInWeek = index % 7 === 0

            return (
              <div
                key={challenge.id}
                ref={isActive ? activeRef : undefined}
                className="absolute"
                style={{
                  left: pos.x,
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
                    isFirstInWeek={isFirstInWeek}
                    weekIdx={weekIdx}
                    cuisine={cuisine}
                    t={t}
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
                    isFirstInWeek={isFirstInWeek}
                    weekIdx={weekIdx}
                    cuisine={cuisine}
                    t={t}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ActiveNode({ theme, dayLabel, mascotName, index, href, isFirstInWeek, weekIdx, cuisine, t }: any) {
  const d = NODE_RADIUS * 2
  const faceH = Math.round(d * 0.72) // ellipse: circle flattened by perspective
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex flex-col items-center"
    >
      {/* Mascot above node */}
      <div className="mb-2">
        <Mascot name={mascotName} mood="happy" size={56} animation="bounce" interactive />
      </div>

      <Link href={href || '#'}>
        <motion.div className="relative group" style={{ width: d, height: faceH + DISC_THICKNESS }}>
          {/* Glow — optimized without blur filter */}
          <div
            className="absolute"
            style={{ inset: -12, bottom: DISC_THICKNESS, borderRadius: '50%', background: `radial-gradient(circle, ${theme.from}33 0%, transparent 70%)` }}
          />

          {/* Single stable Pulse Wave — reaches 0 opacity well before max scale to avoid flashes */}
          <motion.div
            key={`wave-${index}`}
            className="absolute border-2 border-white/40 will-change-transform"
            style={{ left: 0, top: DISC_THICKNESS, width: d, height: faceH, borderRadius: '50%' }}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ 
              scale: [1, 1.8, 2.5, 2.6],
              opacity: [0, 0.4, 0, 0] 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeOut",
              times: [0, 0.2, 0.8, 1]
            }}
          />

          {/* 3D disc rim — starts from equator to match curvature exactly */}
          <div
            className="absolute bg-gradient-to-b"
            style={{
              left: 0,
              width: d,
              top: faceH / 2,
              height: faceH / 2 + DISC_THICKNESS,
              borderRadius: `0 0 ${d / 2}px ${d / 2}px / 0 0 ${faceH / 2}px ${faceH / 2}px`,
              background: `linear-gradient(to bottom, #1a1a3a, #0a0a1a)`,
              opacity: 0.9,
            }}
          />
          {/* Rim side-light highlight */}
          <div
            className="absolute"
            style={{
              left: 0,
              width: d,
              top: faceH / 2,
              height: faceH / 2 + DISC_THICKNESS,
              borderRadius: `0 0 ${d / 2}px ${d / 2}px / 0 0 ${faceH / 2}px ${faceH / 2}px`,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.2) 100%)',
            }}
          />

          {/* Ground shadow — simplified */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bg-black/40"
            style={{
              width: d * 1.1,
              height: 8,
              top: faceH + DISC_THICKNESS - 2,
              borderRadius: '50%',
            }}
          />

          {/* Main disc face — ellipse (static) */}
          <div
            className={`absolute left-0 top-0 flex items-center justify-center bg-gradient-to-br ${theme.node} border-[3px] border-white/30 shadow-lg z-10`}
            style={{ width: d, height: faceH, borderRadius: '50%' }}
          >
            <span className="text-white font-black text-xl drop-shadow-md">{index + 1}</span>
          </div>
        </motion.div>
      </Link>

      {/* Plank / tablet under the node */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-2 relative"
      >
        <div className={`bg-[#13132a]/90 border border-white/10 rounded-xl px-3 py-2 text-center backdrop-blur-sm shadow-lg`}>
          <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${theme.node} rounded-t-xl`} />
          {isFirstInWeek && (
            <p className={`text-[8px] uppercase tracking-widest font-bold bg-gradient-to-r ${theme.node} bg-clip-text text-transparent mb-0.5`}>
              {t.challenges.route} {weekIdx + 1} &middot; {cuisine}
            </p>
          )}
          <p className="text-[9px] text-gray-400 font-semibold">{dayLabel}</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StaticNode({ theme, challenge, dayLabel, mascotName, isCompleted, isLocked, index, href, isFirstInWeek, weekIdx, cuisine, t }: any) {
  const size = NODE_RADIUS * 2
  const thickness = DISC_THICKNESS
  const faceH = Math.round(size * 0.72) // ellipse perspective

  const content = (
    <div className="relative" style={{ width: size, height: faceH + thickness }}>
      {/* 3D disc rim — solid gray for locked, theme for others */}
      <div
        className="absolute"
        style={{
          left: 0,
          width: size,
          top: faceH / 2,
          height: faceH / 2 + thickness,
          borderRadius: `0 0 ${size / 2}px ${size / 2}px / 0 0 ${faceH / 2}px ${faceH / 2}px`,
          background: isCompleted 
            ? 'linear-gradient(to bottom, #15803d, #064e3b)' 
            : isLocked 
              ? 'linear-gradient(to bottom, #171717, #0a0a0a)' 
              : `linear-gradient(to bottom, #1a1a3a, #0a0a1a)`,
          opacity: 1,
        }}
      />
      {/* Rim side highlight */}
      <div
        className="absolute"
        style={{
          left: 0,
          width: size,
          top: faceH / 2,
          height: faceH / 2 + thickness,
          borderRadius: `0 0 ${size / 2}px ${size / 2}px / 0 0 ${faceH / 2}px ${faceH / 2}px`,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 35%, transparent 75%, rgba(0,0,0,0.15) 100%)',
          opacity: isLocked ? 0 : 1,
        }}
      />

      {/* Ground shadow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bg-black/20 blur-sm"
        style={{
          width: size * 0.85,
          height: 6,
          top: faceH + thickness - 1,
          borderRadius: '50%',
        }}
      />

      {/* Main disc face — ellipse */}
      <div
        className={`absolute left-0 top-0 flex items-center justify-center border-[3px] z-10 ${isCompleted
            ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-white/25 shadow-md shadow-green-500/20'
            : isLocked
              ? 'bg-gradient-to-br from-neutral-800 to-neutral-950 border-white/5 shadow-2xl'
              : `bg-gradient-to-br ${theme.node} border-white/15 shadow-md`
          }`}
        style={{ width: size, height: faceH, borderRadius: '50%' }}
      >
        {isCompleted ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/mascots/${mascotName}_happy.png`} alt="" className="w-8 h-8 drop-shadow" />
        ) : (
          <span className={`font-black text-base ${isLocked ? 'text-neutral-700' : 'text-white'}`}>{index + 1}</span>
        )}

        {isCompleted && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0f0f23]">
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}


      </div>
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
      {/* Plank under node */}
      <div className={`mt-1.5 bg-[#13132a]/80 border border-white/5 rounded-lg px-2.5 py-1 text-center ${isLocked ? 'opacity-40' : ''}`}>
        {isFirstInWeek && (
          <p className={`text-[7px] uppercase tracking-widest font-bold bg-gradient-to-r ${theme.node} bg-clip-text text-transparent`}>
            {t.challenges.route} {weekIdx + 1} &middot; {cuisine}
          </p>
        )}
        <p className={`text-[9px] font-semibold ${isLocked ? 'text-gray-600' : 'text-gray-400'}`}>{dayLabel}</p>
        <p className={`text-[10px] font-bold leading-tight line-clamp-1 mt-0.5 ${isLocked ? 'text-gray-600' : isCompleted ? 'text-green-400' : 'text-white'}`}>
          {challenge.description}
        </p>
      </div>
    </motion.div>
  )
}
