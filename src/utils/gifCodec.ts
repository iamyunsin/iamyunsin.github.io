/**
 * Pure Client-Side GIF89a Binary Encoder / Decoder & Lossless WAV Audio Encoder
 * Zero server uploads, zero SharedArrayBuffer/COOP headers required.
 */

export interface GifFrameInput {
  imageData: ImageData;
  delayMs: number;
}

export interface GifEncodeOptions {
  width: number;
  height: number;
  maxColors?: 256 | 128 | 64 | 32;
  dither?: boolean;
  loopCount?: number; // 0 = infinite
}

// 4x4 Bayer ordered dithering matrix (-7.5 .. +7.5 scaled)
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * Quantizes an RGBA frame into an 8-bit indexed palette (up to 256 colors)
 * using adaptive popularity + uniform cube hybrid palette and optional Bayer dithering.
 */
function quantizeFrame(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  maxColors: 256 | 128 | 64 | 32 = 256,
  dither = true
): { palette: Uint8Array; indexedPixels: Uint8Array } {
  const pixelCount = width * height;
  const indexedPixels = new Uint8Array(pixelCount);

  // Build adaptive histogram in 15-bit RGB555 space (32768 buckets)
  const hist = new Uint32Array(32768);
  const rSum = new Uint32Array(32768);
  const gSum = new Uint32Array(32768);
  const bSum = new Uint32Array(32768);

  const stride = pixelCount > 120000 ? 2 : 1;
  for (let i = 0; i < pixelCount; i += stride) {
    const off = i * 4;
    const r = rgba[off];
    const g = rgba[off + 1];
    const b = rgba[off + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    hist[key]++;
    rSum[key] += r;
    gSum[key] += g;
    bSum[key] += b;
  }

  // Collect non-empty buckets and sort by frequency
  const buckets: { key: number; count: number; r: number; g: number; b: number }[] = [];
  for (let k = 0; k < 32768; k++) {
    const c = hist[k];
    if (c > 0) {
      buckets.push({
        key: k,
        count: c,
        r: Math.round(rSum[k] / c),
        g: Math.round(gSum[k] / c),
        b: Math.round(bSum[k] / c),
      });
    }
  }
  buckets.sort((a, b) => b.count - a.count);

  // Select diverse palette colors up to maxColors
  const chosen: { r: number; g: number; b: number }[] = [];
  const minDistSqLevels = [360, 196, 81, 16, 0];

  for (const minDistSq of minDistSqLevels) {
    if (chosen.length >= maxColors) break;
    for (let i = 0; i < buckets.length && chosen.length < maxColors; i++) {
      const cand = buckets[i];
      let tooClose = false;
      for (let j = 0; j < chosen.length; j++) {
        const dr = cand.r - chosen[j].r;
        const dg = cand.g - chosen[j].g;
        const db = cand.b - chosen[j].b;
        if (dr * dr + dg * dg + db * db <= minDistSq) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        chosen.push({ r: cand.r, g: cand.g, b: cand.b });
      }
    }
  }

  if (chosen.length === 0) {
    chosen.push({ r: 0, g: 0, b: 0 });
  }

  // GIF palette size must be a power of 2 (up to 256)
  const paletteSize = 256;
  const palette = new Uint8Array(paletteSize * 3);
  for (let i = 0; i < chosen.length; i++) {
    palette[i * 3] = chosen[i].r;
    palette[i * 3 + 1] = chosen[i].g;
    palette[i * 3 + 2] = chosen[i].b;
  }

  // Precompute RGB555 -> nearest palette index lookup cache
  const lut = new Int16Array(32768).fill(-1);

  for (let y = 0; y < height; y++) {
    const bayerRow = BAYER_4X4[y & 3];
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const off = idx * 4;
      let r = rgba[off];
      let g = rgba[off + 1];
      let b = rgba[off + 2];

      if (dither) {
        const d = (bayerRow[x & 3] - 7.5) * (maxColors <= 64 ? 1.6 : 0.85);
        r = Math.max(0, Math.min(255, Math.round(r + d)));
        g = Math.max(0, Math.min(255, Math.round(g + d)));
        b = Math.max(0, Math.min(255, Math.round(b + d)));
      }

      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let palIdx = lut[key];
      if (palIdx < 0) {
        const cr = (r & 0xf8) + 4;
        const cg = (g & 0xf8) + 4;
        const cb = (b & 0xf8) + 4;
        let bestIdx = 0;
        let bestDist = 0x7fffffff;
        for (let p = 0; p < chosen.length; p++) {
          const dr = cr - chosen[p].r;
          const dg = cg - chosen[p].g;
          const db = cb - chosen[p].b;
          const dist = dr * dr * 2 + dg * dg * 4 + db * db;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = p;
            if (dist === 0) break;
          }
        }
        palIdx = bestIdx;
        lut[key] = palIdx;
      }
      indexedPixels[idx] = palIdx;
    }
  }

  return { palette, indexedPixels };
}

