import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatNumber } from "@/lib/format-number";
import type { QuotationWithServices } from "../types";
import { getQuotationFullById } from "../action";

/** Logo path relative to project root (public folder). */
const LOGO_PATH = "public/images/mainlogo.png";
/** Small logo for PDF (avoids ~17MB PDFs from 3858×1199 full-res embed). Prefer when present. */
const LOGO_PDF_PATH = "public/images/mainlogo-pdf.png";
/** Max logo width in pixels when resizing in browser; keeps PDF size small. */
const LOGO_PDF_MAX_WIDTH = 250;

/**
 * Load ASPIAL logo as base64 data URL for use in jsPDF.
 * Resizes in browser to avoid embedding full-resolution image (~17MB).
 * Prefers mainlogo-pdf.png on server when present for smaller server-generated PDFs.
 */
async function getLogoBase64(): Promise<string | null> {
  if (typeof window === "undefined") {
    try {
      const path = await import("path");
      const fs = await import("fs");
      const cwd = process.cwd();
      const pdfPath = path.join(cwd, LOGO_PDF_PATH);
      const mainPath = path.join(cwd, LOGO_PATH);
      const pathToRead = fs.existsSync(pdfPath) ? pdfPath : mainPath;
      const buf = fs.readFileSync(pathToRead);
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  }
  try {
    const res = await fetch("/images/mainlogo.png");
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    return await resizeImageDataUrlForPdf(dataUrl, LOGO_PDF_MAX_WIDTH);
  } catch {
    return null;
  }
}

/**
 * Resize a data URL image to max width for PDF to avoid huge file sizes.
 * Used in browser only; logo is displayed at ~38×16mm so 250px is sufficient.
 */
function resizeImageDataUrlForPdf(dataUrl: string, maxWidth: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w <= maxWidth) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement("canvas");
      const scale = maxWidth / w;
      canvas.width = maxWidth;
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Terms and conditions text for quotation PDF (points 1-3). */
const TERMS_AND_CONDITIONS = [
  "1. Ownership, Usage Rights, and Creator's Rights. All photographs captured by ASPIAL PRODUCTION SDN BHD remain the sole property of the company. Clients are strictly prohibited from selling or utilizing the photographs in contests without prior written consent from ASPIAL PRODUCTION SDN BHD. ASPIAL PRODUCTION SDN BHD reserves the right to employ the photographs/video for advertising, display, website and internet promotion, photographic contests, and any other marketing endeavours deemed appropriate by the company. ASPIAL PRODUCTION SDN BHD retains the rights to the intellectual property created during the provision of services, subject to the terms agreed upon in this agreement.",
  "2. Liability, Payment, and Confidentiality. ASPIAL PRODUCTION SDN BHD shall not be held liable for any form of loss, damage, or expenses incurred during the photography process or the entirety of the project, including but not limited to indirect or consequential loss, hardware malfunctions, manpower, equipment, scheduling, etc. The initial payment is required to secure the reservation of services and must be remitted upon booking. Confirmed packages are non-refundable, non-exchangeable, and non-transferable. Both parties commit to maintaining the confidentiality of proprietary or sensitive information exchanged during the project. Confidentiality obligations extend beyond the project duration and remain in effect indefinitely, except as required by law or with the express written consent of both parties.",
  "3. Cancellation, Refunds, and Acceptance. Clients acknowledge that once the project plan/solution is confirmed, significant resources, including manpower, equipment, and scheduling, are allocated accordingly, rendering cancellation impossible. Payments made are non-refundable. By initiating the first payment, the Client confirms understanding and agreement to comply with these terms and conditions.",
];

/** Payment information (rendered larger for visibility). */
const PAYMENT_INFO = "4. Payment Information: \n     Bank: Public Bank Berhad \n     Account No: 321-9794-528 \n     Account Name: ASPIAL PRODUCTION SDN BHD";

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

// Logo dimensions (proportional, slightly smaller)
const LOGO_HEADER_WIDTH = 38;
const LOGO_HEADER_HEIGHT = 16;
const HEADER_HEIGHT = 24;
const CONTENT_START_Y = 30;

// Add header to every page (logo on left, company info to the right)
function addHeader(
  doc: jsPDF,
  logoBase64: string | null
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Dark green header background
  doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT, "F");

  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);

  // Logo on left side (at margin), keeping proportions
  const logoStartX = margin;
  const logoY = 4;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", logoStartX, logoY, LOGO_HEADER_WIDTH, LOGO_HEADER_HEIGHT, "logo");
    } catch {
      // If image fails, fall back to text-only
    }
  }

  // Company info to the right of the logo (larger font to match logo height)
  const textStartX = logoStartX + LOGO_HEADER_WIDTH + 6;
  const textWidth = pageWidth - textStartX - margin;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  let headerY = 7;
  const companyLines = [
    "ASPIAL PRODUCTION SDN BHD (202001019933 (1376253-A))",
    "2A, JALAN DATO' ABU BAKAR, JALAN 16/1, SECTION 16, 46350 PETALING JAYA, SELANGOR",
    "Phone: 016-5323453 Fax: 03-78770323 Email: aspialproduction@gmail.com",
  ];
  for (const text of companyLines) {
    const wrapped = doc.splitTextToSize(text, textWidth);
    for (const line of wrapped) {
      if (headerY > HEADER_HEIGHT - 3) break;
      doc.text(line, textStartX, headerY);
      headerY += 5;
    }
  }

  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
}

