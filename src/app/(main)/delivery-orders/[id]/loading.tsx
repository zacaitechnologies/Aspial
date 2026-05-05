export default function DeliveryOrderDetailLoading() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col items-center justify-center py-20 text-primary">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-lg font-medium">Loading delivery order details…</p>
      </div>
    </div>
  )
}
