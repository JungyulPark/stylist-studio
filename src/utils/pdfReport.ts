/**
 * Premium Style Report PDF Generator
 * Uses jsPDF for PDF creation with custom layout.
 * Dynamically imported to avoid bundle bloat.
 */

import jsPDF from 'jspdf'

export interface PdfReportData {
  season: string | null
  seasonLabel: string
  bodyType: string | null
  colors: string[]
  silhouettes: string[]
  bestColors: string[]
  avoidColors: string[]
  styleImages: Array<{ label: string; imageUrl?: string | null }>
  reportText: string
  lang: 'ko' | 'en'
}

export async function generatePdfReport(data: PdfReportData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  const isKo = data.lang === 'ko'

  // --- Helper functions ---
  function addGoldLine(yPos: number) {
    doc.setDrawColor(201, 169, 98)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageW - margin, yPos)
  }

  function checkPage(needed: number) {
    if (y + needed > 277) {
      doc.addPage()
      y = margin
    }
  }

  // --- PAGE 1: Cover ---
  doc.setFillColor(250, 250, 248)
  doc.rect(0, 0, pageW, 297, 'F')

  // Gold top bar
  doc.setFillColor(201, 169, 98)
  doc.rect(0, 0, pageW, 3, 'F')

  // Brand
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(201, 169, 98)
  doc.text('STYLIST STUDIO', pageW / 2, 50, { align: 'center' })

  // Title
  doc.setFontSize(28)
  doc.setTextColor(26, 26, 26)
  doc.text(isKo ? 'Personal Style Report' : 'Personal Style Report', pageW / 2, 80, { align: 'center' })

  // Subtitle
  doc.setFontSize(14)
  doc.setTextColor(74, 74, 74)
  doc.text(isKo ? '나만의 퍼스널 컬러 & 스타일 분석' : 'Your Personal Color & Style Analysis', pageW / 2, 95, { align: 'center' })

  // Date
  doc.setFontSize(10)
  doc.setTextColor(160, 160, 160)
  const dateStr = new Date().toLocaleDateString(isKo ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(dateStr, pageW / 2, 115, { align: 'center' })

  addGoldLine(130)

  // Season badge
  if (data.season) {
    doc.setFontSize(12)
    doc.setTextColor(201, 169, 98)
    doc.text(isKo ? '퍼스널 컬러 시즌' : 'Personal Color Season', pageW / 2, 150, { align: 'center' })
    doc.setFontSize(24)
    doc.setTextColor(26, 26, 26)
    doc.text(data.seasonLabel, pageW / 2, 165, { align: 'center' })
  }

  // Body type
  if (data.bodyType) {
    doc.setFontSize(12)
    doc.setTextColor(201, 169, 98)
    doc.text(isKo ? '체형' : 'Body Type', pageW / 2, 185, { align: 'center' })
    doc.setFontSize(16)
    doc.setTextColor(26, 26, 26)
    doc.text(data.bodyType, pageW / 2, 197, { align: 'center' })
  }

  // Footer on cover
  doc.setFontSize(8)
  doc.setTextColor(160, 160, 160)
  doc.text('kstylist.cc', pageW / 2, 280, { align: 'center' })
  doc.setFillColor(201, 169, 98)
  doc.rect(0, 294, pageW, 3, 'F')

  // --- PAGE 2: Color Palette ---
  doc.addPage()
  y = margin

  doc.setFillColor(250, 250, 248)
  doc.rect(0, 0, pageW, 297, 'F')

  doc.setFontSize(18)
  doc.setTextColor(26, 26, 26)
  doc.text(isKo ? '추천 컬러 팔레트' : 'Your Best Colors', margin, y + 8)
  y += 18
  addGoldLine(y)
  y += 10

  // Best colors grid (30 swatches)
  if (data.bestColors.length > 0) {
    const swatchSize = 14
    const gap = 3
    const cols = Math.floor(contentW / (swatchSize + gap))

    data.bestColors.forEach((hex, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const sx = margin + col * (swatchSize + gap)
      const sy = y + row * (swatchSize + gap)

      // Parse hex
      const r = parseInt(hex.slice(1, 3), 16) || 200
      const g = parseInt(hex.slice(3, 5), 16) || 200
      const b = parseInt(hex.slice(5, 7), 16) || 200

      doc.setFillColor(r, g, b)
      doc.roundedRect(sx, sy, swatchSize, swatchSize, 2, 2, 'F')
      doc.setDrawColor(220, 220, 220)
      doc.roundedRect(sx, sy, swatchSize, swatchSize, 2, 2, 'S')
    })

    const rows = Math.ceil(data.bestColors.length / cols)
    y += rows * (swatchSize + gap) + 10
  }

  // Avoid colors
  checkPage(50)
  doc.setFontSize(16)
  doc.setTextColor(180, 50, 50)
  doc.text(isKo ? '피해야 할 컬러' : 'Colors to Avoid', margin, y + 5)
  y += 14

  if (data.avoidColors.length > 0) {
    const swatchSize = 14
    const gap = 3
    const cols = Math.floor(contentW / (swatchSize + gap))

    data.avoidColors.forEach((hex, i) => {
      const col = i % cols
      const sx = margin + col * (swatchSize + gap)

      const r = parseInt(hex.slice(1, 3), 16) || 200
      const g = parseInt(hex.slice(3, 5), 16) || 200
      const b = parseInt(hex.slice(5, 7), 16) || 200

      doc.setFillColor(r, g, b)
      doc.roundedRect(sx, y, swatchSize, swatchSize, 2, 2, 'F')

      // Strike-through
      doc.setDrawColor(220, 53, 69)
      doc.setLineWidth(0.8)
      doc.line(sx, y + swatchSize, sx + swatchSize, y)
    })

    y += swatchSize + 15
  }

  // --- PAGE 3+: Style Analysis Text ---
  checkPage(30)
  doc.setFontSize(18)
  doc.setTextColor(26, 26, 26)
  doc.text(isKo ? '스타일 분석 리포트' : 'Style Analysis Report', margin, y + 5)
  y += 14
  addGoldLine(y)
  y += 8

  // Render report text (basic markdown → plain text)
  const plainText = data.reportText
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')

  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  const lines = doc.splitTextToSize(plainText, contentW)

  for (const line of lines) {
    checkPage(6)
    doc.text(line, margin, y)
    y += 5
  }

  // --- Last page footer ---
  checkPage(40)
  y += 10
  addGoldLine(y)
  y += 12

  doc.setFontSize(11)
  doc.setTextColor(201, 169, 98)
  doc.text(isKo ? '매일 맞춤 스타일 받기' : 'Get Daily Style Recommendations', pageW / 2, y, { align: 'center' })
  y += 7
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(
    isKo ? '날씨와 퍼스널 컬러에 맞는 코디를 매일 아침 받아보세요 — kstylist.cc' : 'Weather-matched outfits every morning — kstylist.cc',
    pageW / 2, y, { align: 'center' }
  )

  // Save
  doc.save(`kstylist-style-report-${new Date().toISOString().split('T')[0]}.pdf`)
}
