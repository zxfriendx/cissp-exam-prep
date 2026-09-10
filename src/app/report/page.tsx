import type { Metadata } from "next";
import ReportClient from "./report-client";

export const metadata: Metadata = {
    title: "Your study guide — CISSP practice — Secure Path Digital",
    description:
        "A study guide generated from your own answers: readiness with the arithmetic shown, the " +
        "objectives costing you the most marks, every question you currently have wrong worked " +
        "through, and the reasoning traps you keep falling for. Built in your browser; prints.",
    robots: { index: false, follow: true },
};

export default function ReportPage() {
    return <ReportClient />;
}
