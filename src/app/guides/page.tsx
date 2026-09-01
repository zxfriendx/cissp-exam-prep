import type { Metadata } from "next";
import Link from "next/link";
import { ICON_SPRITE } from "./icons";
import "./guides.css";

export const metadata: Metadata = {
  title: "The Eight Domains — Study Materials — Secure Path Digital",
  description:
    "Study guide, practice examination and revision sheets covering the eight domains of the information security common body of knowledge. Written from primary sources by Secure Path Digital.",
  robots: { index: false, follow: false },
};

/* ─────────────────────────────────────────────────────────────────────────────
   CHECKOUT WIRING — the ONLY edit needed to take these products live.

   No payment vendor has been chosen yet (Gumroad / Lemon Squeezy / Payhip /
   Stripe are all still open). Until a `url` AND a `price` are filled in below,
   a product shows an inert "Coming soon" chip and NOTHING here can take money.

       study: { url: "https://<store>/l/eight-domains-study-guide", price: "$29" }

   The hosted-storefront route is deliberate: they act as merchant of record and
   handle EU VAT, delivery and refunds. Bluehost static hosting cannot take
   payment, so a checkout link is the whole integration.

   This used to be a script that walked the DOM for [data-buy] and rewrote each
   button after paint. As a route it is just data — the buttons render in the
   right state server-side, with no flash of "Coming soon" on a live product.
   ───────────────────────────────────────────────────────────────────────────── */
const CHECKOUT: Record<string, { url: string | null; price: string | null }> = {
  study: { url: null, price: null },
  test: { url: null, price: null },
  sheets: { url: null, price: null },
};

type Product = {
  id: keyof typeof CHECKOUT & string;
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
    title: <>The Eight Domains<br />— Study Guide</>,
    blurb:
      "Every leaf of the 2024 exam outline, in the order the outline lays them out. One focused entry per subtask, each with its key points and the standard they come from.",
    points: [
      "Domain ▸ task ▸ lesson, with each domain's exam weight shown",
      "Every leaf of the outline covered, nothing silently skipped",
      "Key points boxed, with the source standard named",
    ],
    pages: "127 PP",
  },
  {
    id: "test",
    icon: "ic-clipboard",
    kicker: "Book Two",
    title: <>The Eight Domains<br />— Practice Examination</>,
    blurb:
      "Scenario questions across the eight domains, with a scoring key and worked explanations at the back of the book. Every explanation says why the right answer wins and why each of the other three loses.",
    points: [
      "439 questions, grouped by domain",
      "Every wrong answer refuted by name, and the case it would be right for",
      'No "when in doubt pick A": every letter is right about a quarter of the time',
    ],
    pages: "240 PP",
  },
  {
    id: "sheets",
    icon: "ic-sheet",
    kicker: "Book Three",
    title: <>The Eight Domains<br />— Revision Sheets</>,
    blurb:
      "One page per domain. The facts that decide questions, printed, folded, and reread the night before.",
    points: [
      "Eight sheets, one per domain, each headed by its exam weight",
      "Formulas and ordered models first, with every task in the domain represented",
      "A standards-attribution strip at the foot of every sheet",
    ],
    pages: "10 PP",
  },
];

const FACTS = [
  { n: "292", l: "micro-lessons, one per outline leaf" },
  { n: "439", l: "practice questions" },
  { n: "8", l: "domains, weighted as the outline weights them" },
  { n: "377", l: "pages across the three products" },
];

const METHOD = [
  {
    icon: "ic-scale",
    h: "You learn the material, not the pattern",
    p: 'In a lot of banks the correct answer is "A" far more often than chance. You start picking up the tell without meaning to, and then the real exam takes it away. Here every letter is right about a quarter of the time, so the only way through a question is actually knowing the answer.',
  },
  {
    icon: "ic-source",
    h: "Straight from the standards",
    p: "Written against NIST, ISO/IEC, FIPS, OWASP and the RFCs themselves, not a paraphrase of somebody else's paraphrase. When a question turns on what a standard actually says, you'll have read what it actually says, and every key point names the document it came from so you can go check.",
  },
  {
    icon: "ic-grid",
    h: "No domain quietly skipped",
    p: "Every task and subtask in the 2024 outline gets its own lesson, 292 of them, with each domain sized to the weight it actually carries on the exam. Nothing is thin because it was awkward to write, and you won't find out what was missing in the test centre.",
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
            The Eight <span className="grad-copper">Domains</span>
          </h1>
          <p className="lede">
            Three books that take you through all eight domains in the order the 2024 exam
            outline lays them out: learn it, test yourself on it, then cram the night before.
            Written from the standards themselves, so what you study is what the exam is
            actually built on.
          </p>
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
          <p className="vault-label">The Products</p>
          <h2>Three books, one spine</h2>
          <p className="sec-intro">
            Each is built from the same 2024 outline, so a weak area in the practice examination
            points at a numbered section in the study guide and a line on the revision sheet.
          </p>

          <div className="products">
            {PRODUCTS.map((product) => {
              const buy = CHECKOUT[product.id];
              const live = Boolean(buy?.url && buy?.price);
              return (
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
                    {live ? (
                      <a className="btn btn-buy" href={buy.url!} rel="noopener">
                        Buy · {buy.price}
                      </a>
                    ) : (
                      <a className="btn btn-soon" href="#" aria-disabled="true">
                        Coming soon
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
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
              <h3>Start free</h3>
              <p>
                The practice application is free and needs no account. It carries the same 439
                questions, split by domain, with a study mode alongside the quiz.
              </p>
            </div>
            <Link className="btn btn-ghost" href="/">
              Open the practice app →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
