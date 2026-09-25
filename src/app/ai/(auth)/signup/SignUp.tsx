"use client";

import { useState } from "react";
import { TextLink } from "@/components/ai";
import { AuthFrame } from "@/components/ai/auth/AuthFrame";
import { EmailSignUp } from "@/components/ai/auth/EmailForms";
import { PhoneFlow } from "@/components/ai/auth/PhoneFlow";
import { useRedirectIfSignedIn, useSignedIn } from "@/components/ai/auth/useSignedIn";

export function SignUp() {
  useRedirectIfSignedIn();
  const onSignedIn = useSignedIn();
  const [email, setEmail] = useState(false);

  return (
    <AuthFrame
      title="Create your account"
      lead={
        email
          ? "We'll send a link to confirm your email address."
          : "All you need is your phone number. No email, no password."
      }
      footer={
        <>
          <p>
            <button
              type="button"
              onClick={() => setEmail(!email)}
              className="font-semibold text-accent underline underline-offset-3"
            >
              {email ? "Use your phone number instead" : "Sign up with email instead"}
            </button>
          </p>
          <p>
            Already have an account? <TextLink href="/ai/login">Sign in</TextLink>
          </p>
        </>
      }
    >
      {email ? <EmailSignUp onSignedIn={onSignedIn} /> : <PhoneFlow onSignedIn={onSignedIn} />}
    </AuthFrame>
  );
}
