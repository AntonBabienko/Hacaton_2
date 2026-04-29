'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  motion,
  AnimatePresence,
  useAnimation,
  type Variants,
} from 'framer-motion'
import Image from 'next/image'

const MASCOTS = [
  'broccoli', 'cauldron', 'cheese', 'icecream',
  'knightpan', 'pepper', 'slime', 'stove',
] as const

type MascotName = typeof MASCOTS[number]
type Mood = 'happy' | 'neutral' | 'sad'
type Animation = 'idle' | 'bounce' | 'pop' | 'celebrate' | 'shake' | 'none'

interface MascotProps {
  name?: MascotName
  mood?: Mood
  size?: number
  message?: string
  animation?: Animation
  className?: string
  random?: boolean
  /** Click triggers a playful reaction */
  interactive?: boolean
  /** Delay before entrance (ms) */
  delay?: number
}

// --- Framer Motion Variants ---

// Entrance: scale from 0 with overshoot (squash & stretch)
const entranceVariants: Variants = {
  hidden: { opacity: 0, scale: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 15,
      delay: delay / 1000,
    },
  }),
}

// Idle: breathing effect (subtle scale + float)
const idleVariants: Variants = {
  idle: {
    y: [0, -5, 0],
    scaleY: [1, 1.02, 1],
    scaleX: [1, 0.98, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// Bounce: Duolingo-style jump with squash & stretch
const bounceVariants: Variants = {
  idle: {
    y: [0, -18, 0, -6, 0],
    scaleX: [1, 0.9, 1.1, 0.95, 1],
    scaleY: [1, 1.12, 0.88, 1.04, 1],
    transition: {
      duration: 1.6,
      repeat: Infinity,
      repeatDelay: 1.5,
      ease: [0.36, 0, 0.66, -0.56],
    },
  },
}

// Pop: entrance bounce
const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0, rotate: -12 },
  visible: (delay: number) => ({
    opacity: 1,
    scale: [0, 1.2, 0.9, 1.05, 1],
    rotate: [-12, 5, -3, 1, 0],
    transition: {
      duration: 0.7,
      delay: delay / 1000,
      ease: 'easeOut',
    },
  }),
}

// Celebrate: jump + spin
const celebrateVariants: Variants = {
  idle: {
    y: [0, -25, 0],
    rotate: [0, -10, 10, -5, 0],
    scaleX: [1, 0.85, 1.15, 0.95, 1],
    scaleY: [1, 1.15, 0.85, 1.05, 1],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      repeatDelay: 2,
    },
  },
}

// Shake: sad/error wiggle
const shakeVariants: Variants = {
  idle: {
    x: [0, -6, 6, -4, 4, -2, 0],
    rotate: [0, -3, 3, -2, 2, -1, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 3,
    },
  },
}

// Tap reaction: squash down then spring up
const tapReaction = {
  scale: [1, 0.8, 1.15, 0.95, 1],
  y: [0, 8, -12, 2, 0],
  rotate: [0, 0, -8, 4, 0],
  transition: { duration: 0.5, ease: 'easeOut' as const },
}

// Speech bubble
const bubbleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.7, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      delay: 0.3,
    },
  },
}

export default function Mascot({
  name,
  mood = 'happy',
  size = 120,
  message,
  animation = 'idle',
  className = '',
  random = false,
  interactive = true,
  delay = 0,
}: MascotProps) {
  const [mascotName, setMascotName] = useState<MascotName>(name || 'broccoli')
  const [currentMood, setCurrentMood] = useState<Mood>(mood)
  const controls = useAnimation()

  useEffect(() => {
    if (name) {
      setMascotName(name)
    } else if (random) {
      setMascotName(MASCOTS[Math.floor(Math.random() * MASCOTS.length)])
    }
  }, [name, random])

  useEffect(() => {
    setCurrentMood(mood)
  }, [mood])

  const handleTap = useCallback(async () => {
    if (!interactive) return
    // Squash & stretch reaction
    await controls.start(tapReaction)
    // Quick mood flash
    setCurrentMood('happy')
    setTimeout(() => setCurrentMood(mood), 800)
  }, [interactive, controls, mood])

  const src = `/mascots/${mascotName}_${currentMood}.png`

  // Select continuous animation variant
  const getAnimationVariant = () => {
    switch (animation) {
      case 'bounce': return bounceVariants
      case 'celebrate': return celebrateVariants
      case 'shake': return shakeVariants
      case 'pop': return idleVariants // pop is for entrance, then idle
      case 'idle': return idleVariants
      default: return undefined
    }
  }

  // Select entrance variant
  const getEntranceVariant = () => {
    if (animation === 'pop') return popVariants
    return entranceVariants
  }

  const animVariant = getAnimationVariant()

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <motion.div
        custom={delay}
        variants={getEntranceVariant()}
        initial="hidden"
        animate="visible"
        style={{ originY: 1 }} // Squash from bottom (feet)
      >
        <motion.div
          variants={animVariant}
          animate={animation !== 'none' ? 'idle' : undefined}
          onTap={handleTap}
          whileHover={interactive ? { scale: 1.08, transition: { duration: 0.2 } } : undefined}
          style={{
            cursor: interactive ? 'pointer' : 'default',
            originY: 1,
          }}
        >
          <motion.div animate={controls}>
            <Image
              src={src}
              alt={`${mascotName} mascot`}
              width={size}
              height={size}
              className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] select-none pointer-events-none"
              draggable={false}
              loading="lazy"
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Speech bubble */}
      <AnimatePresence>
        {message && (
          <motion.div
            variants={bubbleVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="relative bg-[#222240] border border-white/10 rounded-2xl px-4 py-2.5 max-w-[250px] text-center"
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#222240] border-l border-t border-white/10 rotate-45" />
            <p className="text-sm text-gray-200 relative z-10 font-medium">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Static version for server components ---
// Uses CSS animations only (no framer-motion, no hooks)
export function MascotStatic({
  name = 'broccoli',
  mood = 'happy',
  size = 120,
  message,
  className = '',
}: Omit<MascotProps, 'animation' | 'random' | 'interactive' | 'delay'>) {
  const src = `/mascots/${name}_${mood}.png`

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="animate-float">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${name} mascot`}
          width={size}
          height={size}
          className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
        />
      </div>
      {message && (
        <div className="relative bg-[#222240] border border-white/10 rounded-2xl px-4 py-2.5 max-w-[250px] text-center animate-slide-up">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#222240] border-l border-t border-white/10 rotate-45" />
          <p className="text-sm text-gray-200 relative z-10 font-medium">{message}</p>
        </div>
      )}
    </div>
  )
}
