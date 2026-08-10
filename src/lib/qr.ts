import "server-only";
import QRCode from "qrcode";

/**
 * QR codes in this app only ever encode a plain /check-in URL — never
 * anything that grants media access. See QR SYSTEM in the product spec.
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 320,
    color: { dark: "#0b0b0e", light: "#ffffff" },
  });
}
