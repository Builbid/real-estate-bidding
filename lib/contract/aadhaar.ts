const MULTIPLICATION_TABLE = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
] as const;

const PERMUTATION_TABLE = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
] as const;

export function digitsOnlyAadhaar(value: string): string {
  return value.replace(/\D/g, '').slice(0, 12);
}

export function formatAadhaarInput(value: string): string {
  const digits = digitsOnlyAadhaar(value);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function verhoeffValid(digits: string): boolean {
  let checksum = 0;
  const reversed = digits.split('').reverse();
  for (let i = 0; i < reversed.length; i += 1) {
    const num = Number(reversed[i]);
    if (!Number.isInteger(num)) return false;
    checksum = MULTIPLICATION_TABLE[checksum][PERMUTATION_TABLE[i % 8][num]];
  }
  return checksum === 0;
}

export function isValidAadhaarNumber(value: string): boolean {
  const digits = digitsOnlyAadhaar(value);
  if (!/^[2-9]\d{11}$/.test(digits)) return false;
  return verhoeffValid(digits);
}

export function aadhaarLast4(value: string): string {
  const digits = digitsOnlyAadhaar(value);
  return digits.slice(-4);
}

export function maskAadhaarLast4(last4: string): string {
  const safe = last4.replace(/\D/g, '').slice(-4).padStart(4, '•');
  return `XXXX XXXX ${safe}`;
}
