/**
 * Pure Client-Side ISO/IEC 18004 QR Code Matrix Engine + 1D Barcode (EAN-13 / Code128 / UPC-A / Code39)
 * Vector Generator & Offline Scanner
 */

export interface QrMatrixResult {
  matrix: boolean[][];
  isFinder: boolean[][];
  size: number;
  version: number;
}

export function generateQrMatrix(rawText: string): QrMatrixResult {
  const text = rawText.trim() || 'https://yunsin.top';
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = val;
    EXP[i + 255] = val;
    LOG[val] = i;
    val = (val << 1) ^ (val >= 128 ? 0x11d : 0);
  }

  function gfMul(x: number, y: number): number {
    if (x === 0 || y === 0) return 0;
    return EXP[LOG[x] + LOG[y]];
  }

  function polyMul(p: Uint8Array, q: Uint8Array): Uint8Array {
    const res = new Uint8Array(p.length + q.length - 1);
    for (let i = 0; i < p.length; i++) {
      for (let j = 0; j < q.length; j++) {
        res[i + j] ^= gfMul(p[i], q[j]);
      }
    }
    return res;
  }

  function rsGenPoly(degree: number): Uint8Array {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < degree; i++) {
      poly = polyMul(poly, new Uint8Array([1, EXP[i]]));
    }
    return poly;
  }

  // Error Correction Level M specs for Versions 1..9 (Byte mode char count = 8 bits for V1..9)
  const VERSION_SPECS = [
    null,
    { version: 1, totalData: 16, ecBytes: 10, g1Blocks: 1, g1Data: 16, g2Blocks: 0, g2Data: 0, size: 21, align: [] as number[] },
    { version: 2, totalData: 28, ecBytes: 16, g1Blocks: 1, g1Data: 28, g2Blocks: 0, g2Data: 0, size: 25, align: [6, 18] },
    { version: 3, totalData: 44, ecBytes: 26, g1Blocks: 1, g1Data: 44, g2Blocks: 0, g2Data: 0, size: 29, align: [6, 22] },
    { version: 4, totalData: 64, ecBytes: 18, g1Blocks: 2, g1Data: 32, g2Blocks: 0, g2Data: 0, size: 33, align: [6, 26] },
    { version: 5, totalData: 86, ecBytes: 24, g1Blocks: 2, g1Data: 43, g2Blocks: 0, g2Data: 0, size: 37, align: [6, 30] },
    { version: 6, totalData: 108, ecBytes: 16, g1Blocks: 4, g1Data: 27, g2Blocks: 0, g2Data: 0, size: 41, align: [6, 34] },
    { version: 7, totalData: 124, ecBytes: 18, g1Blocks: 4, g1Data: 31, g2Blocks: 0, g2Data: 0, size: 45, align: [6, 22, 38] },
    { version: 8, totalData: 154, ecBytes: 22, g1Blocks: 2, g1Data: 38, g2Blocks: 2, g2Data: 39, size: 49, align: [6, 24, 42] },
    { version: 9, totalData: 182, ecBytes: 22, g1Blocks: 3, g1Data: 36, g2Blocks: 2, g2Data: 37, size: 53, align: [6, 26, 46] },
  ];

  const encoder = new TextEncoder();
  let utf8Bytes = encoder.encode(text);
  if (utf8Bytes.length > 180) {
    utf8Bytes = utf8Bytes.subarray(0, 180);
  }

  let chosenSpec = VERSION_SPECS[9]!;
  for (let v = 1; v <= 9; v++) {
    const spec = VERSION_SPECS[v]!;
    const requiredBits = 4 + 8 + utf8Bytes.length * 8;
    if (requiredBits <= spec.totalData * 8) {
      chosenSpec = spec;
      break;
    }
  }

  const bits: number[] = [];
  function pushBits(v: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((v >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode
  pushBits(utf8Bytes.length, 8);
  for (let i = 0; i < utf8Bytes.length; i++) {
    pushBits(utf8Bytes[i], 8);
  }

  const maxBits = chosenSpec.totalData * 8;
  const termBits = Math.min(4, maxBits - bits.length);
  pushBits(0, termBits);
  while (bits.length % 8 !== 0) bits.push(0);

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataBytes = new Uint8Array(chosenSpec.totalData);
  for (let i = 0; i < chosenSpec.totalData; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j];
    }
    dataBytes[i] = b;
  }

  const numBlocks = chosenSpec.g1Blocks + chosenSpec.g2Blocks;
  const blocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  const gen = rsGenPoly(chosenSpec.ecBytes);

  let byteOffset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const isGroup2 = b >= chosenSpec.g1Blocks;
    const blockSize = isGroup2 ? chosenSpec.g2Data : chosenSpec.g1Data;
    const blockData = dataBytes.subarray(byteOffset, byteOffset + blockSize);
    byteOffset += blockSize;
    blocks.push(blockData);

    const ec = new Uint8Array(chosenSpec.ecBytes);
    for (let i = 0; i < blockData.length; i++) {
      const factor = blockData[i] ^ ec[0];
      ec.copyWithin(0, 1);
      ec[chosenSpec.ecBytes - 1] = 0;
      for (let j = 0; j < chosenSpec.ecBytes; j++) {
        ec[j] ^= gfMul(gen[j + 1], factor);
      }
    }
    ecBlocks.push(ec);
  }

  const finalSequence: number[] = [];
  const maxBlockLen = chosenSpec.g2Blocks > 0 ? chosenSpec.g2Data : chosenSpec.g1Data;
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < blocks[b].length) {
        finalSequence.push(blocks[b][i]);
      }
    }
  }
  for (let i = 0; i < chosenSpec.ecBytes; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalSequence.push(ecBlocks[b][i]);
    }
  }

  const size = chosenSpec.size;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFinder: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunction(r: number, c: number, v: boolean, finder = false) {
    matrix[r][c] = v;
    isFunction[r][c] = true;
    if (finder) isFinder[r][c] = true;
  }

  function drawFinder(row: number, col: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setFunction(row + r, col + c, isBorder || isCenter, true);
      }
    }
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (!isFunction[nr][nc]) setFunction(nr, nc, false, false);
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunction(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setFunction(i, 6, i % 2 === 0);
  }

  for (const ar of chosenSpec.align) {
    for (const ac of chosenSpec.align) {
      if (isFunction[ar][ac]) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2;
          const isCenter = r === 0 && c === 0;
          setFunction(ar + r, ac + c, isEdge || isCenter);
        }
      }
    }
  }

  setFunction(size - 8, 8, true);

  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
    if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = true;
  }

  // Version 7+ require 18-bit version info block
  if (chosenSpec.version >= 7) {
    const VERSION_INFO_BITS: Record<number, number> = {
      7: 0x07c94,
      8: 0x085bc,
      9: 0x09a99,
    };
    const vBits = VERSION_INFO_BITS[chosenSpec.version] || 0;
    for (let i = 0; i < 18; i++) {
      const bit = ((vBits >> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(b, a, bit);
      setFunction(a, b, bit);
    }
  }

  let seqBitIdx = 0;
  const totalBits = finalSequence.length * 8;
  let dir = -1;
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--;
    const c1 = col;
    const c2 = col - 1;

    for (let r = 0; r < size; r++) {
      const row = dir === -1 ? size - 1 - r : r;
      for (const c of [c1, c2]) {
        if (!isFunction[row][c]) {
          let bit = false;
          if (seqBitIdx < totalBits) {
            const byteVal = finalSequence[Math.floor(seqBitIdx / 8)];
            const bitOffset = 7 - (seqBitIdx % 8);
            bit = ((byteVal >> bitOffset) & 1) === 1;
            seqBitIdx++;
          }
          if ((row + c) % 2 === 0) bit = !bit;
          matrix[row][c] = bit;
        }
      }
    }
    dir = -dir;
    col -= 2;
  }

  const formatBits = 0x5412; // ECC M, Mask 0
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> (14 - i)) & 1) === 1;
    if (i <= 5) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return { matrix, isFinder, size, version: chosenSpec.version };
}

