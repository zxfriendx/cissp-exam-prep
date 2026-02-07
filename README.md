# CISSP Practice Exam App

A modern, interactive web application designed to help users prepare for the CISSP (Certified Information Systems Security Professional) exam. Built with **Next.js 14**, **Tailwind CSS**, and **Shadcn UI**.

## 🚀 Features

-   **Domain-Based Practice**: Practice questions organized by the 8 CISSP domains.
-   **Adaptive Learning (Weakness Hunter)**:
    -   Automatically tracks your performance across domains.
    -   Generates custom quizzes targeting your weakest areas.
-   **Random Practice Mode**:
    -   Take mixed quizzes (10, 20, or 40 questions) covering all domains.
-   **Case Study Context**:
    -   Integrated "Review Case Study" modal for questions requiring deeper context.
    -   Seamlessly accessible without leaving the question view.
-   **Interactive Quiz Mode**:
    -   Immediate feedback on answers.
    -   Detailed explanations for every question.
    -   **Randomized Options**: Answer choices are shuffled each time to ensure true knowledge retention.
-   **Modern UI/UX**:
    -   Clean, professional interface using Shadcn UI components.
    -   **Dark/Light Mode**: Fully supported theme switching.
    -   Smooth animations with Framer Motion.
-   **State Management**: Real-time quiz state tracking using Zustand.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **Markdown Rendering**: [React Markdown](https://github.com/remarkjs/react-markdown)

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
-   `src/components/quiz`: Core quiz components (QuestionCard, DomainCard, ResultView, etc.).
-   `src/components/ui`: Reusable UI components (Dialog, Card, Button, etc.).
-   `src/data`: JSON data containing the CISSP questions and case studies.
-   `src/store`: Zustand stores (`quiz-store.ts`, `user-stats-store.ts`).
-   `src/lib`: Utility functions and content helpers.

## 🧪 Verification

To verify the installation:
1.  Run `npm run build` to check for build errors.
2.  Run `npm run lint` to check for code style issues.

## 📄 content.json Structure

The app uses a structured JSON file for content. Each domain contains a set of questions with the following format:

```json
{
  "id": "domain_1_q1",
  "question": "Question text here...",
  "options": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text",
    "D": "Option D text"
  },
  "correctAnswer": "A",
  "explanation": "Deep dive explanation..."
}
```

*Note: The `options` are shuffled at runtime for the user, but stored keyed A-D in the source.*
