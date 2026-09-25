import { notFound } from "next/navigation";
import { CalculatorView } from "@/components/ai/routes/CalculatorView";
import { CALCULATOR_KINDS, isCalculatorKind } from "@/lib/ai/calculators";

export const metadata = { title: "Points calculator · Nasuru AI" };

export function generateStaticParams() {
  return CALCULATOR_KINDS.map((kind) => ({ kind }));
}

export default async function CalculatorPage({ params }: PageProps<"/ai/calculators/[kind]">) {
  const { kind } = await params;
  if (!isCalculatorKind(kind)) notFound();
  return <CalculatorView kind={kind} />;
}