// Info box dimensions (circled section with QUOTATION NO, DATE, ADVISOR, PAGE NO)
const INFO_BOX_HEIGHT = 28;
const INFO_BOX_START_Y = CONTENT_START_Y;
const CONTENT_AFTER_INFO_BOX_Y = CONTENT_START_Y + INFO_BOX_HEIGHT + 8;

// Add quotation info box to every page (QUOTATION label, Bill To, QUOTATION NO, DATE, ADVISOR, PAGE NO)
function addQuotationInfoBox(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  quotationName: string,
  quotationDate: string,
  advisorName: string,
  clientInfo: { name: string; company: string; phone: string; email: string }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const rightCol = pageWidth - margin;
  
  // Clear the area first (white background)
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, INFO_BOX_START_Y, pageWidth - 2 * margin, INFO_BOX_HEIGHT, "F");
  
  let leftY = INFO_BOX_START_Y + 6;
  let rightY = INFO_BOX_START_Y + 6;
  
  // Left side - Big bolded QUOTATION label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text("QUOTATION", margin + 3, leftY);
  leftY += 6;
  
  // Left side - Bill To section (smaller font)
  doc.setFontSize(9);
  if (clientInfo.company) {
    doc.setFont("helvetica", "bold");
    doc.text(`Bill To: ${clientInfo.company}`, margin + 3, leftY);
    doc.setFont("helvetica", "normal");
  } else {
    doc.setFont("helvetica", "bold");
    doc.text(`Bill To:`, margin + 3, leftY);
    doc.setFont("helvetica", "normal");
  }
  leftY += 4;
  
  if (clientInfo.name) {
    doc.text(`ATTN TO: ${clientInfo.name}`, margin + 3, leftY);
  }
  leftY += 4;
  
  if (clientInfo.phone) {
    doc.text(`TEL NO: ${clientInfo.phone}`, margin + 3, leftY);
  }
  leftY += 4;
  
  if (clientInfo.email) {
    doc.text(`EMAIL: ${clientInfo.email}`, margin + 3, leftY);
  }
  
  // Right side - Quotation details (right-aligned, inside box)
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`QUOTATION NO : ${quotationName}`, rightCol - 3, rightY, { align: "right" });
  rightY += 5;
  
  doc.text(`DATE : ${quotationDate}`, rightCol - 3, rightY, { align: "right" });
  rightY += 5;
  
  doc.text(`ADVISOR : ${advisorName}`, rightCol - 3, rightY, { align: "right" });
  rightY += 5;
  
  // Page number
  doc.text(`PAGE NO : ${pageNumber} of ${totalPages}`, rightCol - 3, rightY, { align: "right" });
  
  // Draw horizontal line at the bottom of info section
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, INFO_BOX_START_Y + INFO_BOX_HEIGHT, pageWidth - margin, INFO_BOX_START_Y + INFO_BOX_HEIGHT);
}

