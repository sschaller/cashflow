import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import type { Rule, RuleCondition, Category } from '@/types/models.ts'
import type { RuleField, RuleOperator } from '@/types/enums.ts'

interface RuleFormProps {
  rule?: Rule
  categories: Category[]
  transactionDescription?: string
  onSave: (rule: Omit<Rule, 'id'>) => void
  onCancel: () => void
}

const fieldOptions: { value: RuleField; label: string }[] = [
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
  { value: 'date', label: 'Date' },
  { value: 'accountId', label: 'Account' },
  { value: 'bankCategory', label: 'Bank Category' },
]

const operatorOptions: { value: RuleOperator; label: string; fields?: RuleField[] }[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'regex', label: 'Matches regex' },
  { value: 'greater_than', label: 'Greater than', fields: ['amount'] },
  { value: 'less_than', label: 'Less than', fields: ['amount'] },
  { value: 'between', label: 'Between', fields: ['amount', 'date'] },
]

const emptyCondition: RuleCondition = { field: 'description', operator: 'contains', value: '' }

const groupColors = [
  'bg-purple-200 dark:bg-purple-800',
  'bg-green-200 dark:bg-green-800',
  'bg-orange-200 dark:bg-orange-800',
  'bg-pink-200 dark:bg-pink-800',
  'bg-teal-200 dark:bg-teal-800',
]

function HighlightedDescription({ description, conditions }: { description: string; conditions: RuleCondition[] }) {
  const regexCondition = conditions.find((c) => c.field === 'description' && c.operator === 'regex' && c.value)

  const segments = useMemo(() => {
    if (!regexCondition) return null
    try {
      const re = new RegExp(regexCondition.value, 'i')
      const match = description.match(re)
      if (!match || match.index === undefined) return null

      const result: { text: string; type: 'plain' | 'match' | 'group'; groupIndex?: number }[] = []
      const fullStart = match.index
      const fullEnd = fullStart + match[0].length

      // Build group ranges (sub-matches within the full match)
      const groupRanges: { start: number; end: number; index: number }[] = []
      if (match.length > 1) {
        // Find each capture group's position within the original string
        let searchFrom = fullStart
        for (let g = 1; g < match.length; g++) {
          if (match[g] === undefined) continue
          const gStart = description.indexOf(match[g], searchFrom)
          if (gStart === -1 || gStart >= fullEnd) continue
          groupRanges.push({ start: gStart, end: gStart + match[g].length, index: g })
          searchFrom = gStart + match[g].length
        }
      }

      // Text before full match
      if (fullStart > 0) {
        result.push({ text: description.slice(0, fullStart), type: 'plain' })
      }

      // Walk through the full match, splitting at group boundaries
      if (groupRanges.length === 0) {
        result.push({ text: match[0], type: 'match' })
      } else {
        let pos = fullStart
        for (const gr of groupRanges) {
          if (gr.start > pos) {
            result.push({ text: description.slice(pos, gr.start), type: 'match' })
          }
          result.push({ text: description.slice(gr.start, gr.end), type: 'group', groupIndex: gr.index })
          pos = gr.end
        }
        if (pos < fullEnd) {
          result.push({ text: description.slice(pos, fullEnd), type: 'match' })
        }
      }

      // Text after full match
      if (fullEnd < description.length) {
        result.push({ text: description.slice(fullEnd), type: 'plain' })
      }

      return result
    } catch {
      return null
    }
  }, [description, regexCondition])

  if (!segments) {
    return <p className="font-medium text-gray-900 dark:text-white">{description}</p>
  }

  return (
    <p className="font-medium text-gray-900 dark:text-white">
      {segments.map((seg, i) => {
        if (seg.type === 'plain') return <span key={i}>{seg.text}</span>
        if (seg.type === 'group') {
          const colorClass = groupColors[(seg.groupIndex! - 1) % groupColors.length]
          return (
            <span key={i} className={`rounded px-0.5 ${colorClass}`} title={`$${seg.groupIndex}`}>
              {seg.text}
            </span>
          )
        }
        return (
          <span key={i} className="rounded px-0.5 bg-blue-200 dark:bg-blue-800">
            {seg.text}
          </span>
        )
      })}
    </p>
  )
}

