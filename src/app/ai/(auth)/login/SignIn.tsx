"use client";

import { useState } from "react";
import { SegmentedControl, TextLink } from "@/components/ai";
import { AuthFrame } from "@/components/ai/auth/AuthFrame";
import { EmailSignIn } from "@/components/ai/auth/EmailForms";
import { PhoneFlow } from "@/components/ai/auth/PhoneFlow";
import { useRedirectIfSignedIn, useSignedIn } from "@/components/ai/auth/useSignedIn";

export function SignIn() {
  useRedirectIfSignedIn();
  const onSignedIn = useSignedIn();
  const [method, setMethod] = useState<"phone" | "email">("phone");

  return (
    <AuthFrame
      title="Sign in"
      lead="Pick up your plan where you left it."
      footer={
        <p>
          New to Nasuru AI? <TextLink href="/ai/signup">Create an account</TextLink>
        </p>
      }
    >
      <SegmentedControl
        label="Sign in with"
        value={method}
        onChange={setMethod}
        options={[
          { value: "phone", label: "Phone" },
          { value: "email", label: "Email" },
        ]}
        className="mb-6 w-full"
      />
      {method === "phone" ? (
        <PhoneFlow onSignedIn={onSignedIn} />
      ) : (
        <EmailSignIn onSignedIn={onSignedIn} />
      )}
    </AuthFrame>
  );
}
