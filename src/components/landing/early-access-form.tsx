"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EarlyAccessForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to a real backend (Phase 1+). For now we fake success
    // so the landing page demos a complete user flow.
    if (!email) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mt-10 flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-6 py-5 text-center backdrop-blur">
        <div className="flex size-9 items-center justify-center rounded-full bg-accent/20 text-accent-soft">
          <Check className="size-4" strokeWidth={2.25} />
        </div>
        <div className="font-display text-xl italic text-cream">
          You&rsquo;re on the list.
        </div>
        <p className="font-mono text-[11px] tracking-wider uppercase text-cream/50">
          We&rsquo;ll be in touch when your invite is ready.
        </p>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@work.com"
          className="h-12 flex-1 rounded-full border border-white/15 bg-white/5 px-5 text-[15px] text-cream placeholder-cream/40 outline-none transition-colors duration-200 focus:border-accent focus:bg-white/10"
        />
        <Button variant="accent" size="lg" type="submit" className="group">
          Request invite
          <ArrowRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      </form>
      <p className="mt-5 font-mono text-[11px] tracking-wider uppercase text-cream/40">
        No spam. One email when your invite is ready.
      </p>
    </>
  );
}
