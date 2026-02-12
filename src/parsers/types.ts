export interface ParsedRow {
  [key: string]: string
}

export interface ParseResult {
  headers: string[]
  rows: ParsedRow[]
  rowCount: number
  errors: string[]
}

export interface Parser {
  name: string
  extensions: string[]
  parse(content: string, skipRows?: number): Promise<ParseResult>
}
