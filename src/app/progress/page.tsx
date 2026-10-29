import type { Metadata } from "next";
import ProgressClient from "./progress-client";

export const metadata: Metadata = {
    title: "Your progress — CISSP practice — Secure Path Digital",
    description:
        "Where you stand across the eight domains: readiness with the arithmetic shown, the objectives " +
        "you keep losing marks on, and what is due for review. Everything is computed in your browser " +
        "from your own answers and never leaves it.",
    // Nothing here is public and nothing here is the same twice; there is
    // nothing for a crawler to index.
    robots: { index: false, follow: true },
};

export default function ProgressPage() {
    return <ProgressClient />;
}
