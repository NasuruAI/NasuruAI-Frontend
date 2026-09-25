"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { emailSignIn, emailSignUp, type SignedIn } from "@/lib/ai/auth";
import { Button } from "../Button";
import { Checkbox } from "../choice";
import { InlineAlert } from "../feedback";
import { TextField } from "../fields";
import { OTPInput } from "../OTPInput";
import { TextLink } from "../TextLink";

const OFFLINE = "We couldn't reach Nasuru AI. Check your connection and try again.";

function first(errors: Record<string, string[]>, key: string): string | undefined {
  return errors[key]?.[0];
}

/**
 * Email and password. The API gives one answer for a wrong password and an
 * unknown address; so does this form. Accounts with two-factor on get a
 * second step for the authenticator code.
 */
export function EmailSignIn({ onSignedIn }: { onSignedIn: (result: SignedIn) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(code = otp) {
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await emailSignIn({ email, password, ...(needsOtp && { otp: code }) }));
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError(OFFLINE);
      } else if (err.code === "mfa_required") {
        setNeedsOtp(true);
      } else {
        if (err.code === "mfa_invalid") setOtp("");
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-5"
    >
      {error && <InlineAlert tone="danger" title={error} />}
      {needsOtp ? (
        <>
          <p className="text-body text-muted">
            Enter the 6-digit code from your authenticator app, or a recovery code.
          </p>
          <OTPInput
            label="Authenticator code"
            value={otp}
            onChange={setOtp}
            onComplete={(value) => void submit(value)}
            disabled={busy}
          />
        </>
      ) : (
        <>
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="-mt-2 text-body-s">
            <TextLink href="/ai/forgot-password">Forgotten your password?</TextLink>
          </p>
        </>
      )}
      <Button type="submit" className="w-full" loading={busy}>
        Sign in
      </Button>
    </form>
  );
}

export function EmailSignUp({ onSignedIn }: { onSignedIn: (result: SignedIn) => void }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [terms, setTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const problems: Record<string, string[]> = {};
    if (!form.first_name.trim()) problems.first_name = ["Enter your first name."];
    if (!form.email.trim()) problems.email = ["Enter your email address."];
    if (form.password.length < 10) problems.password = ["Use at least 10 characters."];
    if (!terms) problems.accept_terms = ["Tick the box to agree before we create your account."];
    setFieldErrors(problems);
    setError(null);
    if (Object.keys(problems).length) return;
    setBusy(true);
    try {
      onSignedIn(await emailSignUp({ ...form, accept_terms: true }));
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError(OFFLINE);
      } else {
        setFieldErrors(err.fieldErrors);
        if (!Object.keys(err.fieldErrors).length) setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      {error && <InlineAlert tone="danger" title={error} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="First name"
          autoComplete="given-name"
          value={form.first_name}
          onChange={set("first_name")}
          error={first(fieldErrors, "first_name")}
        />
        <TextField
          label="Last name"
          optional
          autoComplete="family-name"
          value={form.last_name}
          onChange={set("last_name")}
          error={first(fieldErrors, "last_name")}
        />
      </div>
      <TextField
        label="Email address"
        type="email"
        autoComplete="email"
        value={form.email}
        onChange={set("email")}
        error={first(fieldErrors, "email")}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        helper="At least 10 characters. Not a common password."
        value={form.password}
        onChange={set("password")}
        error={first(fieldErrors, "password")}
      />
      <div>
        <Checkbox
          checked={terms}
          onChange={setTerms}
          label={
            <>
              I agree to the <TextLink href="/terms">terms</TextLink> and the{" "}
              <TextLink href="/privacy">privacy policy</TextLink>
            </>
          }
        />
        {first(fieldErrors, "accept_terms") && (
          <p role="alert" className="mt-1 text-body-s text-danger">
            {first(fieldErrors, "accept_terms")}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" loading={busy}>
        Create account
      </Button>
    </form>
  );
}
