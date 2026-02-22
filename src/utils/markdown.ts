/**
 * Markdown to HTML conversion utility for style reports
 */

/**
 * Converts markdown-formatted style report to styled HTML
 * @param markdown - The markdown string to convert
 * @returns HTML string with styled sections
 */
export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return ''

  let insideLookCard = false

  let html = markdown
    .split('\n')
    .map(line => {
      // Section header (## Title → card)
      if (line.startsWith('## ')) {
        const content = line.slice(3)
        const emojiMatch = content.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|💎|🎨|👔|🛍️|✨|💡|🎯|💪|👗|💇|🌟)\s*/u)
        // Close any open look-card before starting new section
        const closeLook = insideLookCard ? '</div></div>' : ''
        insideLookCard = false
        if (emojiMatch) {
          const emoji = emojiMatch[1]
          const title = content.slice(emojiMatch[0].length)
          return `${closeLook}</div></div><div class="report-section-card"><div class="section-header"><span class="section-icon">${emoji}</span><h3>${title}</h3></div><div class="section-body">`
        }
        return `${closeLook}</div></div><div class="report-section-card"><div class="section-header"><span class="section-icon">✦</span><h3>${content}</h3></div><div class="section-body">`
      }
      // Subheader
      if (line.startsWith('### ')) {
        return `<h4 class="subsection-title">${line.slice(4)}</h4>`
      }
      // Look card header (**1) Boardroom Modern**)
      const lookMatch = line.match(/^\*\*(\d+)\)\s*(.+)\*\*$/)
      if (lookMatch) {
        // Close previous look-card if open
        const closePrev = insideLookCard ? '</div></div>' : ''
        insideLookCard = true
        return `${closePrev}<div class="look-card"><h4 class="look-title"><span class="look-number">${lookMatch[1]}</span>${lookMatch[2]}</h4><div class="look-items">`
      }
      // Look item (- **Top:** white shirt)
      const lookItemMatch = line.match(/^-\s*\*\*([^*:]+)\*\*:\s*(.+)$/)
      if (lookItemMatch) {
        return `<div class="look-item"><span class="item-label">${lookItemMatch[1]}</span><span class="item-value">${lookItemMatch[2]}</span></div>`
      }
      // Numbered list (1. Item)
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/)
      if (numberedMatch) {
        return `<div class="numbered-item"><span class="item-number">${numberedMatch[1]}</span><span class="item-text">${numberedMatch[2]}</span></div>`
      }
      // Check-style rules
      const ruleMatch = line.match(/^-\s*(Choose|Use|Keep|Select|Avoid|Prioritize|Focus)\s+(.+)$/)
      if (ruleMatch) {
        return `<div class="check-item"><span class="check-icon">✓</span><span><strong class="accent-text">${ruleMatch[1]}</strong> ${ruleMatch[2]}</span></div>`
      }
      // General list
      if (line.startsWith('- ')) {
        return `<div class="list-item"><span class="list-bullet">•</span><span>${line.slice(2)}</span></div>`
      }
      // Divider
      if (line.trim() === '---') return '<hr class="section-divider" />'
      // Empty line
      if (line.trim() === '') return ''
      // Remove notes
      if (line.startsWith('*Note:')) return ''
      // Normal paragraph
      return `<p>${line}</p>`
    })
    .join('\n')
    // Bold → accent
    .replace(/\*\*(.+?)\*\*/g, '<strong class="accent-text">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Close any remaining open look-card
  if (insideLookCard) {
    html += '</div></div>'
  }

  // Wrap with opening tags
  html = '<div class="report-section-card"><div class="section-body">' + html + '</div></div>'

  // Clean empty sections
  html = html
    .replace(/<div class="section-body"><\/div><\/div><div class="report-section-card">/g, '<div class="report-section-card">')
    .replace(/<div class="report-section-card"><div class="section-body"><\/div><\/div>/g, '')
    .replace(/<div class="look-items"><\/div>/g, '</div></div>')

  return html
}
