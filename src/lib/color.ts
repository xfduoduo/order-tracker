/** 字符串哈希 → 稳定的色相值 (0-360) */
function hashToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return Math.abs(hash) % 360;
}

/** HSL → Hex */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** 字符串 → 稳定柔和背景色（极淡，确保黑字可读） */
export function nameToColor(str: string): string {
  if (!str) return "transparent";
  return hslToHex(hashToHue(str), 40, 92);
}

/** 字符串 → 边框色 */
export function nameToBorderColor(str: string): string {
  if (!str) return "transparent";
  return hslToHex(hashToHue(str), 50, 72);
}
