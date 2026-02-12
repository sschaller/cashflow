import type { Parser } from './types.ts'
import { csvParser } from './csvParser.ts'
import { jsonParser } from './jsonParser.ts'

const parsers: Parser[] = [csvParser, jsonParser]

export function getParserForFile(filename: string): Parser | null {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return parsers.find((p) => p.extensions.includes(ext)) ?? null
}

export function getAllParsers(): Parser[] {
  return [...parsers]
}

export function getSupportedExtensions(): string[] {
  return parsers.flatMap((p) => p.extensions)
}
