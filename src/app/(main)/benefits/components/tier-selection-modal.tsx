"use client"

import { useState } from "react"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, TrendingUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TierOption {
	id: string
	name: string
	chineseName: string
	monthlyTarget: string
	yearlyTarget: string
	benefits: {
		wealth: string[]
		wellness: string[]
		development: string[]
	}
	color: string
	commissionRate: string
}

interface TierSelectionModalProps {
	open: boolean
	onClose: () => void
	onSelect: (tier: string, customTarget?: number) => Promise<void>
}

const tierOptions: TierOption[] = [
	{
		id: 'TIER_1',
		name: 'Tier 1',
		chineseName: '自主成长层',
		monthlyTarget: 'RM50k - RM70k',
		yearlyTarget: 'RM600k - RM840k',
		commissionRate: '3%',
		color: 'from-blue-400 to-blue-600',
		benefits: {
			wealth: ['Target Range: Fill your own goal (50k-70k)', 'Benefit Fund: Calculated by Finance'],
			wellness: ['Travel Fund: Discussed During Goal Setting'],
			development: ['Course Fund: Discussed During Goal Setting'],
		},
	},
	{
		id: 'TIER_2',
		name: 'Tier 2',
		chineseName: '成就跃升层',
		monthlyTarget: 'RM80k',
		yearlyTarget: 'RM960k',
		commissionRate: '3%',
		color: 'from-gray-400 to-gray-600',
		benefits: {
			wealth: [
				'Continuous Bonus: RM500 / RM1,000 / RM3,000',
				'Performance Bonus (New Year)',
				'Team Target Bonus',
			],
			wellness: [
				'Travel Fund: RM5,000',
				'Health & Family Fund: RM1,600',
				'Wellness Hours Voucher',
				'Team Building & Travel',
			],
			development: ['Annual Dinner', 'Aspial Badge', 'Certified Courses: RM3,000'],
		},
	},
	{
		id: 'TIER_3',
		name: 'Tier 3',
		chineseName: '精英领航层',
		monthlyTarget: 'RM120k',
		yearlyTarget: 'RM1,440k',
		commissionRate: '3%',
		color: 'from-yellow-400 to-yellow-600',
		benefits: {
			wealth: [
				'Continuous Bonus: RM1,000 / RM2,000 / RM5,000',
				'Performance Bonus',
				'Team Target Bonus',
				'Secret Surprise by Aspial',
			],
			wellness: [
				'Travel Fund: RM9,000',
				'Health & Family Fund: RM2,000',
				'Wellness Hours Voucher',
				'Team Building & Travel',
			],
			development: ['Annual Dinner', 'Aspial Badge', 'Certified Courses: RM4,000'],
		},
	},
	{
		id: 'TIER_4',
		name: 'Tier 4',
		chineseName: '巅峰领导层',
		monthlyTarget: 'RM150k',
		yearlyTarget: 'RM1,800k',
		commissionRate: '3%',
		color: 'from-purple-500 to-pink-500',
		benefits: {
			wealth: [
				'Continuous Bonus: RM2,000 / RM4,000 / RM8,000',
				'Performance Bonus',
				'Team Target Bonus',
				'Secret Surprise by Aspial',
			],
			wellness: [
				'Travel Fund: RM15,000',
				'Health & Family Fund: RM3,000',
				'Wellness Hours Voucher',
				'Team Building & Travel',
			],
			development: ['Annual Dinner', 'Aspial Badge', 'Certified Courses: RM5,000'],
		},
	},
]

