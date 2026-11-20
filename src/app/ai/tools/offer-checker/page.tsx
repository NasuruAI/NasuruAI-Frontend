import { OfferCheckerView } from "@/components/ai/tools/OfferCheckerView";

export const metadata = {
  title: "Free job offer & scam checker · Nasuru AI",
  description:
    "Got a job offer on WhatsApp? Paste it and check it free for scams — against the company's sponsor licence, the sender's address and the usual red flags. No sign-up.",
};

export default function OfferCheckerToolPage() {
  return <OfferCheckerView />;
}
