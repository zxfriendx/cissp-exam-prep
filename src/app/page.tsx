import type { Metadata } from "next";
import Link from "next/link";
import { ICON_SPRITE } from "./_sales/icons";
import { getPreviewSummary } from "@/lib/content";
import { BUY, BUY_HREF, BUY_PLUS, BUY_PLUS_HREF } from "@/lib/checkout";
import "./_sales/guides.css";

export const metadata: Metadata = {
  title: "The Eight Domains — CISSP Study Materials — Secure Path Digital",
  description:
    "Five books covering the eight domains of the 2024 CISSP outline: a lesson for every objective, 750 practice questions with every wrong option answered, two full-length mock forms, and one revision sheet per domain. $9.99.",
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
      "29 diagrams drawn for the page, at a size you can read",
      "Check any claim against the NIST or ISO document behind it",
      "140 pages. Short enough to finish, indexed for the second pass.",
    ],
    pages: "140 PP",
  },
  {
    id: "test",
    icon: "ic-clipboard",
    // Three books, one card. A buyer thinks "the practice examination"; the split
    // into drills and two mock forms is what they find inside it.
    kicker: "Books Two to Four",
    title: (
      <>
        The Eight Domains
        <br />— Practice Examination
      </>
    ),
    blurb:
      "750 questions. Each one drops you into a situation at a named organization and asks for a decision. The key explains why the winner wins, and gives each of the other three a sentence on why it loses.",
    points: [
      "500 drills filed by domain, weighted the way ISC2 weights the exam",
      "Two full-length mock forms of 125, in their own books, to sit under a timer",
      "133 scenarios across 76 organizations, printed above the questions they set up",
      "791 pages you can print and mark up, the answers in a separate book",
    ],
    pages: "791 PP",
  },
  {
    id: "sheets",
    icon: "ic-sheet",
    kicker: "Book Five",
    title: (
      <>
        The Eight Domains
        <br />— Revision Sheets
      </>
    ),
    blurb:
      "The night before the exam, nobody opens a 140-page book. Eight pages. One per domain. Short lines you can cover with your thumb and check yourself against, so the gaps surface while you can still close them.",
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
  { n: "292", l: "objectives, each with its own lesson" },
  { n: "750", l: "questions, every wrong option answered" },
  { n: "2024", l: "exam outline, still ISC2's current revision" },
  { n: "941", l: "pages across the five books" },
];

const METHOD = [
  {
    icon: "ic-scale",
    h: "Every letter is right a quarter of the time",
    p: 'In a lot of banks, "A" wins far more often than chance. You pick up the tell without meaning to. Then the real exam takes it away. In this one, A, B, C and D each win about a quarter of the time. The only way through a question is to know the answer.',
  },
  {
    icon: "ic-source",
    h: "You can check anything that surprises you",
    p: "Every one of the 292 lessons names the standard it came from: NIST, ISO/IEC, FIPS, OWASP, the RFCs. So when something here does not match what you read elsewhere, you can settle it in a minute. No doubt carried into the exam.",
  },
  {
    icon: "ic-grid",
    h: "Your reading time lands where the marks are",
    p: "Each domain is sized to the weight it carries on the exam, so the hours go where the questions are. And 2024 is still the live outline: ISC2 refreshed CCSP and CC in 2026 and left CISSP alone. You are studying the current exam.",
  },
  {
    icon: "ic-shield",
    h: "Written by someone who sits the same exams",
    p: "Bill Friend, CISSP, 20+ years in banking and payments security. He wrote the book he wanted while he was preparing.",
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
            exam wanted the management one. These five books teach that call, objective by
            objective, across the whole 2024 outline.
          </p>
          <div className="herocta">
            <a className="btn btn-buy" href={BUY_HREF} rel="noopener">
              Get the set — {BUY.price}
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
          <h2>Five books, one price</h2>
          <p className="sec-intro">
            The books cross-reference each other. Miss a question, and the answer names the
            lesson that covers it and the revision-sheet line to memorize. One download. All
            five.
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
              <h3>All five, {BUY.price}</h3>
              <p>
                Five PDFs, 941 pages, downloaded once and yours. Print them. Mark them up.
                Take them on a plane. For {BUY_PLUS.price} the same five come with a licence
                key, and the practice app here becomes all 750 questions, offline, on up to
                five devices.
              </p>
            </div>
            <div className="buybtns">
              <a className="btn btn-buy btn-lg" href={BUY_HREF} rel="noopener">
                The five books — {BUY.price}
              </a>
              <a className="btn btn-ghost btn-lg" href={BUY_PLUS_HREF} rel="noopener">
                Books and the app — {BUY_PLUS.price}
              </a>
              <span className="sub">Same books either way</span>
            </div>
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
                option tells you why it loses, in a sentence. If you like how they read,
                {" "}{BUY.price} adds the other 590 on paper, the two mock forms in books of their
                own, plus the Outline Companion and the Revision Sheets.
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
