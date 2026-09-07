/**
 * Sockets, CORS, a body cap and logging. All the behaviour is in app.ts.
 *
 * Nothing here ever writes a licence key or a token to the log: the request
 * body is parsed and handed straight to the app, and the log line identifies a
 * caller by `sub`, the hash the app already works in. A log of live licence keys
 * is a second copy of the product.
 */
import { createServer as createHttpServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AppRequest, Handler } from './app.ts';
import type { Log, LogLevel } from './types.ts';
import { createApp } from './app.ts';
import { makeBank } from './bank.ts';

/** Bigger than any legitimate request here: a key and a token, and nothing else. */
const MAX_BODY = 4096;

const SECRETISH = new Set(['key', 'license_key', 'licence_key', 'token', 'authorization']);

export function makeLog(stream: NodeJS.WritableStream, enabled = true): Log {
    return (level: LogLevel, msg: string, fields: Record<string, unknown> = {}) => {
        if (!enabled) return;
        const safe: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) safe[k] = SECRETISH.has(k.toLowerCase()) ? '[redacted]' : v;
        stream.write(`${JSON.stringify({ t: new Date().toISOString(), lvl: level, msg, ...safe })}\n`);
    };
}

export const parseOrigins = (spec: string | undefined): string[] =>
    (spec ?? '').split(',').map(s => s.trim()).filter(Boolean);

/**
 * `*` in ALLOWED_ORIGINS means any origin, echoed back rather than starred:
 * the client sends no cookies, but echoing keeps the response usable if it ever
 * does. An origin that is not listed gets no CORS headers at all, which is what
 * makes the browser refuse it.
 */
export function corsHeadersFor(origin: string | undefined, allowed: string[]): Record<string, string> | null {
    if (!origin) return null;
    if (!allowed.includes(origin) && !allowed.includes('*')) return null;
    return {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type, if-none-match',
        'access-control-expose-headers': 'etag',
        'access-control-max-age': '86400',
        vary: 'origin',
    };
}

function readBody(req: IncomingMessage): Promise<{ ok: true; text: string } | { ok: false; why: 'too_large' }> {
    return new Promise(resolve => {
        const chunks: Buffer[] = [];
        let size = 0;
        req.on('data', (c: Buffer) => {
            size += c.length;
            if (size > MAX_BODY) {
                // Pause, do not destroy: killing the socket here races the 413
                // out of existence and the caller sees a network error instead
                // of an answer. `connection: close` retires the socket after.
                req.pause();
                resolve({ ok: false, why: 'too_large' });
                return;
            }
            chunks.push(c);
        });
        req.on('end', () => resolve({ ok: true, text: Buffer.concat(chunks).toString('utf8') }));
        req.on('error', () => resolve({ ok: true, text: '' }));
    });
}

const clientIp = (req: IncomingMessage): string => {
    const fwd = req.headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
    return first || req.socket.remoteAddress || 'unknown';
};

export interface ServerDeps {
    handle: Handler;
    log: Log;
    allowedOrigins: string[];
}

export function createServer({ handle, log, allowedOrigins }: ServerDeps): Server {
    return createHttpServer((req: IncomingMessage, res: ServerResponse) => {
        void (async () => {
            const started = Date.now();
            const path = (req.url ?? '/').split('?')[0] ?? '/';
            const method = req.method ?? 'GET';
            const ip = clientIp(req);
            const cors = corsHeadersFor(req.headers.origin, allowedOrigins);

            const send = (status: number, headers: Record<string, string>, body?: Buffer): void => {
                res.writeHead(status, { ...headers, ...(cors ?? {}) });
                res.end(body);
                log(status >= 500 ? 'error' : 'info', 'request', { method, path, status, ip, ms: Date.now() - started });
            };
            const sendJson = (status: number, json: unknown, headers: Record<string, string> = {}): void => {
                const body = Buffer.from(`${JSON.stringify(json)}\n`);
                send(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': String(body.length), ...headers }, body);
            };

            if (method === 'OPTIONS') {
                // No CORS headers means the origin is not configured. Say so with a
                // status rather than a silent 204 the browser will reject anyway.
                if (!cors) return sendJson(403, { ok: false, error: 'origin_not_allowed' });
                return send(204, {});
            }

            let body: unknown;
            if (method === 'POST') {
                const read = await readBody(req);
                if (!read.ok) return sendJson(413, { ok: false, error: 'body_too_large' }, { connection: 'close' });
                try {
                    body = read.text ? JSON.parse(read.text) : {};
                } catch {
                    return sendJson(400, { ok: false, error: 'bad_json' });
                }
            }

            const headers: Record<string, string | undefined> = {};
            for (const [k, v] of Object.entries(req.headers)) headers[k] = Array.isArray(v) ? v.join(', ') : v;

            const appReq: AppRequest = { method, path, headers, body, ip };
            try {
                const out = await handle(appReq);
                if (out.body) return send(out.status, out.headers, out.body);
                return sendJson(out.status, out.json ?? {}, out.headers);
            } catch (err) {
                log('error', 'unhandled', { method, path, err: (err as Error)?.stack ?? String(err) });
                return sendJson(500, { ok: false, error: 'internal' });
            }
        })();
    });
}

export function start(): Server {
    const env = process.env;
    const log = makeLog(process.stdout, env.UNLOCK_LOG !== 'off');
    const bankPath = env.PAID_BANK_PATH ?? join(import.meta.dirname, '..', 'data', 'paid.json');
    const bank = makeBank(readFileSync(bankPath, 'utf8'));
    const handle = createApp({ fetch: globalThis.fetch, now: Date.now, env, bank, log });
    const server = createServer({ handle, log, allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS) });

    const port = Number(env.PORT ?? 8080);
    server.listen(port, () => {
        log('info', 'listening', { port, edition: bank.edition, items: bank.items, stimuli: bank.stimuli });
    });
    for (const sig of ['SIGTERM', 'SIGINT'] as const) {
        process.on(sig, () => {
            log('info', 'shutdown', { sig });
            server.close(() => process.exit(0));
        });
    }
    return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