export function RuleForm({ rule, categories, transactionDescription, onSave, onCancel }: RuleFormProps) {
  const [name, setName] = useState(rule?.name ?? '')
  const [conditions, setConditions] = useState<RuleCondition[]>(rule?.conditions ?? [{ ...emptyCondition }])
  const [categoryId, setCategoryId] = useState<string | undefined>(rule?.categoryId)
  const [displayDescription, setDisplayDescription] = useState(rule?.displayDescription ?? '')
  const [priority, setPriority] = useState(rule?.priority ?? 100)
  const [isEnabled, setIsEnabled] = useState(rule?.isEnabled ?? true)

  // Only allow assigning to leaf categories (those with no children)
  const parentIds = new Set(categories.filter((c) => c.parentId !== null).map((c) => c.parentId))
  const leafCategories = categories.filter((c) => !parentIds.has(c.id!))

  const selectClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
  const inputClass = selectClass

  const updateCondition = (index: number, changes: Partial<RuleCondition>) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...changes } : c)))
  }

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index))
  }

  const addCondition = () => {
    setConditions((prev) => [...prev, { ...emptyCondition }])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name: name.trim() || 'Unnamed Rule',
      conditions,
      categoryId,
      displayDescription: displayDescription.trim() || undefined,
      priority,
      isEnabled,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Rule Name</label>
        <input className={`w-full ${inputClass}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Grocery stores" />
      </div>

      {transactionDescription && conditions.some((c) => c.field === 'description' && c.operator === 'regex' && c.value) && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
          <p className="mb-1 text-gray-500 dark:text-gray-400">Match preview:</p>
          <HighlightedDescription description={transactionDescription} conditions={conditions} />
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Conditions <span className="text-gray-400">(all must match)</span>
        </label>
        <div className="space-y-2">
          {conditions.map((cond, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <select
                className={selectClass}
                value={cond.field}
                onChange={(e) => updateCondition(i, { field: e.target.value as RuleField })}
              >
                {fieldOptions.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              <select
                className={selectClass}
                value={cond.operator}
                onChange={(e) => updateCondition(i, { operator: e.target.value as RuleOperator })}
              >
                {operatorOptions
                  .filter((op) => !op.fields || op.fields.includes(cond.field))
                  .map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
              </select>

              <input
                className={`flex-1 ${inputClass}`}
                value={cond.value}
                onChange={(e) => updateCondition(i, { value: e.target.value })}
                placeholder="Value..."
              />

              {cond.operator === 'between' && (
                <input
                  className={inputClass}
                  value={cond.valueTo ?? ''}
                  onChange={(e) => updateCondition(i, { valueTo: e.target.value })}
                  placeholder="To..."
                />
              )}

              {conditions.length > 1 && (
                <button type="button" onClick={() => removeCondition(i)} className="text-red-400 hover:text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addCondition}>
          + Add Condition
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">Actions</label>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Assign to Category</label>
            <select className={`w-full ${selectClass}`} value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value || undefined)}>
              <option value="">No category change</option>
              {leafCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId !== null ? '  ' : ''}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Display Description</label>
            <input
              className={`w-full ${inputClass}`}
              value={displayDescription}
              onChange={(e) => setDisplayDescription(e.target.value)}
              placeholder="Override the displayed description..."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
          <input
            type="number"
            className={`w-full ${inputClass}`}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            min={0}
          />
          <p className="mt-1 text-xs text-gray-500">Lower number = higher priority</p>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="rounded"
            />
            Enabled
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Rule</Button>
      </div>
    </form>
  )
}
