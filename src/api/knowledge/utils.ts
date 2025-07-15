// knowledge.utils.ts
import { parse } from 'csv-parse/sync';

/**
 * Parse raw CSV string into array of objects (each row).
 * Using `csv-parse` for synchronous parse.
 */
export function parseCsvToRecords(csvContent: string): Record<string, any>[] {
  return parse(csvContent, {
    columns: true, // treat first line as headers
    skip_empty_lines: true,
  });
}

/**
 * Chunk an array into sub-arrays of a given size.
 */
export function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}
