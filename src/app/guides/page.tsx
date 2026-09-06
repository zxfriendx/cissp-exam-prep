import type { Metadata } from "next";
import Link from "next/link";
import { ICON_SPRITE } from "./icons";
import "./guides.css";

export const metadata: Metadata = {
  title: "The Eight Domains — CISSP Study Materials — Secure Path Digital",
  description:
    "Three books covering the eight domains of the 2024 CISSP outline: a lesson for every objective, 491 practice questions with all four options explained, and one revision sheet per domain. $9.99.",
};

/* ─────────────────────────────────────────────────────────────────────────────
   CHECKOUT WIRING

   Live on Gumroad since 2026-09-06 as ONE product — the three books together,
   not three SKUs. That is why the cards below have no individual buy buttons:
   there is nothing to buy separately, and a "Coming soon" chip beside a live
   bundle reads as broken. If the books are ever split, add entries here and
   give each card its own button back.

   Gumroad is the merchant of record, so it handles EU VAT, delivery and
   refunds. Bluehost static hosting cannot take payment, so a checkout link is
   the whole integration.

   Deliberately a plain link rather than Gumroad's overlay script: gumroad.js
   restyles any element carrying .gumroad-button with its own branding, which
   fights Vault Steel. A branded button that leaves for Gumroad is the better
   trade. Swap it if the on-site modal turns out to matter more than the look.
   ───────────────────────────────────────────────────────────────────────────── */
const CHECKOUT = {
  bundle: {
    url: "https://securepath6.gumroad.com/l/eight-domains",
    price: "$9.99",
  },
} as const;

const BUY = CHECKOUT.bundle;

/* ?wanted=true skips Gumroad's product page and opens the checkout form with
   the item already in the cart — verified 2026-09-06. Without it a buyer who
   already decided here has to read a second sales page and click again. */
const BUY_HREF = `${BUY.url}?wanted=true`;

type Product = {
  id: string;
  icon: string;
  kicker: string;
  title: React.ReactNode;
  blurb: string;
  points: string[];
  pages: string;
};

const PRODUCTS: Product[] = [
  {
    id: "study",
    icon: "ic-book",
    kicker: "Book One",
    title: (
      <>
        The Eight Domains
        <br />— Outline Companion
      </>
    ),
    blurb:
      "Learn which control comes first, who owns the decision, and what separates two answers that both look right — the call the exam actually scores, taught in the order ISC2 lays the outline out.",
    points: [
      "Every objective gets a lesson, so there's no gap to discover on exam day",
      "Every claim names its standard — when two books disagree, you can see who is right",
      "137 pages you'll actually finish, and an index for when you need it again",
    ],
    pages: "137 PP",
  },
  {
    id: "test",
    icon: "ic-clipboard",
    kicker: "Book Two",
    title: (
      <>
        The Eight Domains
        <br />— Practice Examination
      </>
    ),
    blurb:
      "Practice the ambiguity, not the vocabulary. Every question puts you in a situation and asks for a decision — and the key explains why the other three options lose, which is where the learning actually happens.",
    points: [
      "All four options explained on every question, not just the right one",
      "A case study opens each domain, so you decide in context instead of matching terms",
      "No letter pattern to game — A, B, C and D are each right about a quarter of the time",
      "The same questions are free in the practice app — this is them on paper, with the key behind them",
    ],
    pages: "276 PP",
  },
  {
    id: "sheets",
    icon: "ic-sheet",
    kicker: "Book Three",
    title: (
      <>
        The Eight Domains
        <br />— Revision Sheets
      </>
    ),
    blurb:
      "The night before, you want one page per domain — not a book. Short lines you can test yourself against, so you find out what you can't recall while there's still time to fix it.",
    points: [
      "Eight sheets weighted like the exam — read the heaviest domain last",
      "Formulas and ordered models first, where you'll look for them",
      "Doubles as the glossary, so it's the only page you carry in",
    ],
    pages: "10 PP",
  },
];

const FACTS = [
  { n: "292", l: "objectives taught — the whole outline, no gaps to find later" },
  { n: "491", l: "questions with all four options explained" },
  { n: "2024", l: "exam outline — still ISC2's current revision in 2026" },
  { n: "423", l: "pages you'll finish, across all three" },
];

