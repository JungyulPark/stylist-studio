/**
 * Markdown to HTML conversion utility for style reports
 * Uses simple, flat HTML structure for maximum compatibility
 */

/**
 * Converts markdown-formatted style report to styled HTML
 * @param markdown - The markdown string to convert
 * @returns HTML string with styled sections
 */
export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return ''

  const lines = markdown.split('\n')
  let html = ''
  let inSection = false
  let inLookCard = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Empty line
    if (!line.trim()) continue

    // Remove notes
    if (line.startsWith('*Note:')) continue

    // Section header: ## Title
    if (line.startsWith('## ')) {
      // Close previous look card and section
      if (inLookCard) { html += '</div>'; inLookCard = false }
      if (inSection) { html += '</div>'; inSection = false }

      const content = line.slice(3)
      const emojiMatch = content.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|💎|🎨|👔|🛍️|✨|💡|🎯|💪|👗|💇|🌟)\s*/u)
      const icon = emojiMatch ? emojiMatch[1] : '✦'
      const title = emojiMatch ? content.slice(emojiMatch[0].length) : content
      html += `<div class="rpt-section"><h3 class="rpt-heading"><span class="rpt-icon">${icon}</span>${title}</h3>`
      inSection = true
      continue
    }

    // Subheader: ### Title
    if (line.startsWith('### ')) {
      if (inLookCard) { html += '</div>'; inLookCard = false }
      html += `<h4 class="rpt-subheading">${line.slice(4)}</h4>`
      continue
    }

    // Look card header: **1) Name**
    const lookMatch = line.match(/^\*\*(\d+)\)\s*(.+)\*\*$/)
    if (lookMatch) {
      if (inLookCard) html += '</div>'
      inLookCard = true
      html += `<div class="rpt-look"><div class="rpt-look-header"><span class="rpt-look-num">${lookMatch[1]}</span><span class="rpt-look-name">${lookMatch[2]}</span></div>`
      continue
    }

    // Look item: - **Label:** Value  OR  - **Label**: Value
    const lookItemA = line.match(/^-\s*\*\*([^*]+?):\*\*\s*(.+)$/)
    const lookItemB = line.match(/^-\s*\*\*([^*:]+)\*\*:\s*(.+)$/)
    const lookItem = lookItemA || lookItemB
    if (lookItem) {
      html += `<div class="rpt-item"><span class="rpt-item-label">${lookItem[1]}</span><span class="rpt-item-value">${applyInline(lookItem[2])}</span></div>`
      continue
    }

    // Numbered list: 1. Item
    const numMatch = line.match(/^(\d+)\.\s+(.+)$/)
    if (numMatch) {
      html += `<div class="rpt-numbered"><span class="rpt-num">${numMatch[1]}</span><span>${applyInline(numMatch[2])}</span></div>`
      continue
    }

    // Bullet list: - Item
    if (line.startsWith('- ')) {
      html += `<div class="rpt-bullet"><span class="rpt-dot"></span><span>${applyInline(line.slice(2))}</span></div>`
      continue
    }

    // Divider
    if (line.trim() === '---') {
      html += '<hr class="rpt-divider" />'
      continue
    }

    // Paragraph
    html += `<p class="rpt-para">${applyInline(line)}</p>`
  }

  // Close any open elements
  if (inLookCard) html += '</div>'
  if (inSection) html += '</div>'

  return html
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}
