/**
 * Every decision the service makes, as pure functions over facts someone else
 * fetched. No I/O here, which is what makes the device-cap rule testable: the
 * cap has to be judged BEFORE the incrementing call is made, and a pure
 * function that returns "now increment" is the only way to assert that ordering
 * without counting HTTP requests.
 */
import type { UnlockErrorCode } from '../../../src/lib/unlock-protocol.ts';
import type { GumroadVerify } from './types.ts';
import { LICENCE_KEY_RE, normaliseKey } from './contract.ts';
import { subOf } from './token.ts';

export interface PolicyConfig {
    /** Keys that skip Gumroad entirely, by normalised key -> label. */
    grants: Map<string, string>;
    /** `sub` prefixes refused at every endpoint. */
    deny: string[];
    deviceCap: number;
}

export type Rejection = { kind: 'reject'; code: UnlockErrorCode; uses?: number; cap?: number };

export type ActivateStep =
    | Rejection
    /** A UNLOCK_GRANTS key: issue a src:'grant' token, never call Gumroad. */
    | { kind: 'grant'; label: string; key: string; sub: string }
    /** Ask Gumroad WITHOUT incrementing, then call again with the answer. */
    | { kind: 'probe'; key: string; sub: string }
    /** Under the cap: now spend one activation. */
    | { kind: 'increment'; key: string; sub: string };

export type RefreshStep =
    | Rejection
    | { kind: 'grant'; label: string; key: string; sub: string }
    | { kind: 'probe'; key: string; sub: string }
    /** Gumroad still says yes: re-issue. Refresh never increments. */
    | { kind: 'issue'; key: string; sub: string };

export interface KeyOk { ok: true; key: string; sub: string }
export type KeyCheck = KeyOk | { ok: false; code: 'invalid_key_format' };

export function checkKey(raw: unknown): KeyCheck {
    if (typeof raw !== 'string') return { ok: false, code: 'invalid_key_format' };
    const key = normaliseKey(raw);
    if (!LICENCE_KEY_RE.test(key)) return { ok: false, code: 'invalid_key_format' };
    return { ok: true, key, sub: subOf(key) };
}

/** `UNLOCK_GRANTS="label:key,label:key"`. Keys are still format-checked. */
export function parseGrants(spec: string | undefined): Map<string, string> {
    const out = new Map<string, string>();
    for (const entry of (spec ?? '').split(',')) {
        const trimmed = entry.trim();
        if (!trimmed) continue;
        const sep = trimmed.indexOf(':');
        if (sep < 1) throw new Error(`UNLOCK_GRANTS entry is not "label:key": ${trimmed.slice(0, 12)}...`);
        const label = trimmed.slice(0, sep).trim();
        const key = normaliseKey(trimmed.slice(sep + 1));
        if (!LICENCE_KEY_RE.test(key)) throw new Error(`UNLOCK_GRANTS "${label}" is not a licence-key-shaped value`);
        out.set(key, label);
    }
    return out;
}

/** `UNLOCK_DENY="a1b2c3,d4e5"` -- prefixes, so a whole batch can be cut with one entry. */
export function parseDeny(spec: string | undefined): string[] {
    return (spec ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

export const isDenied = (sub: string, deny: string[]): boolean => deny.some(p => sub.startsWith(p));

/** What a Gumroad answer means, ignoring the device cap. Shared by both endpoints. */
export function judgeEntitlement(probe: GumroadVerify): UnlockErrorCode | null {
    if (!probe.ok) return 'not_found';
    if (probe.refunded) return 'refunded';
    if (probe.chargebacked) return 'chargebacked';
    if (probe.disabled) return 'disabled';
    return null;
}

/**
 * One step of an activation. Called with `probe: null` first; if it answers
 * 'probe', call Gumroad with increment:false and call this again with the
 * result. It can only answer 'increment' on that second pass, so the cap is
 * always judged against a number that was read without spending anything.
 */
export function decideActivation(input: {
    rawKey: unknown;
    cfg: PolicyConfig;
    probe: GumroadVerify | null;
}): ActivateStep {
    const { cfg, probe } = input;
    const checked = checkKey(input.rawKey);
    if (!checked.ok) return { kind: 'reject', code: checked.code };
    const { key, sub } = checked;

    if (isDenied(sub, cfg.deny)) return { kind: 'reject', code: 'denied' };

    const label = cfg.grants.get(key);
    if (label !== undefined) return { kind: 'grant', label, key, sub };

    if (probe === null) return { kind: 'probe', key, sub };

    const bad = judgeEntitlement(probe);
    if (bad) return { kind: 'reject', code: bad };

    if (probe.uses >= cfg.deviceCap) {
        return { kind: 'reject', code: 'device_cap', uses: probe.uses, cap: cfg.deviceCap };
    }
    return { kind: 'increment', key, sub };
}

/**
 * Same shape, minus the cap: a refresh re-checks an entitlement the buyer has
 * already paid an activation for. Failing it at the cap would lock out exactly
 * the people who used every device they bought.
 */
export function decideRefresh(input: {
    rawKey: unknown;
    cfg: PolicyConfig;
    probe: GumroadVerify | null;
}): RefreshStep {
    const { cfg, probe } = input;
    const checked = checkKey(input.rawKey);
    if (!checked.ok) return { kind: 'reject', code: checked.code };
    const { key, sub } = checked;

    if (isDenied(sub, cfg.deny)) return { kind: 'reject', code: 'denied' };

    const label = cfg.grants.get(key);
    if (label !== undefined) return { kind: 'grant', label, key, sub };

    if (probe === null) return { kind: 'probe', key, sub };

    const bad = judgeEntitlement(probe);
    if (bad) return { kind: 'reject', code: bad };

    return { kind: 'issue', key, sub };
}
