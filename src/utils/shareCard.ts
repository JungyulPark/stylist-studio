/**
 * Share Card Generator
 * Creates Instagram Story (1080x1920) and OG (1200x628) share cards
 * using Canvas API for personal color analysis results.
 */

export interface ShareCardData {
  season: string          // "Spring Warm", "Summer Cool", etc.
  seasonKo?: string       // "봄 웜톤"
  palette: string[]       // ["#CD853F", "#8B4513", ...]
  bodyType?: string       // "Hourglass", "Rectangle", etc.
  format: '9:16' | 'og'  // Instagram Story vs OG/Twitter
}

// Season color mapping for background accents
const SEASON_COLORS: Record<string, { bg: string; accent: string }> = {
  spring: { bg: '#FFF8F0', accent: '#E8A87C' },
  summer: { bg: '#F0F4FF', accent: '#8BAACC' },
  autumn: { bg: '#FDF5EC', accent: '#B87333' },
  winter: { bg: '#F5F0FF', accent: '#6B5B8A' },
}

function getSeasonKey(season: string): string {
  const lower = season.toLowerCase()
  if (lower.includes('spring')) return 'spring'
  if (lower.includes('summer')) return 'summer'
  if (lower.includes('autumn')) return 'autumn'
  if (lower.includes('winter')) return 'winter'
  return 'spring'
}

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const is916 = data.format === '9:16'
  canvas.width = is916 ? 1080 : 1200
  canvas.height = is916 ? 1920 : 628

  const seasonKey = getSeasonKey(data.season)
  const colors = SEASON_COLORS[seasonKey] || SEASON_COLORS.spring

  // Background
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Top gold accent line
  const goldGrad = ctx.createLinearGradient(0, 0, canvas.width, 0)
  goldGrad.addColorStop(0, 'transparent')
  goldGrad.addColorStop(0.3, '#c9a962')
  goldGrad.addColorStop(0.7, '#d4af37')
  goldGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = goldGrad
  ctx.fillRect(0, 0, canvas.width, 4)

  // Bottom gold accent line
  ctx.fillRect(0, canvas.height - 4, canvas.width, 4)

  ctx.textAlign = 'center'

  if (is916) {
    // --- Instagram Story Layout (1080x1920) ---

    // Brand mark
    ctx.fillStyle = '#c9a962'
    ctx.font = '600 28px Manrope, sans-serif'
    ctx.fillText('STYLIST STUDIO', canvas.width / 2, 180)

    // Decorative line
    const lineGrad = ctx.createLinearGradient(canvas.width / 2 - 120, 0, canvas.width / 2 + 120, 0)
    lineGrad.addColorStop(0, 'transparent')
    lineGrad.addColorStop(0.5, '#c9a962')
    lineGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = lineGrad
    ctx.fillRect(canvas.width / 2 - 120, 210, 240, 1)

    // "My Personal Color"
    ctx.fillStyle = '#4A4A4A'
    ctx.font = '500 36px Manrope, sans-serif'
    ctx.fillText('My Personal Color', canvas.width / 2, 340)

    // Season name (large, serif)
    ctx.fillStyle = colors.accent
    ctx.font = 'italic 700 72px "Playfair Display", Georgia, serif'
    ctx.fillText(data.season, canvas.width / 2, 460)

    // Korean name if available
    if (data.seasonKo) {
      ctx.fillStyle = '#4A4A4A'
      ctx.font = '400 32px Manrope, sans-serif'
      ctx.fillText(data.seasonKo, canvas.width / 2, 520)
    }

    // Color palette swatches (centered circles)
    const swatchY = 700
    const swatchSize = 72
    const gap = 24
    const totalWidth = data.palette.length * (swatchSize + gap) - gap
    const startX = (canvas.width - totalWidth) / 2

    data.palette.forEach((color, i) => {
      const cx = startX + i * (swatchSize + gap) + swatchSize / 2
      // Shadow
      ctx.beginPath()
      ctx.arc(cx, swatchY + 3, swatchSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      ctx.fill()
      // Circle
      ctx.beginPath()
      ctx.arc(cx, swatchY, swatchSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 3
      ctx.stroke()
    })

    // Palette label
    ctx.fillStyle = '#999'
    ctx.font = '500 24px Manrope, sans-serif'
    ctx.fillText('RECOMMENDED COLORS', canvas.width / 2, 810)

    // Body type if available
    if (data.bodyType) {
      ctx.fillStyle = '#4A4A4A'
      ctx.font = '500 28px Manrope, sans-serif'
      ctx.fillText(`Body Type: ${data.bodyType}`, canvas.width / 2, 920)
    }

    // Decorative divider
    ctx.fillStyle = lineGrad
    ctx.fillRect(canvas.width / 2 - 120, 1680, 240, 1)

    // CTA
    ctx.fillStyle = '#1A1A1A'
    ctx.font = '600 30px Manrope, sans-serif'
    ctx.fillText('Discover your personal color', canvas.width / 2, 1760)

    ctx.fillStyle = '#c9a962'
    ctx.font = '700 34px Manrope, sans-serif'
    ctx.fillText('kstylist.cc', canvas.width / 2, 1820)

  } else {
    // --- OG Card Layout (1200x628) ---

    // Left section: text
    ctx.textAlign = 'left'

    // Brand
    ctx.fillStyle = '#c9a962'
    ctx.font = '600 18px Manrope, sans-serif'
    ctx.fillText('STYLIST STUDIO', 60, 60)

    // "My Personal Color is..."
    ctx.fillStyle = '#4A4A4A'
    ctx.font = '500 24px Manrope, sans-serif'
    ctx.fillText('My Personal Color Season', 60, 200)

    // Season name
    ctx.fillStyle = colors.accent
    ctx.font = 'italic 700 52px "Playfair Display", Georgia, serif'
    ctx.fillText(data.season, 60, 280)

    if (data.seasonKo) {
      ctx.fillStyle = '#4A4A4A'
      ctx.font = '400 22px Manrope, sans-serif'
      ctx.fillText(data.seasonKo, 60, 320)
    }

    // Color swatches (horizontal row)
    const ogSwatchY = 400
    const ogSwatchSize = 44
    const ogGap = 12
    data.palette.slice(0, 8).forEach((color, i) => {
      const cx = 60 + i * (ogSwatchSize + ogGap) + ogSwatchSize / 2
      ctx.beginPath()
      ctx.arc(cx, ogSwatchY, ogSwatchSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    })

    // CTA
    ctx.fillStyle = '#999'
    ctx.font = '500 18px Manrope, sans-serif'
    ctx.fillText('Discover yours → kstylist.cc', 60, 540)

    // Right side decorative accent
    const accentGrad = ctx.createLinearGradient(canvas.width - 300, 0, canvas.width, canvas.height)
    accentGrad.addColorStop(0, `${colors.accent}15`)
    accentGrad.addColorStop(1, `${colors.accent}30`)
    ctx.fillStyle = accentGrad
    ctx.fillRect(canvas.width - 300, 0, 300, canvas.height)

    // Season icon text (large, right side)
    ctx.textAlign = 'center'
    ctx.fillStyle = `${colors.accent}40`
    ctx.font = 'italic 900 180px "Playfair Display", Georgia, serif'
    ctx.fillText(data.season.charAt(0), canvas.width - 150, 420)
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!)
    }, 'image/png')
  })
}
