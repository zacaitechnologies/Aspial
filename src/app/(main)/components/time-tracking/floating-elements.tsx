"use client"

export function FloatingElements() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Floating circles */}
      <div
        className="absolute top-20 left-10 w-2 h-2 bg-blue-400 rounded-full animate-bounce opacity-60"
        style={{ animationDelay: "0s", animationDuration: "3s" }}
      />
      <div
        className="absolute top-40 right-20 w-3 h-3 bg-purple-400 rounded-full animate-bounce opacity-40"
        style={{ animationDelay: "1s", animationDuration: "4s" }}
      />
      <div
        className="absolute bottom-32 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-bounce opacity-50"
        style={{ animationDelay: "2s", animationDuration: "5s" }}
      />
      <div
        className="absolute bottom-20 right-1/3 w-4 h-4 bg-pink-400 rounded-full animate-bounce opacity-30"
        style={{ animationDelay: "0.5s", animationDuration: "3.5s" }}
      />

      {/* Floating shapes */}
      <div
        className="absolute top-1/3 left-1/2 w-6 h-6 border-2 border-blue-300 rotate-45 animate-spin opacity-20"
        style={{ animationDuration: "20s" }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-8 h-8 border-2 border-purple-300 rounded-full animate-pulse opacity-25"
        style={{ animationDuration: "4s" }}
      />
    </div>
  )
}
