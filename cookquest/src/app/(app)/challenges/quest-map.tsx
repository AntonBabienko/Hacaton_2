'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Mascot from '@/components/mascot'
import { useActiveMascot } from '@/components/mascot-provider'

// Map dimensions
const MAP_WIDTH = 340
const NODE_SPACING_Y = 140
const MAP_PADDING_TOP = 80
const MAP_PADDING_BOTTOM = 40
const AMPLITUDE = 90 // Sine wave amplitude (how far nodes swing left/right)
const NODE_RADIUS = 34

interface Props {
  challenges: any[]
  completedIds: string[]
  today: string
  cuisine: string
}

/** Generate node positions along a sinusoidal path */
function generateNodePositions(count: number) {
  const centerX = MAP_WIDTH / 2
  const nodes: { x: number; y: number }[] = []

  for (let i = 0; i < count; i++) {
    // Sinusoidal x offset — each node is half a period apart
    const x = centerX + Math.sin((i * Math.PI) / 1.5) * AMPLITUDE
    const y = MAP_PADDING_TOP + i * NODE_SPACING_Y
    nodes.push({ x, y })
  }
  return nodes
}

/** Generate SVG path (cubic Bézier curves) through node positions */
function generateSvgPath(nodes: { x: number; y: number }[]): string {
  if (nodes.length < 2) return ''

  let d = `M ${nodes[0].x} ${nodes[0].y}`

  for (let i = 0; i < nodes.length - 1; i++) {
    const curr = nodes[i]
    const next = nodes[i + 1]
    const midY = (curr.y + next.y) / 2

    // Cubic Bézier with control points for smooth S-curve
    d += ` C ${curr.x} ${midY}, ${next.x} ${midY}, ${next.x} ${next.y}`
  }

  return d
}