const METHOD = [
  {
    icon: "ic-scale",
    h: "You learn the material, not the pattern",
    p: 'In a lot of banks the correct answer is "A" far more often than chance. You start picking up the tell without meaning to, and then the real exam takes it away. Here every letter is right about a quarter of the time, so the only way through a question is actually knowing the answer.',
  },
  {
    icon: "ic-source",
    h: "Settle it yourself when two sources disagree",
    p: "Two well-reviewed CISSP books can flatly contradict each other, and you are left guessing which one the exam agrees with. Every one of the 292 lessons names the document its key points came from — NIST, ISO/IEC, FIPS, OWASP, the RFCs — so you can go to the source and settle it in a minute instead of carrying the doubt into the exam.",
  },
  {
    icon: "ic-grid",
    h: "No domain quietly skipped",
    p: "Every objective in the 2024 outline gets its own lesson, 292 of them, with each domain sized to the weight it actually carries on the exam. And 2024 is still the live outline: ISC2 refreshed the CCSP and CC exams in 2026 and left the CISSP alone, so this is the current exam, not an old one. Nothing is thin because it was awkward to write, and you won't find out what was missing in the test center.",
  },
  {
    icon: "ic-shield",
    h: "Written by someone who sits the same exams",
    p: "Bill Friend, CISSP, 20+ years in banking and payments security, writing the material he wanted when he was preparing. Independent publications: no certification body has reviewed or endorsed them, and nothing here reproduces exam content.",
  },
];

function Machined() {
  return (
    <div className="machined" aria-hidden="true">
      <span className="bolt b1" />
      <span className="bolt b2" />
      <span className="bolt b3" />
    </div>
  );
}

export default function GuidesPage() {
  return (
    // .guides-page scopes guides.css — its class names (.card, .btn, .free)
    // are generic enough to collide with the quiz UI otherwise.
    <div className="guides-page">
      <svg style={{ display: "none" }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICON_SPRITE }} />

      <section className="hero">
        <div className="wrap">
          <p className="vault-label">Study Materials</p>
          <h1>
            You know the technology.
            <br />
            The exam tests <span className="grad-copper">your judgment</span>.
          </h1>
          <p className="lede">
            CISSP puts four defensible answers in front of you and asks which one a security
            leader would choose. Engineers lose marks picking the technically correct answer
            instead of the management one. These three books teach that call — with a lesson
            for every objective in the 2024 outline, so nothing on exam day is the first time
            you&apos;ve seen it.
          </p>
          <div className="herocta">
            <a className="btn btn-buy" href={BUY_HREF} rel="noopener">
              Get all three — {BUY.price}
            </a>
            <Link className="btn btn-ghost" href="/">
              Try the questions free
            </Link>
          </div>
          <div className="facts">
            {FACTS.map((f) => (
              <div key={f.n + f.l}>
                <p className="n">{f.n}</p>
                <p className="l">{f.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="wrap"><Machined /></div>

      <section className="block">
        <div className="wrap">
          <p className="vault-label">What You Get</p>
          <h2>Three books, one price</h2>
          <p className="sec-intro">
            Get a question wrong and the explanation names the section in the companion that
            fixes it — and the line on the revision sheet that keeps it fixed. One download,
            all three, no upsell waiting inside.
          </p>

          <div className="products">
            {PRODUCTS.map((product) => (
              <article className="card" key={product.id}>
                <svg className="icon" aria-hidden="true" focusable="false">
                  <use href={`#${product.icon}`} />
                </svg>
                <p className="kicker">{product.kicker}</p>
                <h3>{product.title}</h3>
                <p className="blurb">{product.blurb}</p>
                <ul>
                  {product.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <div className="spec">
                  <span className="pages">{product.pages}</span>
                  <span className="included">Included</span>
                </div>
              </article>
            ))}
          </div>

          <div className="buyband">
            <div>
              <h3>All three, {BUY.price}</h3>
              <p>
                423 pages as PDFs you keep — no account, no subscription, no app to crash.
                Yours to print and mark up.
              </p>
            </div>
            <a className="btn btn-buy btn-lg" href={BUY_HREF} rel="noopener">
              Buy on Gumroad — {BUY.price}
            </a>
          </div>
        </div>
      </section>

      <div className="wrap"><Machined /></div>

      <section className="block">
        <div className="wrap">
          <p className="vault-label">Why These</p>
          <h2>Study material that doesn&apos;t quietly cheat you</h2>
          <p className="sec-intro">
            Most question banks have habits that feel fine while you&apos;re studying and cost you on
            exam day. These were built to remove them.
          </p>

          <div className="method">
            {METHOD.map((m) => (
              <div className="m-item" key={m.icon}>
                <svg aria-hidden="true" focusable="false">
                  <use href={`#${m.icon}`} />
                </svg>
                <h4>{m.h}</h4>
                <p>{m.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="free">
            <div>
              <h3>The questions are already free</h3>
              <p>
                All 491 of them, split by domain, with a study mode alongside the quiz — no
                account and no card. What {BUY.price} buys is those questions on paper with the
                key at the back, plus the two books that are not in the app at all: the Outline
                Companion and the Revision Sheets.
              </p>
            </div>
            <Link className="btn btn-ghost" href="/">
              Start a free quiz →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
