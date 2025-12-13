'use client'

import { useState, useEffect } from 'react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, TrendingUp, AlertCircle } from 'lucide-react'
import { getEmployeeSalesData, getEmployeeComplaints, getUserTierSelection, type EmployeeSalesData } from '../action'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Image from 'next/image'
import { MonthlyPerformance } from './monthly-performance'
import { ComplaintsTracker } from './complaints-tracker'
import '../custom.css'

interface EmployeeDetailsDialogProps {
	isOpen: boolean
	onClose: () => void
	userId: string
	userName: string
	userEmail: string
	profilePicture: string | null
}

export function EmployeeDetailsDialog({
	isOpen,
	onClose,
	userId,
	userName,
	userEmail,
	profilePicture,
}: EmployeeDetailsDialogProps) {
	const [loading, setLoading] = useState(true)
	const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
	const [salesData, setSalesData] = useState<EmployeeSalesData | null>(null)
	const [complaints, setComplaints] = useState<any[]>([])
	const [selectedTier, setSelectedTier] = useState<string | null>(null)
	const [customTierTarget, setCustomTierTarget] = useState<number | null>(null)

	useEffect(() => {
		async function fetchEmployeeDetails() {
			if (isOpen && userId) {
				setLoading(true)
				try {
					const year = parseInt(selectedYear)
					const [salesResult, complaintsResult, tierSelection] = await Promise.all([
						getEmployeeSalesData(userId, year),
						getEmployeeComplaints(userId),
						getUserTierSelection(userId, year),
					])
					setSalesData(salesResult)
					setComplaints(complaintsResult)
					setSelectedTier(tierSelection.tier)
					setCustomTierTarget(tierSelection.customTarget)
				} catch (error) {
					console.error('Error fetching employee details:', error)
				} finally {
					setLoading(false)
				}
			}
		}

		fetchEmployeeDetails()
	}, [isOpen, userId, selectedYear])

	const getLevelColor = (level: number) => {
		switch (level) {
			case 4: return 'bg-purple-500'
			case 3: return 'bg-yellow-500'
			case 2: return 'bg-gray-400'
			case 1: return 'bg-amber-600'
			default: return 'bg-gray-300'
		}
	}

	const getLevelName = (level: number) => {
		switch (level) {
			case 4: return 'Platinum'
			case 3: return 'Gold'
			case 2: return 'Silver'
			case 1: return 'Bronze'
			default: return 'None'
		}
	}

	const totalStars = salesData?.monthlyData.reduce((sum, month) => sum + month.stars, 0) || 0

	// Tier monthly targets
	const tierMonthlyTargets: Record<string, number> = {
		TIER_1: customTierTarget || 60000,
		TIER_2: 80000,
		TIER_3: 120000,
		TIER_4: 150000,
	}

	const getCurrentTierTarget = (): number => {
		if (selectedTier && tierMonthlyTargets[selectedTier]) {
			return tierMonthlyTargets[selectedTier]
		}
		return 60000
	}

	const tierMonthlyTarget = getCurrentTierTarget()

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent 
				className="h-[90vh] p-0 gap-0 overflow-hidden"
				style={{ width: '95vw', maxWidth: '95vw' }}
			>
				<DialogHeader className="px-6 pt-6 pb-4 border-b bg-white sticky top-0 z-10">
					<DialogTitle className="flex items-center gap-4">
						<Avatar className="h-16 w-16 border-4 border-primary/20">
							<AvatarImage src={profilePicture || undefined} />
							<AvatarFallback className="text-2xl font-bold bg-primary/10">
								{userName.split(' ').map((n) => n[0]).join('')}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1">
							<div className="text-2xl font-black">{userName}</div>
							<div className="text-sm text-muted-foreground font-normal">{userEmail}</div>
						</div>
					</DialogTitle>
				</DialogHeader>

				<div 
					className="overflow-y-auto px-6 pb-6 custom-scrollbar" 
					style={{ maxHeight: 'calc(90vh - 120px)' }}
				>
					{loading ? (
						<div className="flex items-center justify-center py-20">
							<Loader2 className="w-12 h-12 animate-spin text-primary" />
						</div>
					) : salesData ? (
						<div className="space-y-8 py-4">
						{/* Year Selector */}
						<div className="flex items-center justify-between bg-linear-to-r from-primary to-accent p-4 rounded-lg border-2 border-primary/20 shadow-md">
							<h3 className="text-2xl font-black flex items-center gap-2 text-white">
								<TrendingUp className="w-6 h-6 text-white" />
								Performance Details
							</h3>
							<Select value={selectedYear} onValueChange={setSelectedYear}>
								<SelectTrigger className="w-40 h-12 text-lg font-bold border-2 bg-white hover:bg-gray-50">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(() => {
										const currentYear = new Date().getFullYear()
										const startYear = 2020
										const years = Array.from(
											{ length: currentYear - startYear + 1 },
											(_, i) => currentYear - i
										)
										return years.map((year) => (
											<SelectItem key={year} value={year.toString()}>
												{year}
											</SelectItem>
										))
									})()}
								</SelectContent>
							</Select>
						</div>

						{/* Selected Tier Status */}
						{selectedTier && (
							<Card className="p-6 border-4 shadow-xl text-center bg-green-50 border-green-500">
								<div className="flex items-center justify-center gap-3 mb-2">
									<div className="text-5xl">🎯</div>
									<div>
										<h3 className="text-2xl font-black text-foreground mb-1">
											Challenge: Tier {selectedTier.replace('TIER_', '')}
										</h3>
										<p className="text-sm font-bold text-green-800">
											Monthly Target: RM{(tierMonthlyTarget / 1000).toFixed(0)}K | Yearly Target: RM{(tierMonthlyTarget * 12 / 1000).toFixed(0)}K
										</p>
									</div>
								</div>
							</Card>
						)}

						{/* Summary Stats */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							<Card className="border-2 hover:shadow-lg transition-shadow">
								<CardContent className="p-6">
									<div className="text-center space-y-2">
										<div className="text-4xl font-black text-primary">
											RM {(salesData.currentYearlySales / 1000).toFixed(0)}K
										</div>
										<div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
											Yearly Sales
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border-2 hover:shadow-lg transition-shadow">
								<CardContent className="p-6">
									<div className="text-center space-y-2">
										<div className="text-4xl font-black text-green-600">
											3%
										</div>
										<div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
											Commission Rate
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border-2 hover:shadow-lg transition-shadow">
								<CardContent className="p-6">
									<div className="text-center space-y-2">
										<div className="flex items-center justify-center gap-2">
											<span className="text-4xl font-black text-amber-700">{totalStars}</span>
											<Image 
												src="/images/brick.png" 
												alt="Brick" 
												width={32} 
												height={32} 
												className="pixelated" 
											/>
										</div>
										<div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
											Total Bricks
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Monthly Performance */}
						<MonthlyPerformance 
							monthlyData={salesData.monthlyData}
							totalStars={totalStars}
							selectedTier={selectedTier}
							tierMonthlyTarget={tierMonthlyTarget}
						/>

						{/* Complaints */}
						<ComplaintsTracker complaints={complaints} />
					</div>
					) : (
						<div className="text-center py-8 text-muted-foreground">
							No data available for this employee
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}