export default function QuestMap({ challenges, completedIds, today, cuisine }: Props) {
  const activeMascot = useActiveMascot()
  const activeRef = useRef<HTMLDivElement>(null)
  const completedSet = new Set(completedIds)

  const nodes = generateNodePositions(challenges.length)
  const mapHeight = challenges.length > 0
    ? MAP_PADDING_TOP + (challenges.length - 1) * NODE_SPACING_Y + MAP_PADDING_BOTTOM + 60
    : 300

  const svgPath = generateSvgPath(nodes)

  // Find the first active (today's uncompleted) index
  const activeIndex = challenges.findIndex(
    (c: any) => c.date === today && !completedSet.has(c.id)
  )

  // Scroll to active node on mount
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  // Calculate path progress (what portion is "completed")
  const completedCount = challenges.filter((c: any) => completedSet.has(c.id)).length
  const progressFraction = challenges.length > 0 ? completedCount / challenges.length : 0

  if (challenges.length === 0) {
    return (
      <div className="text-center py-12">
        <Mascot name={activeMascot as any} mood="sad" size={120} message="Квестів поки немає... Вони з'являться незабаром!" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600/20 to-violet-600/20 border border-purple-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <Mascot name={activeMascot as any} mood="happy" size={56} animation="idle" interactive={false} />
          <div>
            <h1 className="text-lg font-extrabold text-white">Щоденні квести</h1>
            <p className="text-xs text-gray-400">
              Тиждень <span className="text-purple-400 font-bold">{cuisine}</span> кухні
            </p>
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-gray-500">Виконано</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-gray-500">Активний</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
            <span className="text-gray-500">Закритий</span>
          </div>
        </div>
      </div>

      {/* Quest Map Container */}
      <div className="relative overflow-visible" style={{ height: mapHeight }}>
        {/* SVG Path Layer */}
        <svg
          width={MAP_WIDTH}
          height={mapHeight}
          className="absolute inset-0 mx-auto"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        >
          {/* Background path (full, dimmed) */}
          <path
            d={svgPath}
            fill="none"
            stroke="#2a2a4a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Progress path (animated, colored) */}
          <motion.path
            d={svgPath}
            fill="none"
            stroke="url(#pathGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progressFraction }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="pathGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>

        {/* Nodes Layer */}
        {challenges.map((challenge: any, index: number) => {
          const isToday = challenge.date === today
          const isCompleted = completedSet.has(challenge.id)
          const isActive = isToday && !isCompleted
          const isLocked = !isToday && !isCompleted
          const pos = nodes[index]
          const date = new Date(challenge.date)
          const dayLabel = date.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric' })

          return (
            <div
              key={challenge.id}
              ref={isActive ? activeRef : undefined}
              className="absolute"
              style={{
                left: `calc(50% + ${pos.x - MAP_WIDTH / 2}px)`,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
                zIndex: isActive ? 20 : 10,
              }}
            >
              {/* Active node: mascot + expanded card */}
              {isActive ? (
                <ActiveNode
                  challenge={challenge}
                  dayLabel={dayLabel}
                  mascotName={activeMascot}
                  index={index}
                />
              ) : (
                <StaticNode
                  challenge={challenge}
                  dayLabel={dayLabel}
                  mascotName={activeMascot}
                  isCompleted={isCompleted}
                  isLocked={isLocked}
                  index={index}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Active quest node — pulsing, with mascot and expanded info */
function ActiveNode({
  challenge,
  dayLabel,
  mascotName,
  index,
}: {
  challenge: any
  dayLabel: string
  mascotName: string
  index: number
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: index * 0.08 }}
      className="flex flex-col items-center"
    >
      {/* Mascot floating above */}
      <div className="mb-1">
        <Mascot
          name={mascotName as any}
          mood="happy"
          size={64}
          animation="bounce"
          interactive
        />
      </div>

      {/* Pulsing node circle */}
      <Link href="/generate?mode=random">
        <motion.div
          className="relative"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {/* Pulse rings */}
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-500/30"
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ margin: -8 }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-500/20"
            animate={{
              scale: [1, 2.2, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            style={{ margin: -8 }}
          />

          {/* Main circle */}
          <div
            className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30"
            style={{ width: NODE_RADIUS * 2, height: NODE_RADIUS * 2 }}
          >
            <span className="text-white font-extrabold text-lg">{index + 1}</span>
          </div>
        </motion.div>
      </Link>

      {/* Info card below */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + index * 0.08 }}
        className="mt-2 bg-[#1a1a2e] border border-purple-500/30 rounded-xl px-3 py-2 max-w-[200px] text-center"
      >
        <p className="text-[10px] text-purple-400 font-bold uppercase">{dayLabel}</p>
        <p className="text-xs text-white font-bold mt-0.5 leading-tight line-clamp-2">
          {challenge.description}
        </p>
        <p className="text-[10px] text-purple-400/60 mt-1">+{challenge.bonus_points} XP</p>
      </motion.div>
    </motion.div>
  )
}

/** Completed or locked node */
function StaticNode({
  challenge,
  dayLabel,
  mascotName,
  isCompleted,
  isLocked,
  index,
}: {
  challenge: any
  dayLabel: string
  mascotName: string
  isCompleted: boolean
  isLocked: boolean
  index: number
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 18,
        delay: index * 0.08,
      }}
      className="flex flex-col items-center"
    >
      {/* Node circle */}
      <motion.div
        className="relative"
        whileHover={isCompleted ? { scale: 1.1 } : undefined}
      >
        <div
          className={`relative flex items-center justify-center rounded-full transition-all ${
            isCompleted
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20'
              : 'bg-[#222240] border-2 border-gray-700'
          }`}
          style={{ width: NODE_RADIUS * 2, height: NODE_RADIUS * 2 }}
        >
          {isCompleted ? (
            /* Completed: small mascot inside circle */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/mascots/${mascotName}_happy.png`}
              alt=""
              width={40}
              height={40}
              className="drop-shadow-sm"
            />
          ) : (
            /* Locked: number + lock overlay */
            <span className="text-gray-600 font-bold text-sm">{index + 1}</span>
          )}

          {/* Completed checkmark badge */}
          {isCompleted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 + index * 0.08 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0f0f23]"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          )}

          {/* Locked overlay */}
          {isLocked && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
          )}
        </div>
      </motion.div>

      {/* Label below */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 + index * 0.08 }}
        className="mt-1.5 text-center max-w-[120px]"
      >
        <p className={`text-[10px] font-bold ${isCompleted ? 'text-green-400/70' : 'text-gray-600'}`}>
          {isCompleted ? 'Виконано' : dayLabel}
        </p>
        {isCompleted && (
          <p className="text-[9px] text-green-500/40">+{challenge.bonus_points} XP</p>
        )}
      </motion.div>
    </motion.div>
  )
}
