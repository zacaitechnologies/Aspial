"use client"

import dynamic from "next/dynamic"

// Dynamically import AppHeader with SSR disabled to prevent hydration errors
const AppHeader = dynamic(() => import("./AppHeader").then(mod => ({ default: mod.AppHeader })), {
  ssr: false,
})

export default function AppHeaderClient() {
  return <AppHeader />
}

