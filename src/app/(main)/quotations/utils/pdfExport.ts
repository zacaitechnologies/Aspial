import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { QuotationWithServices } from "../types";
import { getQuotationFullById } from "../action";

// Type definitions for jsPDF autoTable and extension
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

// Convert number to Malaysian Ringgit words
function numberToWords(num: number): string {
  const ones = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
    "SEVENTEEN", "EIGHTEEN", "NINETEEN"
  ];
  
  const tens = [
    "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"
  ];
  
  function convertHundreds(n: number): string {
    let result = "";
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + " HUNDRED";
      n %= 100;
      if (n > 0) result += " ";
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)];
      if (n % 10 > 0) result += " " + ones[n % 10];
    } else if (n > 0) {
      result += ones[n];
    }
    return result;
  }
  
  if (num === 0) return "ZERO";
  
  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);
  
  let words = "";
  
  if (wholePart >= 1000000) {
    const millions = Math.floor(wholePart / 1000000);
    words += convertHundreds(millions) + " MILLION";
    const remainder = wholePart % 1000000;
    if (remainder > 0) words += " ";
    if (remainder >= 1000) {
      const thousands = Math.floor(remainder / 1000);
      words += convertHundreds(thousands) + " THOUSAND";
      const hundreds = remainder % 1000;
      if (hundreds > 0) words += " " + convertHundreds(hundreds);
    } else {
      words += convertHundreds(remainder);
    }
  } else if (wholePart >= 1000) {
    const thousands = Math.floor(wholePart / 1000);
    words += convertHundreds(thousands) + " THOUSAND";
    const hundreds = wholePart % 1000;
    if (hundreds > 0) words += " " + convertHundreds(hundreds);
  } else {
    words = convertHundreds(wholePart);
  }
  
  if (decimalPart > 0) {
    words += " AND " + convertHundreds(decimalPart) + " CENTS";
  }
  
  return words;
}

// Format date as DD/MM/YYYY
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Primary color from CSS: #202F21 (dark green)
// RGB: 32, 47, 33
const PRIMARY_COLOR: [number, number, number] = [32, 47, 33];
const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];

// Add header to every page
function addHeader(doc: jsPDF, pageNumber: number, totalPages: number, quotationName: string, quotationDate: string, advisorName: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Dark green header background
  doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.rect(0, 0, pageWidth, 45, "F");
  
  // Left side - Company header - white text on dark green background
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text("ASPIAL", margin, 15);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("ASPIAL PRODUCTION SDN BHD (202001019933 (1376253-A))", margin, 22);
  doc.text("2A, JALAN DATO' ABU BAKAR, JALAN 16/1, SECTION 16,", margin, 28);
  doc.text("46350 PETALING JAYA, SELANGOR,", margin, 34);
  doc.text("Phone: 016-5323453 Fax: 03-78770323 Email: aspialproduction@gmail.com", margin, 40);
  
  // Title - white text, left side
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("# QUOTATION", margin, 50);
  
  // Page number in header - white text, right-aligned
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`PAGE NO : ${pageNumber} of ${totalPages}`, pageWidth - margin, 50, { align: "right" });
  
  // Reset text color to black for content below
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

// Helper to check if we need a new page and add header
function checkAndAddPage(doc: jsPDF, currentY: number, pageHeight: number, quotationName: string, quotationDate: string, advisorName: string, totalPages: number): number {
  if (currentY > pageHeight - 30) {
    const currentPage = doc.getNumberOfPages();
    doc.addPage();
    addHeader(doc, currentPage + 1, totalPages, quotationName, quotationDate, advisorName);
    return 60; // Start Y after header
  }
  return currentY;
}

// Generate quotation PDF
/**
 * Generate quotation PDF with full data fetching
 * This is a wrapper that ensures all required data is loaded before generating the PDF
 */
export async function generateQuotationPDFWithFetch(quotationId: number) {
  // Fetch full quotation data
  const fullQuotation = await getQuotationFullById(quotationId.toString())
  
  if (!fullQuotation) {
    throw new Error("Quotation not found")
  }
  
  // Generate PDF using the internal function
  return await generateQuotationPDFInternal(fullQuotation)
}

/**
 * Internal PDF generation function
 * Use custom services from quotation if available, otherwise fetch them
 */