// ==========================================
// 1D Barcode Standards (EAN-13, UPC-A, Code 128-B, Code 39)
// ==========================================

const EAN_L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const EAN_G = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
const EAN_R = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];
const EAN_PARITY = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

export function computeGs1CheckDigit(digits: string): string {
  const clean = digits.replace(/\D/g, '');
  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    const d = Number(clean[clean.length - 1 - i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return String((10 - (sum % 10)) % 10);
}

// Code 128 pattern table (values 0..106)
const CODE128_PATTERNS = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100', '10001001100', '10011001000', '10011000100',
  '10001100100', '11001001000', '11001000100', '11000100100', '10110011100', '10011011100', '10011001110', '10111001100',
  '10011101100', '10011100110', '11001110010', '11001011100', '11001001110', '11011100100', '11001110100', '11101101110',
  '11101001100', '11100101100', '11100100110', '11101100100', '11100110100', '11100110010', '11011011000', '11011000110',
  '11000110110', '10100011000', '10001011000', '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110', '10111011000', '10111000110', '10001110110',
  '11101110110', '11010001110', '11000101110', '11011101000', '11011100010', '11011101110', '11101011000', '11101000110',
  '11100010110', '11101101000', '11101100010', '11100011010', '11101111010', '11001000010', '11110001010', '10100110000',
  '10100001100', '10010110000', '10010000110', '10000101100', '10000100110', '10110010000', '10110000100', '10011010000',
  '10011000010', '10000110100', '10000110010', '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100', '10011110010', '11110100100', '11110010100',
  '11110010010', '11011011110', '11011110110', '11110110110', '10101111000', '10100011110', '10001011110', '10111101000',
  '10111100010', '11110101000', '11110100010', '10111011110', '10111101110', '11101011110', '11110101110', '11010000100',
  '11010010000', '11010011100', '1100011101011',
];

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'UPCA' | 'CODE39';

export interface BarcodeEncodedResult {
  valid: boolean;
  bits: string;
  normalizedValue: string;
  checkDigit?: string;
  error?: string;
}

export function encodeBarcodeBits(value: string, format: BarcodeFormat): BarcodeEncodedResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, bits: '', normalizedValue: '', error: 'Empty input' };
  }

  if (format === 'EAN13') {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 12 || digits.length > 13) {
      return {
        valid: false,
        bits: '',
        normalizedValue: digits,
        error: 'EAN-13 requires 12 or 13 digits',
      };
    }
    const base12 = digits.slice(0, 12);
    const check = computeGs1CheckDigit(base12);
    const full13 = base12 + check;
    const first = Number(full13[0]);
    const parity = EAN_PARITY[first];
    let bits = '101'; // Left guard
    for (let i = 1; i <= 6; i++) {
      const d = Number(full13[i]);
      bits += parity[i - 1] === 'L' ? EAN_L[d] : EAN_G[d];
    }
    bits += '01010'; // Center guard
    for (let i = 7; i <= 12; i++) {
      const d = Number(full13[i]);
      bits += EAN_R[d];
    }
    bits += '101'; // Right guard
    return { valid: true, bits, normalizedValue: full13, checkDigit: check };
  }

  if (format === 'UPCA') {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 11 || digits.length > 12) {
      return {
        valid: false,
        bits: '',
        normalizedValue: digits,
        error: 'UPC-A requires 11 or 12 digits',
      };
    }
    const base11 = digits.slice(0, 11);
    const check = computeGs1CheckDigit(base11);
    const full12 = base11 + check;
    let bits = '101';
    for (let i = 0; i < 6; i++) {
      bits += EAN_L[Number(full12[i])];
    }
    bits += '01010';
    for (let i = 6; i < 12; i++) {
      bits += EAN_R[Number(full12[i])];
    }
    bits += '101';
    return { valid: true, bits, normalizedValue: full12, checkDigit: check };
  }

  if (format === 'CODE39') {
    const CODE39_MAP: Record<string, string> = {
      '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
      '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
      '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
      'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
      'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
      'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
      'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
      'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
      'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
      '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101',
    };
    const upper = trimmed.toUpperCase();
    let bits = CODE39_MAP['*'] + '0';
    for (let i = 0; i < upper.length; i++) {
      const pat = CODE39_MAP[upper[i]];
      if (!pat) {
        return {
          valid: false,
          bits: '',
          normalizedValue: upper,
          error: `Unsupported Code39 character: ${upper[i]}`,
        };
      }
      bits += pat + '0';
    }
    bits += CODE39_MAP['*'];
    return { valid: true, bits, normalizedValue: upper };
  }

  // Default: CODE128 (Code Set B: ASCII 32..126)
  let checksum = 104; // Start Code B
  let bits = CODE128_PATTERNS[104];
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code < 32 || code > 126) {
      return {
        valid: false,
        bits: '',
        normalizedValue: trimmed,
        error: 'Code 128-B requires standard ASCII characters (32-126)',
      };
    }
    const val = code - 32;
    checksum += val * (i + 1);
    bits += CODE128_PATTERNS[val];
  }
  const checkVal = checksum % 103;
  bits += CODE128_PATTERNS[checkVal];
  bits += CODE128_PATTERNS[106]; // Stop pattern
  return {
    valid: true,
    bits,
    normalizedValue: trimmed,
    checkDigit: String(checkVal),
  };
}

