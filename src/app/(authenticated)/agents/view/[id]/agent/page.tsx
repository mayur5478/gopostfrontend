import ViewAgentClient from "./ViewAgentClient";

// Enable dynamic parameters for client-side navigation
export const dynamicParams = true;

// This is required for static export with dynamic routes
export async function generateStaticParams() {
  // Return empty array - routes will be generated on-demand during client navigation
  return [];
}

export default function ViewAgentPage() {
  return <ViewAgentClient />;
}
