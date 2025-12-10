"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, File, Download, Trash2, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
	getProjectContracts,
	uploadContract,
	deleteContract,
	getContractUrl,
	type ContractWithUploader,
} from "../contract-actions"
import { useSession } from "../../contexts/SessionProvider"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { cn } from "@/lib/utils"

interface ProjectContractsProps {
	projectId: number
	userPermission?: {
		isOwner: boolean
		canEdit: boolean
		canView: boolean
		isAdmin: boolean
	}
	projectStatus?: string
}

export default function ProjectContracts({
	projectId,
	userPermission,
	projectStatus,
}: ProjectContractsProps) {
	const { enhancedUser } = useSession()
	const [contracts, setContracts] = useState<ContractWithUploader[]>([])
	const [loading, setLoading] = useState(true)
	const [uploading, setUploading] = useState(false)
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [deleteContractId, setDeleteContractId] = useState<string | null>(null)
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

	const isProjectCancelled = projectStatus === "cancelled"
	const canUpload = (userPermission?.canEdit || userPermission?.isOwner || userPermission?.isAdmin) && !isProjectCancelled
	const canDelete = (userPermission?.isOwner || userPermission?.isAdmin) && !isProjectCancelled

	useEffect(() => {
		fetchContracts()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [projectId])

	const fetchContracts = async () => {
		try {
			setLoading(true)
			const data = await getProjectContracts(projectId)
			setContracts(data)
		} catch (error) {
			console.error("Error fetching contracts:", error)
			toast({
				title: "Error",
				description: "Failed to load contracts",
				variant: "destructive",
			})
		} finally {
			setLoading(false)
		}
	}

	const validateFile = (file: File): boolean => {
		// Validate file type - PDF or image files
		const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico']
		const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
		const isPDF = fileExtension === '.pdf'
		const isImage = allowedImageExtensions.includes(fileExtension) || file.type.startsWith('image/')
		
		if (!isPDF && !isImage) {
			toast({
				title: "Invalid file type",
				description: "Please upload a PDF or image file (JPG, PNG, GIF, etc.)",
				variant: "destructive",
			})
			return false
		}

		// Validate file size (10MB)
		if (file.size > 10 * 1024 * 1024) {
			toast({
				title: "File too large",
				description: "File size must be less than 10MB",
				variant: "destructive",
			})
			return false
		}
		return true
	}

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file && validateFile(file)) {
			setSelectedFile(file)
		}
	}

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(false)

		const file = e.dataTransfer.files?.[0]
		if (file && validateFile(file)) {
			setSelectedFile(file)
		}
	}

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(false)
	}

	const handleSelectFileClick = () => {
		fileInputRef.current?.click()
	}

	const handleUpload = async () => {
		if (!selectedFile || !enhancedUser?.id) {
			toast({
				title: "No file selected",
				description: "Please select a file to upload",
				variant: "destructive",
			})
			return
		}

		try {
			setUploading(true)

			const formData = new FormData()
			formData.append("file", selectedFile)

			const result = await uploadContract(projectId, formData)

			if (result.success && result.contract) {
				toast({
					title: "Success",
					description: "Contract uploaded successfully!",
				})
				setSelectedFile(null)
				setIsUploadDialogOpen(false)
				await fetchContracts()
			} else {
				toast({
					title: "Upload failed",
					description: result.error || "Failed to upload contract",
					variant: "destructive",
				})
			}
		} catch (error: any) {
			console.error("Error uploading contract:", error)
			toast({
				title: "Upload failed",
				description: error.message || "Failed to upload contract",
				variant: "destructive",
			})
		} finally {
			setUploading(false)
		}
	}

	const handleDownload = async (contract: ContractWithUploader) => {
		try {
			const url = await getContractUrl(contract.filePath)
			if (url) {
				window.open(url, "_blank")
			} else {
				toast({
					title: "Download failed",
					description: "Failed to get download URL",
					variant: "destructive",
				})
			}
		} catch (error) {
			console.error("Error downloading contract:", error)
			toast({
				title: "Download failed",
				description: "Failed to download contract",
				variant: "destructive",
			})
		}
	}

	const handleDeleteClick = (contractId: string) => {
		setDeleteContractId(contractId)
		setIsDeleteConfirmOpen(true)
	}

	const handleDeleteConfirm = async () => {
		if (!deleteContractId || !enhancedUser?.id) {
			return
		}

		try {
			const result = await deleteContract(deleteContractId, enhancedUser.id)
			if (result.success) {
				toast({
					title: "Success",
					description: "Contract deleted successfully!",
				})
				await fetchContracts()
			} else {
				toast({
					title: "Delete failed",
					description: result.error || "Failed to delete contract",
					variant: "destructive",
				})
			}
		} catch (error: any) {
			console.error("Error deleting contract:", error)
			toast({
				title: "Delete failed",
				description: error.message || "Failed to delete contract",
				variant: "destructive",
			})
		} finally {
			setIsDeleteConfirmOpen(false)
			setDeleteContractId(null)
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-muted-foreground">Loading contracts...</div>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{/* Header with Upload Button */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold">Contracts</h3>
					<p className="text-sm text-muted-foreground">
						{isProjectCancelled 
							? "View and download project contracts (upload/delete disabled for cancelled projects)"
							: "Upload and manage project contracts"}
					</p>
				</div>
				{canUpload && (
					<Dialog 
						open={isUploadDialogOpen} 
						onOpenChange={(open) => {
							setIsUploadDialogOpen(open)
							if (!open) {
								setSelectedFile(null)
								setIsDragging(false)
							}
						}}
					>
						<DialogTrigger asChild>
							<Button>
								<Upload className="w-4 h-4 mr-2" />
								Upload Contract
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-md">
							<DialogHeader>
								<DialogTitle>Upload Contract</DialogTitle>
								<DialogDescription>
									Drag and drop a file here, or click to select. Maximum file size: 10MB
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								{/* Drag and Drop Zone */}
								<div
									onDrop={handleDrop}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onClick={handleSelectFileClick}
									className={cn(
										"relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
										isDragging
											? "border-primary bg-primary/5"
											: "border-muted-foreground/25 hover:border-primary/50",
										selectedFile && "border-primary bg-primary/5"
									)}
								>
									<input
										ref={fileInputRef}
										type="file"
										onChange={handleFileSelect}
										accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*"
										className="hidden"
									/>
									{selectedFile ? (
										<div className="space-y-2">
											<File className="w-12 h-12 mx-auto text-primary" />
											<div className="space-y-1">
												<p className="font-medium text-sm">{selectedFile.name}</p>
												<p className="text-xs text-muted-foreground">
													{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
												</p>
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation()
													setSelectedFile(null)
													if (fileInputRef.current) {
														fileInputRef.current.value = ""
													}
												}}
												className="mt-2"
											>
												<X className="w-4 h-4 mr-2" />
												Remove
											</Button>
										</div>
									) : (
										<div className="space-y-2">
											<Upload className="w-12 h-12 mx-auto text-muted-foreground" />
											<div>
												<p className="text-sm font-medium">
													{isDragging ? "Drop file here" : "Drag file here or click to select"}
												</p>
												<p className="text-xs text-muted-foreground mt-1">
													PDF or image files (JPG, PNG, GIF, etc.)
												</p>
											</div>
										</div>
									)}
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => {
										setIsUploadDialogOpen(false)
										setSelectedFile(null)
										setIsDragging(false)
									}}
								>
									Cancel
								</Button>
								<Button onClick={handleUpload} disabled={!selectedFile || uploading}>
									{uploading ? "Uploading..." : "Upload"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				)}
			</div>

			{/* Contracts List */}
			{contracts.length === 0 ? (
				<Card>
					<CardContent className="p-12 text-center">
						<File className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
						<p className="text-muted-foreground">No contracts uploaded yet</p>
						{canUpload && (
							<p className="text-sm text-muted-foreground mt-2">
								Upload your first contract to get started
							</p>
						)}
						{isProjectCancelled && (
							<p className="text-sm text-muted-foreground mt-2">
								Contract upload is disabled for cancelled projects
							</p>
						)}
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{contracts.map((contract) => (
						<Card key={contract.id}>
							<CardHeader>
								<div className="flex items-start justify-between">
									<div className="flex items-start gap-3">
										<File className="w-5 h-5 mt-1 text-muted-foreground" />
										<div>
											<CardTitle className="text-base text-primary">{contract.fileName}</CardTitle>
											<p className="text-sm text-muted-foreground mt-1">
												Uploaded by {contract.uploader.firstName} {contract.uploader.lastName} on{" "}
												{new Date(contract.createdAt).toLocaleDateString()}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleDownload(contract)}
											className="text-blue-600 hover:text-blue-700"
											title="Download contract"
										>
											<Download className="w-4 h-4" />
										</Button>
										{canDelete && (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleDeleteClick(contract.id)}
												className="text-red-600 hover:text-red-700 hover:bg-red-50"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										)}
									</div>
								</div>
							</CardHeader>
						</Card>
					))}
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={isDeleteConfirmOpen}
				onClose={() => {
					setIsDeleteConfirmOpen(false)
					setDeleteContractId(null)
				}}
				onConfirm={handleDeleteConfirm}
				title="Delete Contract"
				description="Are you sure you want to delete this contract? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
			/>
		</div>
	)
}

