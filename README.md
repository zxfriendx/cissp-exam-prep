# CISSP Practice Exam App

A modern, interactive web application designed to help users prepare for the CISSP (Certified Information Systems Security Professional) exam. Built with **Next.js**, **Tailwind CSS**, and **Shadcn UI**.

It is the on-screen edition of the printed **The Eight Domains — Practice Examination** (Secure Path Digital): the same 439 scenario questions, the same answer key, the same worked explanations, and the same rule that the case study's analysis is held back until after you have answered.

## 🚀 Features

-   **Domain-Based Practice**: Practice questions organized by the 8 CISSP domains, each card showing the domain's share of the real examination (2024 outline weights). Take the whole domain in book order, or one set of 25 at a time.
-   **Practice Examination**:
    -   50 or 100 questions drawn to the exam blueprint weights with domains mixed, or the full book in order.
    -   Answers are recorded as you go and marked at the end, like marking a separate sheet.
    -   Pace guidance at 1 minute 15 seconds per question.
-   **Adaptive Learning (Weakness Hunter)**:
    -   Automatically tracks your performance across domains.
    -   Generates custom quizzes targeting your weakest areas.
-   **Random Practice Mode**:
    -   Take mixed quizzes (10, 20, or 40 questions) covering all domains, marked as you go.
-   **Case Study Context**:
    -   Every domain opens with the scenario its questions are set in; it is one tap away during a quiz.
    -   The scenario's analysis ("Key Lessons") gives answers away, so it waits until the results page, and sits folded on the study page.
-   **Answers Explained**:
    -   Immediate feedback in practice modes, with the key and a worked explanation that says why each distractor loses.
    -   After every set: a full review of each question, your answer, the key, the explanation, score by domain, time taken against exam pace, and the case study debriefs.
-   **Fixed Option Order**: Options are shown A-D exactly as the book prints them. The answer key is balanced across the four letters (109/111/109/110), and the explanations argue by letter, so there is no runtime shuffle.
-   **Modern UI/UX**:
    -   Clean, professional interface using Shadcn UI components.
    -   Smooth animations with Framer Motion.
-   **State Management**: Real-time quiz state tracking using Zustand, persisted so a set survives a reload.

## 🛠️ Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router, static export)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **Markdown Rendering**: [React Markdown](https://github.com/remarkjs/react-markdown) (case studies only; question text uses a small `*emphasis*` renderer)

## 🏃‍♂️ Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/zxfriendx/cissp-exam-prep.git
    cd cissp-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Open the app**:
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

-   `src/app`: Next.js App Router pages and layouts.
-   `src/components/quiz`: Core quiz components (QuestionCard, DomainCard, ExamButton, ResultsView, Emphasis, etc.).
-   `src/components/ui`: Reusable UI components (Dialog, Card, Button, etc.).
-   `src/data`: JSON data containing the CISSP questions and case studies.
-   `src/lib`: Content helpers (`content.ts`), the exam blueprint (`blueprint.ts`), and text helpers shared in spirit with the PDF builder (`text.ts`).
-   `src/store`: Zustand stores (`quiz-store.ts`, `user-stats-store.ts`).
-   `scripts`: `import-questions.mjs`, the only supported way to change the question bank (see below), with its `node:test` cases.
-   `docs`: Audits and notes (`pdf-parity-audit-2026-09-02.md`, `questions-rebuild-scope-2026-09-03.md`).

## 🚀 Deployment

This project is configured for static export (`output: 'export'`) to be hosted on any static hosting service (e.g., Apache/Nginx, GitHub Pages, Vercel, Netlify).

To deploy:
1.  Create a `.env.local` file with the following credentials (ask the administrator for values):
    ```env
    DEPLOY_HOST=your-ftp-host.com
    DEPLOY_USER=your-ftp-username
    DEPLOY_PASS=your-ftp-password
    DEPLOY_REMOTE_DIR=/public_html/your-site-dir
    ```
2.  Run the deployment script:
    ```bash
    npm run deploy
    ```
    This will build the project and upload the `out` directory to the configured FTP server.

## 🧪 Verification

To verify the installation:
1.  Run `npm run build` to check for build errors.
2.  Run `npm run lint` to check for code style issues.

## 📄 content.json Structure

`src/data/content.json` carries the question bank and the eight case studies. The 439 questions are the ones the printed practice examination is rendered from: `content.rekeyed.json` in the content pipeline's product audit directory (paths in `docs/questions-rebuild-scope-2026-09-03.md`), so **edit questions in the pipeline, then import them; never edit them here**. The `caseStudy` strings belong to this repository (rewritten 2026-09-02, `docs/prose-audit-2026-09-02.md`); the importer never touches them.

### Importing questions

```bash
npm run bank:import -- --source /data/video/pipeline/_product_audit_2026-08-29/content.rekeyed.json --edition 2026-08-31
npm run bank:import -- --source a.json --source b.json --dry-run   # report only
npm run bank:check                                                  # validate the file on disk; exit 1 on drift
npm test                                                            # the importer's own tests
```

`scripts/import-questions.mjs` reads bank-shaped (`{domains:[…]}`) and quiz-shaped (`{quizzes:[…]}`) files by path. An item whose id already exists is a **revision**: wording replaced, id and number kept. An item with no id or an unknown id is **new** unless its normalised stem already exists in that domain (then it is skipped as a duplicate); new items get the next number in the domain. Every item is validated (four A–D options, key in A–D, non-empty explanation, no duplicate options); anything failing is skipped with a reason. It prints added / changed / unchanged / skipped and refuses to write a bank whose most common key letter is over 30% (the same cap `stage-learn.sh` enforces).

The file is **bank schema 2**: a `bank` manifest first (edition, counts, key distribution, sources), then the domains. Each question:

```json
{
  "id": "domain_1_q1",
  "number": "1",
  "domainId": "domain_1",
  "question": "Question text here...",
  "options": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text",
    "D": "Option D text"
  },
  "correctAnswer": "D",
  "explanation": "Why D, and why A, B and C lose...",
  "rev": "3f1c9a0b7d2e"
}
```

`level`, `tasks` (2024 outline task ids) and `references` are optional and are passed through when a source carries them; no source does yet.

Notes:
-   Ids are stable (`domain_X_qY`) and are what saved progress keys on; never renumber. The app reads a question's domain through `domainOfQuestion()`, which falls back to the id form for quizzes saved before schema 2.
-   `rev` is a hash of stem, options, key and explanation; `npm run bank:check` fails when it no longer matches (a hand edit). Re-running the importer restamps.
-   Options are displayed in the stored A-D order; the key is balanced across letters at the source.
-   Exam weights and the outline spelling of domain names live in `src/lib/blueprint.ts`, not in the JSON.

## ⚖️ Legal Disclaimer

CISSP® is a registered trademark of (ISC)². This project is an independent educational tool and is not affiliated with, endorsed by, or sponsored by (ISC)². For more information about the CISSP certification, please visit the official [(ISC)² website](https://www.isc2.org/certifications/cissp).
