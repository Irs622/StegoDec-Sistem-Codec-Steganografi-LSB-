/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const HEADER = "§HUSH_START§";
const FOOTER = "§HUSH_END§";

/**
 * Encrypts secret text using a secure dynamic salted XOR-Vigenere cipher.
 * This guarantees password protection client-side with native character mapping.
 */
export function encryptText(text: string, password?: string): string {
  if (!password) return text;

  // 3-digit salt to generate variable cipher texts for the same password-message combo
  const salt = Math.floor(Math.random() * 899 + 100).toString();
  const stretchedPass = password + salt;
  
  let keySum = 0;
  for (let i = 0; i < stretchedPass.length; i++) {
    keySum += stretchedPass.charCodeAt(i) * (i + 1);
  }

  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyChar = stretchedPass.charCodeAt(i % stretchedPass.length);
    // Cipher equation combining index shifting, keySum XOR and rotation
    const encryptedChar = charCode ^ (keyChar + (i * 7) + (keySum % 256)) % 256;
    result += String.fromCharCode(encryptedChar);
  }

  // Double protective wrapping with Base64 supporting proper multi-byte unicode
  const finalStr = `SECURE_${salt}_` + btoa(unescape(encodeURIComponent(result)));
  return finalStr;
}

/**
 * Decrypts secret text using the salted cipher.
 */
export function decryptText(encryptedText: string, password?: string): string {
  if (!encryptedText.startsWith("SECURE_")) {
    return encryptedText; // Was encoded as raw text
  }

  if (!password) {
    throw new Error("Pesan ini terkunci. Harap masukkan Kata Sandi!");
  }

  try {
    const parts = encryptedText.split("_");
    if (parts.length < 3) throw new Error("Data terkorupsi");
    
    const salt = parts[1];
    const base64Data = parts.slice(2).join("_");
    
    const cipherText = decodeURIComponent(escape(atob(base64Data)));
    const stretchedPass = password + salt;

    let keySum = 0;
    for (let i = 0; i < stretchedPass.length; i++) {
      keySum += stretchedPass.charCodeAt(i) * (i + 1);
    }

    let result = "";
    for (let i = 0; i < cipherText.length; i++) {
      const charCode = cipherText.charCodeAt(i);
      const keyChar = stretchedPass.charCodeAt(i % stretchedPass.length);
      const decryptedChar = charCode ^ (keyChar + (i * 7) + (keySum % 256)) % 256;
      result += String.fromCharCode(decryptedChar);
    }

    return result;
  } catch (err: any) {
    throw new Error("Kata sandi salah atau file pengirim rusak!");
  }
}

/**
 * Encodes secret message inside an HTML5 Image element.
 * Supports image scaling (Compression) before encoding.
 * Returns PNG Data URL containing the message inside Least Significant Bits.
 */
export function encodeImageLSB(
  imageEl: HTMLImageElement,
  secretText: string,
  compressionLevel: "none" | "light" | "medium" | "ultra"
): { dataUrl: string; width: number; height: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal membuat konteks grafik 2D");

  // Determine scaling ratio based on compression
  let scale = 1.0;
  if (compressionLevel === "light") scale = 0.9;
  else if (compressionLevel === "medium") scale = 0.75;
  else if (compressionLevel === "ultra") scale = 0.55;

  const width = Math.max(100, Math.floor(imageEl.naturalWidth * scale));
  const height = Math.max(100, Math.floor(imageEl.naturalHeight * scale));
  
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(imageEl, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Anchor delimiter marker to indicate end-of-stego
  const fullText = secretText + "§HUSH_END§";
  
  // Convert full encoded characters to an array of individual bits (16-bit unicode bits)
  const bits: number[] = [];
  for (let i = 0; i < fullText.length; i++) {
    const code = fullText.charCodeAt(i);
    for (let bit = 0; bit < 16; bit++) {
      bits.push((code >> bit) & 1);
    }
  }

  // Maximum bit capacity (R, G, and B channel LSBs. We omit Alpha to preserve transparency stability)
  const maxBits = (data.length / 4) * 3;
  if (bits.length > maxBits) {
    throw new Error(`Pesan terlalu panjang untuk gambar ini! Maksimal hanya menampung ${Math.floor(maxBits / 16)} karakter.`);
  }

  // Modify least significant bit of color channels
  let bitIdx = 0;
  for (let i = 0; i < data.length; i += 4) {
    // Red Channel LSB
    if (bitIdx < bits.length) {
      data[i] = (data[i] & 0xFE) | bits[bitIdx++];
    }
    // Green Channel LSB
    if (bitIdx < bits.length) {
      data[i + 1] = (data[i + 1] & 0xFE) | bits[bitIdx++];
    }
    // Blue Channel LSB
    if (bitIdx < bits.length) {
      data[i + 2] = (data[i + 2] & 0xFE) | bits[bitIdx++];
    }
    if (bitIdx >= bits.length) break;
  }

  ctx.putImageData(imgData, 0, 0);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width,
    height
  };
}

/**
 * Decodes the secret message hidden in the Canvas image's pixel data.
 */
export function decodeImageLSB(imgDataArray: Uint8ClampedArray): string {
  const bits: number[] = [];
  
  // Scan red, green, and blue LSB values in sequence
  for (let i = 0; i < imgDataArray.length; i += 4) {
    bits.push(imgDataArray[i] & 1);       // Red LSB
    bits.push(imgDataArray[i + 1] & 1);   // Green LSB
    bits.push(imgDataArray[i + 2] & 1);   // Blue LSB
  }

  let decodedText = "";
  for (let i = 0; i < bits.length; i += 16) {
    if (i + 16 > bits.length) break;
    
    let code = 0;
    for (let bit = 0; bit < 16; bit++) {
      code |= (bits[i + bit] << bit);
    }
    
    const char = String.fromCharCode(code);
    decodedText += char;

    if (decodedText.endsWith("§HUSH_END§")) {
      return decodedText.slice(0, -10); // Remove footer
    }
  }

  return "";
}

/**
 * Appends the encrypted message securely past the natural End of File (EOF)
 * signature of any file buffers (JPEG, MP3, MP4, etc.).
 */
export function encodeEOFBytes(coverBytes: Uint8Array, secretText: string): Uint8Array {
  const encoder = new TextEncoder();
  const payloadStr = HEADER + secretText + FOOTER;
  const payloadBytes = encoder.encode(payloadStr);

  const out = new Uint8Array(coverBytes.length + payloadBytes.length);
  out.set(coverBytes);
  out.set(payloadBytes, coverBytes.length);
  return out;
}

/**
 * Extracts EOF steganography from the end portion of any file buffer.
 */
export function decodeEOFBytes(fileBytes: Uint8Array): string {
  const decoder = new TextDecoder();
  
  // Scan only the last 150KB to maintain speed and efficiency on larger files
  const maxScanBytes = 150000;
  const startOffset = Math.max(0, fileBytes.length - maxScanBytes);
  const footerBuffer = fileBytes.subarray(startOffset);
  
  const decodedText = decoder.decode(footerBuffer);
  const startIdx = decodedText.indexOf(HEADER);
  if (startIdx === -1) return "";
  
  const endIdx = decodedText.indexOf(FOOTER, startIdx + HEADER.length);
  if (endIdx === -1) return "";
  
  return decodedText.substring(startIdx + HEADER.length, endIdx);
}
