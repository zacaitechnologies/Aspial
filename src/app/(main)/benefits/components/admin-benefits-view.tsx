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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Settings, Loader2, Eye } from 'lucide-react'
import Image from 'next/image'
import type { UserBenefitsSummary } from '../action'
import { adminChangeTierSelection } from '../action'
import { toast } from '@/components/ui/use-toast'
import { EmployeeDetailsDialog } from './employee-details-dialog'

interface AdminBenefitsViewProps {
	usersBenefits: UserBenefitsSummary[]
	onRefresh: () => void
}

export function AdminBenefitsView({ usersBenefits, onRefresh }: AdminBenefitsViewProps) {
	const [selectedUser, setSelectedUser] = useState<UserBenefitsSummary | null>(null)
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)
	const [detailsUser, setDetailsUser] = useState<UserBenefitsSummary | null>(null)
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
	const [selectedTier, setSelectedTier] = useState<string>('TIER_1')
	const [customTarget, setCustomTarget] = useState<string>('60')
	const [targetError, setTargetError] = useState<string>('')
	const [adminNote, setAdminNote] = useState('')

	const handleOpenDialog = (user: UserBenefitsSummary) => {
		setSelectedUser(user)
		setSelectedTier(user.selectedTier || 'TIER_1')
		// Set custom target if user has one for Tier 1
		if (user.selectedTier === 'TIER_1' && user.customTarget) {
			setCustomTarget((user.customTarget / 1000).toString())
		} else {
			setCustomTarget('60')
		}
		setTargetError('')
		setAdminNote('')
		setIsDialogOpen(true)
	}

	const handleViewDetails = (user: UserBenefitsSummary) => {
		setDetailsUser(user)
		setIsDetailsDialogOpen(true)
	}

	const handleConfirmAction = async () => {
		if (!selectedUser) return

		// Validate custom target for Tier 1
		if (selectedTier === 'TIER_1') {
			const target = parseInt(customTarget)
			if (isNaN(target) || target < 50 || target > 70) {
				setTargetError('Please enter a target between 50K and 70K')
				return
			}
		}

		setIsProcessing(true)
		try {
			const target = selectedTier === 'TIER_1' ? parseInt(customTarget) * 1000 : undefined
			const result = await adminChangeTierSelection(
				selectedUser.userId,
				selectedTier,
				adminNote,
				target
			)

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
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
							{usersBenefits.filter((u) => u.selectedTier).length}
						</div>
						<div className="text-sm font-bold text-muted-foreground">Tiers Selected</div>
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
									<TableHead className="text-center">Bricks</TableHead>
									<TableHead className="text-center">Complaints</TableHead>
									<TableHead className="text-center">Selected Tier</TableHead>
									<TableHead className="text-center">Monthly Target</TableHead>
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
											<div className="flex items-center justify-center gap-2 font-bold">
												<span>{user.totalStars}</span>
												<Image 
													src="/images/brick.png" 
													alt="Brick" 
													width={20} 
													height={20} 
													className="pixelated" 
												/>
												{user.complaintsCount > 0 && (
													<span className="text-red-500 ml-1">
														(-{user.complaintsCount})
													</span>
												)}
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
											{user.selectedTier ? (
												<Badge className="bg-blue-500 text-white">
													Tier {user.selectedTier.replace('TIER_', '')}
												</Badge>
											) : (
												<Badge variant="outline" className="text-yellow-600 border-yellow-600">
													Not Selected
												</Badge>
											)}
										</div>
									</TableCell>
									<TableCell className="text-center">
										{user.selectedTier ? (
											<div className="flex flex-col items-center gap-1">
												<div className="font-bold">
													RM {(user.tierMonthlyTarget / 1000).toFixed(0)}K
												</div>
												{user.selectedTier === 'TIER_1' && user.customTarget && (
													<Badge variant="secondary" className="text-xs">
														Custom
													</Badge>
												)}
											</div>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
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
											<Button
												size="sm"
												variant="outline"
												className="w-full text-xs"
												onClick={() => handleOpenDialog(user)}
											>
												<Settings className="w-3 h-3 mr-1" />
												Change Tier
											</Button>
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
						<DialogTitle>Change Tier Selection</DialogTitle>
						<DialogDescription>
							Change the selected tier for {selectedUser?.userName}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="tier">Select Tier</Label>
							<Select 
								value={selectedTier} 
								onValueChange={(value) => {
									setSelectedTier(value)
									setTargetError('')
								}}
							>
								<SelectTrigger id="tier">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="TIER_1">Tier 1 - 自主成长层 (RM50k-70k)</SelectItem>
									<SelectItem value="TIER_2">Tier 2 - 成就跃升层 (RM80k)</SelectItem>
									<SelectItem value="TIER_3">Tier 3 - 精英领航层 (RM120k)</SelectItem>
									<SelectItem value="TIER_4">Tier 4 - 巅峰领导层 (RM150k)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						
						{/* Custom Target Input for Tier 1 */}
						{selectedTier === 'TIER_1' && (
							<div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-3">
								<Label htmlFor="customTarget" className="text-base font-black text-blue-900">
									Set Monthly Target (RM)
								</Label>
								<p className="text-sm font-bold text-blue-800">
									Enter monthly sales target between RM50,000 and RM70,000
								</p>
								<div className="flex items-center gap-4">
									<div className="flex-1">
										<div className="flex items-center gap-2">
											<span className="text-lg font-bold">RM</span>
											<Input
												id="customTarget"
												type="number"
												min="50"
												max="70"
												value={customTarget}
												onChange={(e) => {
													setCustomTarget(e.target.value)
													setTargetError('')
												}}
												className="text-xl font-bold"
												placeholder="60"
											/>
											<span className="text-lg font-bold">K</span>
										</div>
										{targetError && (
											<p className="text-sm font-bold text-red-600 mt-2">{targetError}</p>
										)}
									</div>
									<div className="text-right">
										<div className="text-xs font-bold text-muted-foreground">Yearly Target</div>
										<div className="text-xl font-black text-primary">
											RM {(parseInt(customTarget || '0') * 12).toFixed(0)}K
										</div>
									</div>
								</div>
							</div>
						)}
						
						<div className="space-y-2">
							<Label htmlFor="note">Admin Note (Optional)</Label>
							<Textarea
								id="note"
								placeholder="Reason for tier change..."
								value={adminNote}
								onChange={(e) => setAdminNote(e.target.value)}
							/>
						</div>
					</div>
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
							Confirm Change
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

