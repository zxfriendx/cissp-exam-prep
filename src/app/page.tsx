import type { Metadata } from "next";
import Link from "next/link";
import { ICON_SPRITE } from "./_sales/icons";
import { getPreviewSummary } from "@/lib/content";
import { BUY, BUY_HREF, BUY_PLUS, BUY_PLUS_HREF } from "@/lib/checkout";
import "./_sales/guides.css";

export const metadata: Metadata = {
  title: "The Eight Domains — CISSP Study Materials — Secure Path Digital",
  description:
    "750 CISSP practice questions that read like the real exam, with a reason on every wrong answer, plus a lesson for all 292 objectives on the 2024 outline and one revision sheet per domain. Five books from $29, or $49 with the practice app unlocked.",
};


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
    id: "test",
    icon: "ic-clipboard",
    kicker: "Step one",
    title: (
      <>
        Diagnose
        <br />and train
      </>
    ),
    blurb:
      "Sit questions until one catches you out. That is the point of them. You find the gap at your kitchen table, with time to close it, instead of in the testing centre with the clock running.",
    points: [
      "Drills weighted the way the exam is, so the hours go where the marks are",
      "Two full-length mock forms to sit under a timer, marked at the end",
      "Every miss labelled with why it lost: right control but wrong problem, wrong scope, wrong phase, symptom not cause",
    ],
    pages: "Books Two to Four \u00b7 791 pages",
  },
  {
    id: "study",
    icon: "ic-book",
    kicker: "Step two",
    title: (
      <>
        Close
        <br />the gap
      </>
    ),
    blurb:
      "A miss names the exact lesson that covers it. You read that one, not the whole book. Every claim in it names the standard it came from, so anything that surprises you takes a minute to check.",
    points: [
      "One lesson per objective, in ISC2\u2019s own order, none skipped",
      "The review sends you straight to the lesson, so you never go hunting",
      "Short enough that you will actually finish it",
    ],
    pages: "Book One \u00b7 140 pages",
  },
  {
    id: "sheets",
    icon: "ic-sheet",
    kicker: "Step three",
    title: (
      <>
        Calibrate the
        <br />night before
      </>
    ),
    blurb:
      "You will not open a book the night before. You want one page per domain. Cover the right-hand column with your thumb, work down it, and you know what you still do not know while there is time to do something about it.",
    points: [
      "One page per domain, the heaviest read last",
      "Formulas and ordered models where you look first",
      "Doubles as the glossary. The only paper worth carrying in.",
    ],
    pages: "Book Five \u00b7 10 pages",
  },
];

// Counted from src/data/preview.json, the file the practice app actually
// serves, so this paragraph cannot drift from it the way "491 free questions"
// drifted from an app that rendered 439.
const PREVIEW = getPreviewSummary();

/*
 * Every figure on this page is measured from the built PDFs, not from a plan or
 * a changelog. Re-measure in securepathdigital-site with:
 *
 *   python3 products/build/build_pdf.py --out /tmp/v2
 *   pdfinfo /tmp/v2/*.pdf | grep Pages
 *   pdftotext -layout /tmp/v2/eight-domains-domain-drills.pdf - \
 *     | grep -cE '^\s*[0-9]+\s+Domain [0-9]'        # review blocks = questions
 *   pdftotext -layout /tmp/v2/eight-domains-study-guide.pdf - \
 *     | grep -oE 'Figure [0-9]+\.[0-9]+' | sort -u | wc -l
 *
 * Measured 2026-09-08 against products/editions/2026-09-08-inline-reasons:
 * study guide 140 pp with 29 placed figures, domain drills 555 pp / 500
 * questions, mock form A 117 pp / 125, mock form B 119 pp / 125, revision
 * sheets 10 pp. 941 pages, 750 questions.
 *
 * Two numbers here have been wrong before and both were caught by measuring.
 * The page said 491 questions when the app served 439, and 35 diagrams when the
 * book prints 29 -- the build's own figure gate counts 35 rows in its data file
 * and six of them are never placed. Count the captions in the PDF, not the rows.
 */
const FACTS = [
  { n: "Every miss", l: "tells you why the answer you liked was the weaker call" },
  { n: "No tells", l: "a balanced key, measured across all 750 questions" },
  { n: "Sourced", l: "every explanation names the NIST or ISO document behind it" },
  { n: "2024", l: "the live outline, the one you will actually sit" },
];

