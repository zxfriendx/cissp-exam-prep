import type { Metadata } from "next";
import { getAllDomains, getBankManifest, getPreviewSummary, getTotalQuestionCount, SET_SIZE } from "@/lib/content";
import { DomainCard } from "@/components/quiz/domain-card";
import { RandomQuizButton } from "@/components/quiz/random-quiz-button";
import { QuickStartButton } from "@/components/quiz/quick-start-button";
import { WeaknessHunterButton } from "@/components/quiz/weakness-hunter-button";
import { ExamButton } from "@/components/quiz/exam-button";

// Counted, not asserted. Every number on this page comes out of the picker in
// src/lib/preview.ts, so it cannot drift from what the app actually serves --
// which is how the site came to claim 491 free questions while the app rendered
// 439 of them.
const summary = getPreviewSummary();

export const metadata: Metadata = {
  title: "Free CISSP Practice Test — Secure Path Digital",
  description:
    `${summary.served} free CISSP practice questions across the eight domains, ${summary.perDomain} per domain. ` +
    `Every question puts you in a situation and asks what you would do, and every wrong option says why it ` +
    `loses and what it would have been the right answer to. No account needed.`,
};

export default function PracticeHome() {
  const domains = getAllDomains();
  const total = getTotalQuestionCount();
  const bank = getBankManifest();

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-7xl mx-auto px-6 sm:px-10 py-16 space-y-20">
        {/* Hero Section - Centered & Minimalist */}
        <section className="text-center space-y-6 pt-8 md:pt-16 pb-4">
          <p className="vault-label">Free Practice</p>
          {/* Krona One is a display face — uppercase, and only here and in the
              wordmark. Everything else is Schibsted Grotesk. */}
          <h1
            className="font-display uppercase text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-primary max-w-4xl mx-auto"
            style={{ lineHeight: '1.2' }}
          >
            Master the <span className="grad-copper">CISSP</span>
            <sup className="text-[0.5em] align-super">&reg;</sup> Exam
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground text-base md:text-lg leading-relaxed px-4">
            {total} free questions across the eight domains, {summary.perDomain} in each. Every one puts
            you inside a situation and asks what you would do. Get it wrong and you find out why that
            option loses, and which question it would have been the right answer to.
          </p>
          <QuickStartButton count={10} />
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground/80 leading-relaxed px-4">
            The printed <em>Practice Examination</em> carries {summary.paid} questions and two
            full-length mock forms.
          </p>
          {bank && (
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
              Question bank edition {bank.v2?.edition ?? bank.edition}
            </p>
          )}
        </section>

        <div className="grid gap-16">
          {/* Domains Section */}
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-primary">
                Study by Domain
              </h2>
              <p className="text-muted-foreground text-sm">
                Pick a domain and start. Each question drops you into a different organization, so you
                are always reading a new situation cold instead of grinding the same one. Take
                all {summary.perDomain} at once, or {SET_SIZE} at a time.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-4">
              {domains.map((domain) => (
                <DomainCard
                  key={domain.id}
                  id={domain.id}
                  title={domain.title}
                  questionCount={domain.questionCount}
                  description={domain.description}
                  weight={domain.weight}
                />
              ))}
            </div>
          </section>

          {/* Practice Examination */}
          <section className="space-y-6 pt-8 border-t border-primary/10">
            <div className="space-y-2 max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight text-primary">
                Practice Examination
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sit it like the real thing. Nothing is marked until you finish, and then you get the
                score, the worked answers and every scenario you saw. Budget about 1 minute 15 seconds
                a question. You cannot guess your way through on position either: A, B, C and D each
                win exactly {summary.keyCounts.A} times.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ExamButton count={50} total={total} />
              <ExamButton count={100} total={total} />
              <ExamButton total={total} />
            </div>
          </section>

          {/* Special Modes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-primary/10">
            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-primary">
                  Your weak spots
                </h2>
                <p className="text-muted-foreground text-sm">Practice the domains you keep losing marks in</p>
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
        </div>
      </main>
    </div>
  );
}
