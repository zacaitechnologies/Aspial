'use server'

/**
 * Generic pagination utility for server actions
 * Provides consistent pagination interface across all pages
 */

export interface PaginationParams {
	page?: number
	pageSize?: number
	searchQuery?: string
	[key: string]: any
}

export interface PaginatedResponse<T> {
	data: T[]
	total: number
	page: number
	pageSize: number
	totalPages: number
}

export function createPaginatedResponse<T>(
	data: T[],
	total: number,
	page: number,
	pageSize: number
): PaginatedResponse<T> {
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
	}
}

export function getPaginationParams(
	page: number = 1,
	pageSize: number = 10
): {
	skip: number
	take: number
} {
	return {
		skip: (page - 1) * pageSize,
		take: pageSize,
	}
}

