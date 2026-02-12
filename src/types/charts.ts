export interface CategoryBreakdownItem {
  categoryId: number
  categoryName: string
  color: string
  amount: number
  percentage: number
  transactionCount: number
}

export interface MonthlyTotal {
  month: string
  income: number
  expenses: number
  net: number
}

export interface SankeyNode {
  name: string
  id: string
}

export interface SankeyLink {
  source: number
  target: number
  value: number
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

export interface DashboardSummary {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  topCategory: { name: string; amount: number } | null
  transactionCount: number
}
