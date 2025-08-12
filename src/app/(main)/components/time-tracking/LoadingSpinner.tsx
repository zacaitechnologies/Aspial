import { FloatingElements } from "./floating-elements"

export function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-[#BDC4A5] p-4 relative">
      <FloatingElements />
      <div className="mx-auto max-w-7xl flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading time tracking data...</p>
        </div>
      </div>
    </div>
  )
}
