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
}

export function MarioProgressBar({ progress, targets, viewMode }: MarioProgressBarProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [isJumping, setIsJumping] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress)
    }, 500)
    return () => clearTimeout(timer)
  }, [progress])

  // Determine current level based on progress
  useEffect(() => {
    if (progress >= 75) setCurrentLevel(3)
    else if (progress >= 50) setCurrentLevel(2)
    else if (progress >= 25) setCurrentLevel(1)
    else setCurrentLevel(0)
  }, [progress])

  const formatTarget = (value: number) => {
    if (viewMode === "yearly") {
      return value >= 1000000 ? `${(value / 1000000).toFixed(2)}M` : `${value / 1000}K`
    }
    return `${value / 1000}K`
  }

  const checkpoints = [
    { position: 25, level: 1, label: "Level 1", target: formatTarget(targets.level1) },
    { position: 50, level: 2, label: "Level 2", target: formatTarget(targets.level2) },
    { position: 75, level: 3, label: "Level 3", target: formatTarget(targets.level3) },
    { position: 100, level: 4, label: "Level 4", target: formatTarget(targets.level4) },
  ]

  const getMarioCharacter = () => {
    if (currentLevel >= 3) return "👑" // King/Star Mario
    if (currentLevel >= 2) return "🔥" // Fire Mario
    if (currentLevel >= 1) return "🍄" // Super Mario
    return "🏃" // Small Mario
  }

  const getMarioSize = () => {
    if (currentLevel >= 3) return "text-6xl"
    if (currentLevel >= 2) return "text-5xl"
    if (currentLevel >= 1) return "text-4xl"
    return "text-3xl"
  }

  return (
    <div className="relative w-full">
      {/* Progress track with brick texture */}
      <div className="relative h-32 bg-gradient-to-b from-amber-700 to-amber-900 rounded-lg border-4 border-amber-950 shadow-2xl overflow-hidden">
        {/* Brick pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="grid grid-cols-12 h-full">
            {[...Array(48)].map((_, i) => (
              <div key={i} className="border border-amber-950/50" />
            ))}
          </div>
        </div>

        {/* Grass layer at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-green-600 to-green-700 border-t-2 border-green-800">
          {/* Grass blades */}
          <div className="absolute inset-0 flex items-end justify-around px-2">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-green-800 rounded-t"
                style={{
                  height: `${Math.random() * 15 + 10}px`,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        </div>

        {/* Progress fill */}
        <div
          className="absolute bottom-0 left-0 h-full bg-gradient-to-r from-green-500 via-green-400 to-green-500 transition-all duration-1000 ease-out"
          style={{ width: `${animatedProgress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
        </div>

        {/* Checkpoints (Question Mark Boxes) */}
        {checkpoints.map((checkpoint) => {
          const isReached = progress >= checkpoint.position
          const isActive = Math.abs(progress - checkpoint.position) < 2

          return (
            <div
              key={checkpoint.level}
              className="absolute bottom-12 transform -translate-x-1/2 transition-all duration-300"
              style={{ left: `${checkpoint.position}%` }}
            >
              {/* Question mark box */}
              <div
                className={`relative w-16 h-16 rounded-lg border-4 flex items-center justify-center text-3xl font-black transition-all duration-300 ${
                  isReached
                    ? "bg-gradient-to-b from-amber-400 to-amber-600 border-amber-700 shadow-lg"
                    : "bg-gradient-to-b from-yellow-500 to-yellow-600 border-yellow-700 shadow-xl"
                } ${isActive ? "animate-[brick-bump_0.5s_ease-in-out]" : ""}`}
              >
                {isReached ? "✓" : "?"}

                {/* Sparkles when reached */}
                {isReached && (
                  <>
                    <div className="absolute -top-2 -right-2 text-2xl text-yellow-300 animate-[sparkle_1s_ease-in-out_infinite]">
                      ✨
                    </div>
                    <div
                      className="absolute -bottom-2 -left-2 text-2xl text-yellow-300 animate-[sparkle_1s_ease-in-out_infinite]"
                      style={{ animationDelay: "0.5s" }}
                    >
                      ✨
                    </div>
                    <div
                      className="absolute -top-2 -left-2 text-xl text-yellow-400 animate-[sparkle_1s_ease-in-out_infinite]"
                      style={{ animationDelay: "0.25s" }}
                    >
                      ⭐
                    </div>
                    <div
                      className="absolute -bottom-2 -right-2 text-xl text-yellow-400 animate-[sparkle_1s_ease-in-out_infinite]"
                      style={{ animationDelay: "0.75s" }}
                    >
                      ⭐
                    </div>
                  </>
                )}
              </div>

              {/* Level label with target */}
              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span
                  className={`text-xs font-black px-2 py-1 rounded block text-center ${
                    isReached ? "bg-green-600 text-white" : "bg-yellow-500 text-foreground"
                  }`}
                >
                  {checkpoint.label}
                </span>
                <span className="text-xs font-bold text-foreground/80 block text-center mt-1">
                  RM {checkpoint.target}
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