// Helper to check if we need a new page and add header + info box
function checkAndAddPage(
  doc: jsPDF,
  currentY: number,
  pageHeight: number,
  logoBase64: string | null,
  quotationName: string,
  quotationDate: string,
  advisorName: string,
  clientInfo: { name: string; company: string; phone: string; email: string }
): number {
  if (currentY > pageHeight - 30) {
    doc.addPage();
    const totalPages = doc.getNumberOfPages();
    addHeader(doc, logoBase64);
    addQuotationInfoBox(doc, totalPages, totalPages, quotationName, quotationDate, advisorName, clientInfo);
    return CONTENT_AFTER_INFO_BOX_Y;
  }
  return currentY;
}

// Content width for text wrapping (keeps margins consistent, avoids overflow)
const TEXT_SAFETY = 12;

// Add Terms and Conditions section; returns new currentY
function addTermsAndConditions(
  doc: jsPDF,
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  logoBase64: string | null,
  quotationName: string,
  quotationDate: string,
  advisorName: string,
  clientInfo: { name: string; company: string; phone: string; email: string }
): number {
  const contentWidth = pageWidth - 2 * margin - TEXT_SAFETY;
  let currentY = startY;
  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text("Terms And Conditions", margin, currentY);
  currentY += 6;

  // Helper to add new page with header and info box
  const addNewPage = () => {
    doc.addPage();
    const newTotalPages = doc.getNumberOfPages();
    addHeader(doc, logoBase64);
    addQuotationInfoBox(doc, newTotalPages, newTotalPages, quotationName, quotationDate, advisorName, clientInfo);
    return CONTENT_AFTER_INFO_BOX_Y;
  };

  // T&C points 1-3 (font 9pt)
  for (const paragraph of TERMS_AND_CONDITIONS) {
    if (currentY > pageHeight - 25) {
      currentY = addNewPage();
    }
    // Re-set font after page break (header changes font)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    const lines = doc.splitTextToSize(paragraph, contentWidth);
    for (const line of lines) {
      if (currentY > pageHeight - 25) {
        currentY = addNewPage();
        // Re-set font after page break
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      }
      doc.text(line, margin, currentY);
      currentY += 4.5;
    }
    currentY += 3;
  }

  // Payment Information (larger font for visibility)
  currentY += 5;
  if (currentY > pageHeight - 30) {
    currentY = addNewPage();
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  const paymentLines = doc.splitTextToSize(PAYMENT_INFO, contentWidth);
  for (const line of paymentLines) {
    if (currentY > pageHeight - 25) {
      currentY = addNewPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    }
    doc.text(line, margin, currentY);
    currentY += 5;
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
  const logoBase64 = await getLogoBase64();

  // Only include approved custom services in PDF (exclude pending and rejected)
  const customServices = (quotation.customServices ?? []).filter((cs) => cs.status === "APPROVED");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin - TEXT_SAFETY;

  // Calculate totals
  const regularServices = quotation.services.filter((qs) => !qs.customServiceId);
  const servicesTotal = regularServices.reduce(
    (sum, serviceItem) => sum + (serviceItem.service?.basePrice ?? 0),
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
  const clientInfo = {
    name: quotation.Client?.name || '',
    company: quotation.Client?.company || '',
    phone: quotation.Client?.phone || '',
    email: quotation.Client?.email || '',
  };
  
  // Prepare header data
  const quotationDate = formatDate(new Date(quotation.created_at));
  
  // Add header and info box to first page (we'll update total pages later)
  addHeader(doc, logoBase64);
  addQuotationInfoBox(doc, 1, 1, quotation.name, quotationDate, advisorName, clientInfo);
  
  // Start content after the info box
  let currentY = CONTENT_AFTER_INFO_BOX_Y;
  
  // Combine all services
  const allServices = [
    ...regularServices.map((s) => ({
      name: s.service?.name ?? "",
      description: s.service?.description ?? "",
      price: s.service?.basePrice ?? 0,
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
      formatNumber(service.price), // Price per package
      formatNumber(service.price) // Total
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
      formatNumber(packageQty),
      formatNumber(pricePerPackage),
      formatNumber(total)
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
        // Add header and info box on every page (for table overflow pages)
        const pageNum = data.pageNumber;
        const totalPages = doc.getNumberOfPages();
        addHeader(doc, logoBase64);
        addQuotationInfoBox(doc, pageNum, totalPages, quotation.name, quotationDate, advisorName, clientInfo);
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Go to last page for totals
  let totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);
  
  // Helper to add new page with header and info box
  const addNewPage = () => {
    doc.addPage();
    totalPages = doc.getNumberOfPages();
    addHeader(doc, logoBase64);
    addQuotationInfoBox(doc, totalPages, totalPages, quotation.name, quotationDate, advisorName, clientInfo);
    return CONTENT_AFTER_INFO_BOX_Y;
  };

  // Check if we need a new page for totals
  if (currentY > pageHeight - 50) {
    currentY = addNewPage();
  }
  
  // Totals
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("TOTAL ORIGINAL PRICE:", margin, currentY);
  doc.text(`RM${formatNumber(originalPrice)}`, pageWidth - margin, currentY, { align: "right" });
  currentY += 7;

  doc.text("TOTAL DISCOUNT:", margin, currentY);
  doc.text(`RM${formatNumber(discountAmount)}`, pageWidth - margin, currentY, { align: "right" });
  currentY += 7;
  
  doc.text("AFTER DISCOUNT PRICE:", margin, currentY);
  doc.text(`RM${formatNumber(grandTotal)}`, pageWidth - margin, currentY, { align: "right" });
  currentY += 7;
  
  // Split amount in words if too long
  const amountInWords = numberToWords(grandTotal);
  const wordsText = `RINGGIT MALAYSIA : ${amountInWords} ONLY`;
  const wordsLines = doc.splitTextToSize(wordsText, contentWidth);
  wordsLines.forEach((line: string) => {
    if (currentY > pageHeight - 30) {
      currentY = addNewPage();
    }
    doc.text(line, margin, currentY);
    currentY += 5;
  });
  currentY += 5;

  // Horizontal line between totals and Terms & Conditions
  doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // Terms and Conditions
  currentY = addTermsAndConditions(
    doc,
    currentY,
    margin,
    pageWidth,
    pageHeight,
    logoBase64,
    quotation.name,
    quotationDate,
    advisorName,
    clientInfo
  );

  // Final update of page numbers on all pages (header + info box)
  const finalTotalPages = doc.getNumberOfPages();
  for (let i = 1; i <= finalTotalPages; i++) {
    doc.setPage(i);
    addHeader(doc, logoBase64);
    addQuotationInfoBox(doc, i, finalTotalPages, quotation.name, quotationDate, advisorName, clientInfo);
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
  // Always fetch full quotation so services have name, description, basePrice.
  // List views pass placeholder service data (empty name, basePrice 0).
  const fullQuotation = await getQuotationFullById(quotation.id.toString())
  if (!fullQuotation) {
    throw new Error("Quotation not found")
  }
  return await generateQuotationPDFInternal(fullQuotation)
}

/**
 * Generate quotation PDF as base64 string for email attachment
 * This expects a full quotation object with all related data already loaded
 */
export async function generateQuotationPDFBase64(quotation: QuotationWithServices): Promise<string> {
  // Always fetch full quotation so services have name, description, basePrice.
  // List/email callers may pass data that lacks full service details.
  const fullQuotation = await getQuotationFullById(quotation.id.toString())
  if (!fullQuotation) {
    throw new Error("Quotation not found")
  }
  return await _generateQuotationPDFBase64Internal(fullQuotation)
}

/**
 * Generate quotation PDF from already-fetched full quotation (no refetch).
 * Use from send-email flow to avoid duplicate DB round-trip.
 */
export async function generateQuotationPDFBase64FromFull(quotation: QuotationWithServices): Promise<string> {
  return _generateQuotationPDFBase64Internal(quotation)
}

async function _generateQuotationPDFBase64Internal(quotation: QuotationWithServices): Promise<string> {
  const doc = new jsPDF();
  const logoBase64 = await getLogoBase64();

  // Only include approved custom services in PDF (exclude pending and rejected)
  const customServices = (quotation.customServices ?? []).filter((cs) => cs.status === "APPROVED");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin - TEXT_SAFETY;

  // Calculate totals
  const regularServices = quotation.services.filter((qs) => !qs.customServiceId);
  const servicesTotal = regularServices.reduce(
    (sum, serviceItem) => sum + (serviceItem.service?.basePrice ?? 0),
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
  const clientInfo = {
    name: quotation.Client?.name || '',
    company: quotation.Client?.company || '',
    phone: quotation.Client?.phone || '',
    email: quotation.Client?.email || '',
  };
  
  // Prepare header data
  const quotationDate = formatDate(new Date(quotation.created_at));
  
  // Add header and info box to first page (we'll update total pages later)
  addHeader(doc, logoBase64);
  addQuotationInfoBox(doc, 1, 1, quotation.name, quotationDate, advisorName, clientInfo);
  
  // Start content after the info box
  let currentY = CONTENT_AFTER_INFO_BOX_Y;
  
  // Combine all services
  const allServices = [
    ...regularServices.map((s) => ({
      name: s.service?.name ?? "",
      description: s.service?.description ?? "",
      price: s.service?.basePrice ?? 0,
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
      formatNumber(service.price), // Price per package
      formatNumber(service.price) // Total
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
      formatNumber(packageQty),
      formatNumber(pricePerPackage),
      formatNumber(total)
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
        // Add header and info box on every page (for table overflow pages)
        const pageNum = data.pageNumber;
        const totalPages = doc.getNumberOfPages();
        addHeader(doc, logoBase64);
        addQuotationInfoBox(doc, pageNum, totalPages, quotation.name, quotationDate, advisorName, clientInfo);
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Go to last page for totals
  let totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);

  // Helper to add new page with header and info box
  const addNewPage = () => {
    doc.addPage();
    totalPages = doc.getNumberOfPages();
    addHeader(doc, logoBase64);
    addQuotationInfoBox(doc, totalPages, totalPages, quotation.name, quotationDate, advisorName, clientInfo);
    return CONTENT_AFTER_INFO_BOX_Y;
  };

  // Check if we need a new page for totals
  if (currentY > pageHeight - 50) {
    currentY = addNewPage();
  }
  
  // Totals
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("TOTAL ORIGINAL PRICE:", margin, currentY);
  doc.text(`RM${formatNumber(originalPrice)}`, pageWidth - margin, currentY, { align: "right" });
  currentY += 7;
  
  // Show discount if applicable
  if (discountAmount > 0) {
    const discountText = quotation.discountType === "percentage"
      ? `Discount (${quotation.discountValue}%)`
      : `Discount`;
    doc.text(discountText + ":", margin, currentY);
    doc.text(`-RM${formatNumber(discountAmount)}`, pageWidth - margin, currentY, { align: "right" });
    currentY += 7;
  }
  
  doc.text("AFTER DISCOUNT PRICE:", margin, currentY);
  doc.text(`RM${formatNumber(grandTotal)}`, pageWidth - margin, currentY, { align: "right" });
  currentY += 7;
  
  // Split amount in words if too long
  const amountInWords = numberToWords(grandTotal);
  const wordsText = `RINGGIT MALAYSIA : ${amountInWords} ONLY`;
  const wordsLines = doc.splitTextToSize(wordsText, contentWidth);
  wordsLines.forEach((line: string) => {
    if (currentY > pageHeight - 30) {
      currentY = addNewPage();
    }
    doc.text(line, margin, currentY);
    currentY += 5;
  });
  currentY += 5;

  // Horizontal line between totals and Terms & Conditions
  doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // Terms and Conditions
  currentY = addTermsAndConditions(
    doc,
    currentY,
    margin,
    pageWidth,
    pageHeight,
    logoBase64,
    quotation.name,
    quotationDate,
    advisorName,
    clientInfo
  );

  // Final update of page numbers on all pages (header + info box)
  const finalTotalPages = doc.getNumberOfPages();
  for (let i = 1; i <= finalTotalPages; i++) {
    doc.setPage(i);
    addHeader(doc, logoBase64);
    addQuotationInfoBox(doc, i, finalTotalPages, quotation.name, quotationDate, advisorName, clientInfo);
  }
  
  // Return as base64 string
  return doc.output('datauristring').split(',')[1];
}
