import type { Metadata } from "next";
import { getPreviewSummary, getSampleCounts } from "@/lib/content";
import { PracticeHero } from "@/components/practice/practice-hero";
import { DomainGrid } from "@/components/practice/domain-grid";
import { ExamModes } from "@/components/practice/exam-modes";
import { Upsell } from "@/components/practice/upsell";
import { SignupPanel } from "@/components/practice/signup-panel";
import { RandomQuizButton } from "@/components/quiz/random-quiz-button";
import { WeaknessHunterButton } from "@/components/quiz/weakness-hunter-button";

// Counted, not asserted. Every number on this page comes out of the picker in
// src/lib/preview.ts, so it cannot drift from what the app actually serves --
// which is how the site came to claim 491 free questions while the app rendered
// 439 of them.
const summary = getPreviewSummary();
const counts = getSampleCounts();

// This page stays a SERVER component so `metadata` is real metadata -- it is
// what a crawler and a shared link see, and it describes the FREE offer, which
// is what an unauthenticated visitor gets. The sections that change when a
// licence unlocks the paid bank are client components underneath it, and each
// of them renders the free markup until BankLoader has swapped the bank in.
export const metadata: Metadata = {
  // "No Sign-up" came out on 2026-10-27, when 120 of the 160 moved behind a
  // free email signup. The 40 open ones still need nothing at all.
  title: `Free CISSP Practice Test: ${counts.open} Questions Now, ${summary.served} With Email — Secure Path Digital`,
  alternates: { canonical: "https://learn.securepathdigital.net/practice/" },
  description:
    `${summary.served} free CISSP practice questions, ${summary.perDomain} in each domain. Try ${counts.open} now ` +
    `with no sign-up, and get the rest free with your email. Every one puts you in a company with a decision to ` +
    `make, the way the real exam does, and every wrong answer tells you why it was the weaker call. No card.`,
};

export default function PracticeHome() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-7xl mx-auto px-6 sm:px-10 py-16 space-y-20">
        <PracticeHero />

        <div className="grid gap-16">
          <DomainGrid />
          {/* Free tier, before the email signup: renders nothing once joined or paid. */}
          <SignupPanel placement="practice_page" />
          <ExamModes />

          {/* Special Modes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-primary/10">
            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-primary">
                  Due today
                </h2>
                <p className="text-muted-foreground text-sm">
                  Questions you are about to forget, scheduled from how you answered them before
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <WeaknessHunterButton />
              </div>
            </section>

            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-primary">
                  Longer mixed sets
                </h2>
                <p className="text-muted-foreground text-sm">When you want more than the quick ten</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RandomQuizButton count={20} />
                <RandomQuizButton count={40} />
              </div>
            </section>
          </div>

          {/* Free tier only: renders nothing once the paid bank is in. */}
          <Upsell />
        </div>
      </main>
    </div>
  );
}
