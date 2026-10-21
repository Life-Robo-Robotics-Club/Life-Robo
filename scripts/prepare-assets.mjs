// One-off asset pipeline: copies real club photos from the old site export,
// resizes/compresses them, and crops the club badge into logo + favicons.
// Usage: node scripts/prepare-assets.mjs <path-to-old-site-public/photos>
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const SRC = process.argv[2];
if (!SRC) {
  console.error("Usage: node scripts/prepare-assets.mjs <old-site/public/photos>");
  process.exit(1);
}
const OUT = path.resolve("public/photos");
const BRAND = path.resolve("public/brand");

// Stock / placeholder images from the old site that must NOT be presented as club photos.
const SKIP = [
  /^hero-rover/, /^hero-arduino/, /^hero-line-follower/, /^about-epuck/,
  /^project-combat-bot/, /^blog-lorem-/, /^gallery-lorem-/, /^member-placeholder/,
  /^events-student-arena/,
];

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

async function photos() {
  const files = (await walk(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f));
  for (const f of files) {
    const rel = path.relative(SRC, f);
    const base = path.basename(rel);
    if (SKIP.some((r) => r.test(base))) continue;
    const dest = path.join(OUT, rel).replace(/\.(jpe?g|png)$/i, ".jpg");
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await sharp(f)
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#000" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(dest);
    const { size } = await fs.stat(dest);
    console.log(`${rel} -> ${path.relative(process.cwd(), dest)} (${Math.round(size / 1024)} KB)`);
  }
}

async function logo() {
  await fs.mkdir(BRAND, { recursive: true });
  const poster = path.join(SRC, "repo", "repo-event-roboeminence.jpg");
  // Badge measured on the 1080x1350 poster: centre ~(987, 84), radius ~68.
  const cx = 987, cy = 84, r = 66;
  const size = r * 2;
  const crop = await sharp(poster)
    .extract({ left: cx - r, top: cy - r, width: size, height: size })
    .toBuffer();
  const S = 512;
  const mask = Buffer.from(
    `<svg width="${S}" height="${S}"><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}" fill="#fff"/></svg>`,
  );
  const badge = await sharp(crop)
    .resize(S, S, { kernel: "lanczos3" })
    .sharpen()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  await sharp(badge).toFile(path.join(BRAND, "logo-badge.png"));
  await sharp(badge).resize(192, 192).png().toFile(path.join(BRAND, "icon-192.png"));
  await sharp(badge).resize(32, 32).png().toFile(path.join(BRAND, "favicon-32.png"));
  await sharp(badge).resize(16, 16).png().toFile(path.join(BRAND, "favicon-16.png"));
  await sharp(badge).resize(32, 32).png().toFile(path.resolve("public/favicon.png"));
  // Apple touch icon: opaque black background.
  await sharp(badge).resize(180, 180).flatten({ background: "#000" }).png()
    .toFile(path.join(BRAND, "apple-touch-icon.png"));
  // Default social share image 1200x630.
  const og = await sharp(badge).resize(360, 360).toBuffer();
  const text = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="g" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="#1b2a4a"/><stop offset="1" stop-color="#000"/></radialGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <text x="520" y="300" font-family="Helvetica, Arial, sans-serif" font-size="84" font-weight="700" letter-spacing="18" fill="#fff">LIFE ROBO</text>
    <text x="524" y="370" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#a1a1a6">Robotics Club · FoET, University of Lucknow</text>
    <text x="524" y="430" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#2997ff">Innovate. Build. Compete.</text>
  </svg>`);
  await sharp(text).composite([{ input: og, left: 110, top: 135 }]).jpeg({ quality: 85 })
    .toFile(path.join(BRAND, "og-default.jpg"));
  console.log("brand assets written to public/brand");
}

await photos();
await logo();
