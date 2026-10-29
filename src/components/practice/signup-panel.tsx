"use client"

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react"
import { CheckCircle2, Loader2, Mail } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { setSampleJoined, useBankStore } from "@/lib/bank"
import { getSampleCounts } from "@/lib/content"
import { isUnlockConfigured, subscribe } from "@/lib/unlock-client"
import { CONSENT_VERSION } from "@/lib/unlock-protocol"
import { mayServePaidBank } from "@/lib/entitlement"
import { useEntitlementStore } from "@/store/entitlement-store"
import {
    CONSENT_TEXT,
    GATE_SOURCE,
    LOCAL_MESSAGES,
    PRIVACY_URL,
    checkForm,
    readUtm,
    subscribeMessage,
    writeJoined,
    type LocalFormError,
} from "@/lib/sample-gate"
import {
    trackGateView,
    trackSignupError,
    trackSignupSubmit,
    trackSignupSuccess,
    type GatePlacement,
} from "@/lib/analytics"

interface SignupPanelProps {
    placement: GatePlacement
    /** One sentence saying why the panel is here, e.g. "You have answered the 5 open questions in Domain 3." */
    context?: ReactNode
    /** Shown under the success message, e.g. a button that starts the domain's full twenty. */
    successAction?: ReactNode
    /** Moves focus to the panel when it mounts, for a panel the visitor just asked for. */
    autoFocus?: boolean
}

/**
 * The email gate: where a visitor who has used the 40 open questions gets the
 * other 120 of the free sample.
 *
 * Inline, never a modal, and never in the way of a question: it sits where the
 * visitor would otherwise hit a dead end (the end of a domain's open five, a
 * mode that needs more than the open forty) and on the practice page under the
 * domain grid. A buyer never sees it, and a visitor who has joined sees it only
 * long enough to read that it worked.
 *
 * NO DARK PATTERNS
 * ----------------
 * The consent box starts unticked and is required, the sentence beside it is
 * the exact one whose version is sent as consentVersion, and every failure says
 * what happened and what to do. A network failure never opens anything: only a
 * body from the service that says `ok: true` does.
 *
 * The `website` field is a honeypot. It is off screen, hidden from assistive
 * technology and out of the tab order, so a person never fills it. It is sent
 * as typed; the service decides what a filled one means.
 */
