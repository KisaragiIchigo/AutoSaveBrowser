import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const INVALID_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1F]/g;
const RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

export function sanitizeFilename(name: string, maxLen: number = 120): string {
  let cleaned = name.replace(INVALID_CHARS_REGEX, '_').trim();
  cleaned = cleaned.replace(/^[.\s\u3000]+|[.\s\u3000]+$/g, '');
  if (!cleaned) cleaned = 'page';

  if (RESERVED_NAMES.has(cleaned.toUpperCase())) {
    cleaned = `_${cleaned}_`;
  }

  if (cleaned.length > maxLen) {
    cleaned = cleaned.substring(0, maxLen);
  }

  return cleaned;
}

export function extractDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname || 'unknown_domain';
  } catch {
    return 'unknown_domain';
  }
}

export function formatTimestamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

export function dedupeFilePath(targetPath: string, checkFilesDir: boolean = true): string {
  const dir = path.dirname(targetPath);
  const ext = path.extname(targetPath);
  const base = path.basename(targetPath, ext);

  const assetsDir = path.join(dir, `${base}_files`);

  if (!fs.existsSync(targetPath) && (!checkFilesDir || !fs.existsSync(assetsDir))) {
    return targetPath;
  }

  for (let i = 2; i <= 9999; i++) {
    const candidatePath = path.join(dir, `${base} (${i})${ext}`);
    const candidateAssets = path.join(dir, `${base} (${i})_files`);
    if (!fs.existsSync(candidatePath) && (!checkFilesDir || !fs.existsSync(candidateAssets))) {
      return candidatePath;
    }
  }

  return path.join(dir, `${base} (copy)${ext}`);
}

export function getFileSizeSafe(filePath: string): number {
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      return stat.size;
    }
  } catch {}
  return 0;
}
