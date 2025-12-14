"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "lucide-react"
import { APPOINTMENT_TYPES } from "@/app/(main)/calander/constants"
import { WeeklyCalendarBooking } from "./weekly-calendar-booking"

interface Appointment {
	id: number
	name: string
	location: string | null
	brand: string | null
	description: string | null
	appointmentType: string
	isAvailable: boolean
}

interface AppointmentGridProps {
	appointments: Appointment[]
	selectedDate: Date
	onBookingComplete: () => void
}

export function AppointmentGrid({ appointments, selectedDate, onBookingComplete }: AppointmentGridProps) {
	const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{appointments.map((appointment) => {
					const appointmentConfig = APPOINTMENT_TYPES[appointment.appointmentType as keyof typeof APPOINTMENT_TYPES] || APPOINTMENT_TYPES.OTHERS

					return (
						<Card
							key={appointment.id}
							className="cursor-pointer hover:shadow-lg transition-shadow"
							onClick={() => setSelectedAppointment(appointment)}
						>
							<CardHeader>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<CardTitle className="text-lg">
											{appointment.name}
										</CardTitle>
										<div className="mt-2 space-y-1">
											{appointment.location && (
												<p className="text-sm text-muted-foreground">
													Location: {appointment.location}
												</p>
											)}
											{appointment.brand && (
												<p className="text-sm text-muted-foreground">
													Brand: {appointment.brand}
												</p>
											)}
											{appointment.description && (
												<p className="text-sm text-muted-foreground">
													{appointment.description}
												</p>
											)}
										</div>
									</div>
									<Badge className={appointmentConfig.color}>
										{appointmentConfig.label}
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<Button variant="outline" className="w-full" onClick={(e) => {
									e.stopPropagation()
									setSelectedAppointment(appointment)
								}}>
									<Calendar className="w-4 h-4 mr-2" />
									Book Appointment
								</Button>
							</CardContent>
						</Card>
					)
				})}
			</div>

			<Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
				<DialogContent className="max-w-[98vw]! sm:max-w-[98vw]! w-[98vw]! max-h-[90vh] overflow-y-auto p-6">
					<DialogTitle>
						Book {selectedAppointment?.name}
					</DialogTitle>
					{selectedAppointment && (
						<WeeklyCalendarBooking
							appointment={selectedAppointment}
							initialDate={selectedDate}
							onClose={() => setSelectedAppointment(null)}
							onSuccess={() => {
								setSelectedAppointment(null)
								onBookingComplete()
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	)
}
