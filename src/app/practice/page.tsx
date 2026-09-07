import type { Metadata } from "next";
import { getAllDomains, getBankManifest, getPreviewSummary, getTotalQuestionCount, SET_SIZE } from "@/lib/content";
import { DomainCard } from "@/components/quiz/domain-card";
import { RandomQuizButton } from "@/components/quiz/random-quiz-button";
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
    `${summary.served} free CISSP practice questions across the eight domains, ${summary.perDomain} per domain, ` +
    `set in ${summary.scenarios} scenarios. Every wrong option says why it loses and what it would have been ` +
    `the right answer to. No account needed.`,
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
            {total} scenario questions across the eight domains, {summary.perDomain} in each,
            set in {summary.scenarios} different organizations. Answer one and every wrong option
            tells you the reason it loses and the question it would have been right for.
          </p>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground/80 leading-relaxed px-4">
            This is the sample. The printed <em>Practice Examination</em> carries {summary.paid} questions,
            including two full-length mock forms.
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
                Choose a domain to begin. Each question opens with the scenario it is set in — a domain
                is fifteen-odd organizations, not one — and no two questions in a sitting repeat a
                scenario until every one of them has been seen. Take all {summary.perDomain}, or one
                set of {SET_SIZE} at a time.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-4">
              {domains.map((domain) => (
                <DomainCard
                  key={domain.id}
                  id={domain.id}
                  title={domain.title}
                  questionCount={domain.questionCount}
                  scenarioCount={domain.scenarioCount}
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
                Sit it like the real thing: answers are recorded as you go and marked at the end,
                with the key, the worked explanations and every scenario you met. Allow roughly
                1 minute 15 seconds per question. The correct letter lands exactly {summary.keyCounts.A}
                times each on A, B, C and D, so position tells you nothing. Answer from the stem.
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
                  Adaptive Learning
                </h2>
                <p className="text-muted-foreground text-sm">Focus on your weakest areas</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <WeaknessHunterButton />
              </div>
            </section>

            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-primary">
                  Random Practice
                </h2>
                <p className="text-muted-foreground text-sm">Quick sessions, marked as you go</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <RandomQuizButton count={10} />
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
