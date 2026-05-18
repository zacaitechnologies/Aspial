-- Add optional project relation to delivery_orders
ALTER TABLE "delivery_orders" ADD COLUMN "projectId" INTEGER;

CREATE INDEX "delivery_orders_projectId_idx" ON "delivery_orders"("projectId");

ALTER TABLE "delivery_orders"
ADD CONSTRAINT "delivery_orders_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "projects"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
