'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Trophy, Ban, RotateCcw, Loader2, Eye } from 'lucide-react'
import type { UserBenefitsSummary } from '../action'
import {
	activateSuperPerformanceAward,
	terminateSuperPerformanceAward,
	resetSuperPerformanceAward,
} from '../action'
import { toast } from '@/components/ui/use-toast'
import { EmployeeDetailsDialog } from './employee-details-dialog'

interface AdminBenefitsViewProps {
	usersBenefits: UserBenefitsSummary[]
	onRefresh: () => void
}

export function AdminBenefitsView({ usersBenefits, onRefresh }: AdminBenefitsViewProps) {
	const [selectedUser, setSelectedUser] = useState<UserBenefitsSummary | null>(null)
	const [actionType, setActionType] = useState<'activate' | 'terminate' | 'reset' | null>(null)
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)
	const [detailsUser, setDetailsUser] = useState<UserBenefitsSummary | null>(null)
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

	const handleOpenDialog = (
		user: UserBenefitsSummary,
		action: 'activate' | 'terminate' | 'reset'
	) => {
		setSelectedUser(user)
		setActionType(action)
		setIsDialogOpen(true)
	}

	const handleViewDetails = (user: UserBenefitsSummary) => {
		setDetailsUser(user)
		setIsDetailsDialogOpen(true)
	}

	const handleConfirmAction = async () => {
		if (!selectedUser || !actionType) return

		setIsProcessing(true)
		try {
			let result
			switch (actionType) {
				case 'activate':
					result = await activateSuperPerformanceAward(selectedUser.userId)
					break
				case 'terminate':
					result = await terminateSuperPerformanceAward(selectedUser.userId)
					break
				case 'reset':
					result = await resetSuperPerformanceAward(selectedUser.userId)
					break
			}

			if (result.success) {
				toast({
					title: 'Success',
					description: result.message,
				})
				onRefresh()
			} else {
				toast({
					title: 'Error',
					description: result.message,
					variant: 'destructive',
				})
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'An unexpected error occurred',
				variant: 'destructive',
			})
		} finally {
			setIsProcessing(false)
			setIsDialogOpen(false)
			setSelectedUser(null)
			setActionType(null)
		}
	}

	const getLevelColor = (level: number) => {
		switch (level) {
			case 4:
				return 'bg-purple-500'
			case 3:
				return 'bg-yellow-500'
			case 2:
				return 'bg-gray-400'
			case 1:
				return 'bg-amber-600'
			default:
				return 'bg-gray-300'
		}
	}

	const getLevelName = (level: number) => {
		switch (level) {
			case 4:
				return 'Platinum'
			case 3:
				return 'Gold'
			case 2:
				return 'Silver'
			case 1:
				return 'Bronze'
			default:
				return 'None'
		}
	}

	return (
		<div className="space-y-6">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card className="bg-white/95 border-4 border-foreground/20">
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-3xl font-black text-primary mb-1">
								{usersBenefits.length}
							</div>
							<div className="text-sm font-bold text-muted-foreground">Total Employees</div>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-white/95 border-4 border-foreground/20">
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-3xl font-black text-green-600 mb-1">
								{usersBenefits.filter((u) => u.hasSuperPerformanceAward).length}
							</div>
							<div className="text-sm font-bold text-muted-foreground">Active Awards</div>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-white/95 border-4 border-foreground/20">
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-3xl font-black text-accent mb-1">
								RM{' '}
								{(
									usersBenefits.reduce((sum, u) => sum + u.currentYearlySales, 0) / 1000000
								).toFixed(2)}
								M
							</div>
							<div className="text-sm font-bold text-muted-foreground">Total Sales</div>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-white/95 border-4 border-foreground/20">
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-3xl font-black text-secondary mb-1">
								{usersBenefits.reduce((sum, u) => sum + u.totalStars, 0)}
							</div>
							<div className="text-sm font-bold text-muted-foreground">Total Stars</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Users Table */}
			<Card className="bg-white/95 border-4 border-foreground/20">
				<CardHeader>
					<CardTitle className="text-2xl font-black">Employee Benefits Overview</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Employee</TableHead>
									<TableHead>Level</TableHead>
									<TableHead className="text-right">Yearly Sales</TableHead>
									<TableHead className="text-center">Commission</TableHead>
									<TableHead className="text-center">Stars</TableHead>
									<TableHead className="text-center">Complaints</TableHead>
									<TableHead className="text-center">Super Award</TableHead>
									<TableHead className="text-center">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{usersBenefits.map((user) => (
									<TableRow key={user.userId}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar className="h-10 w-10">
													<AvatarImage src={user.profilePicture || undefined} />
													<AvatarFallback>
														{user.userName
															.split(' ')
															.map((n) => n[0])
															.join('')}
													</AvatarFallback>
												</Avatar>
												<div>
													<div className="font-bold">{user.userName}</div>
													<div className="text-xs text-muted-foreground">{user.email}</div>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge className={`${getLevelColor(user.currentLevel)} text-white`}>
												Level {user.currentLevel} - {getLevelName(user.currentLevel)}
											</Badge>
										</TableCell>
										<TableCell className="text-right font-bold">
											RM {(user.currentYearlySales / 1000).toFixed(1)}K
										</TableCell>
										<TableCell className="text-center">
											<Badge variant="outline" className="font-bold">
												{user.commissionRate}
											</Badge>
										</TableCell>
										<TableCell className="text-center">
											<div className="font-bold">
												{user.totalStars} ⭐
												{user.complaintsCount > 0 && (
													<span className="text-red-500 ml-1">
														(-{user.complaintsCount})
													</span>
												)}
											</div>
											<div className="text-xs text-muted-foreground">
												Net: {user.starsAfterComplaints} ⭐
											</div>
										</TableCell>
										<TableCell className="text-center">
											<Badge
												variant={user.complaintsCount > 0 ? 'destructive' : 'secondary'}
											>
												{user.complaintsCount}
											</Badge>
										</TableCell>
										<TableCell className="text-center">
											<div className="flex flex-col items-center gap-1">
												{user.hasSuperPerformanceAward ? (
													<>
														<Badge className="bg-yellow-500 text-white">
															🏆 Active
														</Badge>
														{user.manualOverride && (
															<span className="text-xs text-blue-600 font-bold">
																(Manual)
															</span>
														)}
													</>
												) : (
													<>
														<Badge variant="secondary">Inactive</Badge>
														{user.manualOverride && (
															<span className="text-xs text-red-600 font-bold">
																(Terminated)
															</span>
														)}
													</>
												)}
												<div className="text-xs text-muted-foreground">
													{user.previousYearStars} ⭐ last year
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-1">
												<Button
													size="sm"
													variant="default"
													className="w-full text-xs"
													onClick={() => handleViewDetails(user)}
												>
													<Eye className="w-3 h-3 mr-1" />
													View Details
												</Button>
												{!user.hasSuperPerformanceAward && (
													<Button
														size="sm"
														variant="outline"
														className="w-full text-xs"
														onClick={() => handleOpenDialog(user, 'activate')}
													>
														<Trophy className="w-3 h-3 mr-1" />
														Activate
													</Button>
												)}
												{user.hasSuperPerformanceAward && (
													<Button
														size="sm"
														variant="outline"
														className="w-full text-xs text-red-600"
														onClick={() => handleOpenDialog(user, 'terminate')}
													>
														<Ban className="w-3 h-3 mr-1" />
														Terminate
													</Button>
												)}
												{user.manualOverride && (
													<Button
														size="sm"
														variant="outline"
														className="w-full text-xs text-blue-600"
														onClick={() => handleOpenDialog(user, 'reset')}
													>
														<RotateCcw className="w-3 h-3 mr-1" />
														Reset
													</Button>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Confirmation Dialog */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{actionType === 'activate' && 'Activate Super Performance Award'}
							{actionType === 'terminate' && 'Terminate Super Performance Award'}
							{actionType === 'reset' && 'Reset Super Performance Award'}
						</DialogTitle>
						<DialogDescription>
							{actionType === 'activate' &&
								`Are you sure you want to manually activate the Super Performance Award for ${selectedUser?.userName}? This will override the automatic calculation.`}
							{actionType === 'terminate' &&
								`Are you sure you want to terminate the Super Performance Award for ${selectedUser?.userName}? This will override the automatic calculation.`}
							{actionType === 'reset' &&
								`Are you sure you want to reset the Super Performance Award for ${selectedUser?.userName}? This will return it to automatic calculation based on performance.`}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsDialogOpen(false)}
							disabled={isProcessing}
						>
							Cancel
						</Button>
						<Button onClick={handleConfirmAction} disabled={isProcessing}>
							{isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							Confirm
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Employee Details Dialog */}
			{detailsUser && (
				<EmployeeDetailsDialog
					isOpen={isDetailsDialogOpen}
					onClose={() => {
						setIsDetailsDialogOpen(false)
						setDetailsUser(null)
					}}
					userId={detailsUser.userId}
					userName={detailsUser.userName}
					userEmail={detailsUser.email}
					profilePicture={detailsUser.profilePicture}
				/>
			)}
		</div>
	)
}

