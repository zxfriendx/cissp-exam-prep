import type { Metadata } from "next";
import Link from "next/link";
import { ICON_SPRITE } from "./_sales/icons";
import { getPreviewSummary } from "@/lib/content";
import "./_sales/guides.css";

export const metadata: Metadata = {
  title: "The Eight Domains — CISSP Study Materials — Secure Path Digital",
  description:
    "Three books covering the eight domains of the 2024 CISSP outline: a lesson for every objective, 439 practice questions with all four options explained, and one revision sheet per domain. $9.99.",
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
      "Which control comes first. Who owns the decision. Why one of two right-looking answers is the one that scores. That judgment is what CISSP measures, and this book runs the outline in ISC2's own order so you can study straight down it.",
    points: [
      "A lesson for every one of the 292 objectives ISC2 lists",
      "Check any claim against the NIST or ISO document behind it",
      "137 pages. Short enough to finish, indexed for the second pass.",
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
      "Every question drops you into a situation and asks for a decision. Then the key walks all four options. Why the winner wins. What each of the other three would have been correct for.",
    points: [
      "A case study opens each domain, so every question sits inside a real organization",
      "Every option gets a paragraph, the winner and all three losers",
      "242 pages you can print, sit under a timer, and mark up",
    ],
    pages: "242 PP",
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
      "The night before the exam, nobody opens a 137-page book. Eight pages. One per domain. Short lines you can cover with your thumb and check yourself against, so the gaps surface while you can still close them.",
    points: [
      "Stacked so you read the heaviest domain last, closest to the exam",
      "Formulas and ordered models at the top of each sheet",
      "Doubles as the glossary, so it is the only paper you carry in",
    ],
    pages: "10 PP",
  },
];

// Counted from src/data/preview.json, the file the practice app actually
// serves, so this paragraph cannot drift from it the way "491 free questions"
// drifted from an app that rendered 439.
const PREVIEW = getPreviewSummary();

/*
 * Every figure below is measured from the built v1 bundle, not from a plan or a
 * changelog. Re-measure with:
 *
 *   python3 products/build/build_pdf.py --edition v1 --out /tmp/v1   # in securepathdigital-site
 *   pdfinfo /tmp/v1/*.pdf | grep Pages
 *
 * Measured 2026-09-07: study guide 137 pp, practice examination 242 pp,
 * revision sheets 10 pp -> 389 total; 439 questions, cross-checked by counting
 * answer-key entries in the examination's text layer.
 *
 * The page carried 491 questions and 423 pages before that. 491 was 439 plus 52
 * v2 items that were never in this book; 423 and 276 were the iter9 build, which
 * these three PDFs no longer match.
 */
const FACTS = [
  { n: "292", l: "objectives, each with its own lesson" },
  { n: "439", l: "questions with all four options explained" },
  { n: "2024", l: "exam outline, still ISC2's current revision" },
  { n: "389", l: "pages across all three books" },
];

const METHOD = [
  {
    icon: "ic-scale",
    h: "Every letter is right a quarter of the time",
    p: 'In a lot of banks, "A" wins far more often than chance. You pick up the tell without meaning to. Then the real exam takes it away. In this one, A, B, C and D each win about a quarter of the time. The only way through a question is to know the answer.',
  },
  {
    icon: "ic-source",
    h: "Settle it yourself when two sources disagree",
    p: "Two well-reviewed CISSP books can flatly contradict each other, and you are left guessing which one the exam agrees with. Every lesson names its source: NIST, ISO/IEC, FIPS, OWASP, the RFCs. Look it up, settle it, move on.",
  },
  {
    icon: "ic-grid",
    h: "Your reading time lands where the marks are",
    p: "Each domain is sized to the weight it carries on the exam, so the hours go where the questions are. And 2024 is still the live outline: ISC2 refreshed CCSP and CC in 2026 and left CISSP alone. You are studying the current exam.",
  },
  {
    icon: "ic-shield",
    h: "Written by someone who sits the same exams",
    p: "Bill Friend, CISSP, 20+ years in banking and payments security. He wrote the book he wanted while he was preparing. Independent publications: no certification body has reviewed or endorsed them, and nothing here reproduces exam content.",
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
            CISSP shows you four defensible answers and asks which one a security leader picks.
            Engineers lose marks right there. They choose the technically correct option; the
            exam wanted the management one. These three books teach that call, objective by
            objective, across the whole 2024 outline.
          </p>
          <div className="herocta">
            <a className="btn btn-buy" href={BUY_HREF} rel="noopener">
              Get all three — {BUY.price}
            </a>
            <Link className="btn btn-ghost" href="/practice/">
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
            The three books cross-reference each other. Miss a question, and the answer names
            the lesson that covers it and the revision-sheet line to memorize. One download.
            All three.
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
                Three PDFs, 389 pages, downloaded once and yours. Print them. Mark them up.
                Take them on a plane.
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
          <h2>Practice that survives contact with the real exam</h2>
          <p className="sec-intro">
            Cheap question banks build habits that feel like progress. The exam is designed to
            defeat them.
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
              <h3>Sit {PREVIEW.perDomain} of them free, in every domain</h3>
              <p>
                {PREVIEW.served} questions, open right now with no sign-up and no card. Every wrong
                option tells you why it loses and what it would have been correct for. If you like
                how they read, {BUY.price} adds the rest of the examination on paper with the key at
                the back, plus the Outline Companion and the Revision Sheets.
              </p>
            </div>
            <Link className="btn btn-ghost" href="/practice/">
              Start a free quiz →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
