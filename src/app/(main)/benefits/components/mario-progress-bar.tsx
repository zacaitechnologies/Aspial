"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface MarioProgressBarProps {
  progress: number // 0-100
  targets: {
    level1: number
    level2: number
    level3: number
    level4: number
  }
  viewMode: "monthly" | "yearly"
  selectedTier: string | null
  tierTarget: number
}

export function MarioProgressBar({ progress, targets, viewMode, selectedTier, tierTarget }: MarioProgressBarProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [isJumping, setIsJumping] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress)
    }, 500)
    return () => clearTimeout(timer)
  }, [progress])

  const formatTarget = (value: number) => {
    if (viewMode === "yearly") {
      return value >= 1000000 ? `${(value / 1000000).toFixed(2)}M` : `${value / 1000}K`
    }
    return `${value / 1000}K`
  }

  const getTierName = () => {
    if (!selectedTier) return "Not Selected"
    return `Tier ${selectedTier.replace('TIER_', '')}`
  }

  // Define all 4 checkpoints at quarters (25/50/75/100) but shifted left by 5% to prevent overflow
  const tierCheckpoints = [
    {
      tier: 'CHECKPOINT_1',
      name: 'Checkpoint 1',
      position: 20, // 25% - 5%
      label: 25,
    },
    {
      tier: 'CHECKPOINT_2',
      name: 'Checkpoint 2',
      position: 45, // 50% - 5%
      label: 50,
    },
    {
      tier: 'CHECKPOINT_3',
      name: 'Checkpoint 3',
      position: 70, // 75% - 5%
      label: 75,
    },
    {
      tier: 'CHECKPOINT_4',
      name: 'Checkpoint 4',
      position: 95, // 100% - 5%
      label: 100,
    },
  ]

  return (
    <div className="relative w-full">
      {/* Progress track with brick texture */}
      <div className="relative h-32 bg-linear-to-b from-amber-700 to-amber-900 rounded-lg border-4 border-amber-950 shadow-2xl overflow-visible">
        {/* Brick pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="grid grid-cols-12 h-full">
            {[...Array(48)].map((_, i) => (
              <div key={i} className="border border-amber-950/50" />
            ))}
          </div>
        </div>

        {/* Grass layer at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-b from-green-600 to-green-700 border-t-2 border-green-800">
          {/* Grass blades */}
          <div className="absolute inset-0 flex items-end justify-around px-2">
            {[...Array(30)].map((_, i) => {
              // Use index to create deterministic but varied heights
              const height = 10 + ((i * 7) % 15)
              return (
                <div
                  key={i}
                  className="w-1 bg-green-800 rounded-t"
                  style={{
                    height: `${height}px`,
                    opacity: 0.6,
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Progress fill */}
        <div
          className="absolute bottom-0 left-0 h-full bg-linear-to-r from-green-500 via-green-400 to-green-500 transition-all duration-1000 ease-out"
          style={{ width: `${animatedProgress}%` }}
        >
          <div className="absolute inset-0 bg-linear-to-b from-white/20 to-transparent" />
        </div>

        {/* All 4 Checkpoints - Mario Question Blocks */}
        {tierCheckpoints.map((checkpoint, index) => {
          const isPassed = animatedProgress >= checkpoint.position

          return (
            <div
              key={checkpoint.tier}
              className="absolute bottom-12 transform -translate-x-1/2 transition-all duration-300"
              style={{ left: `${checkpoint.position}%` }}
            >
              {/* Mario Question Block */}
              <div
                className={`relative w-14 h-14 rounded border-4 flex items-center justify-center transition-all duration-300 ${
                  isPassed
                    ? 'bg-linear-to-br from-orange-300 via-orange-400 to-orange-600 border-orange-800 shadow-lg'
                    : 'bg-linear-to-br from-yellow-400 via-yellow-500 to-yellow-700 border-yellow-900 shadow-md'
                }`}
                style={{
                  boxShadow: isPassed
                    ? '0 6px 0 #c2410c, 0 8px 15px rgba(0,0,0,0.2)'
                    : '0 6px 0 #78350f, 0 8px 15px rgba(0,0,0,0.2)',
                }}
              >
                {/* Question mark or checkmark */}
                <span className="text-4xl font-black text-white drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  {isPassed ? '✓' : '?'}
                </span>

                {/* Inner shine effect */}
                <div className="absolute inset-2 border-2 border-white/30 rounded pointer-events-none" />
              </div>

              {/* Checkpoint label - percentage only */}
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span
                  className={`text-sm font-black px-2 py-1 rounded block text-center ${
                    isPassed
                      ? 'bg-green-600 text-white'
                      : 'bg-yellow-600 text-white'
                  }`}
                >
                  {checkpoint.label}%
                </span>
              </div>
            </div>
          )
        })}

        {/* Mario character */}
        <div
          className="absolute bottom-12 transform -translate-x-1/2 transition-all duration-1000 ease-out z-20"
          style={{ left: `${animatedProgress}%` }}
        >
          <div
            className={`${isJumping ? "animate-[bounce_0.6s_ease-in-out]" : ""} transition-all duration-300`}
          >
            <Image
              src="/images/mario-running.gif"
              alt="Mario"
              width={64}
              height={64}
              className="pixelated"
              priority
            />
          </div>
        </div>
      </div>

      {/* Progress percentage */}
      <div className="text-center mt-16">
        <div className="inline-block bg-white/95 px-6 py-3 rounded-full border-4 border-foreground/20 shadow-lg">
          <span className="text-3xl font-black text-primary">{Math.round(progress)}%</span>
          <span className="text-lg font-bold text-muted-foreground ml-2">Complete!</span>
        </div>
      </div>
    </div>
  )
}
