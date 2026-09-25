import type { Metadata } from "next";
import { VerifyEmail } from "./VerifyEmail";

export const metadata: Metadata = {
  title: "Confirm your email · Nasuru AI",
  robots: { index: false },
};

export default function Page() {
  return <VerifyEmail />;
}
