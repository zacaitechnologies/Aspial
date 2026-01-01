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
							className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
							onClick={() => setSelectedAppointment(appointment)}
						>
							<CardHeader className="overflow-hidden">
								<div className="space-y-2 w-full overflow-hidden">
									<h3
										className="text-lg font-semibold !truncate !min-w-0 w-full"
										title={appointment.name}
									>
										{appointment.name}
									</h3>
									<Badge className={appointmentConfig.color}>
										{appointmentConfig.label}
									</Badge>
									<div className="space-y-1 w-full overflow-hidden">
										{appointment.location && (
											<div className="flex items-center gap-2 text-sm !min-w-0 w-full overflow-hidden">
												<span className="text-muted-foreground shrink-0">Location:</span>
												<span
													className="!truncate text-muted-foreground !min-w-0 flex-1"
													title={appointment.location}
												>
													{appointment.location}
												</span>
											</div>
										)}
										{appointment.brand && (
											<div className="flex items-center gap-2 text-sm">
												<span className="text-muted-foreground shrink-0">Brand:</span>
												<span className="text-muted-foreground">{appointment.brand}</span>
											</div>
										)}
										{appointment.description && (
											<div className="flex items-center gap-2 text-sm !min-w-0 w-full overflow-hidden">
												<span
													className="!truncate text-muted-foreground !min-w-0 flex-1"
													title={appointment.description}
												>
													{appointment.description}
												</span>
											</div>
										)}
									</div>
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
						<div className="space-y-2 text-sm text-muted-foreground mb-4">
							<div className="flex flex-col gap-1">
								<div className="font-medium text-foreground">
									{selectedAppointment.name}
								</div>
								{selectedAppointment.location && (
									<div>
										<span className="font-medium text-foreground">Location: </span>
										<span>{selectedAppointment.location}</span>
									</div>
								)}
								{selectedAppointment.description && (
									<div>
										<span className="font-medium text-foreground">Description: </span>
										<span>{selectedAppointment.description}</span>
									</div>
								)}
							</div>
						</div>
					)}
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
