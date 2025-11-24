'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'

/**
 * Cached authentication helper
 * Uses React's cache() to deduplicate requests within the same render
 * This prevents multiple Supabase calls for the same request
 */
export const getCachedUser = cache(async () => {
	try {
		const supabase = await createClient()
		const { data: { user }, error } = await supabase.auth.getUser()

		if (error || !user) {
			redirect('/login')
		}

		return user
	} catch (error: any) {
		if (error.digest?.startsWith('NEXT_REDIRECT')) {
			throw error
		}
		console.error('Error in getCachedUser:', error)
		throw new Error('Authentication failed')
	}
})

