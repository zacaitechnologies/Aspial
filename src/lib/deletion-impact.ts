/**
 * Types and utilities for checking deletion impact
 */

export interface DeletionImpactItem {
	relation: string
	count: number
	examples?: string[]
	description?: string
}

export interface DeletionImpact {
	hasRelations: boolean
	items: DeletionImpactItem[]
}

export interface DeleteResult {
	success: boolean
	error?: string
	code?: 'HAS_RELATIONS' | 'CONFIRM_REQUIRED' | 'FORBIDDEN' | 'UNKNOWN'
	impact?: DeletionImpact
}

/**
 * Check if deletion impact has any relations
 */
export function hasRelations(impact: DeletionImpact): boolean {
	return impact.items.length > 0 && impact.items.some(item => item.count > 0)
}

/**
 * Format deletion impact for display
 */
export function formatDeletionImpact(impact: DeletionImpact): string {
	if (!hasRelations(impact)) {
		return ''
	}

	const items = impact.items
		.filter(item => item.count > 0)
		.map(item => {
			const examples = item.examples && item.examples.length > 0
				? ` (e.g., ${item.examples.slice(0, 3).join(', ')})`
				: ''
			return `${item.count} ${item.relation}${examples}`
		})

	return items.join(', ')
}

