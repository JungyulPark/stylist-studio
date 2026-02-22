/**
 * Markdown to HTML conversion utility for style reports
 */

interface Section {
  icon: string
  title: string
  lines: string[]
}

/**
 * Converts markdown-formatted style report to styled HTML
 * @param markdown - The markdown string to convert
 * @returns HTML string with styled sections
 */
export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return ''

  // Step 1: Split into sections by ## headers
  const sections: Section[] = []
  let currentSection: Section | null = null
  const preLines: string[] = [] // Lines before any ## header

  for (const line of markdown.split('\n')) {
    if (line.startsWith('## ')) {
      const content = line.slice(3)
      const emojiMatch = content.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|💎|🎨|👔|🛍️|✨|💡|🎯|💪|👗|💇|🌟)\s*/u)
      if (emojiMatch) {
        currentSection = { icon: emojiMatch[1], title: content.slice(emojiMatch[0].length), lines: [] }
      } else {
        currentSection = { icon: '✦', title: content, lines: [] }
      }
      sections.push(currentSection)
    } else if (currentSection) {
      currentSection.lines.push(line)
    } else {
      preLines.push(line)
    }
  }

  // Step 2: Build HTML for each section
  let html = ''

  // Pre-header content (rare)
  const preHtml = renderLines(preLines)
  if (preHtml) {
    html += `<div class="report-section-card"><div class="section-body">${preHtml}</div></div>`
  }

  // Each section
  for (const section of sections) {
    const bodyHtml = renderSectionBody(section.lines)
    html += `<div class="report-section-card">`
    html += `<div class="section-header"><span class="section-icon">${section.icon}</span><h3>${section.title}</h3></div>`
    html += `<div class="section-body">${bodyHtml}</div>`
    html += `</div>`
  }

  return html
}

/**
 * Render lines within a section body, handling look-cards properly
 */
function renderSectionBody(lines: string[]): string {
  let html = ''
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Look card header: **1) Name**
    const lookMatch = line.match(/^\*\*(\d+)\)\s*(.+)\*\*$/)
    if (lookMatch) {
      // Collect all look-items until next look card or end
      const lookItems: string[] = []
      i++
      while (i < lines.length) {
        const nextLookMatch = lines[i].match(/^\*\*(\d+)\)\s*(.+)\*\*$/)
        if (nextLookMatch) break // Start of next look card
        if (lines[i].startsWith('## ')) break // Next section (shouldn't happen)
        lookItems.push(lines[i])
        i++
      }
      html += renderLookCard(lookMatch[1], lookMatch[2], lookItems)
      continue
    }

    // Regular line
    html += renderLine(line)
    i++
  }

  return html
}

/**
 * Render a complete look card with properly closed tags
 */
function renderLookCard(number: string, title: string, itemLines: string[]): string {
  let itemsHtml = ''
  for (const line of itemLines) {
    // Look item: - **Label:** Value  OR  - **Label**: Value
    const lookItemMatch = line.match(/^-\s*\*\*([^*]+?):\*\*\s*(.+)$/) || line.match(/^-\s*\*\*([^*:]+)\*\*:\s*(.+)$/)
    if (lookItemMatch) {
      itemsHtml += `<div class="look-item"><span class="item-label">${lookItemMatch[1]}</span><span class="item-value">${lookItemMatch[2]}</span></div>`
    } else if (line.trim()) {
      itemsHtml += renderLine(line)
    }
  }

  return `<div class="look-card"><h4 class="look-title"><span class="look-number">${number}</span>${applyInlineFormatting(title)}</h4><div class="look-items">${itemsHtml}</div></div>`
}

/**
 * Render a single line of markdown
 */
function renderLine(line: string): string {
  if (!line.trim()) return ''

  // Subheader
  if (line.startsWith('### ')) {
    return `<h4 class="subsection-title">${line.slice(4)}</h4>`
  }

  // Numbered list (1. Item)
  const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/)
  if (numberedMatch) {
    return `<div class="numbered-item"><span class="item-number">${numberedMatch[1]}</span><span class="item-text">${applyInlineFormatting(numberedMatch[2])}</span></div>`
  }

  // Check-style rules
  const ruleMatch = line.match(/^-\s*(Choose|Use|Keep|Select|Avoid|Prioritize|Focus)\s+(.+)$/)
  if (ruleMatch) {
    return `<div class="check-item"><span class="check-icon">✓</span><span><strong class="accent-text">${ruleMatch[1]}</strong> ${applyInlineFormatting(ruleMatch[2])}</span></div>`
  }

  // General list item
  if (line.startsWith('- ')) {
    return `<div class="list-item"><span class="list-bullet">•</span><span>${applyInlineFormatting(line.slice(2))}</span></div>`
  }

  // Divider
  if (line.trim() === '---') return '<hr class="section-divider" />'

  // Remove notes
  if (line.startsWith('*Note:')) return ''

  // Normal paragraph
  return `<p>${applyInlineFormatting(line)}</p>`
}

/**
 * Render lines without section structure (for pre-header content)
 */
function renderLines(lines: string[]): string {
  return lines.map(renderLine).filter(Boolean).join('')
}

/**
 * Apply inline formatting (bold, italic)
 */
function applyInlineFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="accent-text">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}
