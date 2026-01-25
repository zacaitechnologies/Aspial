"use client"

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, User, Building2, Phone, Mail, FileText, Briefcase } from "lucide-react"
import { format } from "date-fns"
import type { AppointmentBooking } from "../equipment-dashboard"

interface BookingDetailsDialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	booking: AppointmentBooking | null
}

export default function BookingDetailsDialog({
	isOpen,
	onOpenChange,
	booking,
}: BookingDetailsDialogProps) {
	if (!booking) return null

	const formattedStartDate = format(new Date(booking.startDate), "PPP")
	const formattedStartTime = format(new Date(booking.startDate), "h:mm a")
	const formattedEndTime = format(new Date(booking.endDate), "h:mm a")
	const formattedEndDate = format(new Date(booking.endDate), "PPP")

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Calendar className="w-5 h-5" />
						Booking Details
					</DialogTitle>
					<DialogDescription>
						Complete information about this appointment booking
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 mt-4">
					{/* Appointment Information */}
					<div className="space-y-3">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<Calendar className="w-4 h-4" />
							Appointment Information
						</h3>
						<div className="space-y-2 pl-6">
							<div className="flex items-start gap-3">
								<span className="font-medium min-w-[120px]">Appointment:</span>
								<span>{booking.appointment?.name || "N/A"}</span>
							</div>
							{booking.appointment?.location && (
								<div className="flex items-start gap-3">
									<span className="font-medium min-w-[120px]">Location:</span>
									<span>{booking.appointment.location}</span>
								</div>
							)}
							<div className="flex items-start gap-3">
								<span className="font-medium min-w-[120px]">Date:</span>
								<span>{formattedStartDate}</span>
							</div>
							<div className="flex items-start gap-3">
								<span className="font-medium min-w-[120px]">Time:</span>
								<span>
									{formattedStartTime} - {formattedEndTime}
									{formattedStartDate !== formattedEndDate && ` (${formattedEndDate})`}
								</span>
							</div>
							{booking.attendees && (
								<div className="flex items-start gap-3">
									<span className="font-medium min-w-[120px]">Attendees:</span>
									<span>{booking.attendees}</span>
								</div>
							)}
						</div>
					</div>

					<Separator />

					{/* Booking Information */}
					<div className="space-y-3">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<FileText className="w-4 h-4" />
							Booking Information
						</h3>
						<div className="space-y-2 pl-6">
							<div className="flex items-start gap-3">
								<span className="font-medium min-w-[120px]">Booked By:</span>
								<span>{booking.bookedBy}</span>
							</div>
							{booking.purpose && (
								<div className="flex items-start gap-3">
									<span className="font-medium min-w-[120px]">Purpose:</span>
									<span className="flex-1">{booking.purpose}</span>
								</div>
							)}
						</div>
					</div>

					<Separator />

					{/* Client Information */}
					<div className="space-y-3">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<User className="w-4 h-4" />
							Client Information
						</h3>
						<div className="space-y-2 pl-6">
							{booking.bookingName && (
								<div className="flex items-start gap-3">
									<span className="font-medium min-w-[120px] flex items-center gap-2">
										<User className="w-4 h-4" />
										Booking Name:
									</span>
									<span>{booking.bookingName}</span>
								</div>
							)}
							{booking.companyName && (
								<div className="flex items-start gap-3">
									<span className="font-medium min-w-[120px] flex items-center gap-2">
										<Building2 className="w-4 h-4" />
										Company Name:
									</span>
									<span>{booking.companyName}</span>
								</div>
							)}
							{booking.contactNumber && (
								<div className="flex items-start gap-3">
									<span className="font-medium min-w-[120px] flex items-center gap-2">
										<Phone className="w-4 h-4" />
										Contact Number:
									</span>
									<span>{booking.contactNumber}</span>
								</div>
							)}
							{booking.project?.Client && (
								<>
									{booking.project.Client.email && (
										<div className="flex items-start gap-3">
											<span className="font-medium min-w-[120px] flex items-center gap-2">
												<Mail className="w-4 h-4" />
												Email:
											</span>
											<span>{booking.project.Client.email}</span>
										</div>
									)}
									{booking.project.Client.phone && !booking.contactNumber && (
										<div className="flex items-start gap-3">
											<span className="font-medium min-w-[120px] flex items-center gap-2">
												<Phone className="w-4 h-4" />
												Phone:
											</span>
											<span>{booking.project.Client.phone}</span>
										</div>
									)}
								</>
							)}
						</div>
					</div>

					{/* Project Information */}
					{booking.project && (
						<>
							<Separator />
							<div className="space-y-3">
								<h3 className="text-lg font-semibold flex items-center gap-2">
									<Briefcase className="w-4 h-4" />
									Project Information
								</h3>
								<div className="space-y-2 pl-6">
									<div className="flex items-start gap-3">
										<span className="font-medium min-w-[120px]">Project Name:</span>
										<span>{booking.project.name}</span>
									</div>
									{booking.project.clientName && (
										<div className="flex items-start gap-3">
											<span className="font-medium min-w-[120px]">Client Name:</span>
											<span>{booking.project.clientName}</span>
										</div>
									)}
									{booking.project.Client?.company && (
										<div className="flex items-start gap-3">
											<span className="font-medium min-w-[120px]">Company:</span>
											<span>{booking.project.Client.company}</span>
										</div>
									)}
								</div>
							</div>
						</>
					)}

					{/* Remarks */}
					{booking.remarks && (
						<>
							<Separator />
							<div className="space-y-3">
								<h3 className="text-lg font-semibold flex items-center gap-2">
									<FileText className="w-4 h-4" />
									Remarks
								</h3>
								<div className="pl-6">
									<p className="text-sm text-muted-foreground whitespace-pre-wrap">
										{booking.remarks}
									</p>
								</div>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
