import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { getAllDomains } from "@/lib/content";
import { DomainCard } from "@/components/quiz/domain-card";
import { RandomQuizButton } from "@/components/quiz/random-quiz-button";
import { WeaknessHunterButton } from "@/components/quiz/weakness-hunter-button"; // Added

export default function Home() {
  const domains = getAllDomains();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">CISSP Prep</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <a href="https://github.com/zxfriendx/cissp-exam-prep" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-12">
        {/* Hero Section - Refined */}
        <section className="text-center space-y-4 pt-4 md:pt-10">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
            Master the CISSP Exam
          </h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-lg leading-relaxed">
            Real-world case studies and adaptive practice questions designed to help you pass with confidence.
          </p>
        </section>

        <div className="grid gap-10">
          {/* Domains Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">Study by Domain</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Adaptive Learning</h2>
              <div className="grid grid-cols-1 gap-4">
                <WeaknessHunterButton />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Random Practice</h2>
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
