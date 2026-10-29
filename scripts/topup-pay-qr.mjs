// Canonical payment QR lives outside the Pages publish directory.
// Release copies it into site/www.yanghat.cn only when TOPUP_OPEN=true.
import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

export const PAY_QR_HASH = '8649d800da4a2d74cc235c6690b4ed332ef707fb08b91016cf6a6428d8b7e817';
export const PAY_QR_SOURCE = 'site/topup-pay-qr/wechat-pay-qr.png';

export async function syncPayQr(open, publishRoot = 'site/www.yanghat.cn') {
  const dest = path.join(publishRoot, 'assets', 'wechat-pay-qr.png');
  if (!open) {
    await rm(dest, { force: true });
    return dest;
  }
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(PAY_QR_SOURCE, dest);
  return dest;
}
