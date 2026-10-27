import type { Metadata } from "next";
import Link from "next/link";
import { ICON_SPRITE } from "./_sales/icons";
import { getPreviewSummary } from "@/lib/content";
import { BUY, BUY_PLUS } from "@/lib/checkout";
import { BuyLink } from "@/components/buy-link";
import "./_sales/guides.css";

/* The title carries the funnel queries (docs/CISSP_SEO_RESEARCH.md in the content
   pipeline, § 6): "CISSP practice questions", "CISSP study guide", "CISSP cheat sheet"
   are what someone mid-study types, and they are the three things this sells. */
export const metadata: Metadata = {
  title: "The Eight Domains — 750 CISSP Practice Questions, Study Guide and Cheat Sheets",
  description:
    "A CISSP practice examination: 750 practice questions that read like the real exam with a reason on every wrong answer, a study guide with a lesson for all 292 objectives on the 2024 outline, and a one-page cheat sheet per domain. Five books for $29, or $49 with the practice app unlocked.",
  alternates: { canonical: "https://learn.securepathdigital.net/" },
};

/* Product schema for the offer. The apex home page carries the same product
   under its own @id; both point at the same two Gumroad offers. */
const PRODUCT_LD = {
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": "https://learn.securepathdigital.net/#eight-domains",
  name: "The Eight Domains — CISSP Study Materials",
  description:
    "Five books and a practice app for the 2024 CISSP outline: a study guide with a lesson for every one of the 292 objectives, 750 practice questions with a reason on every wrong answer, two full-length timed mock exams, and one revision sheet per domain.",
  image: "https://learn.securepathdigital.net/og/eight-domains.png",
  brand: { "@type": "Organization", name: "Secure Path Digital LLC", url: "https://securepathdigital.net/" },
  author: { "@type": "Person", name: "Bill Friend", url: "https://securepathdigital.net/about/" },
  offers: [
    { "@type": "Offer", name: "The five books (PDF)", price: "29.00", priceCurrency: "USD", availability: "https://schema.org/InStock", url: BUY.url },
    { "@type": "Offer", name: "The five books and the practice app", price: "49.00", priceCurrency: "USD", availability: "https://schema.org/InStock", url: BUY_PLUS.url },
  ],
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

// Three cards, one per part of the examination, in the order a reader uses
// them. The kicker is the verb (practice, learn, walk in ready) and the title
// is the NOUN -- what the reader is actually buying. They used to be titled
// "Diagnose and train", "Close the gap", "Calibrate the night before", which
// described a method and never said "500 questions" or "a lesson for every
// objective", so a reader reached the price without knowing what it bought.
const PRODUCTS: Product[] = [
  {
    id: "test",
    icon: "ic-clipboard",
    kicker: "Step one · Practice",
    title: (
      <>
        500 drills,
        <br />two mock exams
      </>
    ),
    blurb:
      "Book Two is 500 questions across the eight domains, weighted the way the exam weights them. Books Three and Four are two full-length mock exams of 125, to sit under a timer with a printable answer sheet. Every question is set in a company with something at stake, and when you miss one, the review says why the answer you liked was the weaker call.",
    points: [
      "Drills weighted the way the exam is, so the hours go where the marks are",
      "Two full-length mock exams of 125, sat under a timer and marked at the end",
      "Every miss labeled with why it lost: right control, wrong problem; wrong scope; wrong phase; symptom, not cause",
    ],
    pages: "Books Two to Four · 791 pages",
  },
  {
    id: "study",
    icon: "ic-book",
    kicker: "Step two · Learn",
    title: (
      <>
        A lesson for
        <br />every objective
      </>
    ),
    blurb:
      "Book One is a lesson for each of the 292 objectives on the 2024 outline, in ISC2’s own order. When a question catches you out, its review names the lesson that covers it. You read that one and go back to the drills. Every claim in it names the standard it came from, so anything that surprises you takes a minute to check.",
    points: [
      "One lesson per objective, none skipped",
      "A miss sends you straight to the lesson, so you never go hunting",
      "140 pages, short enough that you will actually finish it",
    ],
    pages: "Book One · 140 pages",
  },
  {
    id: "sheets",
    icon: "ic-sheet",
    kicker: "Step three · Walk in ready",
    title: (
      <>
        One page
        <br />per domain
      </>
    ),
    blurb:
      "Book Five is for the night before. You will not open a study guide then, and you should not. Cover the right-hand column with your thumb, work down the page, and you know what you still do not know while there is time to do something about it.",
    points: [
      "One page per domain, the heaviest read last",
      "Formulas and ordered models where you look first",
      "Doubles as the glossary. The only paper worth carrying in.",
    ],
    pages: "Book Five · 10 pages",
  },
];

// Counted from src/data/preview.json, the file the practice app actually
// serves, so this paragraph cannot drift from it the way "491 free questions"
// drifted from an app that rendered 439.
const PREVIEW = getPreviewSummary();
const WITHHELD = PREVIEW.paid - PREVIEW.served;

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
 * Measured 2026-09-10 against products/editions/2026-09-10-length-tell:
 * study guide 140 pp with 29 placed figures, domain drills 555 pp / 500
 * questions, mock form A 117 pp / 125, mock form B 117 pp / 125, revision
 * sheets 10 pp. 939 pages, 750 questions. (941 until 2026-09-10: the length-tell
 * pass trimmed 47 options and Mock Form B lost two pages.)
 *
 * Two numbers here have been wrong before and both were caught by measuring.
 * The page said 491 questions when the app served 439, and 35 diagrams when the
 * book prints 29 -- the build's own figure gate counts 35 rows in its data file
 * and six of them are never placed. Count the captions in the PDF, not the rows.
 */

// The strip under the hero is the inventory in four lines: what is in the box,
// each with the reason it is there. It carried outcome phrases alone for a few
// days ("Every miss", "No tells", "Sourced", "2024") and the page never said
// what was for sale until the price cards.
const FACTS = [
  { n: "750 questions", l: "500 domain drills, and two full-length mock exams to sit under a timer" },
  { n: "Every miss", l: "tells you why the answer you liked was the weaker call" },
  { n: "292 lessons", l: "one per objective on the 2024 outline, and each miss names the one to read" },
  { n: "Revision sheets", l: "one page per domain, the only paper you carry in the night before" },
];

const METHOD = [
  {
    icon: "ic-scale",
    h: "Decisions, not definitions",
    sub: "Each question is a business decision with something at stake.",
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
    // SECTION ORDER IS DELIBERATE. Two readers land here: someone sent by a
    // social link, cold, and someone who has been sitting the free questions at
    // /practice/ and clicked through. Both need the same first screen: WHAT this
    // is, what it costs, and where to buy it. Then why these questions are
    // different, then the three parts, then the two prices, then the free
    // sample as the way in for anyone still deciding.
    <div className="guides-page">
      <svg style={{ display: "none" }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICON_SPRITE }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PRODUCT_LD) }} />

      <section className="hero">
        <div className="wrap">
          <p className="vault-label">
            A CISSP practice examination &middot; five books and an app &middot; from {BUY.price}
          </p>
          {/* The headline is shared with the Gumroad page and the hero artwork
              (securepathdigital-site marketing_images.py g_hero, and the og image).
              Change it in all of them or in none. */}
          {/* Since 2026-10-26 it leads with what the reader gets. It used to open on how
              candidates fail ("You don't fail the CISSP because..."); Bill: it "leads
              with describing how to fail". */}
          <h1>
            750 CISSP questions that read like{" "}
            <span className="grad-copper">the real exam</span>.
          </h1>
          {/* The first sentence names the product. The page went without one
              for a while: "there are 750 questions of that second kind here"
              read as a description of the free app to anyone arriving from it. */}
          <p className="lede">
            The Eight Domains is a practice examination for the CISSP. 750 questions written
            the way the exam writes them, each one set in a company with something at stake,
            and a reason on every wrong answer. It comes as five printable books for {BUY.price},
            or the same five plus the free practice app on this site unlocked to all 750 for{" "}
            {BUY_PLUS.price}. You learn to pick the better of two good answers, which is what the
            exam scores, and you practice it at your kitchen table before the day that counts.
          </p>
          {/* The buy button says what it buys. "See the packs" did not. */}
          <div className="herocta">
            <a className="btn btn-buy" href="#pricing">
              Get all 750 questions — from {BUY.price}
            </a>
            <Link className="btn btn-ghost" href="/practice/">
              Try {PREVIEW.served} of them free
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
          <p className="vault-label">Why these questions</p>
          <h2>Written the way the exam asks</h2>
          <p className="sec-intro">
            The exam asks for judgment: who owns the risk, which control comes first. Three
            things make these questions train that.
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
          <p className="vault-label">What you are buying</p>
          <h2>Five books, and the app that serves them</h2>
          <p className="sec-intro">
            A practice examination in three parts. The drills and the mock exams find the gap.
            The study guide closes it. The revision sheets are what you carry in. A miss in one
            names the page in the next, so you are never hunting for what you got wrong.
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
              are actually sittable; the PDFs alone are a reference.

              The tier names are the contents. "PDF Reference Pack" and
              "Complete Study Engine" were names invented for this page, and a
              reader met them without ever having been told what was in them. */}
          <div className="tiers" id="pricing">
            <div className="tier">
              <p className="tname">The five books</p>
              <p className="price">{BUY.price}</p>
              <p className="price-sub">Five PDFs. Print them, write on them, keep them.</p>
              <ul>
                <li><strong>500 domain drills</strong>, weighted the way the exam is</li>
                <li><strong>Two full-length mock exams</strong> of 125, with printable answer and scoring sheets</li>
                <li><strong>The study guide</strong>: a lesson for every objective on the 2024 outline</li>
                <li><strong>The revision sheets</strong>: one page per domain, the cheat sheet you carry in</li>
                <li><strong>A reason on every wrong answer</strong>, across all 750 questions</li>
              </ul>
              <div className="buy-foot">
                <BuyLink className="btn btn-ghost btn-lg" buy="books" placement="offer_tier">
                  Buy the five books — {BUY.price}
                </BuyLink>
              </div>
            </div>

            <div className="tier rec">
              <span className="flag">Recommended</span>
              <p className="tname">The books and the app</p>
              <p className="price">{BUY_PLUS.price}</p>
              <p className="price-sub">The same five PDFs, plus a licence key for the practice app.</p>
              <ul>
                <li>Everything in the five books</li>
                <li><strong>All 750 questions in the app</strong>, in place of the free {PREVIEW.served}</li>
                <li>Both mock exams <strong>under a timer</strong>, marked at the end</li>
                <li>Practice weighted to <strong>the domains you keep missing</strong></li>
                <li>Works <strong>offline</strong>, on up to five devices</li>
              </ul>
              <div className="buy-foot">
                <BuyLink className="btn btn-buy btn-lg" buy="plus" placement="offer_tier">
                  Buy the books and the app — {BUY_PLUS.price}
                </BuyLink>
              </div>
            </div>
          </div>
          <p className="tiers-note">
            One payment, no subscription. Same five books either way. Instant download, 30-day money back.
          </p>
        </div>
      </section>

      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          {/* Written to the reader who is already sitting the free questions,
              which is where most of this page's traffic comes from. It says
              what the sample is a sample OF, and what the rest buys. */}
          <div className="free">
            <div>
              <h3>Start with {PREVIEW.served} free. Then the other {WITHHELD}.</h3>
              <p>
                The free app on this site serves {PREVIEW.perDomain} questions in every domain,
                with no email, no account and no card. They are drawn from the same 750, at the
                same difficulty, with the same reason on every wrong answer, so read a few and
                see whether they feel like the exam you are about to sit. When you can clear
                them, the examination is where you go on: the {WITHHELD} questions you have not
                seen, two full-length mock exams under a timer, the lesson behind every miss,
                and one page a domain for the night before.
              </p>
            </div>
            <div className="buybtns">
              <Link className="btn btn-ghost btn-lg" href="/practice/">
                Start the free {PREVIEW.served} →
              </Link>
              <BuyLink className="btn btn-buy btn-lg" buy="plus" placement="offer_free_block">
                Unlock all 750 in the app — {BUY_PLUS.price}
              </BuyLink>
            </div>
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