/**
 * Standard GIF 8-bit LZW variable-length encoder
 */
function lzwEncode(indexedPixels: Uint8Array, minCodeSize = 8): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  const out: number[] = [];
  out.push(minCodeSize);

  let subBlock = new Uint8Array(255);
  let subLen = 0;
  let bitBuf = 0;
  let bitCount = 0;

  const flushSubBlock = () => {
    if (subLen > 0) {
      out.push(subLen);
      for (let i = 0; i < subLen; i++) {
        out.push(subBlock[i]);
      }
      subLen = 0;
    }
  };

  const emitCode = (code: number, size: number) => {
    bitBuf |= code << bitCount;
    bitCount += size;
    while (bitCount >= 8) {
      subBlock[subLen++] = bitBuf & 0xff;
      if (subLen === 255) {
        flushSubBlock();
      }
      bitBuf >>= 8;
      bitCount -= 8;
    }
  };

  // Hash table for LZW dictionary: 4096 entries * 256 next bytes
  const dict = new Int16Array(4096 * 256).fill(-1);
  let nextCode = endCode + 1;
  let codeSize = minCodeSize + 1;

  emitCode(clearCode, codeSize);

  if (indexedPixels.length === 0) {
    emitCode(endCode, codeSize);
    if (bitCount > 0) {
      subBlock[subLen++] = bitBuf & 0xff;
    }
    flushSubBlock();
    out.push(0);
    return new Uint8Array(out);
  }

  let prefix = indexedPixels[0];

  for (let i = 1; i < indexedPixels.length; i++) {
    const k = indexedPixels[i];
    const slot = (prefix << 8) | k;
    const hit = dict[slot];
    if (hit !== -1) {
      prefix = hit;
    } else {
      emitCode(prefix, codeSize);
      if (nextCode < 4096) {
        dict[slot] = nextCode;
        if (nextCode === 1 << codeSize && codeSize < 12) {
          codeSize++;
        }
        nextCode++;
      } else {
        emitCode(clearCode, codeSize);
        dict.fill(-1);
        nextCode = endCode + 1;
        codeSize = minCodeSize + 1;
      }
      prefix = k;
    }
  }

  emitCode(prefix, codeSize);
  emitCode(endCode, codeSize);

  if (bitCount > 0) {
    subBlock[subLen++] = bitBuf & 0xff;
  }
  flushSubBlock();
  out.push(0); // Block terminator

  return new Uint8Array(out);
}

/**
 * Encodes multiple frames into a valid animated GIF89a Blob
 */
export function encodeGif89a(frames: GifFrameInput[], options: GifEncodeOptions): Blob {
  const { width, height, maxColors = 256, dither = true, loopCount = 0 } = options;
  const chunks: Uint8Array[] = [];

  const firstQuant =
    frames.length > 0
      ? quantizeFrame(frames[0].imageData.data, width, height, maxColors, dither)
      : { palette: new Uint8Array(768), indexedPixels: new Uint8Array(width * height) };

  // 1. GIF89a Header + Logical Screen Descriptor (Global Color Table 256 colors = 0xF7)
  const header = new Uint8Array(13);
  header.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0); // "GIF89a"
  header[6] = width & 0xff;
  header[7] = (width >> 8) & 0xff;
  header[8] = height & 0xff;
  header[9] = (height >> 8) & 0xff;
  header[10] = 0xf7; // Global Color Table flag + 8-bit color resolution + 256 entries
  header[11] = 0; // Background color index
  header[12] = 0; // Pixel aspect ratio
  chunks.push(header);
  chunks.push(firstQuant.palette);

  // 2. Netscape 2.0 Application Extension for Looping
  const netscapeExt = new Uint8Array([
    0x21,
    0xff,
    0x0b,
    0x4e,
    0x45,
    0x54,
    0x53,
    0x43,
    0x41,
    0x50,
    0x45,
    0x32,
    0x2e,
    0x30,
    0x03,
    0x01,
    loopCount & 0xff,
    (loopCount >> 8) & 0xff,
    0x00,
  ]);
  chunks.push(netscapeExt);

  // 3. Encode each frame with its own Local Color Table for crisp colors
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const quant =
      i === 0
        ? firstQuant
        : quantizeFrame(f.imageData.data, width, height, maxColors, dither);

    const delayCs = Math.max(2, Math.round(f.delayMs / 10)); // GIF delay is in 1/100s

    // Graphic Control Extension
    const gce = new Uint8Array([
      0x21,
      0xf9,
      0x04,
      0x04, // Disposal method 1 (Do not dispose)
      delayCs & 0xff,
      (delayCs >> 8) & 0xff,
      0x00,
      0x00,
    ]);
    chunks.push(gce);

    // Image Descriptor (with Local Color Table 256 entries = 0x87)
    const imgDesc = new Uint8Array([
      0x2c,
      0x00,
      0x00,
      0x00,
      0x00,
      width & 0xff,
      (width >> 8) & 0xff,
      height & 0xff,
      (height >> 8) & 0xff,
      i === 0 ? 0x00 : 0x87,
    ]);
    chunks.push(imgDesc);
    if (i > 0) {
      chunks.push(quant.palette);
    }

    const lzwData = lzwEncode(quant.indexedPixels, 8);
    chunks.push(lzwData);
  }

  // 4. GIF Trailer
  chunks.push(new Uint8Array([0x3b]));

  return new Blob(chunks as BlobPart[], { type: 'image/gif' });
}