export function SignupPanel({ placement, context, successAction, autoFocus }: SignupPanelProps) {
    const access = useBankStore(state => state.access)
    const counts = getSampleCounts()
    const configured = isUnlockConfigured()

    const [email, setEmail] = useState("")
    const [consent, setConsent] = useState(false)
    const [website, setWebsite] = useState("")
    const [busy, setBusy] = useState(false)
    const [localErrors, setLocalErrors] = useState<LocalFormError[]>([])
    const [submitError, setSubmitError] = useState<string | null>(null)
    // True only in the panel that did the joining, so it can say so. Every
    // other panel on the page simply disappears when access flips.
    const [joinedHere, setJoinedHere] = useState(false)

    const id = useId()
    const emailId = `${id}-email`
    const consentId = `${id}-consent`
    const emailErrId = `${id}-email-error`
    const consentErrId = `${id}-consent-error`
    const submitErrId = `${id}-submit-error`
    const headingId = `${id}-heading`

    const sectionRef = useRef<HTMLElement>(null)
    const emailRef = useRef<HTMLInputElement>(null)
    const consentRef = useRef<HTMLInputElement>(null)
    const successRef = useRef<HTMLDivElement>(null)

    const visible = access === "open" || joinedHere

    // One gate_view per panel per mount, and only for a visitor it is actually
    // gating. The bank store starts at 'open' on every load, so wait for the
    // flag to have been read before counting a view a joined visitor never saw,
    // and skip a buyer whose paid bank is still coming out of IndexedDB.
    const viewed = useRef(false)
    useEffect(() => {
        if (access !== "open" || viewed.current) return
        const t = window.setTimeout(() => {
            if (useBankStore.getState().access !== "open") return
            const { token, exp } = useEntitlementStore.getState()
            if (mayServePaidBank({ token, exp }, Math.floor(Date.now() / 1000))) return
            viewed.current = true
            trackGateView(placement)
        }, 0)
        return () => window.clearTimeout(t)
    }, [access, placement])

    useEffect(() => {
        if (autoFocus && access === "open") {
            sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
            emailRef.current?.focus({ preventScroll: true })
        }
    }, [autoFocus, access])

    useEffect(() => {
        if (joinedHere) successRef.current?.focus()
    }, [joinedHere])

    if (!visible) return null

    const emailError = localErrors.find(e => e === "email_missing" || e === "email_format")
    const consentError = localErrors.includes("consent_missing")

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        if (busy) return
        setSubmitError(null)

        const errors = checkForm(email, consent)
        setLocalErrors(errors)
        if (errors.length) {
            if (errors[0] === "consent_missing") consentRef.current?.focus()
            else emailRef.current?.focus()
            return
        }

        if (!configured) {
            setSubmitError(subscribeMessage("unconfigured"))
            trackSignupError(placement, "unconfigured")
            return
        }

        setBusy(true)
        trackSignupSubmit(placement)
        const res = await subscribe({
            email: email.trim(),
            consent: true,
            consentVersion: CONSENT_VERSION,
            source: GATE_SOURCE,
            utm: readUtm(window.sessionStorage),
            website,
        })
        setBusy(false)

        if (res.ok) {
            writeJoined(window.localStorage)
            setJoinedHere(true)
            setSampleJoined(true)
            trackSignupSuccess(placement)
            return
        }

        trackSignupError(placement, res.code)
        setSubmitError(subscribeMessage(res.code, res.retryAfter))
        if (res.code === "invalid_email") emailRef.current?.focus()
        if (res.code === "consent_required") consentRef.current?.focus()
    }

    if (joinedHere) {
        return (
            <section
                className="rounded-xl border border-success/40 bg-card p-6 sm:p-8 space-y-4"
                aria-labelledby={headingId}
            >
                <div
                    ref={successRef}
                    tabIndex={-1}
                    role="status"
                    className="flex items-start gap-3 outline-none"
                >
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-success stroke-2 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1">
                        <h2 id={headingId} className="text-xl font-semibold tracking-tight text-primary">
                            You are in. All {counts.sample} free questions are open.
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            That is {counts.perDomain} in every domain, on this device. The study notes come by email.
                        </p>
                    </div>
                </div>
                {successAction && <div className="flex flex-col sm:flex-row gap-3">{successAction}</div>}
            </section>
        )
    }

    const describedBy = (...ids: (string | false | null | undefined)[]) =>
        ids.filter(Boolean).join(" ") || undefined

    return (
        <section
            ref={sectionRef}
            aria-labelledby={headingId}
            className="relative rounded-xl border border-secondary/40 bg-card p-6 sm:p-8 space-y-5"
        >
            <div className="space-y-2 max-w-3xl">
                <p className="vault-label">Free with your email</p>
                <h2 id={headingId} className="text-2xl font-semibold tracking-tight text-primary flex items-center gap-2">
                    <Mail className="h-6 w-6 shrink-0 text-secondary stroke-2" aria-hidden="true" />
                    Get the other {counts.gated} free questions
                </h2>
                {context && <p className="text-sm text-foreground/90 leading-relaxed">{context}</p>}
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {counts.open} are open now. Add your email and all {counts.sample} open on this device,{" "}
                    {counts.perDomain} in every domain, each with its worked answer. No card, no account.
                </p>
            </div>

            <form onSubmit={submit} noValidate className="space-y-4 max-w-xl">
                <div className="space-y-2">
                    <label htmlFor={emailId} className="block text-sm font-medium text-primary">
                        Email address
                    </label>
                    <input
                        ref={emailRef}
                        id={emailId}
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value)
                            if (emailError) setLocalErrors(errs => errs.filter(x => x === "consent_missing"))
                        }}
                        disabled={busy}
                        aria-invalid={emailError ? true : undefined}
                        aria-describedby={describedBy(emailError && emailErrId)}
                        className={`w-full rounded-md border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none disabled:opacity-50 ${emailError ? "border-destructive" : "border-primary/20"}`}
                        placeholder="you@example.com"
                    />
                    {emailError && (
                        <p id={emailErrId} className="text-sm text-destructive">
                            {LOCAL_MESSAGES[emailError]}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-start gap-3">
                        <input
                            ref={consentRef}
                            id={consentId}
                            name="consent"
                            type="checkbox"
                            required
                            checked={consent}
                            onChange={(e) => {
                                setConsent(e.target.checked)
                                if (e.target.checked) setLocalErrors(errs => errs.filter(x => x !== "consent_missing"))
                            }}
                            disabled={busy}
                            aria-invalid={consentError ? true : undefined}
                            aria-describedby={describedBy(consentError && consentErrId)}
                            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--copper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        />
                        <label htmlFor={consentId} className="text-sm text-foreground/90 leading-relaxed cursor-pointer">
                            {CONSENT_TEXT}{" "}
                            <a
                                href={PRIVACY_URL}
                                target="_blank"
                                rel="noopener"
                                className="text-accent underline underline-offset-4 hover:brightness-110"
                            >
                                Privacy policy<span className="sr-only"> (opens in a new tab)</span>
                            </a>
                        </label>
                    </div>
                    {consentError && (
                        <p id={consentErrId} className="text-sm text-destructive pl-8">
                            {LOCAL_MESSAGES.consent_missing}
                        </p>
                    )}
                </div>

                {/* Honeypot. Off screen rather than display:none, which some
                    bots skip; hidden from screen readers and the tab order. */}
                <div
                    aria-hidden="true"
                    style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
                >
                    <label htmlFor={`${id}-website`}>Website</label>
                    <input
                        id={`${id}-website`}
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                    />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Button
                        type="submit"
                        size="lg"
                        className="font-medium w-full sm:w-auto"
                        disabled={busy || !configured}
                        aria-describedby={describedBy(submitError && submitErrId)}
                    >
                        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {busy ? "Signing you up…" : `Get all ${counts.sample} free`}
                    </Button>
                </div>

                {!configured && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {subscribeMessage("unconfigured")}
                    </p>
                )}
                <div aria-live="assertive">
                    {submitError && (
                        <p id={submitErrId} role="alert" className="text-sm text-destructive leading-relaxed">
                            {submitError}
                        </p>
                    )}
                </div>
            </form>
            {/* Two different keys to the same page: the email opens the free 160, the
                licence key from a purchase opens all 750. Say which is which here,
                where a buyer would otherwise try the email form. */}
            <p className="mt-4 text-sm text-muted-foreground">
                Bought the books and app?{" "}
                <Link href="/unlock/" className="text-accent underline underline-offset-4 hover:brightness-110">
                    Enter your licence key
                </Link>
                .
            </p>
        </section>
    )
}
