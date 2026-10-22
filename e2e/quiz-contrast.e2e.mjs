/**
 * Rendered contrast check for the quiz answer buttons.
 *
 * The bug this guards: the app is dark-only, and the `outline` Button variant
 * carries `dark:bg-input/30 dark:border-input`. Those beat an unprefixed
 * override such as `bg-[rgb(var(--success))]` on specificity, so a marked
 * answer once rendered near-black text on a near-black steel fill. See
 * src/components/quiz/question-card.tsx and src/components/ui/button.tsx.
 *
 * This test opens a real quiz in Chrome, clicks answers, and reads the
 * computed colours of every text-bearing element inside each option button.
 * It composites translucent backgrounds and opacity over the page, computes
 * the WCAG contrast ratio, and checks the marked fills are the success and
 * red colours rather than the outline variant's steel.
 *
 * Run it with `npm run test:browser`, which starts `next dev` and sets
 * BASE_URL. Not part of `npm test`: it needs a browser and a running app.
 */

import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL;
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const DOMAIN = process.env.QUIZ_DOMAIN || "domain_1";

// Thresholds. 4.5:1 is WCAG AA for body text. The unselected wrong options
// are disabled and deliberately dimmed to 60%, and WCAG exempts disabled
// controls; 3:1 still keeps them readable.
const AA = 4.5;
const DIMMED = 3.0;

let browser;
before(async () => {
  assert.ok(BASE_URL, "BASE_URL is not set -- run via `npm run test:browser`");
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
});
after(async () => { await browser?.close(); });

/**
 * Runs in the page. For one option button, returns the effective (composited)
 * background and text colour of every element that holds visible text, plus
 * the button's own raw background and border.
 */
function measureButton(btn) {
  // Chrome reports Tailwind v4 colours as rgb(), oklab(), oklch() or
  // color(srgb ...). Split off the alpha, then let a canvas convert the opaque
  // colour to sRGB, so any syntax the browser understands is measured.
  const ctx2d = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const parse = (s) => {
    if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
    let a = 1;
    let opaque = s;
    const slash = s.match(/^(\w+\(.*?)\s*\/\s*([\d.]+%?)\s*\)$/);
    const rgba = s.match(/^rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)$/);
    if (slash) { a = slash[2].endsWith("%") ? parseFloat(slash[2]) / 100 : Number(slash[2]); opaque = slash[1] + ")"; }
    else if (rgba) { a = Number(rgba[4]); opaque = `rgb(${rgba[1]},${rgba[2]},${rgba[3]})`; }
    ctx2d.clearRect(0, 0, 1, 1);
    ctx2d.fillStyle = "#000";
    ctx2d.fillStyle = opaque;
    ctx2d.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx2d.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a };
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const mix = (x, y, t) => ({ r: x.r * t + y.r * (1 - t), g: x.g * t + y.g * (1 - t), b: x.b * t + y.b * (1 - t), a: 1 });

  // Backdrop behind the button: composite every ancestor background from the
  // root down. Opacity on the button and its ancestors fades the whole button
  // (text and fill alike) toward this backdrop.
  const chain = [];
  for (let el = btn.parentElement; el; el = el.parentElement) chain.unshift(el);
  let backdrop = { r: 255, g: 255, b: 255, a: 1 };
  let opacity = 1;
  for (const el of chain) {
    const cs = getComputedStyle(el);
    backdrop = over(parse(cs.backgroundColor), backdrop);
    opacity *= Number(cs.opacity);
  }
  const bcs = getComputedStyle(btn);
  opacity *= Number(bcs.opacity);
  const btnBg = over(parse(bcs.backgroundColor), backdrop);

  const samples = [];
  const walk = (el, bg) => {
    const cs = getComputedStyle(el);
    const ownBg = el === btn ? btnBg : over(parse(cs.backgroundColor), bg);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      const fg = over(parse(cs.color), ownBg);
      samples.push({
        tag: el.tagName.toLowerCase(),
        text: el.textContent.trim().slice(0, 40),
        fg: mix(fg, backdrop, opacity),
        bg: mix(ownBg, backdrop, opacity),
      });
    }
    for (const c of el.children) walk(c, ownBg);
  };
  walk(btn, btnBg);

  return {
    text: btn.textContent.trim().slice(0, 60),
    rawBg: parse(bcs.backgroundColor),
    border: parse(bcs.borderTopColor),
    opacity,
    hasIcon: !!btn.querySelector("svg"),
    disabled: btn.disabled,
    samples,
  };
}

function luminance({ r, g, b }) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const near = (c, t, tol = 3) => Math.abs(c.r - t.r) <= tol && Math.abs(c.g - t.g) <= tol && Math.abs(c.b - t.b) <= tol;
const fmt = (c) => `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)})`;

function assertContrast(m, min, label) {
  assert.ok(m.samples.length > 0, `${label}: no text found in button`);
  for (const s of m.samples) {
    const ratio = contrast(s.fg, s.bg);
    assert.ok(
      ratio >= min,
      `${label}: <${s.tag}> "${s.text}" is ${fmt(s.fg)} on ${fmt(s.bg)}, contrast ${ratio.toFixed(2)}:1 < ${min}:1`,
    );
  }
}

/** Resolve a CSS colour expression to rgb in the live page. */
async function resolveColor(page, expr) {
  return page.evaluate((e) => {
    const d = document.createElement("div");
    d.style.color = e;
    document.body.appendChild(d);
    const c = getComputedStyle(d).color;
    d.remove();
    const x = document.createElement("canvas").getContext("2d");
    x.fillStyle = c;
    x.fillRect(0, 0, 1, 1);
    const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: 1 };
  }, expr);
}

const optionButtons = (page) =>
  page.locator('[data-slot="card"] button').filter({ hasText: /^\s*[A-D]\./ });

