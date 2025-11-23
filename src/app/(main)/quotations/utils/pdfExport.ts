import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { QuotationWithServices } from "../types";
import { getCustomServicesByQuotationId } from "../action";

// Type definitions for jsPDF autoTable and extension remain the same

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export async function generateQuotationPDF(quotation: QuotationWithServices) {
  const doc = new jsPDF();
  const customServices = await getCustomServicesByQuotationId(quotation.id); // Set up grayscale colors
  const black = 0;
  const white = 255;
  const darkGray = 70;
  const mediumGray = 150; // Service Provider Information
  const serviceProvider = {
    company: "Aspial Production",
    address:
      "2A, Lorong Dato Abu Bakar, Section 16, 46350 Petaling Jaya, Selangor",
    phone: "016-753 5323",
    email: "contact@aspialproduction.com",
  }; // Calculate dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const center = pageWidth / 2;
  let currentY = margin; // 1. Header (Unchanged)
  doc.setFillColor(darkGray, darkGray, darkGray);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(white, white, white);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(serviceProvider.company.toUpperCase(), margin, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(serviceProvider.address, margin, 27);
  doc.text(
    `Phone: ${serviceProvider.phone} | Email: ${serviceProvider.email}`,
    margin,
    35
  ); // Reset text color and initial content Y
  doc.setTextColor(black, black, black);
  currentY = 55; // 2. Quotation Title and Details (REMOVED: Main "QUOTATION" Title) // Place essential quote details higher up to reclaim space
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const quoteId = `Quotation: Q-${quotation.id.toString().padStart(4, "0")}`;
  const quoteDate = `Date: ${new Date(quotation.created_at).toLocaleDateString(
    "en-GB"
  )}`; // Positioning quote details to the left
  doc.text(quoteId, margin, currentY);
  currentY += 5; // Use minimal spacing
  doc.text(quoteDate, margin, currentY);
  currentY += 10; // 3. Client information (Bill To) & Project Information (Side-by-Side)

  const sectionY = currentY;
  let clientY = sectionY;
  let projectY = sectionY; // --- BILL TO (Left Side) ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", margin, clientY);
  clientY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (quotation.Client) {
    if (quotation.Client.company) {
      doc.text(quotation.Client.company, margin, clientY);
      clientY += 5;
    }
    if (quotation.Client.email) {
      doc.text(quotation.Client.email, margin, clientY);
      clientY += 5;
    }
    if (quotation.Client.phone) {
      doc.text(quotation.Client.phone, margin, clientY);
      clientY += 5;
    }
    if (quotation.Client.address) {
      const addressLines = doc.splitTextToSize(
        quotation.Client.address,
        center - margin - 5
      );
      addressLines.forEach((line: string) => {
        doc.text(line, margin, clientY);
        clientY += 5;
      });
    }
  } else {
    doc.text("Client information not available", margin, clientY);
    clientY += 5;
  } // --- PROJECT DETAILS (Right Side) ---
  const projectStartX = center + 10;
  if (quotation.project) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Project Details:", projectStartX, projectY);
    projectY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Project: ${quotation.project.name}`, projectStartX, projectY);
    projectY += 5;
    if (quotation.project.startDate) {
      doc.text(
        `Start Date: ${new Date(quotation.project.startDate).toLocaleDateString(
          "en-GB"
        )}`,
        projectStartX,
        projectY
      );
      projectY += 5;
    }
    if (quotation.project.endDate) {
      doc.text(
        `End Date: ${new Date(quotation.project.endDate).toLocaleDateString(
          "en-GB"
        )}`,
        projectStartX,
        projectY
      );
      projectY += 5;
    }
  } // Set next Y below the taller of the two sections
  currentY = Math.max(clientY, projectY) + 10; // 4. Quoted Items Table
  const regularServices = quotation.services.filter(
    (qs) => !qs.customServiceId
  );
  const allServiceItems = [
    ...regularServices.map((s) => ({
      name: s.service.name,
      description: s.service.description || "",
      price: s.service.basePrice,
      type: "Service",
    })),
    ...customServices.map((cs) => ({
      name: cs.name,
      description: cs.description || "",
      price: cs.price,
      type: "Custom Service",
    })),
  ];

  if (allServiceItems.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Quoted Items", margin, currentY);
    currentY += 8;
    const tableData = allServiceItems.map((item) => [
      item.name,
      item.description,
      item.type,
      `RM ${item.price.toFixed(2)}`,
    ]);
    autoTable(doc, {
      startY: currentY,
      head: [["Name", "Description", "Type", "Price"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: darkGray,
        textColor: white,
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: black,
      },
      alternateRowStyles: {
        fillColor: 240,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 65 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40, halign: "right" },
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: 3,
        lineWidth: 0.1,
        lineColor: mediumGray,
      },
      tableWidth: "auto",
      showHead: "everyPage",
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("No services quoted for this quotation.", margin, currentY);
    currentY += 15;
  } // 5. Calculate totals
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

  const pricePerMonth = subtotal - discountAmount;
  const duration = quotation.duration || 1;
  const grandTotal = pricePerMonth * duration; // 6. Pricing breakdown (No Box, Right-Aligned)
  const totalsBoxWidth = 100; // Reference width for alignment
  const totalsX = pageWidth - margin - totalsBoxWidth;
  const valueX = pageWidth - margin;

  let totalsY = currentY + 5;
  doc.setFontSize(10); // Subtotal line
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX, totalsY, { align: "right" });
  doc.text(`RM ${subtotal.toFixed(2)}`, valueX, totalsY, { align: "right" });
  totalsY += 6; // Discount line (if applicable)
  if (discountAmount > 0) {
    const discountText =
      quotation.discountType === "percentage"
        ? `Discount (${quotation.discountValue}%)`
        : `Discount (RM ${(quotation.discountValue || 0).toFixed(2)})`;
    doc.text(discountText, totalsX, totalsY, { align: "right" });
    doc.text(`-RM ${discountAmount.toFixed(2)}`, valueX, totalsY, {
      align: "right",
    });
    totalsY += 6;
  } // Price Per Month line
  doc.setFont("helvetica", "normal");
  doc.text("Price per Month:", totalsX, totalsY, { align: "right" });
  doc.text(`RM ${pricePerMonth.toFixed(2)}`, valueX, totalsY, {
    align: "right",
  });
  totalsY += 6; // Duration line

  doc.text(`Duration:`, totalsX, totalsY, { align: "right" });
  doc.text(`${duration} month${duration > 1 ? "s" : ""}`, valueX, totalsY, {
    align: "right",
  });
  totalsY += 8; // Final Total line (Separator and larger font)
  doc.setDrawColor(darkGray, darkGray, darkGray);
  doc.setLineWidth(0.3);
  doc.line(totalsX - 10, totalsY, valueX, totalsY);
  totalsY += 6;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL AMOUNT:", totalsX, totalsY, { align: "right" });
  doc.text(`RM ${grandTotal.toFixed(2)}`, valueX, totalsY, { align: "right" }); // REMOVED: Payment terms section entirely. // Save the PDF
  const fileName = `quotation-${quotation.id.toString().padStart(4, "0")}-${
    quotation.Client?.company?.replace(/\s+/g, "-") || "client"
  }.pdf`;
  doc.save(fileName);
}
