import { Button } from "@/components/ui/button";
import { createQuotation } from "./action";

const services = [
  {
    name: "Branding Package",
    description: "Logo design + brand guidelines",
    basePrice: 1500.0,
  },
  {
    name: "Social Media Management",
    description: "Monthly content creation & posting",
    basePrice: 800.0,
  },
  {
    name: "Video Production",
    description: "2-minute promotional video",
    basePrice: 2500.0,
  },
  {
    name: "SEO Optimization",
    description: "Website SEO audit & implementation",
    basePrice: 1200.0,
  },
];

export default function Sales() {
  return (
    <div>
      <p className="text-2xl font-bold mb-4">Services Available</p>
      {services.map((service) => (
        <div key={service.name} className="mb-4">
          <p className="text-md font-medium">{service.name}</p>
          <p className="text-sm text-gray-500">{service.description}</p>
          <p className="text-sm text-gray-500">
            $
            {service.basePrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      ))}

      <Button
        onClick={createQuotation}
      >
        Create Quotation Plan
      </Button>
    </div>
  );
}
