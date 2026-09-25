import { RouteView } from "@/components/ai/routes/RouteView";

export const metadata = { title: "Route · Nasuru AI" };

export default async function RoutePage({ params }: PageProps<"/ai/routes/[routeId]">) {
  const { routeId } = await params;
  return <RouteView code={routeId} />;
}
