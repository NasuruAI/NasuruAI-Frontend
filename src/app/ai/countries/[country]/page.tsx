import { CountryView } from "@/components/ai/countries/CountryView";

const NAME: Record<string, string> = {
  de: "Germany",
  gb: "the United Kingdom",
  ca: "Canada",
  ie: "Ireland",
  nl: "the Netherlands",
  ch: "Switzerland",
  us: "the United States",
};

export async function generateMetadata(props: PageProps<"/ai/countries/[country]">) {
  const { country } = await props.params;
  const name = NAME[country.toLowerCase()] ?? country.toUpperCase();
  return {
    title: `Moving to ${name} — routes & requirements · Nasuru AI`,
    description: `Every legal route to ${name}, checked against the official rules. See what each takes and find out free which you qualify for.`,
  };
}

export default async function CountryPage(props: PageProps<"/ai/countries/[country]">) {
  const { country } = await props.params;
  return <CountryView code={country} />;
}