async function generateQuotationPDFInternal(quotation: QuotationWithServices) {
  const doc = new jsPDF();
  
  // Use custom services already loaded on the quotation (full fetch includes these)
  const customServices = quotation.customServices ?? [];
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = 60; // Start after header
  
  // Calculate totals
  const regularServices = quotation.services.filter((qs) => !qs.customServiceId);
  const servicesTotal = regularServices.reduce(
    (sum, serviceItem) => sum + serviceItem.service.basePrice,
    0
  );
  const customServicesTotal = customServices.reduce(
    (sum, customService) => sum + customService.price,
    0
  );
  const subtotal = servicesTotal + customServicesTotal;
  
  let discountAmount = 0;
  if (quotation.discountValue && quotation.discountValue > 0) {
    discountAmount =
      quotation.discountType === "percentage"
        ? (subtotal * quotation.discountValue) / 100
        : quotation.discountValue;
  }
  
  const grandTotal = subtotal - discountAmount;
  const originalPrice = subtotal;
  
  // Get advisor name (createdBy)
  const advisorName = quotation.createdBy
    ? `${quotation.createdBy.firstName || ''} ${quotation.createdBy.lastName || ''}`.trim()
    : 'ADMIN';
  
  // Get client info
  const clientName = quotation.Client?.name || '';
  const clientCompany = quotation.Client?.company || '';
  const clientPhone = quotation.Client?.phone || '';
  const clientEmail = quotation.Client?.email || '';
  
  // Prepare header data
  const quotationDate = formatDate(new Date(quotation.created_at));
  
  // Add header to first page (we'll update total pages later)
  addHeader(doc, 1, 1, quotation.name, quotationDate, advisorName);
  
  // Quotation details section - two columns layout
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const leftCol = margin;
  const rightCol = pageWidth - margin; // Right-aligned from right margin
  let leftY = currentY;
  let rightY = currentY;
  
  // Left side - Big bolded QUOTATION label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("QUOTATION", leftCol, leftY);
  leftY += 8;
  
  // Left side - Bill To section
  if (clientCompany) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Bill To: ${clientCompany}`, leftCol, leftY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  } else {
    doc.setFont("helvetica", "bold");
    doc.text(`Bill To :`, leftCol, leftY);
    doc.setFont("helvetica", "normal");
  }
  leftY += 5;
  
  if (clientName) {
    doc.text(`ATTN TO: ${clientName}`, leftCol, leftY);
  } else {
    doc.text(`ATTN TO :`, leftCol, leftY);
  }
  leftY += 5;
  
  doc.text("TEL NO :", leftCol, leftY);
  if (clientPhone) {
    doc.text(`TEL NO: ${clientPhone}`, leftCol, leftY);
  } else {
    doc.text(`TEL NO :`, leftCol, leftY);
  }
  leftY += 5;
  
  doc.text("EMAIL :", leftCol, leftY);
  if (clientEmail) {
    doc.text(`EMAIL: ${clientEmail}`, leftCol, leftY);
  } else {
    doc.text(`EMAIL :`, leftCol, leftY);
  }
  
  // Right side - Quotation details (right-aligned)
  doc.text(`QUOTATION NO : ${quotation.name}`, rightCol, rightY, { align: "right" });
  rightY += 5;
  
  doc.text(`DATE : ${quotationDate}`, rightCol, rightY, { align: "right" });
  rightY += 5;
  
  doc.text(`ADVISOR : ${advisorName}`, rightCol, rightY, { align: "right" });
  rightY += 5;
  
  // Add PAGE NO right below ADVISOR
  doc.text(`PAGE NO : 1 of 1`, rightCol, rightY, { align: "right" });
  
  // Use the maximum Y position from both columns
  currentY = Math.max(leftY, rightY) + 8;
  
  // Combine all services
  const allServices = [
    ...regularServices.map((s) => ({
      name: s.service.name,
      description: s.service.description || "",
      price: s.service.basePrice,
      type: "service",
    })),
    ...customServices.map((cs) => ({
      name: cs.name,
      description: cs.description || "",
      price: cs.price,
      type: "custom",
    })),
  ];
  
  // Services table - create a row for each service
  const tableData: any[] = [];
  const rowHeights: number[] = [];
  const descCellWidth = 110 - 6; // Account for padding
  
  // Calculate row height for each service and create table rows
  allServices.forEach((service, index) => {
    const nameLines = doc.splitTextToSize(service.name, descCellWidth);
    let totalLines = nameLines.length;
    
    if (service.description) {
      // Process description - split by newlines and remove bullets
      const processedDesc = service.description
        .split('\n')
        .map(line => line.trim().replace(/^[-•*]\s*/, ''))
        .filter(line => line.length > 0)
        .join('\n');
      const descLines = doc.splitTextToSize(processedDesc, descCellWidth);
      totalLines += descLines.length;
      // Add 2px for gap between name and description
      totalLines += 0.5; // 2px gap = 0.5 line spacing
    }
    
    // Calculate row height - use 5px per line for better spacing, add extra padding
    const rowHeight = Math.max(20, totalLines * 5 + 12); // 5px per line + extra padding
    rowHeights.push(rowHeight);
    
    // Add row data - empty string in description column will be rendered by didDrawCell
    tableData.push([
      String(index + 1),
      "", // Empty - will be rendered by didDrawCell
      "1.00", // Package quantity
      service.price.toFixed(2), // Price per package
      service.price.toFixed(2) // Total
    ]);
  });
  
  // If no individual services, show combined total
  if (allServices.length === 0) {
    const packageQty = 1.00;
    const pricePerPackage = originalPrice;
    const total = grandTotal;
    tableData.push([
      "1",
      "",
      packageQty.toFixed(2),
      pricePerPackage.toFixed(2),
      total.toFixed(2)
    ]);
    rowHeights.push(15);
  }
  
  // Add table
  if (tableData.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [["No", "Description", "Package", "Price/Package", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: PRIMARY_COLOR,
        textColor: WHITE,
        fontSize: 9,
        fontStyle: "bold",
        lineWidth: 0.1,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: BLACK,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: (pageWidth - 2 * margin) / 15 * 1, halign: "center" },
        1: { 
          cellWidth: (pageWidth - 2 * margin) / 15 * 7, 
          cellPadding: { top: 5, right: 3, bottom: 5, left: 3 },
          valign: 'top'
        },
        2: { cellWidth: (pageWidth - 2 * margin) / 15 * 2, halign: "right" }, 
        3: { cellWidth: (pageWidth - 2 * margin) / 15 * 3, halign: "right" },
        4: { cellWidth: (pageWidth - 2 * margin) / 15 * 2, halign: "right" },
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: 3,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        overflow: 'linebreak',
      },
      didParseCell: (data: any) => {
        // Set row height based on calculated height for each row
        if (data.row.index >= 0 && rowHeights[data.row.index]) {
          // Set minHeight for all cells in the row to ensure consistent row height
          data.cell.minHeight = rowHeights[data.row.index];
          // Also set the row height directly
          if (data.table.body[data.row.index]) {
            data.table.body[data.row.index].height = rowHeights[data.row.index];
          }
        }
      },
      willDrawCell: (data: any) => {
        // Ensure row height is applied before drawing
        if (data.row.index >= 0 && rowHeights[data.row.index]) {
          data.cell.height = rowHeights[data.row.index];
        }
      },
      didDrawCell: (data: any) => {
        // Custom rendering for description column (index 1) to handle bold name and normal description
        // Only render for body rows, not header rows
        if (data.column.index === 1 && data.row.index >= 0 && data.row.section === 'body') {
          const serviceIndex = data.row.index;
          const service = allServices[serviceIndex];
          
          if (service) {
            const cellWidth = data.cell.width - 6; // Account for padding
            const x = data.cell.x + 3;
            let y = data.cell.y + 5;
            // Use calculated row height or cell height, whichever is larger
            const cellHeight = rowHeights[serviceIndex] || data.cell.height || 20;
            const maxY = data.cell.y + cellHeight - 5;
            
            // Draw service name in bold
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
            const nameLines = doc.splitTextToSize(service.name, cellWidth);
            nameLines.forEach((line: string) => {
              if (y >= maxY) return; // Prevent overflow
              doc.text(line, x, y);
              y += 4; // Tighter spacing
            });
            
            // Add small gap between name and description
            if (service.description) {
              y += 2;
            }
            
            // Draw description in normal font (always show if it exists)
            if (service.description) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(9);
              doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
              // Process description - split by newlines and remove bullets
              let processedDesc = service.description
                .split('\n')
                .map(line => line.trim().replace(/^[-•*]\s*/, ''))
                .filter(line => line.length > 0)
                .join('\n');
              
              // If processing removed everything, use original description
              if (!processedDesc || processedDesc.trim().length === 0) {
                processedDesc = service.description.trim();
              }
              
              if (processedDesc && processedDesc.length > 0) {
                const descLines = doc.splitTextToSize(processedDesc, cellWidth);
                descLines.forEach((line: string) => {
                  if (y >= maxY) return; // Prevent overflow
                  doc.text(line, x, y);
                  y += 4; // Tighter spacing
                });
              }
            }
            
            // Return false to prevent default rendering
            return false;
          }
        }
      },
      didDrawPage: (data: any) => {
        // Add header on every page
        const pageNum = data.pageNumber;
        const totalPages = doc.getNumberOfPages();
        addHeader(doc, pageNum, totalPages, quotation.name, quotationDate, advisorName);
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Get final total pages
  const totalPages = doc.getNumberOfPages();
  
  // Update page numbers on all pages (both in header and below ADVISOR)
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeader(doc, i, totalPages, quotation.name, quotationDate, advisorName);
    
    // Update PAGE NO below ADVISOR on first page only
    if (i === 1) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      const rightCol = pageWidth - margin;
      let rightY = 60; // Start position
      rightY += 5; // After QUOTATION NO
      rightY += 5; // After DATE
      rightY += 5; // After ADVISOR
      doc.text(`PAGE NO : ${i} of ${totalPages}`, rightCol, rightY, { align: "right" });
    }
  }
  
  // Go back to last page for totals
  doc.setPage(totalPages);
  
  // Check if we need a new page for totals
  if (currentY > pageHeight - 50) {
    doc.addPage();
    const newTotalPages = doc.getNumberOfPages();
    addHeader(doc, newTotalPages, newTotalPages, quotation.name, quotationDate, advisorName);
    currentY = 60;
  }
  
  // Totals
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("TOTAL ORIGINAL PRICE:", margin, currentY);
  doc.text(`RM${originalPrice.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" });
  currentY += 7;

  doc.text("TOTAL DISCOUNT:", margin, currentY);
  doc.text(`RM${discountAmount.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" });
  currentY += 7;
  
  doc.text("AFTER DISCOUNT PRICE:", margin, currentY);
  doc.text(`RM${grandTotal.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" });
  currentY += 7;
  
  // Split amount in words if too long
  const amountInWords = numberToWords(grandTotal);
  const wordsText = `RINGGIT MALAYSIA : ${amountInWords} ONLY`;
  const wordsLines = doc.splitTextToSize(wordsText, pageWidth - 2 * margin);
  wordsLines.forEach((line: string) => {
    if (currentY > pageHeight - 30) {
      doc.addPage();
      const newTotalPages = doc.getNumberOfPages();
      addHeader(doc, newTotalPages, newTotalPages, quotation.name, quotationDate, advisorName);
      currentY = 60;
    }
    doc.text(line, margin, currentY);
    currentY += 5;
  });
  currentY += 5;
  
  // Final update of page numbers on all pages (only in header)
  const finalTotalPages = doc.getNumberOfPages();
  for (let i = 1; i <= finalTotalPages; i++) {
    doc.setPage(i);
    addHeader(doc, i, finalTotalPages, quotation.name, quotationDate, advisorName);
  }
  
  // Save the PDF
  const fileName = `quotation-${quotation.name}-${
    quotation.Client?.company?.replace(/\s+/g, "-") || "client"
  }.pdf`;
  doc.save(fileName);
}

/**
 * Generate quotation PDF (public export)
 * This is the public interface that accepts a quotation object
 * It will use existing custom services data if available, or fetch if needed
 */
export async function generateQuotationPDF(quotation: QuotationWithServices) {
  // List views may provide a lightweight quotation (services without basePrice, etc).
  // Ensure we have full service details before generating.
  const hasFullServiceData =
    quotation.services?.length > 0 &&
    quotation.services.every((qs) => typeof (qs.service as any)?.basePrice === "number")

  if (!hasFullServiceData) {
    const fullQuotation = await getQuotationFullById(quotation.id.toString())
    if (!fullQuotation) {
      throw new Error("Quotation not found")
    }
    return await generateQuotationPDFInternal(fullQuotation)
  }

  return await generateQuotationPDFInternal(quotation)
}

/**
 * Generate quotation PDF as base64 string for email attachment
 * This expects a full quotation object with all related data already loaded
 */
export async function generateQuotationPDFBase64(quotation: QuotationWithServices): Promise<string> {
  // Ensure we have full service details (list views may not)
  const hasFullServiceData =
    quotation.services?.length > 0 &&
    quotation.services.every((qs) => typeof (qs.service as any)?.basePrice === "number")

  if (!hasFullServiceData) {
    const fullQuotation = await getQuotationFullById(quotation.id.toString())
    if (!fullQuotation) {
      throw new Error("Quotation not found")
    }
    return await generateQuotationPDFBase64(fullQuotation)
  }

  const doc = new jsPDF();
  
  // Use custom services already loaded on the quotation (full fetch includes these)
  const customServices = quotation.customServices ?? [];
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = 60;
  
  // Calculate totals
  const regularServices = quotation.services.filter((qs) => !qs.customServiceId);
  const servicesTotal = regularServices.reduce(
    (sum, serviceItem) => sum + serviceItem.service.basePrice,
    0
  );
  const customServicesTotal = customServices.reduce(
    (sum, customService) => sum + customService.price,
    0
  );
  const subtotal = servicesTotal + customServicesTotal;
  
  let discountAmount = 0;
  if (quotation.discountValue && quotation.discountValue > 0) {
    discountAmount =
      quotation.discountType === "percentage"
        ? (subtotal * quotation.discountValue) / 100
        : quotation.discountValue;
  }
  
  const grandTotal = subtotal - discountAmount;
  const originalPrice = subtotal;
  
  // Get advisor name (createdBy)
  const advisorName = quotation.createdBy
    ? `${quotation.createdBy.firstName || ''} ${quotation.createdBy.lastName || ''}`.trim()
    : 'ADMIN';
  
  // Get client info
  const clientName = quotation.Client?.name || '';
  const clientCompany = quotation.Client?.company || '';
  const clientPhone = quotation.Client?.phone || '';
  const clientEmail = quotation.Client?.email || '';
  
  // Prepare header data
  const quotationDate = formatDate(new Date(quotation.created_at));
  
  // Add header to first page (we'll update total pages later)
  addHeader(doc, 1, 1, quotation.name, quotationDate, advisorName);
  
  // Quotation details section - two columns layout
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const leftCol = margin;
  const rightCol = pageWidth - margin; // Right-aligned from right margin
  let leftY = currentY;
  let rightY = currentY;
  
  // Left side - Big bolded QUOTATION label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("QUOTATION", leftCol, leftY);
  leftY += 8;
  
  // Left side - Bill To section
  if (clientCompany) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Bill To: ${clientCompany}`, leftCol, leftY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  } else {
    doc.setFont("helvetica", "bold");
    doc.text(`Bill To :`, leftCol, leftY);
    doc.setFont("helvetica", "normal");
  }
  leftY += 5;
  
  doc.text("ATTN TO :", leftCol, leftY);
  if (clientName) {
    doc.text(`ATTN TO: ${clientName}`, leftCol, leftY);
  } else {
    doc.text(`ATTN TO :`, leftCol, leftY);
  }
  leftY += 5;
  
  doc.text("TEL NO :", leftCol, leftY);
  if (clientPhone) {
    doc.text(`TEL NO: ${clientPhone}`, leftCol, leftY);
  } else {
    doc.text(`TEL NO :`, leftCol, leftY);
  }
  leftY += 5;
  
  doc.text("EMAIL :", leftCol, leftY);
  if (clientEmail) {
    doc.text(`EMAIL: ${clientEmail}`, leftCol, leftY);
  } else {
    doc.text(`EMAIL :`, leftCol, leftY);
  }
  
  // Right side - Quotation details (right-aligned)
  doc.text(`QUOTATION NO : ${quotation.name}`, rightCol, rightY, { align: "right" });
  rightY += 5;
  
  doc.text(`DATE : ${quotationDate}`, rightCol, rightY, { align: "right" });
  rightY += 5;
  
  doc.text(`ADVISOR : ${advisorName}`, rightCol, rightY, { align: "right" });
  rightY += 5;
  
  // Add PAGE NO right below ADVISOR
  doc.text(`PAGE NO : 1 of 1`, rightCol, rightY, { align: "right" });
  
  // Use the maximum Y position from both columns
  currentY = Math.max(leftY, rightY) + 8;
  
  // Combine all services
  const allServices = [
    ...regularServices.map((s) => ({
      name: s.service.name,
      description: s.service.description || "",
      price: s.service.basePrice,
      type: "service",
    })),
    ...customServices.map((cs) => ({
      name: cs.name,
      description: cs.description || "",
      price: cs.price,
      type: "custom",
    })),
  ];
  
  // Services table - create a row for each service
  const tableData: any[] = [];
  const rowHeights: number[] = [];
  const descCellWidth = 110 - 6; // Account for padding
  
  // Calculate row height for each service and create table rows
  allServices.forEach((service, index) => {
    const nameLines = doc.splitTextToSize(service.name, descCellWidth);
    let totalLines = nameLines.length;
    
    if (service.description) {
      // Process description - split by newlines and remove bullets
      const processedDesc = service.description
        .split('\n')
        .map(line => line.trim().replace(/^[-•*]\s*/, ''))
        .filter(line => line.length > 0)
        .join('\n');
      const descLines = doc.splitTextToSize(processedDesc, descCellWidth);
      totalLines += descLines.length;
      // Add 2px for gap between name and description
      totalLines += 0.5; // 2px gap = 0.5 line spacing
    }
    
    // Calculate row height - use 5px per line for better spacing, add extra padding
    const rowHeight = Math.max(20, totalLines * 5 + 12); // 5px per line + extra padding
    rowHeights.push(rowHeight);
    
    // Add row data - empty string in description column will be rendered by didDrawCell
    tableData.push([
      String(index + 1),
      "", // Empty - will be rendered by didDrawCell
      "1.00", // Package quantity
      service.price.toFixed(2), // Price per package
      service.price.toFixed(2) // Total
    ]);
  });
  
  // If no individual services, show combined total
  if (allServices.length === 0) {
    const packageQty = 1.00;
    const pricePerPackage = originalPrice;
    const total = grandTotal;
    tableData.push([
      "1",
      "",
      packageQty.toFixed(2),
      pricePerPackage.toFixed(2),
      total.toFixed(2)
    ]);
    rowHeights.push(15);
  }
  
  // Add table
  if (tableData.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [["No", "Description", "Package", "Price/Package", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: PRIMARY_COLOR,
        textColor: WHITE,
        fontSize: 9,
        fontStyle: "bold",
        lineWidth: 0.1,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: BLACK,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: (pageWidth - 2 * margin) / 15 * 1, halign: "center" },
        1: { 
          cellWidth: (pageWidth - 2 * margin) / 15 * 7, 
          cellPadding: { top: 5, right: 3, bottom: 5, left: 3 },
          valign: 'top'
        },
        2: { cellWidth: (pageWidth - 2 * margin) / 15 * 2, halign: "right" }, 
        3: { cellWidth: (pageWidth - 2 * margin) / 15 * 3, halign: "right" },
        4: { cellWidth: (pageWidth - 2 * margin) / 15 * 2, halign: "right" },
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: 3,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        overflow: 'linebreak',
      },
      didParseCell: (data: any) => {
        // Set row height based on calculated height for each row
        if (data.row.index >= 0 && rowHeights[data.row.index]) {
          // Set minHeight for all cells in the row to ensure consistent row height
          data.cell.minHeight = rowHeights[data.row.index];
          // Also set the row height directly
          if (data.table.body[data.row.index]) {
            data.table.body[data.row.index].height = rowHeights[data.row.index];
          }
        }
      },
      willDrawCell: (data: any) => {
        // Ensure row height is applied before drawing
        if (data.row.index >= 0 && rowHeights[data.row.index]) {
          data.cell.height = rowHeights[data.row.index];
        }
      },
      didDrawCell: (data: any) => {
        // Custom rendering for description column (index 1) to handle bold name and normal description
        // Only render for body rows, not header rows
        if (data.column.index === 1 && data.row.index >= 0 && data.row.section === 'body') {
          const serviceIndex = data.row.index;
          const service = allServices[serviceIndex];
          
          if (service) {
            const cellWidth = data.cell.width - 6; // Account for padding
            const x = data.cell.x + 3;
            let y = data.cell.y + 5;
            // Use calculated row height or cell height, whichever is larger
            const cellHeight = rowHeights[serviceIndex] || data.cell.height || 20;
            const maxY = data.cell.y + cellHeight - 5;
            
            // Draw service name in bold
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
            const nameLines = doc.splitTextToSize(service.name, cellWidth);
            nameLines.forEach((line: string) => {
              if (y >= maxY) return; // Prevent overflow
              doc.text(line, x, y);
              y += 4; // Tighter spacing
            });
            
            // Add small gap between name and description
            if (service.description) {
              y += 2;
            }
            
            // Draw description in normal font (always show if it exists)
            if (service.description) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(9);
              doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
              // Process description - split by newlines and remove bullets
              let processedDesc = service.description
                .split('\n')
                .map(line => line.trim().replace(/^[-•*]\s*/, ''))
                .filter(line => line.length > 0)
                .join('\n');
              
              // If processing removed everything, use original description
              if (!processedDesc || processedDesc.trim().length === 0) {
                processedDesc = service.description.trim();
              }
              
              if (processedDesc && processedDesc.length > 0) {
                const descLines = doc.splitTextToSize(processedDesc, cellWidth);
                descLines.forEach((line: string) => {
                  if (y >= maxY) return; // Prevent overflow
                  doc.text(line, x, y);
                  y += 4; // Tighter spacing
                });
              }
            }
            
            // Return false to prevent default rendering
            return false;
          }
        }
      },
      didDrawPage: (data: any) => {
        const totalPages = doc.getNumberOfPages();
        addHeader(doc, data.pageNumber, totalPages, quotation.name, quotationDate, advisorName);
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Get final total pages
  const totalPages = doc.getNumberOfPages();
  
  // Update page numbers on all pages (both in header and below ADVISOR)
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeader(doc, i, totalPages, quotation.name, quotationDate, advisorName);
    
    // Update PAGE NO below ADVISOR on first page only
    if (i === 1) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      const rightCol = pageWidth - margin;
      let rightY = 60; // Start position
      rightY += 5; // After QUOTATION NO
      rightY += 5; // After DATE
      rightY += 5; // After ADVISOR
      doc.text(`PAGE NO : ${i} of ${totalPages}`, rightCol, rightY, { align: "right" });
    }
  }
  
  // Go back to last page for totals
  doc.setPage(totalPages);
  
  // Check if we need a new page for totals
  if (currentY > pageHeight - 50) {
    doc.addPage();
    const newTotalPages = doc.getNumberOfPages();
    addHeader(doc, newTotalPages, newTotalPages, quotation.name, quotationDate, advisorName);
    currentY = 60;
  }
  
  // Totals
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("TOTAL ORIGINAL PRICE:", margin, currentY);
  doc.text(`RM${originalPrice.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" });
  currentY += 7;
  
  // Show discount if applicable
  if (discountAmount > 0) {
    const discountText = quotation.discountType === "percentage"
      ? `Discount (${quotation.discountValue}%)`
      : `Discount`;
    doc.text(discountText + ":", margin, currentY);
    doc.text(`-RM${discountAmount.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" });
    currentY += 7;
  }
  
  doc.text("AFTER DISCOUNT PRICE:", margin, currentY);
  doc.text(`RM${grandTotal.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" });
  currentY += 7;
  
  // Split amount in words if too long
  const amountInWords = numberToWords(grandTotal);
  const wordsText = `RINGGIT MALAYSIA : ${amountInWords} ONLY`;
  const wordsLines = doc.splitTextToSize(wordsText, pageWidth - 2 * margin);
  wordsLines.forEach((line: string) => {
    if (currentY > pageHeight - 30) {
      doc.addPage();
      const newTotalPages = doc.getNumberOfPages();
      addHeader(doc, newTotalPages, newTotalPages, quotation.name, quotationDate, advisorName);
      currentY = 60;
    }
    doc.text(line, margin, currentY);
    currentY += 5;
  });
  currentY += 5;
  
  // Final update of page numbers on all pages (both in header and below ADVISOR)
  const finalTotalPages = doc.getNumberOfPages();
  for (let i = 1; i <= finalTotalPages; i++) {
    doc.setPage(i);
    addHeader(doc, i, finalTotalPages, quotation.name, quotationDate, advisorName);
    
    // Update PAGE NO below ADVISOR on first page only
    if (i === 1) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      const rightCol = pageWidth - margin;
      let rightY = 60; // Start position
      rightY += 5; // After QUOTATION NO
      rightY += 5; // After DATE
      rightY += 5; // After ADVISOR
      doc.text(`PAGE NO : ${i} of ${finalTotalPages}`, rightCol, rightY, { align: "right" });
    }
  }
  
  // Return as base64 string
  return doc.output('datauristring').split(',')[1];
}
