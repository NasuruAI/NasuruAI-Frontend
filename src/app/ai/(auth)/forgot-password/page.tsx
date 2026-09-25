import type { Metadata } from "next";
import { ForgotPassword } from "./ForgotPassword";

export const metadata: Metadata = {
  title: "Reset your password · Nasuru AI",
  robots: { index: false },
};

export default function Page() {
  return <ForgotPassword />;
}
