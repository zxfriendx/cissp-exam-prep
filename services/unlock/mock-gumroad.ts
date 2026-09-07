/**
 * A fake Gumroad, for running the real service without a real licence.
 *
 *   node mock-gumroad.ts &                       # listens on 127.0.0.1:9999
 *   GUMROAD_API_BASE=http://127.0.0.1:9999 npm start
 *
 * Fixture keys are hex because LICENCE_KEY_RE is hex: the mnemonics are spelled
 * in the letters hex allows (600DBEEF = "good beef", D15AB1ED = "disabled").
 * `uses` is kept in memory, so an increment shows up on the next verify and a
 * restart resets every count. README.md has the table.
 */
import { createServer } from 'node:http';

const rep = (g: string): string => [g, g, g, g].join('-');

/** key -> the purchase Gumroad would report for it. */
const FIXTURES = new Map<string, { uses: number; refunded?: boolean; chargebacked?: boolean; disabled?: boolean }>([
    [rep('600DBEEF'), { uses: 0 }],
    [rep('EFD00DED'), { uses: 1, refunded: true }],
    [rep('C4A46EBA'), { uses: 1, chargebacked: true }],
    [rep('D15AB1ED'), { uses: 1, disabled: true }],
    [rep('A7CA9004'), { uses: 4 }],
]);

const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
        const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
        const key = (form.get('license_key') ?? '').trim().toUpperCase();
        const fixture = FIXTURES.get(key);
        const json = (status: number, body: unknown): void => {
            res.writeHead(status, { 'content-type': 'application/json' });
            res.end(JSON.stringify(body));
            console.log(`mock-gumroad ${status} ${key.slice(0, 8)}… increment=${form.get('increment_uses_count')}`);
        };

        if (!req.url?.startsWith('/v2/licenses/verify') || !fixture) {
            return json(404, { success: false, error: { code: 'not_found', status_code: 404 } });
        }
        if (form.get('increment_uses_count') === 'true') fixture.uses += 1;
        json(200, {
            success: true,
            uses: fixture.uses,
            purchase: {
                sale_id: `mock-${key.slice(0, 8)}`,
                product_id: form.get('product_id'),
                email: 'buyer@example.test',
                refunded: fixture.refunded === true,
                chargebacked: fixture.chargebacked === true,
                disputed: false,
                disabled: fixture.disabled === true,
            },
        });
    });
});

server.listen(Number(process.env.MOCK_PORT ?? 9999), '127.0.0.1', () => {
    console.log(`mock-gumroad on http://127.0.0.1:${Number(process.env.MOCK_PORT ?? 9999)} — ${FIXTURES.size} fixture keys`);
});
