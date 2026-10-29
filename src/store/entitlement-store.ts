import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearCachedBank, setActiveBank } from '@/lib/bank';
import {
    decodeTokenPayload,
    shouldRefresh,
    statusFor,
    type EntitlementStatus,
} from '@/lib/entitlement';
import * as unlock from '@/lib/unlock-client';
import { isTerminal, normaliseKey, type UnlockErrorCode } from '@/lib/unlock-protocol';

/**
 * The licence this device holds, and the two things it does with it: activate
 * once, then re-check now and then.
 *
 * WHAT IS PERSISTED AND WHY THE KEY IS AMONG IT
 * ---------------------------------------------
 * The key is kept because /v1/refresh needs it alongside the token, and a
 * refresh that made the buyer re-type their key every three weeks would just
 * train them to stop. It is not a credential worth much on its own — Gumroad
 * caps it at five devices and the service is the only thing that can turn it
 * into a bank.
 *
 * WHAT IS NOT PERSISTED
 * ---------------------
 * The last error, and the device counts that go with it. They describe the last
 * attempt, not the entitlement, and a stale "could not reach the service" left
 * on screen a week later is worse than nothing.
 *
 * Times are Unix SECONDS throughout, matching the protocol and src/lib/entitlement.
 */

const nowSec = (): number => Math.floor(Date.now() / 1000);

interface EntitlementState {
    key: string | null;
    token: string | null;
    /** Unix seconds; when the service stops accepting the token. */
    exp: number | null;
    /** The paid bank edition the token is good for. */
    edition: string | null;
    /** Unix seconds; the first successful activation. Kept after a revocation, as history. */
    activatedAt: number | null;
    /** Unix seconds; the last time the service was ASKED, successful or not. */
    lastRefreshAt: number | null;
    status: EntitlementStatus;

    /** Not persisted. The last code the service returned. */
    lastError: UnlockErrorCode | null;
    /** Not persisted. Device activations used and allowed, when the service said. */
    uses: number | null;
    cap: number | null;

    /** Check a key and, if it is good, hold its token. Returns whether it unlocked. */
    activate: (key: string) => Promise<boolean>;
    /** Re-check, but only if it is time to. Safe to call on every mount. */
    refreshIfDue: () => Promise<void>;
    /** The service has definitively refused this licence: drop the token and the bank. */
    revoke: (code: UnlockErrorCode) => void;
    /** The reader is done with this device. Drops everything, including the cache. */
    forget: () => void;
}

const NO_LICENCE = {
    key: null,
    token: null,
    exp: null,
    edition: null,
    activatedAt: null,
    lastRefreshAt: null,
    status: 'locked' as EntitlementStatus,
    lastError: null,
    uses: null,
    cap: null,
};

export const useEntitlementStore = create<EntitlementState>()(
    persist(
        (set, get) => {
            /**
             * Status is DERIVED, never assigned by hand. Every write goes
             * through here so there is exactly one place that decides what
             * `expired` or `refresh_due` mean, and it is the tested one.
             */
            const commit = (patch: Partial<EntitlementState>): void => {
                const next = { ...get(), ...patch };
                const iat = decodeTokenPayload(next.token)?.iat ?? null;
                set({
                    ...patch,
                    status: statusFor(
                        {
                            token: next.token,
                            exp: next.exp,
                            iat,
                            activatedAt: next.activatedAt,
                            lastAttempt: next.lastRefreshAt,
                            // commit() only ever records a SETTLED result;
                            // `activating` is set directly by activate().
                            activating: false,
                            lastError: next.lastError,
                        },
                        nowSec(),
                    ),
                });
            };

            const drop = (lastError: UnlockErrorCode | null, keepHistory: boolean): void => {
                void clearCachedBank();
                setActiveBank(null);
                commit({
                    ...NO_LICENCE,
                    activatedAt: keepHistory ? get().activatedAt : null,
                    lastError,
                });
            };

            return {
                ...NO_LICENCE,

                activate: async (raw) => {
                    const key = normaliseKey(raw);
                    // `activating` is set directly: it is the one status that is
                    // about this call rather than about the stored licence.
                    set({ status: 'activating', lastError: null, uses: null, cap: null });

                    const res = await unlock.activate(key);
                    const at = nowSec();

                    if (res.ok) {
                        commit({
                            key,
                            token: res.token,
                            exp: res.exp,
                            edition: res.edition,
                            activatedAt: at,
                            lastRefreshAt: at,
                            lastError: null,
                            uses: res.uses ?? null,
                            cap: res.cap ?? null,
                        });
                        // The bank itself is fetched by BankLoader, which is
                        // watching `token`. One place downloads it, whether the
                        // trigger was this call or a reload three weeks later.
                        return true;
                    }

                    if (isTerminal(res.code)) {
                        // Nothing to keep: a terminal code on a first activation
                        // means this key will never work.
                        drop(res.code, false);
                        return false;
                    }

                    commit({ lastError: res.code, uses: res.uses ?? null, cap: res.cap ?? null });
                    return false;
                },

                refreshIfDue: async () => {
                    const s = get();
                    if (!s.token || !s.key) return;
                    const iat = decodeTokenPayload(s.token)?.iat ?? null;
                    const now = nowSec();
                    if (!shouldRefresh(now, iat, s.exp, s.lastRefreshAt)) return;

                    const res = await unlock.refresh(s.key, s.token);

                    if (res.ok) {
                        commit({
                            token: res.token,
                            exp: res.exp,
                            edition: res.edition,
                            lastRefreshAt: nowSec(),
                            lastError: null,
                            uses: res.uses ?? null,
                            cap: res.cap ?? null,
                        });
                        return;
                    }

                    if (isTerminal(res.code)) {
                        drop(res.code, true);
                        return;
                    }

                    // A transient failure changes nothing but the clock. Stamping
                    // lastRefreshAt on a FAILED attempt is the point: otherwise a
                    // service answering 500s gets asked again on every mount.
                    commit({ lastRefreshAt: nowSec(), lastError: res.code });
                },

                revoke: (code) => drop(code, true),

                forget: () => drop(null, false),
            };
        },
        {
            name: 'cissp-entitlement',
            version: 1,
            partialize: (state) => ({
                key: state.key,
                token: state.token,
                exp: state.exp,
                edition: state.edition,
                activatedAt: state.activatedAt,
                lastRefreshAt: state.lastRefreshAt,
                status: state.status,
            }),
            /**
             * The persisted `status` is last session's answer, and `expired` in
             * particular is a function of the clock. Recompute on rehydrate so
             * the first paint is not a stale claim.
             */
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                const iat = decodeTokenPayload(state.token)?.iat ?? null;
                const status = statusFor(
                    {
                        token: state.token,
                        exp: state.exp,
                        iat,
                        activatedAt: state.activatedAt,
                        lastAttempt: state.lastRefreshAt,
                    },
                    nowSec(),
                );
                if (status !== state.status) useEntitlementStore.setState({ status });
            },
        },
    ),
);
