import * as FileSystem from 'expo-file-system/legacy';

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

function decodeBase64(base64Str: string): Uint8Array {
  // Remove any whitespace or newlines
  const base64 = base64Str.replace(/[\s\r\n]+/g, '');
  const len = base64.length;
  let p = 0;
  if (base64[len - 1] === '=') {
    p++;
    if (base64[len - 2] === '=') {
      p++;
    }
  }

  const bytes = new Uint8Array(Math.floor(len * 0.75) - p);
  let coords = 0;

  for (let i = 0; i < len; i += 4) {
    const c1 = lookup[base64.charCodeAt(i)] || 0;
    const c2 = lookup[base64.charCodeAt(i + 1)] || 0;
    const c3 = lookup[base64.charCodeAt(i + 2)] || 0;
    const c4 = lookup[base64.charCodeAt(i + 3)] || 0;

    const chunk = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4;

    bytes[coords++] = (chunk >> 16) & 255;
    if (coords < bytes.length) bytes[coords++] = (chunk >> 8) & 255;
    if (coords < bytes.length) bytes[coords++] = chunk & 255;
  }
  return bytes;
}

function readUTF16String(bytes: Uint8Array, offset: number, length: number): string {
  // Skip BOM if present
  let start = offset;
  let len = length;
  if (len >= 2) {
    if ((bytes[start] === 0xFE && bytes[start + 1] === 0xFF) || (bytes[start] === 0xFF && bytes[start + 1] === 0xFE)) {
      start += 2;
      len -= 2;
    }
  }
  
  let str = '';
  // Check UTF-16 endianness
  const isBE = bytes[offset] === 0xFE && bytes[offset + 1] === 0xFF;
  
  for (let i = 0; i < len - 1; i += 2) {
    const val = isBE 
      ? (bytes[start + i] << 8) | bytes[start + i + 1]
      : bytes[start + i] | (bytes[start + i + 1] << 8);
    if (val === 0) break; // null terminator
    str += String.fromCharCode(val);
  }
  return str;
}

function readUTF8String(bytes: Uint8Array, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    const val = bytes[offset + i];
    if (val === 0) break; // null terminator
    str += String.fromCharCode(val);
  }
  try {
    return decodeURIComponent(escape(str)); // Simple utf-8 decoding fallback
  } catch {
    return str;
  }
}

export interface LocalMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number; // in seconds
  coverBase64?: string; // base64 representation of cover image
  coverMime?: string; // e.g. image/jpeg
}

export async function parseLocalMetadata(fileUri: string): Promise<LocalMetadata | null> {
  try {
    // 1. Leer los primeros 10 bytes para obtener el encabezado ID3 y tamaño exacto
    const headerBase64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 10,
      position: 0,
    });

    if (!headerBase64) return null;
    const headerData = decodeBase64(headerBase64);

    // Verificar firma ID3 "ID3"
    if (headerData[0] !== 0x49 || headerData[1] !== 0x44 || headerData[2] !== 0x33) {
      return null; // No es ID3v2
    }

    const version = headerData[3];
    // El tamaño en ID3v2 es un entero "synchsafe" (4 bytes, 7 bits útiles por byte)
    const id3Size = (headerData[6] << 21) | (headerData[7] << 14) | (headerData[8] << 7) | headerData[9];

    // Limitar la lectura máxima a 12MB para evitar desbordar memoria con portadas gigantescas
    const readLength = Math.min(id3Size + 10, 1024 * 1024 * 12);

    // 2. Leer exactamente el tamaño del bloque ID3 completo
    const tagBase64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: readLength,
      position: 0,
    });

    if (!tagBase64) return null;
    const data = decodeBase64(tagBase64);
    
    const metadata: LocalMetadata = {};
    let offset = 10; // Omitir el encabezado inicial

    // Parse frames
    while (offset < id3Size + 10 && offset < data.length - 10) {
      // Frame ID (4 bytes)
      const frameId = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
      if (frameId.charCodeAt(0) === 0) break; // Padding / End of tags

      // Frame Size (4 bytes)
      let frameSize = 0;
      if (version === 4) {
        // ID3v2.4 uses synchsafe size
        frameSize = (data[offset + 4] << 21) | (data[offset + 5] << 14) | (data[offset + 6] << 7) | data[offset + 7];
      } else {
        // ID3v2.3 uses normal size
        frameSize = (data[offset + 4] << 24) | (data[offset + 5] << 16) | (data[offset + 6] << 8) | data[offset + 7];
      }

      if (frameSize <= 0 || offset + 10 + frameSize > data.length) {
        break;
      }

      const contentOffset = offset + 10;
      const frameData = data.subarray(contentOffset, contentOffset + frameSize);

      if (frameId === 'TIT2' || frameId === 'TT2') {
        metadata.title = parseTextFrame(frameData);
      } else if (frameId === 'TPE1' || frameId === 'TP1') {
        metadata.artist = parseTextFrame(frameData);
      } else if (frameId === 'TALB' || frameId === 'TAL') {
        metadata.album = parseTextFrame(frameData);
      } else if (frameId === 'TLEN' || frameId === 'TLE') {
        // Duration in ms
        const msStr = parseTextFrame(frameData);
        const ms = parseInt(msStr, 10);
        if (!isNaN(ms)) {
          metadata.duration = Math.round(ms / 1000);
        }
      } else if (frameId === 'APIC' || frameId === 'PIC') {
        try {
          parseAPICFrame(frameData, metadata);
        } catch (err) {
          console.warn('Error parsing APIC frame:', err);
        }
      }

      offset += 10 + frameSize;
    }

    return metadata;
  } catch (error) {
    console.warn('Error parsing local ID3 metadata:', error);
    return null;
  }
}

function parseTextFrame(data: Uint8Array): string {
  if (data.length <= 1) return '';
  const encoding = data[0];
  const textBytes = data.subarray(1);

  if (encoding === 1 || encoding === 2) {
    return readUTF16String(textBytes, 0, textBytes.length);
  } else {
    return readUTF8String(textBytes, 0, textBytes.length);
  }
}

function parseAPICFrame(data: Uint8Array, metadata: LocalMetadata) {
  if (data.length <= 5) return;
  const encoding = data[0];
  
  // Find MIME type (null-terminated string)
  let mimeStart = 1;
  let mimeEnd = mimeStart;
  while (mimeEnd < data.length && data[mimeEnd] !== 0) {
    mimeEnd++;
  }
  
  const mimeType = String.fromCharCode.apply(null, Array.from(data.subarray(mimeStart, mimeEnd)));
  metadata.coverMime = mimeType;

  // Next byte is picture type (usually 3 for front cover)
  const picType = data[mimeEnd + 1];

  // Description is null-terminated string
  let descStart = mimeEnd + 2;
  let descEnd = descStart;
  
  if (encoding === 1 || encoding === 2) {
    // UTF-16 uses 2 null bytes as terminator
    while (descEnd < data.length - 1 && !(data[descEnd] === 0 && data[descEnd + 1] === 0)) {
      descEnd += 2;
    }
    descEnd += 2; // skip terminator
  } else {
    while (descEnd < data.length && data[descEnd] !== 0) {
      descEnd++;
    }
    descEnd++; // skip terminator
  }

  const imageBytes = data.subarray(descEnd);
  if (imageBytes.length > 0) {
    // Convert to base64
    let binary = '';
    const len = imageBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(imageBytes[i]);
    }
    metadata.coverBase64 = btoa(binary);
  }
}
