import { useRef, useEffect, useMemo } from 'react'
import { sankey, sankeyLinkHorizontal, type SankeyNode as D3SankeyNode, type SankeyLink as D3SankeyLink } from 'd3-sankey'
import { ChartContainer } from './ChartContainer.tsx'
import { formatCurrencyOrPlain } from '@/utils/currencyUtils.ts'
import type { Transaction, Category } from '@/types/models.ts'

interface SankeyDiagramProps {
  transactions: Transaction[]
  categories: Category[]
  currency: string | null
  bare?: boolean
  onCategoryClick?: (categoryId: number) => void
}

interface SNode {
  name: string
  id: string
  color?: string
}

interface SLink {
  source: string
  target: string
  value: number
}

export function SankeyDiagram({ transactions, categories, currency, bare, onCategoryClick }: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const catMap = useMemo(() => {
    const m = new Map<number, Category>()
    for (const c of categories) m.set(c.id!, c)
    return m
  }, [categories])

  const { nodes, links, isEmpty } = useMemo(() => {
    const nodeSet = new Map<string, SNode>()
    const linkMap = new Map<string, number>()

    const ensureNode = (id: string, name: string, color?: string) => {
      if (!nodeSet.has(id)) {
        nodeSet.set(id, { name, id, color })
      }
    }

    const addLink = (sourceId: string, targetId: string, value: number) => {
      if (sourceId === targetId || value <= 0) return
      const key = `${sourceId}|||${targetId}`
      linkMap.set(key, (linkMap.get(key) ?? 0) + value)
    }

    let totalIncome = 0
    let totalExpenses = 0

    ensureNode('budget', 'Budget', '#78909C')

    for (const tx of transactions) {
      const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined
      const catId = cat?.id ?? 0

      if (tx.amount > 0) {
        // Income: income-cat → Budget
        const catNodeId = `income-cat-${catId}`
        ensureNode(catNodeId, cat?.name ?? 'Uncategorized', cat?.color)
        addLink(catNodeId, 'budget', tx.amount)
        totalIncome += tx.amount
      } else if (tx.amount < 0) {
        // Expense: Budget → expense-cat (→ expense-subcat)
        const parentCat = cat?.parentId ? catMap.get(cat.parentId) : null
        const absAmount = Math.abs(tx.amount)

        if (parentCat) {
          const parentNodeId = `expense-cat-${parentCat.id}`
          const childNodeId = `expense-subcat-${cat!.id}`
          ensureNode(parentNodeId, parentCat.name, parentCat.color)
          ensureNode(childNodeId, cat!.name, cat!.color)
          addLink('budget', parentNodeId, absAmount)
          addLink(parentNodeId, childNodeId, absAmount)
        } else {
          const catNodeId = `expense-cat-${catId}`
          ensureNode(catNodeId, cat?.name ?? 'Uncategorized', cat?.color)
          addLink('budget', catNodeId, absAmount)
        }

        totalExpenses += absAmount
      }
    }

    // Add savings node if income > expenses
    const surplus = totalIncome - totalExpenses
    if (surplus > 0) {
      ensureNode('savings', 'Savings', '#4CAF50')
      addLink('budget', 'savings', surplus)
    }

    const nodeList = Array.from(nodeSet.values())
    const linkList: SLink[] = []
    for (const [key, value] of linkMap) {
      const [source, target] = key.split('|||')
      if (nodeSet.has(source) && nodeSet.has(target)) {
        linkList.push({ source, target, value })
      }
    }

    return { nodes: nodeList, links: linkList, isEmpty: linkList.length === 0 }
  }, [transactions, catMap])

  useEffect(() => {
    if (!svgRef.current || isEmpty) return

    const svg = svgRef.current
    const width = svg.clientWidth || 800
    const height = Math.max(400, nodes.length * 30)

    while (svg.firstChild) svg.removeChild(svg.firstChild)
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)

    const sankeyGenerator = sankey<SNode, SLink>()
      .nodeId((d) => d.id)
      .nodeWidth(16)
      .nodePadding(12)
      .extent([[1, 5], [width - 1, height - 5]])

    const graph = sankeyGenerator({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    })

    const getNodeColor = (node: SNode & { color?: string }) => {
      return node.color ?? '#9E9E9E'
    }

    // Draw links
    const linkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    linkGroup.setAttribute('fill', 'none')
    linkGroup.setAttribute('stroke-opacity', '0.3')

    for (const link of graph.links) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const pathD = sankeyLinkHorizontal()(link as unknown as D3SankeyLink<SNode, SLink>)
      if (pathD) path.setAttribute('d', pathD)
      const sourceNode = link.source as D3SankeyNode<SNode, SLink>
      path.setAttribute('stroke', getNodeColor(sourceNode))
      path.setAttribute('stroke-width', String(Math.max(1, link.width ?? 1)))
      path.addEventListener('mouseenter', () => path.setAttribute('stroke-opacity', '0.6'))
      path.addEventListener('mouseleave', () => path.setAttribute('stroke-opacity', '0.3'))

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
      const sName = (link.source as D3SankeyNode<SNode, SLink>).name
      const tName = (link.target as D3SankeyNode<SNode, SLink>).name
      title.textContent = `${sName} \u2192 ${tName}: ${formatCurrencyOrPlain(link.value ?? 0, currency)}`
      path.appendChild(title)
      linkGroup.appendChild(path)
    }
    svg.appendChild(linkGroup)

    // Draw nodes
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    for (const node of graph.nodes) {
      const x0 = node.x0 ?? 0
      const x1 = node.x1 ?? 0
      const y0 = node.y0 ?? 0
      const y1 = node.y1 ?? 0

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', String(x0))
      rect.setAttribute('y', String(y0))
      rect.setAttribute('width', String(x1 - x0))
      rect.setAttribute('height', String(Math.max(1, y1 - y0)))
      rect.setAttribute('fill', getNodeColor(node))
      rect.setAttribute('rx', '2')

      // Parse node ID to determine click behavior
      const nodeId = node.id ?? ''
      const catMatch = nodeId.match(/^(?:income-cat|expense-cat|expense-subcat)-(\d+)$/)
      if (catMatch && onCategoryClick) {
        rect.style.cursor = 'pointer'
        const id = Number(catMatch[1])
        rect.addEventListener('click', () => onCategoryClick(id))
      }

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = `${node.name}: ${formatCurrencyOrPlain(node.value ?? 0, currency)}`
      rect.appendChild(title)
      nodeGroup.appendChild(rect)

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      const isLeft = x0 < width / 2
      text.setAttribute('x', String(isLeft ? x1 + 6 : x0 - 6))
      text.setAttribute('y', String((y0 + y1) / 2))
      text.setAttribute('dy', '0.35em')
      text.setAttribute('text-anchor', isLeft ? 'start' : 'end')
      text.setAttribute('font-size', '11')
      text.setAttribute('fill', '#666')
      text.textContent = node.name ?? ''
      nodeGroup.appendChild(text)
    }
    svg.appendChild(nodeGroup)
  }, [nodes, links, isEmpty, currency, onCategoryClick])

  return (
    <ChartContainer title="Money Flow (Sankey)" empty={isEmpty} bare={bare}>
      <div className="overflow-x-auto">
        <svg ref={svgRef} className="w-full" style={{ minHeight: 400 }} />
      </div>
    </ChartContainer>
  )
}
