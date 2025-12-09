import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "*.supabase.co",
				pathname: "/storage/v1/object/public/**",
			},
		],
	},
	// Performance optimizations
	experimental: {
		// Optimize package imports for smaller bundles
		optimizePackageImports: [
			"lucide-react",
			"@radix-ui/react-dialog",
			"@radix-ui/react-select",
			"@radix-ui/react-dropdown-menu",
			"@radix-ui/react-tabs",
			"@radix-ui/react-popover",
			"@radix-ui/react-tooltip",
			"date-fns",
			"recharts",
		],
	},
	// Enable compression
	compress: true,
	// Power production builds
	poweredByHeader: false,
};

export default nextConfig;
