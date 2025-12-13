"use client"

import { Card } from "@/components/ui/card"
import Image from "next/image"

interface MonthlyData {
  month: string
  sales: number
  level: number
  stars: number
}

interface MonthlyPerformanceProps {
  monthlyData: MonthlyData[]
  totalStars: number
  selectedTier: string | null
  tierMonthlyTarget: number
}

export function MonthlyPerformance({ 
  monthlyData, 
  totalStars, 
  selectedTier, 
  tierMonthlyTarget 
}: MonthlyPerformanceProps) {
  // Calculate how many months achieved the target
  const monthsAchieved = monthlyData.filter(month => month.sales >= tierMonthlyTarget).length
  
  // Calculate bricks (same as stars but named differently)
  const totalBricks = monthlyData.filter(month => month.sales >= tierMonthlyTarget).length
  
  // Determine castle phase (0-2 months: Phase 1, 3-5: Phase 2, 6-8: Phase 3, 9-12: Phase 4)
  const getCastlePhase = () => {
    if (monthsAchieved >= 9) return 4
    if (monthsAchieved >= 6) return 3
    if (monthsAchieved >= 3) return 2
    return 1
  }
  
  const castlePhase = getCastlePhase()
  
  const getPhaseProgress = () => {
    if (castlePhase === 4) return { current: monthsAchieved, required: 9, next: "Complete!" }
    if (castlePhase === 3) return { current: monthsAchieved, required: 9, next: "Phase 4" }
    if (castlePhase === 2) return { current: monthsAchieved, required: 6, next: "Phase 3" }
    return { current: monthsAchieved, required: 3, next: "Phase 2" }
  }
  
  const phaseProgress = getPhaseProgress()

  return (
    <>
      <Card className="p-6 bg-white/95 border-4 border-foreground/20 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-black text-foreground">Monthly Performance Tracker</h2>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Image src="/images/brick.png" alt="Brick" width={32} height={32} className="pixelated" />
                <span className="text-4xl font-black text-orange-600">{totalBricks}</span>
              </div>
              <div className="text-xs font-bold text-muted-foreground">Total Bricks</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {monthlyData.map((month, index) => {
            const achieved = month.sales >= tierMonthlyTarget
            
            return (
              <div key={index} className="relative group">
                <div
                  className={`p-4 rounded-lg border-4 shadow-lg transition-transform hover:scale-105 hover:shadow-xl ${
                    achieved 
                      ? 'bg-linear-to-br from-green-400 to-green-600 border-green-700 ring-4 ring-green-300' 
                      : 'bg-linear-to-br from-gray-300 to-gray-400 border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg font-black text-white mb-2">{month.month}</div>
                    <div className="text-sm font-bold text-white/90 mb-2">
                      RM {(month.sales / 1000).toFixed(0)}K / RM {(tierMonthlyTarget / 1000).toFixed(0)}K
                    </div>
                    <div className="inline-block bg-white/90 px-2 py-1 rounded text-xs font-black text-foreground mb-2">
                      {achieved ? "✓ Target Met" : "Target Not Achieved"}
                    </div>
                    <div className="text-2xl">
                      {achieved ? (
                        <Image src="/images/brick.png" alt="Brick" width={40} height={40} className="pixelated mx-auto" />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-foreground text-background px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap shadow-xl">
                    <div>{achieved ? "Target Achieved!" : "Target Not Met"}</div>
                    <div>RM {month.sales.toLocaleString()}</div>
                    <div>Target: RM {tierMonthlyTarget.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-400 rounded-lg">
          <h3 className="text-lg font-black text-blue-900 mb-2">Performance Tracking</h3>
          <ul className="space-y-1 text-sm font-bold text-blue-800">
            <li>• Monthly sales tracked against your selected tier target (RM{(tierMonthlyTarget / 1000).toFixed(0)}K)</li>
            <li>• Consistent performance earns continuous bonuses</li>
            <li>• All achievements presented at year-end</li>
          </ul>
        </div>
      </Card>

      {/* Castle Progress Section */}
      <Card className="mt-6 p-6 bg-linear-to-br from-purple-50 to-pink-50 border-4 border-purple-400 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-foreground mb-2">🏰 Castle Building Progress</h2>
          <p className="text-lg font-bold text-muted-foreground">
            Achieve monthly targets to unlock castle phases!
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
          {/* Progress Info - Left Side */}
          <div className="flex-1 w-full md:w-auto">
            <div className="bg-white/90 p-6 rounded-lg border-4 border-purple-300 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black text-purple-900">Building Progress</h3>
                {selectedTier && (
                  <div className="bg-purple-100 px-3 py-1 rounded-full border-2 border-purple-400">
                    <span className="text-xs font-black text-purple-900">
                      Tier {selectedTier.replace('TIER_', '')}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-linear-to-br from-purple-100 to-pink-100 p-4 rounded-lg border-2 border-purple-300">
                    <div className="flex items-center gap-2 mb-2">
                      <Image src="/images/brick.png" alt="Brick" width={24} height={24} className="pixelated" />
                      <span className="text-sm font-bold text-purple-900">Bricks Collected</span>
                    </div>
                    <div className="text-3xl font-black text-purple-600">{totalBricks}/12</div>
                    <div className="text-xs font-bold text-purple-700 mt-1">
                      {12 - totalBricks} more to complete
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🏰</span>
                    <span className="text-lg font-black text-purple-900">Castle Phases</span>
                  </div>
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg border-2 transition-all ${
                      castlePhase >= 1 
                        ? 'bg-green-50 border-green-400 text-green-800' 
                        : 'bg-gray-50 border-gray-300 text-gray-500'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{castlePhase >= 1 ? '✅' : '⏳'}</span>
                          <div>
                            <div className="font-black">Phase 1: Foundation</div>
                            <div className="text-xs font-bold opacity-80">0-2 months achieved</div>
                          </div>
                        </div>
                        {castlePhase >= 1 && (
                          <span className="text-lg font-black">✓</span>
                        )}
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded-lg border-2 transition-all ${
                      castlePhase >= 2 
                        ? 'bg-green-50 border-green-400 text-green-800' 
                        : 'bg-gray-50 border-gray-300 text-gray-500'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{castlePhase >= 2 ? '✅' : '⏳'}</span>
                          <div>
                            <div className="font-black">Phase 2: Construction</div>
                            <div className="text-xs font-bold opacity-80">3-5 months achieved</div>
                          </div>
                        </div>
                        {castlePhase >= 2 && (
                          <span className="text-lg font-black">✓</span>
                        )}
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded-lg border-2 transition-all ${
                      castlePhase >= 3 
                        ? 'bg-green-50 border-green-400 text-green-800' 
                        : 'bg-gray-50 border-gray-300 text-gray-500'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{castlePhase >= 3 ? '✅' : '⏳'}</span>
                          <div>
                            <div className="font-black">Phase 3: Expansion</div>
                            <div className="text-xs font-bold opacity-80">6-8 months achieved</div>
                          </div>
                        </div>
                        {castlePhase >= 3 && (
                          <span className="text-lg font-black">✓</span>
                        )}
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded-lg border-2 transition-all ${
                      castlePhase >= 4 
                        ? 'bg-linear-to-r from-yellow-50 to-orange-50 border-yellow-400 text-yellow-900' 
                        : 'bg-gray-50 border-gray-300 text-gray-500'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{castlePhase >= 4 ? '👑' : '⏳'}</span>
                          <div>
                            <div className="font-black">Phase 4: Complete Castle</div>
                            <div className="text-xs font-bold opacity-80">9-12 months achieved</div>
                          </div>
                        </div>
                        {castlePhase >= 4 && (
                          <span className="text-lg font-black">👑</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {castlePhase === 4 && (
                  <div className="mt-4 p-6 bg-linear-to-r from-yellow-400 via-orange-400 to-yellow-500 rounded-lg border-4 border-yellow-600 shadow-2xl">
                    <div className="text-center">
                      <div className="text-5xl mb-3">🎉👑🎉</div>
                      <div className="text-2xl font-black text-white mb-2">Castle Complete!</div>
                      <div className="text-base font-bold text-white/95 mb-3">Amazing performance this year!</div>
                      <div className="bg-white/30 p-3 rounded-lg border-2 border-white/50">
                        <div className="text-sm font-black text-white">
                          You've achieved all {monthsAchieved} monthly targets! 🏆
                        </div>
                        <div className="text-xs font-bold text-white/90 mt-1">
                          Your dedication has built a magnificent castle!
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Castle Image - Right Side */}
          <div className="relative shrink-0 w-full md:w-auto">
            <Image 
              src={`/images/castle${castlePhase}.png`} 
              alt={`Castle Phase ${castlePhase}`} 
              width={350} 
              height={350}
              className="pixelated drop-shadow-2xl mx-auto md:mx-0"
            />
            <div className="absolute -top-4 -right-4 bg-purple-600 text-white px-4 py-2 rounded-full font-black text-lg shadow-xl">
              Phase {castlePhase}
            </div>
          </div>
        </div>
      </Card>
    </>
  )
}
