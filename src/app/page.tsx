import type { Metadata } from "next";
import Link from "next/link";
import { ICON_SPRITE } from "./_sales/icons";
import { getPreviewSummary } from "@/lib/content";
import { BUY, BUY_HREF, BUY_PLUS, BUY_PLUS_HREF } from "@/lib/checkout";
import "./_sales/guides.css";

export const metadata: Metadata = {
  title: "The Eight Domains — CISSP Study Materials — Secure Path Digital",
  description:
    "750 CISSP practice questions that read like the real exam, with a reason on every wrong answer, plus a lesson for all 292 objectives on the 2024 outline and one revision sheet per domain. Five books, $9.99.",
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
      "750 questions that read like the exam instead of like flashcards. Each one puts you in a company with a decision to make. Miss it and you find out why the answer you liked was the weaker one, which is the part that changes how you read the next question.",
    points: [
      "500 drills by domain, weighted the way the real exam is",
      "Two full 125-question mock exams to sit under a timer",
      "133 scenarios, so you read a new situation cold every time",
      "Answers in a separate book, so you cannot peek",
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
  { n: "2024", l: "outline, the one you will actually sit" },
];

const METHOD = [
  {
    icon: "ic-scale",
    h: "You cannot guess your way through",
    p: 'In most question banks "A" wins far more often than chance, and you pick up the habit without meaning to. The real exam takes it away. Here A, B, C and D each win about a quarter of the time, so the only way through a question is to know the answer.',
  },
  {
    icon: "ic-source",
    h: "Check anything that looks wrong to you",
    p: "Every one of the 292 lessons names the standard it came from: NIST, ISO/IEC, FIPS, OWASP, the RFCs. When something here contradicts what you read elsewhere, you can settle it in a minute instead of carrying the doubt into the exam.",
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
          <p className="vault-label">Study Materials</p>
          <h1>
            You can ace the practice apps
            <br />
            and still <span className="grad-copper">fail the exam</span>.
          </h1>
          <p className="lede">
            The free apps ask whether you remember a term. The exam does something else. It
            gives you four answers that all look defensible and asks which one you would
            actually pick. There are 750 of that second kind here, each one set in a real
            company, and when you miss one you find out why the answer you liked was the
            weaker one.
          </p>
          <div className="herocta">
            <a className="btn btn-buy" href={BUY_HREF} rel="noopener">
              Get all five books — {BUY.price}
            </a>
            <Link className="btn btn-ghost" href="/practice/">
              Try {PREVIEW.served} questions free
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
              <h3>Try {PREVIEW.perDomain} in every domain, free</h3>
              <p>
                {PREVIEW.served} questions, open right now, no sign-up and no card. Read a few
                and see whether they feel like the exam you are about to sit. If they do,
                {" "}{BUY.price} gets you the other 590, both mock forms, the Outline Companion
                and the Revision Sheets.
              </p>
            </div>
            <Link className="btn btn-ghost" href="/practice/">
              Start a free quiz →
            </Link>
          </div>
        </div>
      </section>

      <div className="wrap"><Machined /></div>

      <section className="block">
        <div className="wrap">
          <p className="vault-label">What You Get</p>
          <h2>Five books, one price</h2>
          <p className="sec-intro">
            Miss a question and the answer tells you which lesson to reread and which
            revision-sheet line to memorize. You never have to go looking. One download, all
            five books.
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
                Five PDFs, 941 pages, yours the moment you download them. Print them, write on
                them, take them on a plane. For {BUY_PLUS.price} you get the same five books
                plus a licence key that turns the practice app here into all 750 questions,
                offline, on up to five devices.
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
    </div>
  );
}