/**
 * Generates a standalone vector SVG string for a 1D barcode
 */
export function generateBarcodeSvg(
  value: string,
  format: BarcodeFormat,
  options: {
    barWidth?: number;
    height?: number;
    showText?: boolean;
    labelTitle?: string;
    fgColor?: string;
    bgColor?: string;
  } = {}
): { svg: string; encoded: BarcodeEncodedResult } {
  const encoded = encodeBarcodeBits(value, format);
  if (!encoded.valid) {
    return { svg: '', encoded };
  }
  const barWidth = options.barWidth ?? 2;
  const barHeight = options.height ?? 68;
  const showText = options.showText ?? true;
  const fgColor = options.fgColor || '#111827';
  const bgColor = options.bgColor || '#ffffff';
  const quietZone = 18;
  const topTitleSpace = options.labelTitle ? 22 : 8;
  const bottomTextSpace = showText ? 24 : 10;
  const totalWidth = encoded.bits.length * barWidth + quietZone * 2;
  const totalHeight = topTitleSpace + barHeight + bottomTextSpace;

  let rects = '';
  let i = 0;
  while (i < encoded.bits.length) {
    if (encoded.bits[i] === '1') {
      let run = 1;
      while (i + run < encoded.bits.length && encoded.bits[i + run] === '1') {
        run++;
      }
      const x = quietZone + i * barWidth;
      const w = run * barWidth;
      rects += `<rect x="${x}" y="${topTitleSpace}" width="${w}" height="${barHeight}" fill="${fgColor}" />`;
      i += run;
    } else {
      i++;
    }
  }

  const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const titleNode = options.labelTitle
    ? `<text x="${totalWidth / 2}" y="15" text-anchor="middle" fill="${fgColor}" font-family="system-ui, sans-serif" font-size="11" font-weight="700">${escapeXml(options.labelTitle)}</text>`
    : '';

  const textNode = showText
    ? `<text x="${totalWidth / 2}" y="${topTitleSpace + barHeight + 16}" text-anchor="middle" fill="${fgColor}" font-family="JetBrains Mono, Consolas, monospace" font-size="13" font-weight="700" letter-spacing="1.5">${escapeXml(encoded.normalizedValue)}</text>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
  <rect width="100%" height="100%" rx="6" fill="${bgColor}" />
  ${titleNode}
  ${rects}
  ${textNode}
</svg>`;

  return { svg, encoded };
}

