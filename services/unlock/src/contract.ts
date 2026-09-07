/**
 * The two RUNTIME values of src/lib/unlock-protocol.ts, mirrored.
 *
 * Everything else the service takes from that file is a type, and `import type`
 * is erased before Node runs this code -- which is why the image copies no part
 * of the app tree. These two are values, so importing them would drag app source
 * into the container and put a Next.js package scope in the service's load path.
 *
 * test/contract.test.ts compares both against the real file and fails on drift.
 * That test is the reason this copy is safe; do not edit one half without it.
 */
export const LICENCE_KEY_RE = /^[A-F0-9]{8}(-[A-F0-9]{8}){3}$/;

export const normaliseKey = (raw: string): string => raw.trim().toUpperCase();
