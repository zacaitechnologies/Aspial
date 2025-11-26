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
import { Loader2, TrendingUp, Star, AlertCircle } from 'lucide-react'
import { getEmployeeSalesData, getEmployeeComplaints, type EmployeeSalesData } from '../action'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

	useEffect(() => {
		async function fetchEmployeeDetails() {
			if (isOpen && userId) {
				setLoading(true)
				try {
					const year = parseInt(selectedYear)
					const [salesResult, complaintsResult] = await Promise.all([
						getEmployeeSalesData(userId, year),
						getEmployeeComplaints(userId),
					])
					setSalesData(salesResult)
					setComplaints(complaintsResult)
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
	const starsAfterComplaints = totalStars - complaints.length

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
						<div className="flex items-center justify-between bg-gradient-to-r from-primary to-accent p-4 rounded-lg border-2 border-primary/20 shadow-md">
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

						{/* Summary Stats */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
										<Badge className={`${getLevelColor(salesData.currentLevel)} text-white text-lg px-4 py-2`}>
											Level {salesData.currentLevel} - {getLevelName(salesData.currentLevel)}
										</Badge>
										<div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
											Current Level
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border-2 hover:shadow-lg transition-shadow">
								<CardContent className="p-6">
									<div className="text-center space-y-2">
										<div className="text-4xl font-black text-green-600">
											{salesData.commissionRate}
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
										<div className="text-4xl font-black text-yellow-600">
											{starsAfterComplaints} ⭐
										</div>
										<div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
											Net Stars
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Monthly Performance */}
						<Card className="border-2 shadow-lg overflow-hidden !py-0 !gap-0">
							<CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 border-b-2 pt-6 px-6 pb-4 rounded-t-xl">
								<CardTitle className="flex items-center gap-3 text-2xl text-white">
									<TrendingUp className="w-7 h-7 text-white" />
									Monthly Performance ({selectedYear})
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6">
								<div className="grid grid-cols-12 gap-3">
									{salesData.monthlyData.map((month) => (
										<Card 
											key={month.month} 
											className="bg-gradient-to-br from-white to-gray-50 border-2 hover:shadow-md transition-all hover:scale-105"
										>
											<CardContent className="p-3">
												<div className="font-black text-base mb-1 text-center">{month.month}</div>
												<div className="text-muted-foreground mb-2 text-center font-bold text-sm">
													RM {(month.sales / 1000).toFixed(1)}K
												</div>
												<div className="flex flex-col items-center gap-1">
													<Badge
														variant="outline"
														className={`${getLevelColor(month.level)} text-white border-0 px-2 py-0.5 font-bold text-xs`}
													>
														L{month.level}
													</Badge>
													{month.stars > 0 && (
														<span className="text-yellow-600 font-black text-sm">
															{month.stars} ⭐
														</span>
													)}
												</div>
											</CardContent>
										</Card>
									))}
								</div>

								<div className="mt-6 p-6 bg-gradient-to-r from-yellow-400 to-orange-400 border-2 border-yellow-500 rounded-xl shadow-md">
									<div className="flex items-center justify-between">
										<div>
											<div className="text-xl font-black text-white">Total Stars Earned</div>
											<div className="text-white/90 font-bold">
												{selectedYear} Performance
											</div>
										</div>
										<div className="text-5xl font-black text-white drop-shadow-md">{totalStars} ⭐</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Complaints */}
						<Card className="border-2 shadow-lg overflow-hidden !py-0 !gap-0">
							<CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 border-b-2 pt-6 px-6 pb-4 rounded-t-xl">
								<CardTitle className="flex items-center gap-3 text-2xl text-white">
									<AlertCircle className="w-7 h-7 text-white" />
									Complaints ({complaints.filter((c) => new Date(c.date).getFullYear().toString() === selectedYear).length})
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6">
								{complaints.length > 0 ? (
									<div className="space-y-4">
										{complaints
											.filter((complaint) => {
												const complaintYear = new Date(complaint.date).getFullYear()
												return complaintYear.toString() === selectedYear
											})
											.map((complaint, index) => (
												<div
													key={index}
													className="p-5 border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100 rounded-xl shadow-sm hover:shadow-md transition-shadow"
												>
													<div className="flex items-start justify-between gap-4">
														<div className="flex-1">
															<div className="font-black text-lg mb-2">{complaint.customer}</div>
															<div className="text-muted-foreground font-medium">
																{complaint.reason}
															</div>
														</div>
														<Badge variant="destructive" className="ml-2 px-4 py-2 text-sm font-bold">
															{new Date(complaint.date).toLocaleDateString()}
														</Badge>
													</div>
												</div>
											))}
										
										{complaints.filter((c) => new Date(c.date).getFullYear().toString() === selectedYear).length === 0 && (
											<div className="text-center py-12 text-muted-foreground text-lg">
												🎉 No complaints in {selectedYear}
											</div>
										)}

										{complaints.filter((c) => new Date(c.date).getFullYear().toString() === selectedYear).length > 0 && (
											<div className="mt-6 p-6 bg-gradient-to-r from-red-500 to-red-600 border-2 border-red-600 rounded-xl shadow-md">
												<div className="flex items-center justify-between">
													<div>
														<div className="text-xl font-black text-white">Stars After Deduction</div>
														<div className="text-white/90 font-bold">
															{totalStars} ⭐ - {complaints.filter((c) => new Date(c.date).getFullYear().toString() === selectedYear).length} complaints
														</div>
													</div>
													<div className="text-5xl font-black text-white drop-shadow-md">
														{totalStars - complaints.filter((c) => new Date(c.date).getFullYear().toString() === selectedYear).length} ⭐
													</div>
												</div>
											</div>
										)}
									</div>
								) : (
									<div className="text-center py-12 text-muted-foreground text-lg">
										🎉 No complaints recorded
									</div>
								)}
							</CardContent>
						</Card>
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