export interface DecodedCodeItem {
  format: string;
  rawValue: string;
}

/**
 * Offline Scanline 1D Barcode (Code128 & EAN-13) Decoder Fallback
 * Allows decoding barcode PNG/SVG screenshots even in browsers without native BarcodeDetector
 */
function scanlineDecode1DBarcode(imageData: ImageData): DecodedCodeItem | null {
  const { width, height, data } = imageData;
  const candidateRows = [
    Math.floor(height * 0.5),
    Math.floor(height * 0.4),
    Math.floor(height * 0.6),
  ];

  for (const y of candidateRows) {
    if (y < 0 || y >= height) continue;
    // Binarize scanline
    let minLum = 255;
    let maxLum = 0;
    const lums = new Uint8Array(width);
    for (let x = 0; x < width; x++) {
      const off = (y * width + x) * 4;
      const lum = Math.round(data[off] * 0.299 + data[off + 1] * 0.587 + data[off + 2] * 0.114);
      lums[x] = lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }
    if (maxLum - minLum < 40) continue;
    const threshold = (minLum + maxLum) >> 1;

    // Extract run-lengths of black(1) and white(0)
    let firstBlack = -1;
    let lastBlack = -1;
    for (let x = 0; x < width; x++) {
      if (lums[x] < threshold) {
        if (firstBlack === -1) firstBlack = x;
        lastBlack = x;
      }
    }
    if (firstBlack === -1 || lastBlack - firstBlack < 30) continue;

    // Measure shortest bar run as unit module width
    const runs: { bit: number; len: number }[] = [];
    let curBit = 1;
    let curLen = 0;
    for (let x = firstBlack; x <= lastBlack; x++) {
      const b = lums[x] < threshold ? 1 : 0;
      if (b === curBit) {
        curLen++;
      } else {
        runs.push({ bit: curBit, len: curLen });
        curBit = b;
        curLen = 1;
      }
    }
    if (curLen > 0) runs.push({ bit: curBit, len: curLen });
    if (runs.length < 18) continue;

    // Estimate module width from first 3 runs (Start guard is 101 for EAN or 2-1-2 for Code128)
    const minRun = Math.max(1, Math.min(...runs.slice(0, 12).map((r) => r.len)));
    let bitStr = '';
    for (const r of runs) {
      const modules = Math.max(1, Math.round(r.len / minRun));
      bitStr += (r.bit ? '1' : '0').repeat(modules);
    }

    // Check EAN-13 (95 modules starting and ending with 101)
    if (bitStr.length === 95 && bitStr.startsWith('101') && bitStr.endsWith('101')) {
      let leftParity = '';
      let digits = '';
      let ok = true;
      for (let i = 0; i < 6; i++) {
        const seg = bitStr.slice(3 + i * 7, 3 + (i + 1) * 7);
        const lIdx = EAN_L.indexOf(seg);
        const gIdx = EAN_G.indexOf(seg);
        if (lIdx !== -1) {
          leftParity += 'L';
          digits += String(lIdx);
        } else if (gIdx !== -1) {
          leftParity += 'G';
          digits += String(gIdx);
        } else {
          ok = false;
          break;
        }
      }
      const firstDigit = EAN_PARITY.indexOf(leftParity);
      if (ok && firstDigit !== -1) {
        for (let i = 0; i < 6; i++) {
          const seg = bitStr.slice(50 + i * 7, 50 + (i + 1) * 7);
          const rIdx = EAN_R.indexOf(seg);
          if (rIdx !== -1) digits += String(rIdx);
          else {
            ok = false;
            break;
          }
        }
        if (ok) {
          return { format: 'ean_13', rawValue: String(firstDigit) + digits };
        }
      }
    }

    // Check Code 128-B (starts with 11010010000 and ends with 1100011101011)
    if (bitStr.startsWith(CODE128_PATTERNS[104]) && bitStr.endsWith(CODE128_PATTERNS[106])) {
      const inner = bitStr.slice(11, bitStr.length - 13);
      if (inner.length >= 11 && inner.length % 11 === 0) {
        const symCount = inner.length / 11 - 1; // Last symbol is checksum
        let decoded = '';
        let ok = true;
        for (let s = 0; s < symCount; s++) {
          const pat = inner.slice(s * 11, (s + 1) * 11);
          const idx = CODE128_PATTERNS.indexOf(pat);
          if (idx >= 0 && idx <= 94) {
            decoded += String.fromCharCode(idx + 32);
          } else {
            ok = false;
            break;
          }
        }
        if (ok && decoded.length > 0) {
          return { format: 'code_128', rawValue: decoded };
        }
      }
    }
  }
  return null;
}

/**
 * Decodes QR Codes and 1D Barcodes from an HTMLImageElement / HTMLCanvasElement / ImageBitmap
 */
export async function decodeImageBarcodes(
  source: HTMLImageElement | HTMLCanvasElement,
  imageData?: ImageData
): Promise<DecodedCodeItem[]> {
  const GlobalBarcodeDetector = (globalThis as unknown as { BarcodeDetector?: any }).BarcodeDetector;
  if (typeof GlobalBarcodeDetector === 'function') {
    try {
      const detector = new GlobalBarcodeDetector({
        formats: ['qr_code', 'ean_13', 'code_128', 'upc_a', 'code_39', 'ean_8'],
      });
      const detected = await detector.detect(source);
      if (Array.isArray(detected) && detected.length > 0) {
        return detected.map((d: any) => ({
          format: d.format || 'qr_code',
          rawValue: d.rawValue || '',
        }));
      }
    } catch {
      // Fallback below
    }
  }

  if (imageData) {
    const fallback1D = scanlineDecode1DBarcode(imageData);
    if (fallback1D) {
      return [fallback1D];
    }
  }

  return [];
}
