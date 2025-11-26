import { useState, useEffect } from 'react'

export interface Toast {
	id: string
	title: string
	description?: string
	variant?: 'default' | 'destructive'
}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 3000

let count = 0

function genId() {
	count = (count + 1) % Number.MAX_VALUE
	return count.toString()
}

type ToasterToast = Toast & {
	id: string
}

const listeners: Array<(toasts: ToasterToast[]) => void> = []
let memoryState: ToasterToast[] = []

function dispatch(toast: Omit<ToasterToast, 'id'>) {
	const id = genId()
	const newToast = {
		...toast,
		id,
	}

	memoryState = [newToast, ...memoryState].slice(0, TOAST_LIMIT)

	listeners.forEach((listener) => {
		listener(memoryState)
	})

	setTimeout(() => {
		dismiss(id)
	}, TOAST_REMOVE_DELAY)

	return {
		id,
		dismiss: () => dismiss(id),
	}
}

function dismiss(toastId?: string) {
	memoryState = memoryState.filter((t) => t.id !== toastId)

	listeners.forEach((listener) => {
		listener(memoryState)
	})
}

export function useToast() {
	const [state, setState] = useState<ToasterToast[]>(memoryState)

	useEffect(() => {
		listeners.push(setState)
		return () => {
			const index = listeners.indexOf(setState)
			if (index > -1) {
				listeners.splice(index, 1)
			}
		}
	}, [])

	return {
		toast: (props: Omit<Toast, 'id'>) => dispatch(props),
		toasts: state,
		dismiss: (toastId?: string) => dismiss(toastId),
	}
}

export function toast(props: Omit<Toast, 'id'>) {
	return dispatch(props)
}

