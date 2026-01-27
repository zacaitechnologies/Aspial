"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ServiceTagManager from "./ServiceTagManager"
import ServicesList from "./ServicesList"
import { ServicesCacheProvider, useServicesCacheContext } from "../contexts/ServicesCacheContext"

interface ServicesPageContentProps {
	isAdmin: boolean
}

function ServicesPageInner({ isAdmin }: ServicesPageContentProps) {
	const [activeTab, setActiveTab] = useState("services")
	const { services, serviceTags } = useServicesCacheContext()

	// Invalidate cache when switching tabs to ensure fresh data if needed
	const handleTabChange = (value: string) => {
		setActiveTab(value)
		// Invalidate cache when switching tabs to ensure fresh data if needed
		if (value === "services") {
			services.invalidateCache()
		} else if (value === "tags") {
			serviceTags.invalidateCache()
		}
	}

	return (
		<div className="min-h-screen bg-[var(--background)]">
			<div className="container mx-auto px-4 py-8 max-w-7xl">
				{/* Tabs Section */}
				<Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
					<div className="relative">
						<TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} bg-transparent border-primary border-1 transition-all duration-300 ease-in-out`}>
							<TabsTrigger 
								value="services" 
								className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
							>
								Services
							</TabsTrigger>
							{isAdmin && (
								<TabsTrigger 
									value="tags" 
									className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
								>
									Service Tags
								</TabsTrigger>
							)}
						</TabsList>
						{/* Sliding indicator */}
						<div 
							className={`absolute top-1 h-[calc(100%-8px)] bg-secondary transition-all duration-300 ease-in-out rounded-md z-0 ${
								isAdmin 
									? (activeTab === "services" ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+2px)] w-[calc(50%-4px)]")
									: "left-1 w-[calc(100%-8px)]"
							}`}
						/>
					</div>

					<TabsContent value="services" className="space-y-0">
						<ServicesList 
							services={services.services} 
							isLoading={services.isLoading} 
							onRefresh={services.onRefresh}
							isAdmin={isAdmin}
						/>
					</TabsContent>

					{isAdmin && (
						<TabsContent value="tags" className="space-y-0">
							<ServiceTagManager />
						</TabsContent>
					)}
				</Tabs>
			</div>
		</div>
	)
}

export default function ServicesPageContent({ isAdmin }: ServicesPageContentProps) {
	return (
		<ServicesCacheProvider>
			<ServicesPageInner isAdmin={isAdmin} />
		</ServicesCacheProvider>
	)
}
