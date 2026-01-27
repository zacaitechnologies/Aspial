"use client"

import { useState, useMemo, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { MarioProgressBar } from "./mario-progress-bar"
import { RewardCard } from "./reward-card"
import { MonthlyPerformance } from "./monthly-performance"
import { ComplaintsTracker } from "./complaints-tracker"
import { TierSelectionModal } from "./tier-selection-modal"
import { AdminBenefitsView } from "./admin-benefits-view"
import { Plane, Award, Trophy, Car, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { 
	getEmployeeSalesData, 
	getEmployeeComplaints, 
	getUserTierSelection,
	getAllUsersBenefits,
	selectUserTier,
	type EmployeeSalesData,
	type UserBenefitsSummary,
	type ComplaintData,
} from "../action"
import { useSession } from "../../contexts/SessionProvider"

interface BenefitsPageClientProps {
	initialSalesData: EmployeeSalesData | null
	initialComplaints: ComplaintData[]
	initialTierSelection: { tier: string | null; customTarget: number | null; needsSelection: boolean; selectedAt: Date | null }
	initialAllUsersBenefits: UserBenefitsSummary[]
	isAdmin: boolean
	userId: string
	currentYear: number
	currentMonth: number
}

export default function BenefitsPageClient({
	initialSalesData,
	initialComplaints,
	initialTierSelection,
	initialAllUsersBenefits,
	isAdmin,
	userId,
	currentYear: initialCurrentYear,
	currentMonth: initialCurrentMonth,
}: BenefitsPageClientProps) {
	const { enhancedUser } = useSession()
	const { toast } = useToast()
	const [viewMode, setViewMode] = useState<"monthly" | "yearly">("yearly")
	const [selectedYear, setSelectedYear] = useState<string>(initialCurrentYear.toString())
	const [selectedMonth, setSelectedMonth] = useState<string>(initialCurrentMonth.toString())
	const [salesData, setSalesData] = useState<EmployeeSalesData | null>(initialSalesData)
	const [complaints, setComplaints] = useState<ComplaintData[]>(initialComplaints)
	const [loading, setLoading] = useState(false)
	const [selectedTier, setSelectedTier] = useState<string | null>(initialTierSelection.tier)
	const [customTierTarget, setCustomTierTarget] = useState<number | null>(initialTierSelection.customTarget)
	const [showTierModal, setShowTierModal] = useState(initialTierSelection.needsSelection && !isAdmin)
	const [allUsersBenefits, setAllUsersBenefits] = useState<UserBenefitsSummary[]>(initialAllUsersBenefits)
	const [adminLoading, setAdminLoading] = useState(false)

	// Handle year/month changes via direct callbacks (not useEffect)
	const handleYearChange = useCallback(async (year: string) => {
		setSelectedYear(year)
		if (!isAdmin && userId) {
			setLoading(true)
			try {
				const yearNum = parseInt(year)
				const monthNum = viewMode === "monthly" ? parseInt(selectedMonth) : undefined
				const [salesResult, tierSelection] = await Promise.all([
					getEmployeeSalesData(userId, yearNum, monthNum),
					getUserTierSelection(userId, yearNum),
				])
				setSalesData(salesResult)
				setSelectedTier(tierSelection.tier)
				setCustomTierTarget(tierSelection.customTarget)
			} catch (error) {
				if (process.env.NODE_ENV === 'development') {
					console.error("Error fetching benefits data:", error)
				}
			} finally {
				setLoading(false)
			}
		} else if (isAdmin) {
			setAdminLoading(true)
			try {
				const yearNum = parseInt(year)
				const usersData = await getAllUsersBenefits(yearNum)
				setAllUsersBenefits(usersData)
			} catch (error) {
				if (process.env.NODE_ENV === 'development') {
					console.error("Error fetching admin benefits data:", error)
				}
			} finally {
				setAdminLoading(false)
			}
		}
	}, [isAdmin, userId, viewMode, selectedMonth])

	const handleMonthChange = useCallback(async (month: string) => {
		setSelectedMonth(month)
		if (!isAdmin && userId) {
			setLoading(true)
			try {
				const yearNum = parseInt(selectedYear)
				const monthNum = parseInt(month)
				const salesResult = await getEmployeeSalesData(userId, yearNum, monthNum)
				setSalesData(salesResult)
			} catch (error) {
				if (process.env.NODE_ENV === 'development') {
					console.error("Error fetching benefits data:", error)
				}
			} finally {
				setLoading(false)
			}
		}
	}, [isAdmin, userId, selectedYear])

	const handleViewModeChange = useCallback(async (checked: boolean) => {
		const newMode = checked ? "monthly" : "yearly"
		setViewMode(newMode)
		if (!isAdmin && userId) {
			setLoading(true)
			try {
				const yearNum = parseInt(selectedYear)
				const monthNum = newMode === "monthly" ? parseInt(selectedMonth) : undefined
				const salesResult = await getEmployeeSalesData(userId, yearNum, monthNum)
				setSalesData(salesResult)
			} catch (error) {
				if (process.env.NODE_ENV === 'development') {
					console.error("Error fetching benefits data:", error)
				}
			} finally {
				setLoading(false)
			}
		}
	}, [isAdmin, userId, selectedYear, selectedMonth])

	const handleRefreshAdminData = useCallback(async () => {
		setAdminLoading(true)
		try {
			const year = parseInt(selectedYear)
			const usersData = await getAllUsersBenefits(year)
			setAllUsersBenefits(usersData)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error refreshing admin benefits data:", error)
			}
		} finally {
			setAdminLoading(false)
		}
	}, [selectedYear])

	const handleTierSelection = useCallback(async (tier: string, customTarget?: number) => {
		if (!userId) return

		try {
			const result = await selectUserTier(userId, tier, customTarget)
			if (result.success) {
				toast({
					title: 'Success',
					description: result.message,
				})
				setSelectedTier(tier)
				setShowTierModal(false)
				// Refresh tier selection
				const tierSelection = await getUserTierSelection(userId, parseInt(selectedYear))
				setSelectedTier(tierSelection.tier)
				setCustomTierTarget(tierSelection.customTarget)
			} else {
				toast({
					title: 'Error',
					description: result.message,
					variant: 'destructive',
				})
			}
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Error selecting tier:', error)
			}
			toast({
				title: 'Error',
				description: 'Failed to select tier',
				variant: 'destructive',
			})
		}
	}, [userId, selectedYear, toast])

	// Tier monthly targets based on new policy
	const tierMonthlyTargets: Record<string, number> = {
		TIER_1: 60000, // Middle of range (50k-70k)
		TIER_2: 80000,
		TIER_3: 120000,
		TIER_4: 150000,
	}

	// Get current tier target (with custom target support for Tier 1)
	const getCurrentTierTarget = (): number => {
		if (selectedTier === 'TIER_1' && customTierTarget) {
			return customTierTarget
		}
		if (selectedTier && tierMonthlyTargets[selectedTier]) {
			return tierMonthlyTargets[selectedTier]
		}
		return 60000 // Default to Tier 1 middle
	}

	const currentYearlySales = salesData?.currentYearlySales || 0
	const currentMonthlySales = salesData?.currentMonthlySales || 0
	const monthlyData = salesData?.monthlyData || []

	const totalStars = monthlyData.reduce((sum, month) => sum + month.stars, 0)

	// Updated tier targets for progress calculation
	const tierTargetsForProgress = {
		level1: getCurrentTierTarget(),
		level2: getCurrentTierTarget() * 1.33,
		level3: getCurrentTierTarget() * 2,
		level4: getCurrentTierTarget() * 2.5,
	}

	const yearlyTierTargets = {
		level1: getCurrentTierTarget() * 12,
		level2: getCurrentTierTarget() * 12 * 1.33,
		level3: getCurrentTierTarget() * 12 * 2,
		level4: getCurrentTierTarget() * 12 * 2.5,
	}

	const calculateProgress = () => {
		const sales = viewMode === "yearly" ? currentYearlySales : currentMonthlySales
		const currentTarget = getCurrentTierTarget()

		// Progress based on selected tier target
		if (viewMode === "monthly") {
			return Math.min((sales / currentTarget) * 100, 100)
		} else {
			const yearlyTarget = currentTarget * 12
			return Math.min((sales / yearlyTarget) * 100, 100)
		}
	}

	const currentProgress = calculateProgress()

	// Employee data from database
	const employeeData = {
		name: salesData?.userName || (enhancedUser?.profile ? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim() : 'User'),
		currentSales: viewMode === "yearly" ? currentYearlySales : currentMonthlySales,
		monthlySales: currentYearlySales / 12,
		level: salesData?.currentLevel || 0,
		commissionRate: "3%", // Fixed at 3% for all tiers
	}

	const rewards = [
		{
			level: 1,
			title: "Tier 1 - 自主成长层",
			target: tierMonthlyTargets.TIER_1 * 12,
			monthlySales: tierMonthlyTargets.TIER_1,
			commissionRate: "3%",
			prizes: [
				"Target Range: RM50k-70k (you choose)",
				"Benefit Fund: Calculated by Finance",
				"Travel Fund: Discussed during goal setting",
			],
			icon: Award,
			color: "from-blue-400 to-blue-600",
			unlocked: selectedTier === 'TIER_1',
		},
		{
			level: 2,
			title: "Tier 2 - 成就跃升层",
			target: tierMonthlyTargets.TIER_2 * 12,
			monthlySales: tierMonthlyTargets.TIER_2,
			commissionRate: "3%",
			prizes: [
				"Continuous Bonus: RM500/RM1,000/RM3,000",
				"Travel Fund: RM5,000",
				"Health & Family Fund: RM1,600",
				"Course Fund: RM3,000",
				"Team Building & Travel",
				"Annual Dinner & Badge",
			],
			icon: Plane,
			color: "from-gray-400 to-gray-600",
			unlocked: selectedTier === 'TIER_2',
		},
		{
			level: 3,
			title: "Tier 3 - 精英领航层",
			target: tierMonthlyTargets.TIER_3 * 12,
			monthlySales: tierMonthlyTargets.TIER_3,
			commissionRate: "3%",
			prizes: [
				"Continuous Bonus: RM1,000/RM2,000/RM5,000",
				"Travel Fund: RM9,000",
				"Health & Family Fund: RM2,000",
				"Course Fund: RM4,000",
				"Secret Surprise by Aspial",
				"Team Building & Travel",
				"Annual Dinner & Badge",
			],
			icon: Trophy,
			color: "from-yellow-400 to-yellow-600",
			unlocked: selectedTier === 'TIER_3',
		},
		{
			level: 4,
			title: "Tier 4 - 巅峰领导层",
			target: tierMonthlyTargets.TIER_4 * 12,
			monthlySales: tierMonthlyTargets.TIER_4,
			commissionRate: "3%",
			prizes: [
				"Continuous Bonus: RM2,000/RM4,000/RM8,000",
				"Travel Fund: RM15,000",
				"Health & Family Fund: RM3,000",
				"Course Fund: RM5,000",
				"Secret Surprise by Aspial",
				"Team Building & Travel",
				"Annual Dinner & Badge",
			],
			icon: Car,
			color: "from-purple-500 to-pink-500",
			unlocked: selectedTier === 'TIER_4',
		},
	]

	const renderStaffView = () => (
		<>
			{/* Header */}
			<div className="text-center mb-8">
				<h1
					className="text-6xl font-black text-white mb-2 drop-shadow-[0_4px_0_rgba(0,0,0,0.3)] tracking-tight"
					style={{ textShadow: "4px 4px 0 rgba(0,0,0,0.2)" }}
				>
					POWER UP YOUR REWARDS!
				</h1>
				<p className="text-2xl font-bold text-foreground/90">
					Welcome back, <span className="text-primary">{employeeData.name}</span>!
				</p>
			</div>

			{/* Selected Tier Status */}
			<Card className={`mb-8 p-6 border-4 shadow-xl text-center ${
				selectedTier
					? "bg-green-50 dark:bg-green-950/20 border-green-500 dark:border-green-400"
					: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500 dark:border-yellow-400"
			}`}>
				{loading ? (
					<div className="flex items-center justify-center gap-3 mb-2">
						<div className="w-16 h-16 bg-gray-200 animate-pulse rounded"></div>
						<div>
							<div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-2"></div>
							<div className="h-4 w-48 bg-gray-200 animate-pulse rounded"></div>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-center justify-center gap-3 mb-2">
							<div className="text-5xl">
								{selectedTier ? "🎯" : "⚠️"}
							</div>
							<div>
								<h3 className="text-2xl font-black text-foreground mb-1">
									{selectedTier 
										? `Your Challenge: Tier ${selectedTier.replace('TIER_', '')}` 
										: "Tier Selection Required"}
								</h3>
								<p className={`text-sm font-bold ${
									selectedTier
										? "text-green-800"
										: "text-yellow-800"
								}`}>
									{selectedTier 
										? `Monthly Target: RM${(getCurrentTierTarget() / 1000).toFixed(0)}K | Yearly Target: RM${(getCurrentTierTarget() * 12 / 1000).toFixed(0)}K`
										: "Please select your challenge tier for this year"}
								</p>
							</div>
						</div>
						{!selectedTier && (
							<div className="flex justify-center">
								<Button
									onClick={() => setShowTierModal(true)}
									size="lg"
									className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white font-bold px-8 py-3 text-lg shadow-lg"
								>
									Select Your Tier
								</Button>
							</div>
						)}
					</div>
				)}
			</Card>

			<Card className="mb-8 p-4 bg-white/95 border-4 border-foreground/20 shadow-xl">
				<div className="flex items-center justify-between gap-4 flex-wrap">
					<div className="flex items-center gap-3">
						<Label htmlFor="view-mode" className="font-bold text-sm whitespace-nowrap">
							Yearly
						</Label>
						<Switch
							id="view-mode"
							checked={viewMode === "monthly"}
							onCheckedChange={handleViewModeChange}
							className="data-[state=checked]:bg-primary"
						/>
						<Label htmlFor="view-mode" className="font-bold text-sm whitespace-nowrap">
							Monthly
						</Label>
					</div>

					{viewMode === "yearly" && (
						<Select value={selectedYear} onValueChange={handleYearChange}>
							<SelectTrigger className="w-32">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(() => {
									const currentYear = initialCurrentYear
									const startYear = 2020
									const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => currentYear - i)
									return years.map((year) => (
										<SelectItem key={year} value={year.toString()}>
											{year}
										</SelectItem>
									))
								})()}
							</SelectContent>
						</Select>
					)}

					{viewMode === "monthly" && (
						<div className="flex gap-2">
							<Select value={selectedMonth} onValueChange={handleMonthChange}>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, index) => (
										<SelectItem key={index} value={index.toString()}>
											{month}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={selectedYear} onValueChange={handleYearChange}>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(() => {
										const year = initialCurrentYear
										const startYear = 2020
										const years = Array.from({ length: year - startYear + 1 }, (_, i) => year - i)
										return years.map((y) => (
											<SelectItem key={y} value={y.toString()}>
												{y}
											</SelectItem>
										))
									})()}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>
			</Card>

			{/* Stats Card */}
			<Card className="mb-8 p-6 bg-white/95 border-4 border-foreground/20 shadow-2xl">
				{loading ? (
					<div className="flex flex-wrap gap-6 justify-around items-center">
						{[1, 2, 3].map((i) => (
							<div key={i} className="text-center">
								<div className="text-5xl font-black mb-2 h-14 w-32 bg-gray-200 animate-pulse rounded"></div>
								<div className="text-sm font-bold text-muted-foreground uppercase tracking-wide h-4 w-24 bg-gray-200 animate-pulse rounded mx-auto"></div>
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-wrap gap-6 justify-around items-center">
						<div className="text-center">
							<div className="text-5xl font-black text-primary mb-2">RM {(currentYearlySales / 1000).toFixed(0)}K</div>
							<div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Yearly Sales</div>
						</div>
						<div className="text-center">
							<div className="text-5xl font-black text-accent mb-2">
								RM {(employeeData.monthlySales / 1000).toFixed(0)}K
							</div>
							<div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Monthly Average</div>
						</div>
						<div className="text-center">
							<div className="text-5xl font-black text-green-600 mb-2">{employeeData.commissionRate}</div>
							<div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Commission Rate</div>
						</div>
					</div>
				)}
			</Card>

			{/* Mario Progress Bar */}
			<div className="mb-12 relative">
				<MarioProgressBar
					progress={currentProgress}
					targets={tierTargetsForProgress}
					viewMode={viewMode}
					selectedTier={selectedTier}
					tierTarget={getCurrentTierTarget()}
				/>
				{loading && (
					<div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
						<Loader2 className="w-8 h-8 animate-spin text-primary" />
					</div>
				)}
			</div>

			<div className="mb-12 relative">
				<MonthlyPerformance
					monthlyData={monthlyData}
					totalStars={totalStars}
					selectedTier={selectedTier}
					tierMonthlyTarget={getCurrentTierTarget()}
				/>
				{loading && (
					<div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
						<Loader2 className="w-8 h-8 animate-spin text-primary" />
					</div>
				)}
			</div>

			<div className="mb-12 relative">
				<ComplaintsTracker complaints={complaints} />
				{loading && (
					<div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
						<Loader2 className="w-8 h-8 animate-spin text-primary" />
					</div>
				)}
			</div>

			{/* Rewards Grid */}
			<div className="mb-8">
				<h2 className="text-4xl font-black text-center mb-4 text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.3)]">
					YOUR TIER BENEFITS
				</h2>
				<p className="text-center text-lg font-bold text-foreground/80 mb-8">
					Selected Tier: {selectedTier ? `Tier ${selectedTier.replace('TIER_', '')}` : 'Not selected'}
				</p>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					{rewards.map((reward) => (
						<RewardCard key={reward.level} {...reward} />
					))}
				</div>
			</div>

			{/* Policy Notes */}
			<Card className="mt-8 p-6 bg-white/95 border-4 border-foreground/20 shadow-xl">
				<h3 className="text-2xl font-black mb-4 text-foreground">Important Notes</h3>
				<ul className="space-y-2 text-sm font-bold text-muted-foreground">
					<li className="flex items-start gap-2">
						<span className="text-primary">•</span>
						<span>Select your challenge tier at the start of each year</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-primary">•</span>
						<span>Once selected, tier cannot be changed (except by admin)</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-primary">•</span>
						<span>Progress tracked monthly towards your selected tier target</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-primary">•</span>
						<span>All tier benefits presented at year-end</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-primary">•</span>
						<span>Commission rate: 3% across all tiers</span>
					</li>
				</ul>
			</Card>

			{/* Tier Selection Modal */}
			<TierSelectionModal
				open={showTierModal}
				onClose={() => setShowTierModal(false)}
				onSelect={handleTierSelection}
			/>
		</>
	)

	if (isAdmin) {
		return (
			<div className="min-h-screen bg-[#87CEEB] p-8 relative overflow-hidden" style={{
				background: 'linear-gradient(to bottom, #87CEEB 0%, #87CEEB 85%, #228B22 85%, #228B22 100%)',
			}}>
				{/* Clouds */}
				<div className="absolute inset-0 pointer-events-none">
					<div className="absolute top-20 left-10 w-32 h-20 bg-white rounded-full opacity-90" style={{
						boxShadow: '60px 0 0 -10px white, 30px -20px 0 -5px white, 30px 20px 0 -5px white, -10px 0 0 -5px white',
					}}></div>
					<div className="absolute top-40 right-20 w-40 h-24 bg-white rounded-full opacity-90" style={{
						boxShadow: '70px 0 0 -15px white, 35px -25px 0 -8px white, 35px 25px 0 -8px white, -15px 0 0 -8px white',
					}}></div>
					<div className="absolute top-60 left-1/3 w-36 h-22 bg-white rounded-full opacity-90" style={{
						boxShadow: '65px 0 0 -12px white, 32px -22px 0 -6px white, 32px 22px 0 -6px white, -12px 0 0 -6px white',
					}}></div>
					<div className="absolute top-32 right-1/4 w-28 h-18 bg-white rounded-full opacity-90" style={{
						boxShadow: '55px 0 0 -8px white, 28px -18px 0 -4px white, 28px 18px 0 -4px white, -8px 0 0 -4px white',
					}}></div>
				</div>
				<div className="max-w-7xl mx-auto relative z-10">
					<div className="text-center mb-8">
						<h1 className="text-6xl font-black text-white mb-2 drop-shadow-[0_4px_0_rgba(0,0,0,0.3)] tracking-tight">
							ADMIN BENEFITS VIEW
						</h1>
						<p className="text-2xl font-bold text-foreground/90">
							Manage all employee benefits and tier selections
						</p>
					</div>

					<Card className="mb-8 p-4 bg-white/95 border-4 border-foreground/20 shadow-xl">
						<div className="flex items-center justify-between gap-4 flex-wrap">
							<Label className="font-bold text-sm whitespace-nowrap">
								Year:
							</Label>
							<Select value={selectedYear} onValueChange={handleYearChange}>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(() => {
										const currentYear = initialCurrentYear
										const startYear = 2020
										const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => currentYear - i)
										return years.map((year) => (
											<SelectItem key={year} value={year.toString()}>
												{year}
											</SelectItem>
										))
									})()}
								</SelectContent>
							</Select>
						</div>
					</Card>

					{adminLoading ? (
						<div className="flex items-center justify-center py-20">
							<Loader2 className="w-8 h-8 animate-spin text-primary" />
						</div>
					) : (
						<AdminBenefitsView 
							usersBenefits={allUsersBenefits} 
							onRefresh={handleRefreshAdminData}
						/>
					)}
				</div>
				<Toaster />
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-[#87CEEB] p-8 relative overflow-hidden" style={{
			background: 'linear-gradient(to bottom, #87CEEB 0%, #87CEEB 85%, #228B22 85%, #228B22 100%)',
		}}>
			{/* Clouds */}
			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute top-20 left-10 w-32 h-20 bg-white rounded-full opacity-90" style={{
					boxShadow: '60px 0 0 -10px white, 30px -20px 0 -5px white, 30px 20px 0 -5px white, -10px 0 0 -5px white',
				}}></div>
				<div className="absolute top-40 right-20 w-40 h-24 bg-white rounded-full opacity-90" style={{
					boxShadow: '70px 0 0 -15px white, 35px -25px 0 -8px white, 35px 25px 0 -8px white, -15px 0 0 -8px white',
				}}></div>
				<div className="absolute top-60 left-1/3 w-36 h-22 bg-white rounded-full opacity-90" style={{
					boxShadow: '65px 0 0 -12px white, 32px -22px 0 -6px white, 32px 22px 0 -6px white, -12px 0 0 -6px white',
				}}></div>
				<div className="absolute top-32 right-1/4 w-28 h-18 bg-white rounded-full opacity-90" style={{
					boxShadow: '55px 0 0 -8px white, 28px -18px 0 -4px white, 28px 18px 0 -4px white, -8px 0 0 -4px white',
				}}></div>
				<div className="absolute top-80 left-1/2 w-34 h-20 bg-white rounded-full opacity-90" style={{
					boxShadow: '62px 0 0 -11px white, 31px -21px 0 -5px white, 31px 21px 0 -5px white, -11px 0 0 -5px white',
				}}></div>
				<div className="absolute top-16 left-2/3 w-30 h-19 bg-white rounded-full opacity-90" style={{
					boxShadow: '58px 0 0 -9px white, 29px -19px 0 -4px white, 29px 19px 0 -4px white, -9px 0 0 -4px white',
				}}></div>
			</div>
			<div className="max-w-7xl mx-auto relative z-10">
				{renderStaffView()}
			</div>
			<Toaster />
		</div>
	)
}
