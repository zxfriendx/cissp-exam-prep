import { getAllDomains } from "@/lib/content";
import { DomainCard } from "@/components/quiz/domain-card";
import { RandomQuizButton } from "@/components/quiz/random-quiz-button";
import { WeaknessHunterButton } from "@/components/quiz/weakness-hunter-button";

export default function Home() {
  const domains = getAllDomains();

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
            Real-world case studies and adaptive practice questions designed to help you pass with confidence.
          </p>
        </section>

        <div className="grid gap-16">
          {/* Domains Section */}
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-primary">
                Study by Domain
              </h2>
              <p className="text-muted-foreground text-sm">Choose a domain to begin your preparation</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-4">
              {domains.map((domain) => (
                <DomainCard
                  key={domain.id}
                  id={domain.id}
                  title={domain.title}
                  questionCount={domain.questionCount}
                  description={domain.description}
                />
              ))}
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
                <p className="text-muted-foreground text-sm">Quick practice sessions</p>
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
