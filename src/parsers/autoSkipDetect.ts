import { getParserForFile } from './index.ts'

/**
 * Finds the optimal number of rows to skip before the header row by trying
 * increasing skip values and picking the one with the most parsed rows
 * and fewest errors. Stops early when remaining rows can't beat the current best.
 */
export async function findOptimalSkipRows(
  content: string,
  filename: string,
  maxSkip: number = 20
): Promise<number> {
  const parser = getParserForFile(filename)
  if (!parser) return 0

  let bestSkip = 0
  let bestScore = 0

  for (let skip = 0; skip <= maxSkip; skip++) {
    const result = await parser.parse(content, skip)
    const score = result.rowCount - result.errors.length

    // Early exit: if total rows can't beat our best, no future skip can either
    if (result.rowCount <= bestScore) break

    if (score > bestScore) {
      bestScore = score
      bestSkip = skip
    }
  }

  return bestSkip
}
