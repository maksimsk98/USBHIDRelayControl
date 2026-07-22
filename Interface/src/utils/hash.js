export async function hashBlobSHA256(blob) {
  const arrayBuffer = await blob.arrayBuffer(); // read blob into memory
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

  // Convert ArrayBuffer → hex string
  return [...new Uint8Array(hashBuffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function stableStringify(value) { // TODO WATCHLIST will have analog on serverside after dynamic queues
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  } if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function hashObjectSHA256(obj) {
  const json = stableStringify(obj);
  const encoder = new TextEncoder();
  const data = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const buildPoorQuickXYHash = (x = [], y = [], buckets = 5) => {
  const len = Math.min(x.length, y.length);

  if (len === 0) return 'empty';

  const take = Math.min(buckets, len);
  const step = len / take;

  let acc = '';

  for (let i = 0; i < take; i++) {
    const idx = Math.floor(i * step);
    const xv = x[idx];
    const yv = y[idx];

    // ограничиваем точность, чтобы мелкий шум не триггерил diff
    acc += `${Number(xv).toFixed(3)}:${Number(yv).toFixed(3)}|`;
  }

  return acc;
};
