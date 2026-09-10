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
    // Three books, one card. A buyer thinks "the practice examination"; the split
    // into drills and two mock forms is what they find inside it.
    kicker: "Step One — Books Two to Four",
    title: (
      <>
        The Eight Domains
        <br />— Practice Examination
      </>
    ),
    blurb:
      "750 questions that read like the exam instead of like flashcards. Each one puts you in a company with a decision to make. Miss it and you find out why the answer you liked was the weaker one, which is the part that changes how you read the next question.",
    points: [
      "500 drills by domain, weighted the way the real exam is",
      "Two full 125-question mock exams to sit under a timer",
      "133 scenarios, so you read a new situation cold every time",
      "Answers and review sit behind each domain, not beside the question",
    ],
    pages: "791 PP",
  },
  {
    id: "study",
    icon: "ic-book",
    kicker: "Step Two — Book One",
    title: (
      <>
        The Eight Domains
        <br />— Outline Companion
      </>
    ),
    blurb:
      "Everything the exam can ask you, in the order ISC2 lists it. Start at page one and work down. When a practice question catches you out, the answer sends you to the exact lesson that covers it, so you are never hunting for the thing you got wrong.",
    points: [
      "One lesson per objective. All 292 of them, none skipped.",
      "29 diagrams you can actually read, drawn for the page",
      "Every lesson names its source, so you can check anything",
      "140 pages. Short enough that you will finish it.",
    ],
    pages: "140 PP",
  },
  {
    id: "sheets",
    icon: "ic-sheet",
    kicker: "Step Three — Book Five",
    title: (
      <>
        The Eight Domains
        <br />— Revision Sheets
      </>
    ),
    blurb:
      "The night before the exam you will not open a 140-page book. You will want one page per domain. Cover the right-hand column with your thumb, work down it, and you will know what you still do not know while there is time to do something about it.",
    points: [
      "Ordered so the heaviest domain is the last thing you read",
      "Formulas and ordered models up top, where you look first",
      "Doubles as the glossary. The only paper worth taking with you.",
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
  { n: "750", l: "questions, every wrong answer explained" },
  { n: "292", l: "objectives on the outline, none skipped" },
  { n: "941", l: "pages you can print and write on" },
  { n: "2", l: "full 125-question mock forms, timed" },
];

const METHOD = [
  {
    icon: "ic-scale",
    h: "No position tell to lean on",
    p: 'In most question banks "A" wins far more often than chance, and you pick up the habit without meaning to. The real exam takes it away. Measured across all 750 here: A 24.8%, B 26.0%, C 25.6%, D 23.6%. Close enough to even that position tells you nothing.',
  },
  {
    icon: "ic-source",
    h: "Every answer names the standard it rests on",
    p: "NIST SP 800-53 Rev 5, ISO/IEC 27001 and 27002:2022, FIPS, OWASP, the RFCs. When an explanation here contradicts something you read on a forum, you can check the governing document in a minute instead of carrying the doubt into the exam.",
  },
  {
    icon: "ic-grid",
    h: "Your study time goes where the marks are",
    p: "Each domain is sized to the weight it carries on the exam, so you are not spending two weeks on 10% of the paper. And 2024 is still the live outline: ISC2 refreshed CCSP and CC in 2026 and left CISSP alone.",
  },
  {
    icon: "ic-shield",
    h: "Written by someone who sits these exams",
    p: "Bill Friend, CISSP, 20+ years in banking and payments security. He wrote the book he wanted while he was preparing for it.",
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


      <div className="wrap"><Machined /></div>

      <section className="block">
        <div className="wrap">
          <p className="vault-label">What You Get</p>
          <h2>Three steps, five books</h2>
          <p className="sec-intro">
            Sit questions until one catches you out. Read the lesson it sends you to. The night
            before, work down the one page that matters. Miss a question and the answer names
            the lesson and the revision-sheet line, so you are never hunting for what you got
            wrong.
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
              <p className="price-sub">Five PDFs, 941 pages. Yours to keep.</p>
              <ul>
                <li><strong>500 domain drills</strong>, weighted the way the exam is</li>
                <li><strong>Mock Form A and Form B</strong>, 125 questions each</li>
                <li>The <strong>140-page Outline Companion</strong>, all 292 objectives</li>
                <li>The <strong>10-page Revision Sheets</strong>, one per domain</li>
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
                <li>All <strong>750 questions inside the practice app</strong>, not just the free {PREVIEW.served}</li>
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
        </div>
      </section>
    </div>
  );
}
