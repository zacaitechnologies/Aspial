import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { QuotationWithServices } from "../types";
import { getCustomServicesByQuotationId } from "../action";

// Type definitions for jsPDF autoTable
interface AutoTableOptions {
  startY?: number;
  head?: string[][];
  body?: string[][];
  theme?: string;
  headStyles?: {
    fillColor?: number[];
    textColor?: number[];
    fontSize?: number;
    fontStyle?: string;
  };
  bodyStyles?: {
    fontSize?: number;
    textColor?: number[];
  };
  alternateRowStyles?: {
    fillColor?: number[];
  };
  columnStyles?: {
    [key: number]: {
      cellWidth?: number;
      halign?: string;
    };
  };
  margin?: {
    left?: number;
    right?: number;
  };
}

// Extend jsPDF type to include lastAutoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export async function generateQuotationPDF(quotation: QuotationWithServices) {
  const doc = new jsPDF();
  
  // Fetch custom services
  const customServices = await getCustomServicesByQuotationId(quotation.id);
  
  // Set up colors
  const primaryColor: [number, number, number] = [71, 85, 105]; // Slate-600
  const secondaryColor: [number, number, number] = [148, 163, 184]; // Slate-400
  const accentColor: [number, number, number] = [59, 130, 246]; // Blue-500
  const successColor: [number, number, number] = [34, 197, 94]; // Green-500
  
  // Service Provider Information
  const serviceProvider = {
    company: "Aspial Production",
    address: "2A, Lorong Dato Abu Bakar, Section 16, 46350 Petaling Jaya, Selangor",
    phone: "016-753 5323",
    email: "contact@aspialproduction.com"
  };
  
  // Calculate dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  let currentY = margin;
  
  // Header with company logo area
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(serviceProvider.company.toUpperCase(), margin, 25);
  
  // Company details
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(serviceProvider.address, margin, 35);
  doc.text(`Phone: ${serviceProvider.phone} | Email: ${serviceProvider.email}`, margin, 42);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  currentY = 70;
  
  // Quotation title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTATION", pageWidth - margin, currentY, { align: "right" });
  currentY += 15;
  
  // Quotation details box - positioned more to the left
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(pageWidth - 140, currentY - 5, 120, 32, 'F');
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(pageWidth - 140, currentY - 5, 120, 32, 'S');
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Quotation #: Q-${quotation.id.toString().padStart(4, '0')}`, pageWidth - 135, currentY);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString('en-GB')}`, pageWidth - 135, currentY + 8);
  doc.text(`Created By: ${quotation.createdBy.firstName} ${quotation.createdBy.lastName}`, pageWidth - 135, currentY + 16);
  doc.text(`Status: ${quotation.workflowStatus.toUpperCase()}`, pageWidth - 135, currentY + 24);
  
  currentY += 40;
  
  // Client information
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", margin, currentY);
  currentY += 8;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  
  if (quotation.Client) {    
    if (quotation.Client.company) {
      doc.text(quotation.Client.company, margin, currentY);
      currentY += 6;
    }
    
    if (quotation.Client.email) {
      doc.text(quotation.Client.email, margin, currentY);
      currentY += 6;
    }
    
    if (quotation.Client.phone) {
      doc.text(quotation.Client.phone, margin, currentY);
      currentY += 6;
    }
    
    if (quotation.Client.address) {
      const addressLines = doc.splitTextToSize(quotation.Client.address, 80);
      addressLines.forEach((line: string) => {
        doc.text(line, margin, currentY);
        currentY += 6;
      });
    }
  } else {
    doc.text("Client information not available", margin, currentY);
    currentY += 6;
  }
  
  currentY += 15;
  
  // Project information (if available)
  if (quotation.project) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Project Details:", margin, currentY);
    currentY += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Project: ${quotation.project.name}`, margin, currentY);
    currentY += 6;
    
    if (quotation.project.startDate) {
      doc.text(`Start Date: ${new Date(quotation.project.startDate).toLocaleDateString('en-GB')}`, margin, currentY);
      currentY += 6;
    }
    
    if (quotation.project.endDate) {
      doc.text(`End Date: ${new Date(quotation.project.endDate).toLocaleDateString('en-GB')}`, margin, currentY);
      currentY += 6;
    }
    
    currentY += 10;
  }

  // Services table
  if (quotation.services && quotation.services.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Services", margin, currentY);
    currentY += 10;
    
    // Filter out custom services and only show regular services
    const regularServices = quotation.services.filter(qs => !qs.customServiceId);
    
    if (regularServices.length > 0) {
      const tableData = regularServices.map((serviceItem) => [
        serviceItem.service.name,
        serviceItem.service.description || '',
        `RM ${serviceItem.service.basePrice.toFixed(2)}`,
      ]);
      
      autoTable(doc, {
        startY: currentY,
        head: [["Service", "Description", "Price"]],
        body: tableData,
        theme: "striped",
        headStyles: { 
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: { 
          fontSize: 9,
          textColor: [0, 0, 0]
        },
        alternateRowStyles: { 
          fillColor: [248, 250, 252] 
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 100 },
          2: { cellWidth: 30, halign: "right" },
        },
        margin: { left: margin, right: margin },
        styles: {
          cellPadding: 3,
          lineWidth: 0.1,
        },
        tableWidth: 'auto',
        showHead: 'everyPage',
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
  }
  
  // Custom services (if any)
  if (customServices && customServices.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Custom Services", margin, currentY);
    currentY += 10;
    
    const customTableData = customServices.map((customService) => [
      customService.name,
      customService.description || '',
      `RM ${customService.price.toFixed(2)}`,
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [["Service", "Description", "Price"]],
      body: customTableData,
      theme: "striped",
      headStyles: { 
        fillColor: accentColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: { 
        fontSize: 9,
        textColor: [0, 0, 0]
      },
      alternateRowStyles: { 
        fillColor: [239, 246, 255] // Blue-50
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 100 },
        2: { cellWidth: 30, halign: "right" },
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: 3,
        lineWidth: 0.1,
      },
      tableWidth: 'auto',
      showHead: 'everyPage',
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Calculate totals
  const regularServices = quotation.services.filter(qs => !qs.customServiceId);
  const servicesTotal = regularServices.reduce((sum, serviceItem) => sum + serviceItem.service.basePrice, 0);
  const customServicesTotal = customServices.reduce((sum, customService) => sum + customService.price, 0);
  const subtotal = servicesTotal + customServicesTotal;
  
  // Pricing breakdown
  const totalsX = pageWidth - margin - 80;
  let totalsY = currentY + 10;
  
  // Services subtotal
  if (regularServices && regularServices.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Services Subtotal:", totalsX, totalsY, { align: "right" });
    doc.text(`RM ${servicesTotal.toFixed(2)}`, pageWidth - margin, totalsY, { align: "right" });
    totalsY += 8;
  }
  
  // Custom services subtotal
  if (customServices && customServices.length > 0) {
    doc.text("Custom Services Subtotal:", totalsX, totalsY, { align: "right" });
    doc.text(`RM ${customServicesTotal.toFixed(2)}`, pageWidth - margin, totalsY, { align: "right" });
    totalsY += 8;
  }
  
  // Total subtotal
  doc.setFont("helvetica", "bold");
  doc.text("Subtotal:", totalsX, totalsY, { align: "right" });
  doc.text(`RM ${subtotal.toFixed(2)}`, pageWidth - margin, totalsY, { align: "right" });
  totalsY += 8;
  
  // Discount (if applicable)
  if (quotation.discountValue && quotation.discountValue > 0) {
    const discountText = quotation.discountType === 'percentage' 
      ? `Discount (${quotation.discountValue}%)`
      : `Discount (RM ${quotation.discountValue})`;
    
    doc.setFont("helvetica", "normal");
    doc.text(discountText, totalsX, totalsY, { align: "right" });
    
    const discountAmount = quotation.discountType === 'percentage'
      ? (subtotal * quotation.discountValue / 100)
      : quotation.discountValue;
    
    doc.text(`-RM ${discountAmount.toFixed(2)}`, pageWidth - margin, totalsY, { align: "right" });
    totalsY += 8;
  }
  
  // Duration calculation - duration is always required
  const duration = quotation.duration || 1; // Fallback to 1 if somehow undefined
  const discountedPrice = quotation.discountValue && quotation.discountType === 'percentage'
    ? subtotal * (1 - quotation.discountValue / 100)
    : quotation.discountValue && quotation.discountType === 'fixed'
    ? subtotal - quotation.discountValue
    : subtotal;
  
  doc.text(`Price per Month:`, totalsX, totalsY, { align: "right" });
  doc.text(`RM ${discountedPrice.toFixed(2)}`, pageWidth - margin, totalsY, { align: "right" });
  totalsY += 8;
  
  doc.text(`Duration: ${duration} month${duration > 1 ? 's' : ''}`, totalsX, totalsY, { align: "right" });
  totalsY += 8;
  
  const grandTotal = discountedPrice * duration;
  doc.text(`Total Price (${duration} month${duration > 1 ? 's' : ''}):`, totalsX, totalsY, { align: "right" });
  doc.text(`RM ${grandTotal.toFixed(2)}`, pageWidth - margin, totalsY, { align: "right" });
  totalsY += 8;
  
  // Total
  totalsY += 5;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(totalsX, totalsY, pageWidth - margin, totalsY);
  totalsY += 8;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount:", totalsX, totalsY, { align: "right" });
  
  const finalTotal = quotation.discountValue && quotation.discountType === 'percentage'
    ? subtotal * (1 - quotation.discountValue / 100) * duration
    : quotation.discountValue && quotation.discountType === 'fixed'
    ? (subtotal - quotation.discountValue) * duration
    : subtotal * duration;
  
  doc.text(`RM ${finalTotal.toFixed(2)}`, pageWidth - margin, totalsY, { align: "right" });
  
  // Add bottom padding to pricing section
  totalsY += 20;
  
  // Payment terms
  totalsY += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Terms:", margin, totalsY);
  totalsY += 8;
  
  doc.setFont("helvetica", "normal");
  doc.text("• Quotation is valid for 30 days from the date of issue", margin, totalsY);
  totalsY += 6;
  doc.text("• A deposit may be required before project commencement", margin, totalsY);
  totalsY += 6;
  doc.text("• All prices are in MYR unless stated otherwise", margin, totalsY);
  totalsY += 6;
  doc.text("• Payment is due within 30 days of invoice date", margin, totalsY);
  totalsY += 6;
  doc.text("• Late payments may incur additional charges", margin, totalsY);
  totalsY += 6;
  doc.text("• For questions regarding this quotation, please contact us", margin, totalsY);
  totalsY += 20;
  
  // Footer - ensure it's positioned after all content with proper spacing
  const footerY = Math.max(totalsY + 20, pageHeight - 40);
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, footerY, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for considering Aspial Production for your project.", pageWidth / 2, footerY + 15, { align: "center" });
  doc.text("Please contact us for any clarification regarding this quotation.", pageWidth / 2, footerY + 25, { align: "center" });
  
  // Contact information
  doc.setFontSize(8);
  doc.text(`Contact: ${serviceProvider.email} | Phone: ${serviceProvider.phone}`, pageWidth / 2, footerY + 35, { align: "center" });
  
  // Save the PDF
  const fileName = `quotation-${quotation.id.toString().padStart(4, '0')}-${quotation.Client?.name?.replace(/\s+/g, '-') || 'client'}.pdf`;
  doc.save(fileName);
}

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

// Helper function to format date
export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB');
}
