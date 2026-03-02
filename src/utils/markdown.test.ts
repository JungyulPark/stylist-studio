import { describe, it, expect } from 'vitest'
import { renderMarkdownToHtml } from './markdown'

describe('renderMarkdownToHtml', () => {
  describe('empty input handling', () => {
    it('returns empty string for empty input', () => {
      expect(renderMarkdownToHtml('')).toBe('')
    })

    it('returns empty string for null/undefined', () => {
      expect(renderMarkdownToHtml(null as unknown as string)).toBe('')
      expect(renderMarkdownToHtml(undefined as unknown as string)).toBe('')
    })
  })

  describe('section headers', () => {
    it('converts section headers with emoji', () => {
      const input = '## 💎 Your Style Profile'
      const output = renderMarkdownToHtml(input)

      expect(output).toContain('rpt-icon')
      expect(output).toContain('💎')
      expect(output).toContain('Your Style Profile')
      expect(output).toContain('rpt-section')
    })

    it('converts section headers without emoji', () => {
      const input = '## Style Tips'
      const output = renderMarkdownToHtml(input)

      expect(output).toContain('✦')
      expect(output).toContain('Style Tips')
      expect(output).toContain('rpt-heading')
    })
  })

  describe('subheaders', () => {
    it('converts h3 subheaders', () => {
      const input = '### Color Recommendations'
      const output = renderMarkdownToHtml(input)

      expect(output).toContain('<h4 class="rpt-subheading">')
      expect(output).toContain('Color Recommendations')
    })
  })

  describe('look cards', () => {
    it('converts numbered look headers', () => {
      const input = '**1) Business Casual**'
      const output = renderMarkdownToHtml(input)

      expect(output).toContain('rpt-look')
      expect(output).toContain('rpt-look-num')
      expect(output).toContain('1')
      expect(output).toContain('Business Casual')
    })

    it('converts look items with labels', () => {
      // Format: - **Label**: value (closing ** before colon)
      const input = '- **Top**: White oxford shirt'
      const output = renderMarkdownToHtml(input)

      expect(output).toContain('rpt-item')
      expect(output).toContain('rpt-item-label')
      expect(output).toContain('Top')
      expect(output).toContain('rpt-item-value')
      expect(output).toContain('White oxford shirt')
    })
  })

  describe('lists', () => {
    it('converts numbered lists', () => {
      const input = '1. First item\n2. Second item'
      const output = renderMarkdownToHtml(input)

      expect(output).toContain('rpt-numbered')
      expect(output).toContain('rpt-num')
      expect(output).toContain('1')
      expect(output).toContain('First item')
    })

    it('converts bullet lists', () => {
      const input = '- Regular item\n- Another item'
      const output = renderMarkdownToHtml(input)

      expect(output).toContain('rpt-bullet')
      expect(output).toContain('rpt-dot')
      expect(output).toContain('Regular item')
    })

    it('converts check-style rules as bullets', () => {
      const keywords = ['Choose', 'Use', 'Keep', 'Select', 'Avoid', 'Prioritize', 'Focus']

      keywords.forEach(keyword => {
        const input = `- ${keyword} dark colors for a slimming effect`
        const output = renderMarkdownToHtml(input)

        expect(output).toContain('rpt-bullet')
        expect(output).toContain('rpt-dot')
        expect(output).toContain(keyword)
      })
    })
  })

  describe('text formatting', () => {
    it('converts bold text', () => {
      const input = 'This is **bold** text'
      const output = renderMarkdownToHtml(input)

      expect(output).toContain('<strong>bold</strong>')
    })

    it('converts italic text', () => {
      const input = 'This is *italic* text'
      const output = renderMarkdownToHtml(input)

      expect(output).toContain('<em>italic</em>')
    })

    it('converts dividers', () => {
      const input = '---'
      const output = renderMarkdownToHtml(input)

      expect(output).toContain('<hr class="rpt-divider" />')
    })
  })

  describe('special cases', () => {
    it('removes note lines', () => {
      const input = '*Note: This is a note'
      const output = renderMarkdownToHtml(input)

      expect(output).not.toContain('*Note:')
      expect(output).not.toContain('This is a note')
    })

    it('wraps regular paragraphs', () => {
      const input = 'This is a regular paragraph.'
      const output = renderMarkdownToHtml(input)

      expect(output).toContain('<p class="rpt-para">This is a regular paragraph.</p>')
    })
  })

  describe('complex documents', () => {
    it('converts a complete style report section', () => {
      const input = `## 💎 Your Style Profile

### Body Type
You have an athletic build with broad shoulders.

**1) Casual Weekend**
- **Top**: Navy polo shirt
- **Bottom**: Chinos
- **Shoes**: White sneakers

- Choose fitted cuts for a modern look
- Avoid baggy silhouettes`

      const output = renderMarkdownToHtml(input)

      // Check structure
      expect(output).toContain('rpt-section')
      expect(output).toContain('rpt-heading')
      expect(output).toContain('💎')
      expect(output).toContain('Your Style Profile')
      expect(output).toContain('rpt-subheading')
      expect(output).toContain('rpt-look')
      expect(output).toContain('rpt-item')
      expect(output).toContain('rpt-bullet')
    })
  })
})
