import type { MetadataRoute } from "next";

import manifest from "@/pwa/manifest.json";

/**
 * The web app manifest, served at /manifest.webmanifest.
 *
 * The document itself lives in src/pwa/manifest.json rather than inline here,
 * because scripts/build-sw.mjs needs to read it too: it asserts after the build
 * that the export really does contain out/manifest.webmanifest, and writes the
 * file from that JSON if this metadata route did not produce one. Stating the
 * manifest twice would let those two copies drift apart in exactly the way that
 * is hardest to notice — an installed app keeps its old manifest.
 *
 * The cast is unavoidable: a JSON import widens "standalone" to string, and
 * MetadataRoute.Manifest wants the literal union. src/pwa/manifest.json is
 * checked against this type by the build the moment it stops being valid,
 * because the cast only silences the widening, not a wrong field name.
 */
/**
 * Required under `output: 'export'`. Without it Next refuses the route at export
 * time — "export const dynamic = force-static ... not configured" — and the
 * whole build exits 1. Verified: build failed, this fixed it.
 */
export const dynamic = "force-static";

export default function webManifest(): MetadataRoute.Manifest {
    return manifest as MetadataRoute.Manifest;
}
