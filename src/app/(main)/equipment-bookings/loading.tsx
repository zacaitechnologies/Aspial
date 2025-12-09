export default function EquipmentBookingsLoading() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col items-center justify-center py-20 text-primary">
        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-lg font-medium">Loading equipment…</p>
      </div>
    </div>
  );
}