export function TierSelectionModal({ open, onClose, onSelect }: TierSelectionModalProps) {
	const [selectedTier, setSelectedTier] = useState<string | null>(null)
	const [customTarget, setCustomTarget] = useState<string>('60')
	const [targetError, setTargetError] = useState<string>('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSelect = async () => {
		if (!selectedTier) return

		// Validate custom target for Tier 1
		if (selectedTier === 'TIER_1') {
			const target = parseInt(customTarget)
			if (isNaN(target) || target < 50 || target > 70) {
				setTargetError('Please enter a target between 50K and 70K')
				return
			}
		}

		setIsSubmitting(true)
		try {
			const target = selectedTier === 'TIER_1' ? parseInt(customTarget) * 1000 : undefined
			await onSelect(selectedTier, target)
			onClose()
		} catch (error) {
			console.error('Error selecting tier:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleTierClick = (tierId: string) => {
		setSelectedTier(tierId)
		setTargetError('')
	}

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-full sm:w-[1400px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-3xl font-black text-center">
						🎯 Select Your Challenge Tier for {new Date().getFullYear()}
					</DialogTitle>
					<DialogDescription className="text-center text-lg">
						Choose the tier that matches your goals this year
					</DialogDescription>
				</DialogHeader>

				<Alert className="border-red-500 bg-red-50">
					<AlertCircle className="h-5 w-5 text-red-600" />
					<AlertDescription className="text-red-900 font-bold">
						IMPORTANT: Once selected, you cannot change your tier for this year. Choose wisely!
					</AlertDescription>
				</Alert>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
					{tierOptions.map((tier) => (
						<Card
							key={tier.id}
							className={`relative cursor-pointer transition-all duration-300 border-4 ${
								selectedTier === tier.id
									? 'border-green-500 shadow-2xl scale-105'
									: 'border-foreground/20 hover:border-primary/50 hover:shadow-xl'
							}`}
							onClick={() => handleTierClick(tier.id)}
						>
							{selectedTier === tier.id && (
								<div className="absolute top-2 right-2 z-10">
									<Badge className="bg-green-600 text-white font-black text-xs px-3 py-1">
										SELECTED
									</Badge>
								</div>
							)}

							<div className={`absolute inset-0 bg-linear-to-br ${tier.color} opacity-10 rounded-lg`} />

							<div className="relative p-6">
								<div className="flex items-center justify-between mb-4">
									<div>
										<h3 className="text-2xl font-black text-foreground">{tier.name}</h3>
										<p className="text-sm text-muted-foreground font-bold">{tier.chineseName}</p>
									</div>
									<TrendingUp className={`w-8 h-8 text-primary`} />
								</div>

								<div className="mb-4 p-3 bg-white/50 rounded-lg">
									<div className="flex items-center justify-between mb-2">
										<span className="text-xs font-bold text-muted-foreground uppercase">
											Monthly Target
										</span>
										<Badge className="bg-primary text-white">{tier.commissionRate} Commission</Badge>
									</div>
									<div className="text-xl font-black text-primary">{tier.monthlyTarget}</div>
									<div className="text-xs font-bold text-muted-foreground mt-1">
										{tier.yearlyTarget} / year
									</div>
								</div>

								<div className="space-y-3">
									<div>
										<h4 className="text-sm font-black text-foreground mb-1 flex items-center gap-1">
											💰 Wealth
										</h4>
										<ul className="space-y-1">
											{tier.benefits.wealth.map((benefit, idx) => (
												<li key={idx} className="text-xs font-bold text-muted-foreground flex items-start gap-1">
													<span>•</span>
													<span>{benefit}</span>
												</li>
											))}
										</ul>
									</div>

									<div>
										<h4 className="text-sm font-black text-foreground mb-1 flex items-center gap-1">
											🧘 Wellness
										</h4>
										<ul className="space-y-1">
											{tier.benefits.wellness.map((benefit, idx) => (
												<li key={idx} className="text-xs font-bold text-muted-foreground flex items-start gap-1">
													<span>•</span>
													<span>{benefit}</span>
												</li>
											))}
										</ul>
									</div>

									<div>
										<h4 className="text-sm font-black text-foreground mb-1 flex items-center gap-1">
											📚 Development
										</h4>
										<ul className="space-y-1">
											{tier.benefits.development.map((benefit, idx) => (
												<li key={idx} className="text-xs font-bold text-muted-foreground flex items-start gap-1">
													<span>•</span>
													<span>{benefit}</span>
												</li>
											))}
										</ul>
									</div>
								</div>
							</div>
						</Card>
					))}
				</div>

				{/* Custom Target Input for Tier 1 */}
				{selectedTier === 'TIER_1' && (
					<div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
						<Label htmlFor="customTarget" className="text-lg font-black text-blue-900 mb-2 block">
							Set Your Monthly Target (RM)
						</Label>
						<p className="text-sm font-bold text-blue-800 mb-3">
							Enter your monthly sales target between RM50,000 and RM70,000
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

				<DialogFooter className="flex gap-3">
					<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button onClick={handleSelect} disabled={!selectedTier || isSubmitting} className="font-bold">
						{isSubmitting ? 'Confirming...' : 'Confirm Selection'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