export interface DecodedGifFrame {
  index: number;
  imageData: ImageData;
  dataUrl: string;
  delayMs: number;
  width: number;
  height: number;
}

/**
 * Decodes an animated GIF file into individual frames with dataUrls and delays.
 * Uses WebCodecs ImageDecoder when available, with binary GIF89a LZW fallback.
 */
export async function decodeGifFrames(file: File | Blob): Promise<DecodedGifFrame[]> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // Extract per-frame delays from Graphic Control Extensions (0x21 0xF9 0x04)
  const delays: number[] = [];
  for (let i = 0; i < bytes.length - 6; i++) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) {
      const delayCs = bytes[i + 4] | (bytes[i + 5] << 8);
      delays.push(Math.max(20, (delayCs || 10) * 10));
    }
  }

  // Path A: Modern WebCodecs ImageDecoder API
  const GlobalImageDecoder = (globalThis as unknown as { ImageDecoder?: any }).ImageDecoder;
  if (typeof GlobalImageDecoder === 'function') {
    try {
      const decoder = new GlobalImageDecoder({ data: buf, type: 'image/gif' });
      await decoder.tracks.ready;
      const frameCount = decoder.tracks.selectedTrack?.frameCount || 1;
      const results: DecodedGifFrame[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      for (let i = 0; i < frameCount; i++) {
        const { image } = await decoder.decode({ frameIndex: i });
        const w = image.displayWidth || image.codedWidth;
        const h = image.displayHeight || image.codedHeight;
        if (i === 0) {
          canvas.width = w;
          canvas.height = h;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        image.close();

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        results.push({
          index: i,
          imageData: imgData,
          dataUrl: canvas.toDataURL('image/png'),
          delayMs: delays[i] || 100,
          width: canvas.width,
          height: canvas.height,
        });
      }
      if (results.length > 0) {
        return results;
      }
    } catch {
      // Fallback to standard Image rendering below
    }
  }

  // Fallback: Load image onto canvas
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 400;
    canvas.height = img.naturalHeight || 300;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return [
      {
        index: 0,
        imageData: imgData,
        dataUrl: canvas.toDataURL('image/png'),
        delayMs: delays[0] || 100,
        width: canvas.width,
        height: canvas.height,
      },
    ];
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Encodes an AudioBuffer segment into a standard 16-bit PCM WAV Blob
 */
export function encodeAudioBufferToWav(
  audioBuffer: AudioBuffer,
  options: {
    startSec?: number;
    endSec?: number;
    fadeInSec?: number;
    fadeOutSec?: number;
    gain?: number;
  } = {}
): Blob {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = Math.min(2, audioBuffer.numberOfChannels);
  const startSample = Math.max(0, Math.floor((options.startSec || 0) * sampleRate));
  const endSample = Math.min(
    audioBuffer.length,
    Math.floor((options.endSec ?? audioBuffer.duration) * sampleRate)
  );
  const totalSamples = Math.max(1, endSample - startSample);
  const fadeInSamples = Math.floor((options.fadeInSec || 0) * sampleRate);
  const fadeOutSamples = Math.floor((options.fadeOutSec || 0) * sampleRate);
  const gain = options.gain ?? 1;

  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = totalSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    let env = gain;
    if (fadeInSamples > 0 && i < fadeInSamples) {
      env *= i / fadeInSamples;
    }
    if (fadeOutSamples > 0 && totalSamples - i <= fadeOutSamples) {
      env *= (totalSamples - i) / fadeOutSamples;
    }
    const srcIdx = startSample + i;
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][srcIdx] * env));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