const METHOD = [
  {
    icon: "ic-scale",
    h: "The keyword trap",
    sub: "Cheap question banks build habits that fail on exam day.",
    p: "Most free apps ask whether you remember what an acronym stands for. The real exam assumes you know the term and tests whether you know who owns the risk, which control comes first, or when a compensating control is acceptable. These questions make you read like a risk manager, not a technician.",
  },
  {
    icon: "ic-grid",
    h: "No guessing tells",
    sub: "A balanced answer key across all 750 questions.",
    p: 'In amateur banks "A" wins far more often than chance, and you learn the tell without meaning to. The real exam takes it away. Measured here: A 24.8%, B 26.0%, C 25.6%, D 23.6%. The only way through a question is the rationale.',
  },
  {
    icon: "ic-source",
    h: "Rooted in primary sources",
    sub: "Every explanation cites the governing standard.",
    p: "NIST SP 800-53 Rev 5, ISO/IEC 27001 and 27002:2022, FIPS, OWASP, the RFCs. When an answer here contradicts something you read on a forum, you can check the source in sixty seconds instead of carrying the doubt into the exam.",
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
    //
    // SECTION ORDER IS DELIBERATE. Social links land here cold, so the page runs
    // pain -> why this is different -> try it free -> what you get -> buy. The
    // catalogue used to sit second and pushed the free sample and the reasons to
    // believe below three long product cards.
    <div className="guides-page">
      <svg style={{ display: "none" }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICON_SPRITE }} />

      <section className="hero">
        <div className="wrap">
          <p className="vault-label">Updated for the live 2024 ISC2 outline</p>
          <h1>
            You don&apos;t fail the CISSP because you forgot a definition.
            <br />
            You fail because two answers look{" "}
            <span className="grad-copper">completely defensible</span>.
          </h1>
          <p className="lede">
            Practice apps drill recall. The exam does something harder: it puts you in a room
            with four plausible business decisions and asks which one you own first. There are
            750 questions of that second kind here, each one set in a company with something at
            stake. Miss one and the review does not just show you the key. It tells you why the
            answer you liked was the weaker decision under the standard that governs it.
          </p>
          {/* Free first. It is the cheapest thing a cold visitor can say yes to,
              and the questions are the product -- reading four of them sells the
              books better than a paragraph about the books does. */}
          <div className="herocta">
            <Link className="btn btn-buy" href="/practice/">
              Try {PREVIEW.served} questions free
            </Link>
            <a className="btn btn-ghost" href="#pricing">
              See the packs — from {BUY.price}
            </a>
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
          <p className="vault-label">Why most prep fails</p>
          <h2>Most prep trains you for a different exam</h2>
          <p className="sec-intro">
            You can clear a question bank at 90% and still read a real question four times
            without knowing what it wants. Here is why, and what changes it.
          </p>

          <div className="method">
            {METHOD.map((m) => (
              <div className="m-item" key={m.icon}>
                <svg aria-hidden="true" focusable="false">
                  <use href={`#${m.icon}`} />
                </svg>
                <h4>{m.h}</h4>
                <p className="m-sub">{m.sub}</p>
                <p>{m.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <div className="wrap"><Machined /></div>

      <section className="block">
        <div className="wrap">
          <p className="vault-label">What You Get</p>
          <h2>Find the gap, close it, carry one page in</h2>
          <p className="sec-intro">
            The five books work as one loop. A miss in the drills names the
            lesson that covers it and the revision-sheet line to memorize, so you are never
            hunting for what you got wrong, and the night before you carry in one page per
            domain instead of a book.
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

          {/* Two tiers, the same five PDFs. The only difference is the licence
              key, so the cards say that in one line rather than running a
              feature matrix where fifteen of sixteen rows are identical.
              `plus` is recommended because the app is where the 750 questions
              are actually sittable; the PDFs alone are a reference. */}
          <div className="tiers" id="pricing">
            <div className="tier">
              <p className="tname">PDF Reference Pack</p>
              <p className="price">{BUY.price}</p>
              <p className="price-sub">Five PDFs, yours to keep and print.</p>
              <ul>
                <li>The <strong>domain drills</strong>, weighted the way the exam is</li>
                <li><strong>Two full-length mock exams</strong> to sit under a timer</li>
                <li>The <strong>Outline Companion</strong>, a lesson for every objective</li>
                <li>The <strong>Revision Sheets</strong>, one page per domain</li>
                <li>Printable answer and scoring sheets</li>
              </ul>
              <div className="buy-foot">
                <a className="btn btn-ghost btn-lg" href={BUY_HREF} rel="noopener">
                  Buy the PDF pack — {BUY.price}
                </a>
              </div>
            </div>

            <div className="tier rec">
              <span className="flag">Recommended</span>
              <p className="tname">Complete Study Engine</p>
              <p className="price">{BUY_PLUS.price}</p>
              <p className="price-sub">The same five PDFs, plus the app unlocked.</p>
              <ul>
                <li>Everything in the PDF Reference Pack</li>
                <li><strong>Every question inside the practice app</strong>, not just the free sample</li>
                <li>Both mock forms <strong>under a timer</strong>, marked at the end</li>
                <li>Practice weighted to the <strong>domains you keep missing</strong></li>
                <li>Works <strong>offline</strong>, on up to five devices</li>
              </ul>
              <div className="buy-foot">
                <a className="btn btn-buy btn-lg" href={BUY_PLUS_HREF} rel="noopener">
                  Buy the study engine — {BUY_PLUS.price}
                </a>
              </div>
            </div>
          </div>
          <p className="tiers-note">
            One payment, no subscription. Same five books either way.
          </p>
        </div>
      </section>

      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="free">
            <div>
              <h3>Test {PREVIEW.perDomain} questions in every domain, free</h3>
              <p>
                {PREVIEW.served} live scenario questions across all eight domains. No email, no
                account, no card. Read a few and see whether they feel like the exam you are
                about to sit — the difficulty, the way the options are written, and how much
                the explanation actually tells you.
              </p>
            </div>
            <Link className="btn btn-ghost btn-lg" href="/practice/">
              Start the free {PREVIEW.served} questions →
            </Link>
          </div>
          <p className="author-note">
            Written by Bill Friend, CISSP, 20+ years in banking and payments security. He wrote
            the book he wanted while he was preparing for the same exam.
          </p>
        </div>
      </section>
    </div>
  );
}
