/**
 * Shapes that cross module boundaries inside the service. The client-facing
 * contract is src/lib/unlock-protocol.ts, imported with `import type` wherever
 * it is needed; nothing here restates it.
 */
export interface GumroadVerify {
    /** Gumroad answered `success: true`. Anything else is a rejection. */
    ok: boolean;
    uses: number;
    refunded: boolean;
    chargebacked: boolean;
    disabled: boolean;
    /** The parsed body, for the log line on a rejection. */
    raw: unknown;
}

export type LogLevel = 'info' | 'warn' | 'error';

export type Log = (level: LogLevel, msg: string, fields?: Record<string, unknown>) => void;
