export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'cash'

export type TransactionType = 'income' | 'expense' | 'transfer'

export type ImportFormat = 'csv' | 'json'

export type RuleOperator =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'greater_than'
  | 'less_than'
  | 'between'

export type RuleField = 'description' | 'amount' | 'date' | 'accountId' | 'bankCategory'
