import sharp from 'sharp';
import { config } from '../config';

export async function encodeTile(pngBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels; // always 4 after ensureAlpha
  const pixelCount = info.width * info.height;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
    const positionSalt = (pixelIndex * 31) & 0xFF;
    const key = config.xorKey ^ positionSalt;
    const base = pixelIndex * channels;
    data[base]     = data[base]     ^ key; // R
    data[base + 1] = data[base + 1] ^ key; // G
    data[base + 2] = data[base + 2] ^ key; // B
    // data[base + 3] = alpha, unchanged
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels }
  }).png().toBuffer();
}
