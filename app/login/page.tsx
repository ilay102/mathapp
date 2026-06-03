"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Method = "magic" | "password";
type PwMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("magic");
  const [pwMode, setPwMode] = useState<PwMode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitMagic(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const sb = createClient();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const sb = createClient();
      if (pwMode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/notebooks");
        router.refresh();
      } else {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        // If email confirmations are ON, session is null and a verification mail is sent.
        if (!data.session) {
          setInfo(`Check ${email} for a verification link to finish creating your account.`);
        } else {
          router.push("/notebooks");
          router.refresh();
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const tabBtn = (active: boolean) =>
    `flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-100"
    }`;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-1 text-2xl font-semibold">
        {method === "password" && pwMode === "signup" ? "Create your MathPad account" : "Sign in to MathPad"}
      </h1>
      <p className="mb-4 text-sm text-neutral-500">
        {method === "magic"
          ? "We'll email you a magic link."
          : pwMode === "signin"
          ? "Use your email and password."
          : "Pick an email and password to register."}
      </p>

      {/* Method tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-neutral-100 p-1">
        <button type="button" onClick={() => { setMethod("magic"); setError(null); setInfo(null); setSent(false); }} className={tabBtn(method === "magic")}>
          Magic link
        </button>
        <button type="button" onClick={() => { setMethod("password"); setError(null); setInfo(null); setSent(false); }} className={tabBtn(method === "password")}>
          Password
        </button>
      </div>

      {method === "magic" ? (
        sent ? (
          <p className="rounded border bg-green-50 p-3 text-sm">
            Check <strong>{email}</strong> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={submitMagic} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border p-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )
      ) : (
        <form onSubmit={submitPassword} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border p-2"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder={pwMode === "signup" ? "Pick a password (min 6 chars)" : "Your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border p-2"
            autoComplete={pwMode === "signin" ? "current-password" : "new-password"}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? (pwMode === "signin" ? "Signing in…" : "Creating…") : pwMode === "signin" ? "Log in" : "Create account"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="rounded border bg-green-50 p-3 text-sm">{info}</p>}
          <p className="pt-1 text-center text-xs text-neutral-500">
            {pwMode === "signin" ? (
              <>
                No account?{" "}
                <button type="button" onClick={() => { setPwMode("signup"); setError(null); setInfo(null); }} className="font-medium text-black underline">
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => { setPwMode("signin"); setError(null); setInfo(null); }} className="font-medium text-black underline">
                  Log in
                </button>
              </>
            )}
          </p>
        </form>
      )}
    </main>
  );
}
