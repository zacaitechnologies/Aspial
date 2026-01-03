-- Add ON DELETE CASCADE to business entity foreign key constraints
-- This migration only updates foreign key constraints, no data is affected
-- IMPORTANT: Run this SQL manually in your Supabase SQL editor

-- Quotation -> Client (business entity cascade, currently SET NULL)
ALTER TABLE "quotations" 
DROP CONSTRAINT IF EXISTS "quotations_clientId_fkey";

ALTER TABLE "quotations" 
ADD CONSTRAINT "quotations_clientId_fkey" 
FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Project -> Client (business entity cascade, currently SET NULL)
ALTER TABLE "projects" 
DROP CONSTRAINT IF EXISTS "projects_clientId_fkey";

ALTER TABLE "projects" 
ADD CONSTRAINT "projects_clientId_fkey" 
FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invoice -> Quotation (business entity cascade)
ALTER TABLE "invoices" 
DROP CONSTRAINT IF EXISTS "invoices_quotationId_fkey";

ALTER TABLE "invoices" 
ADD CONSTRAINT "invoices_quotationId_fkey" 
FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Receipt -> Invoice (business entity cascade)
ALTER TABLE "receipts" 
DROP CONSTRAINT IF EXISTS "receipts_invoiceId_fkey";

ALTER TABLE "receipts" 
ADD CONSTRAINT "receipts_invoiceId_fkey" 
FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Quotation -> Project (business entity cascade)
ALTER TABLE "quotations" 
DROP CONSTRAINT IF EXISTS "quotations_projectId_fkey";

ALTER TABLE "quotations" 
ADD CONSTRAINT "quotations_projectId_fkey" 
FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AppointmentBooking -> Project (business entity cascade, currently SET NULL)
ALTER TABLE "appointment_bookings" 
DROP CONSTRAINT IF EXISTS "appointment_bookings_projectId_fkey";

ALTER TABLE "appointment_bookings" 
ADD CONSTRAINT "appointment_bookings_projectId_fkey" 
FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AppointmentBooking -> Appointment (business entity cascade, currently SET NULL)
ALTER TABLE "appointment_bookings" 
DROP CONSTRAINT IF EXISTS "appointment_bookings_appointmentId_fkey";

ALTER TABLE "appointment_bookings" 
ADD CONSTRAINT "appointment_bookings_appointmentId_fkey" 
FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- QuotationService -> Services (Cascade - delete join records when service deleted)
-- This removes the service from quotations (join table records), but quotations themselves remain
ALTER TABLE "quotation_services" 
DROP CONSTRAINT IF EXISTS "quotation_services_serviceId_fkey";

ALTER TABLE "quotation_services" 
ADD CONSTRAINT "quotation_services_serviceId_fkey" 
FOREIGN KEY ("serviceId") REFERENCES "Services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Milestone -> Services (SetNull - milestones keep serviceId as null when service deleted)
ALTER TABLE "milestones" 
DROP CONSTRAINT IF EXISTS "milestones_serviceId_fkey";

ALTER TABLE "milestones" 
ADD CONSTRAINT "milestones_serviceId_fkey" 
FOREIGN KEY ("serviceId") REFERENCES "Services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Task -> Milestone (business entity cascade, currently no constraint or SET NULL)
ALTER TABLE "tasks" 
DROP CONSTRAINT IF EXISTS "tasks_milestoneId_fkey";

ALTER TABLE "tasks" 
ADD CONSTRAINT "tasks_milestoneId_fkey" 
FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserRole -> Role (cascade for role deletion)
ALTER TABLE "user_role" 
DROP CONSTRAINT IF EXISTS "user_role_roleId_fkey";

ALTER TABLE "user_role" 
ADD CONSTRAINT "user_role_roleId_fkey" 
FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserRole -> User (cascade for user deletion)
ALTER TABLE "user_role" 
DROP CONSTRAINT IF EXISTS "user_role_userId_fkey";

ALTER TABLE "user_role" 
ADD CONSTRAINT "user_role_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