/** Wait until computed colours stop changing (the buttons have a 300 ms transition). */
async function settle(page) {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await page.waitForTimeout(100);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
}

async function measureAll(page) {
  await settle(page);
  const btns = await optionButtons(page).all();
  return Promise.all(btns.map((b) => b.evaluate(measureButton)));
}

/**
 * Open the first question of a fresh quiz (new browser context, so no saved
 * sitting), measure the four options, click option `pick`, measure again.
 * The bank serves questions and options in a fixed order, so the same
 * question comes up every time.
 */
async function answerFirst(pick) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, colorScheme: "dark" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE_URL}/quiz/${DOMAIN}/`, { waitUntil: "load", timeout: 120_000 });
  await optionButtons(page).first().waitFor({ timeout: 60_000 });
  await expectCount(page, 4);
  const before = await measureAll(page);
  await optionButtons(page).nth(pick).click();
  await page.locator('[data-slot="card"] button[disabled]').first().waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: /Next Question|Finish/ }).waitFor({ timeout: 10_000 });
  const after = await measureAll(page);
  await ctx.close();
  return { before, after, errors };
}

/**
 * Answer the first question once wrongly and once rightly. Option A goes
 * first; whichever outcome that gives, the marking shows where the key is,
 * and a second fresh sitting picks the other outcome.
 */
async function collectStates() {
  const first = await answerFirst(0);
  const out = { unanswered: first.before, pickedRight: null, pickedWrong: null, errors: [...first.errors] };
  if (isRight(first.after, 0)) {
    out.pickedRight = { pick: 0, buttons: first.after };
    const second = await answerFirst(1);
    out.errors.push(...second.errors);
    out.pickedWrong = { pick: 1, correctIdx: 0, buttons: second.after };
  } else {
    const key = first.after.findIndex((m, i) => i !== 0 && m.hasIcon);
    out.pickedWrong = { pick: 0, correctIdx: key, buttons: first.after };
    assert.ok(key > 0, "after a wrong pick no other option is marked as the key");
    const second = await answerFirst(key);
    out.errors.push(...second.errors);
    out.pickedRight = { pick: key, buttons: second.after };
  }
  return out;
}

// After answering, the picked option was right if it is the only one with an icon.
function isRight(buttons, pick) {
  return buttons[pick].hasIcon && buttons.filter((m) => m.hasIcon).length === 1;
}

async function expectCount(page, n) {
  const c = await optionButtons(page).count();
  assert.equal(c, n, `expected ${n} option buttons, found ${c}`);
}

let states;
let palette;
async function getStates() {
  if (!states) {
    states = await collectStates();
    const ctx = await browser.newContext({ colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/quiz/${DOMAIN}/`, { waitUntil: "load", timeout: 120_000 });
    await optionButtons(page).first().waitFor({ timeout: 60_000 });
    palette = {
      success: await resolveColor(page, "rgb(var(--success))"),
      destructive: await resolveColor(page, "rgb(var(--destructive))"),
      input: await resolveColor(page, "rgb(var(--input))"),
      red400: await resolveColor(page, "var(--color-red-400)"),
    };
    await ctx.close();
  }
  return states;
}

test("quiz renders without page errors", async () => {
  const s = await getStates();
  assert.deepEqual(s.errors, []);
  assert.ok(isRight(s.pickedRight.buttons, s.pickedRight.pick), "the right pick is not marked as the only key");
});

test("unanswered options: text has AA contrast", async () => {
  const s = await getStates();
  s.unanswered.forEach((m, i) => assertContrast(m, AA, `unanswered option ${i}`));
});

test("picked the right answer: success fill, AA contrast", async () => {
  const { pickedRight: r } = await getStates();
  const m = r.buttons[r.pick];
  assert.ok(near(m.rawBg, palette.success) && m.rawBg.a === 1,
    `correct option background is ${fmt(m.rawBg)} (alpha ${m.rawBg.a}), expected --success ${fmt(palette.success)} -- the outline variant's dark: fill won`);
  assert.equal(m.opacity, 1, "correct option is dimmed by the disabled state");
  assertContrast(m, AA, "correct option");
  r.buttons.forEach((o, i) => { if (i !== r.pick) assertContrast(o, DIMMED, `other option ${i} after a right answer`); });
});

test("picked a wrong answer: red fill and border on the pick, success on the key, AA contrast", async () => {
  const { pickedWrong: w } = await getStates();
  const m = w.buttons[w.pick];
  // The fill is a translucent red-950 over the card, so check its hue and that
  // it is not the outline variant's steel, rather than an exact value.
  assert.ok(m.rawBg.r > m.rawBg.g + 10 && m.rawBg.r > m.rawBg.b + 10,
    `wrong pick background ${fmt(m.rawBg)} is not red -- the outline variant's dark: fill won`);
  assert.ok(!near(m.rawBg, palette.input, 6), `wrong pick background is the outline steel ${fmt(palette.input)}`);
  assert.ok(near(m.border, palette.red400, 3), `wrong pick border ${fmt(m.border)}, expected red-400 ${fmt(palette.red400)}`);
  assert.equal(m.opacity, 1, "wrong pick is dimmed by the disabled state");
  assertContrast(m, AA, "wrong pick");

  assert.ok(w.correctIdx >= 0, "the right answer is not marked after a wrong pick");
  const key = w.buttons[w.correctIdx];
  assert.ok(near(key.rawBg, palette.success), `key background ${fmt(key.rawBg)}, expected --success ${fmt(palette.success)}`);
  assertContrast(key, AA, "key after a wrong pick");

  w.buttons.forEach((o, i) => {
    if (i !== w.pick && i !== w.correctIdx) assertContrast(o, DIMMED, `unselected wrong option ${i}`);
  });
});
