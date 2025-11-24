'use client'

import { useToast } from './use-toast'

export function Toaster() {
	const { toasts } = useToast()

	return (
		<div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:right-0 sm:top-0 sm:flex-col md:max-w-[420px]">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={`pointer-events-auto mb-4 w-full overflow-hidden rounded-lg border shadow-lg transition-all ${
						toast.variant === 'destructive'
							? 'border-red-500 bg-red-50'
							: 'border-gray-200 bg-white'
					}`}
				>
					<div className="p-4">
						<div className="flex items-start">
							<div className="ml-3 w-0 flex-1 pt-0.5">
								<p
									className={`text-sm font-medium ${
										toast.variant === 'destructive' ? 'text-red-900' : 'text-gray-900'
									}`}
								>
									{toast.title}
								</p>
								{toast.description && (
									<p
										className={`mt-1 text-sm ${
											toast.variant === 'destructive' ? 'text-red-700' : 'text-gray-500'
										}`}
									>
										{toast.description}
									</p>
								)}
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	)
}

