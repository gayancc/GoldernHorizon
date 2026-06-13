#!/usr/bin/env node
/**
 * slice-frames.mjs — Golden Horizon scroll-cinematic frame slicer.
 *
 * Downloads a rendered Higgsfield clip (URL or local path) and slices it into an
 * evenly-spaced JPG sequence used for scroll-scrubbed playback on the site.
 *
 * Usage:
 *   node scripts/slice-frames.mjs --input <url|path> --name hero [--fps 18] [--width 1440] [--quality 4]
 *
 * Output:
 *   public/frames/<name>/<name>_0001.jpg ...
 *   public/frames/<name>/manifest.json   { name, count, width, fps }
 *
 * The site reads each manifest to know how many frames to preload and scrub.
 */

import { spawn } from 'node:child_process';
import { mkdir, rm, readdir, writeFile, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/** Minimal `--flag value` parser. */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

function runFfmpeg(args) {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

async function fetchToFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status} ${res.statusText} for ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input;
  const name = args.name || 'clip';
  const fps = Number(args.fps || 18);
  const width = Number(args.width || 1440);
  const quality = Number(args.quality || 4); // ffmpeg -q:v 2 (best) .. 31 (worst)

  if (!input) {
    console.error('Missing --input <url|path>');
    process.exit(1);
  }

  const outDir = join(ROOT, 'public', 'frames', name);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  // Resolve the source to a local file (download remote URLs).
  let sourcePath = input;
  const isRemote = /^https?:\/\//i.test(input);
  if (isRemote) {
    sourcePath = join(outDir, `__source-${name}.mp4`);
    console.log(`Downloading ${input}`);
    await fetchToFile(input, sourcePath);
    const info = await stat(sourcePath);
    console.log(`Downloaded ${(info.size / 1024 / 1024).toFixed(2)} MB`);
  }

  // Evenly-spaced frames at the requested fps, downscaled, even dimensions for JPG.
  const pattern = join(outDir, `${name}_%04d.jpg`);
  console.log(`Slicing @ ${fps}fps, width ${width}px, q${quality}`);
  await runFfmpeg([
    '-y',
    '-i', sourcePath,
    '-vf', `fps=${fps},scale=${width}:-2:flags=lanczos`,
    '-q:v', String(quality),
    pattern,
  ]);

  // Remove the temp source so it does not ship in the build.
  if (isRemote) await rm(sourcePath, { force: true });

  const files = (await readdir(outDir)).filter((f) => f.endsWith('.jpg')).sort();
  const count = files.length;
  if (count === 0) throw new Error('No frames produced — check the source clip.');

  const manifest = { name, count, width, fps, pattern: `${name}_%04d.jpg`, base: `/frames/${name}/` };
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Done: ${count} frames -> public/frames/${name}/`);
  console.log(JSON.stringify(manifest));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
