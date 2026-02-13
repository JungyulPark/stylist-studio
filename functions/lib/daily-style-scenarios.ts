/**
 * Weather-based daily style scenarios for image generation
 * Returns 3 outfit scenarios: Today's Pick, Casual, Evening
 */

import type { ImageScenario } from './gemini-image'

interface WeatherInfo {
  temp: number
  condition: string // 'Clear', 'Rain', 'Snow', 'Clouds', etc.
  wind_speed: number
}

function getTodaysPickPrompt(weather: WeatherInfo, gender: string): string {
  const isCold = weather.temp < 10
  const isCool = weather.temp >= 10 && weather.temp < 20
  const isWarm = weather.temp >= 20 && weather.temp < 28
  const isHot = weather.temp >= 28
  const isRainy = ['Rain', 'Drizzle', 'Thunderstorm'].includes(weather.condition)
  const isSnowy = weather.condition === 'Snow'
  const isWindy = weather.wind_speed > 7

  if (gender === 'female') {
    if (isSnowy) return 'warm winter outfit: elegant long wool coat in cream or camel, cozy turtleneck sweater in soft ivory, fitted dark jeans or warm leggings under a midi skirt, insulated waterproof ankle boots, cashmere scarf and leather gloves - chic winter protection'
    if (isRainy) return 'stylish rainy day outfit: waterproof trench coat in beige or navy, soft knit top, comfortable dark pants or jeans, waterproof chelsea boots or rain boots, compact crossbody bag - practical yet fashionable'
    if (isCold) return 'cozy cold weather outfit: structured wool coat in charcoal or burgundy, cashmere V-neck sweater layered over silk blouse, tailored wool trousers, leather ankle boots, delicate gold jewelry - warm and elegant'
    if (isCool && isWindy) return 'wind-ready chic outfit: fitted leather or suede jacket, lightweight cashmere sweater, high-waisted straight-leg pants, comfortable loafers, silk scarf for wind protection - effortlessly put-together'
    if (isCool) return 'perfect layering outfit: soft knit cardigan in dusty rose or sage, fitted white tee underneath, high-waisted cropped trousers, white sneakers or ballet flats, minimalist gold necklace - relaxed sophistication'
    if (isWarm) return 'breezy warm outfit: flowy linen blouse in soft pastel, comfortable wide-leg linen pants or midi skirt, flat sandals or espadrilles, straw tote bag, simple gold earrings - effortless summer elegance'
    if (isHot) return 'cool summer outfit: light cotton or linen sundress in white or soft floral print, comfortable flat sandals, woven bag, delicate layered necklaces, sunglasses - fresh and feminine'
    return 'versatile everyday outfit: soft cream cashmere V-neck sweater, high-waisted camel wide-leg trousers, nude ballet flats, delicate gold jewelry - refined effortless chic'
  }

  // Male
  if (isSnowy) return 'warm winter outfit: insulated parka or heavy wool overcoat in navy or charcoal, chunky knit sweater, dark jeans or wool trousers, waterproof leather boots, warm scarf - rugged winter style'
  if (isRainy) return 'rainy day outfit: waterproof jacket or mac coat in navy, cotton sweater, dark chinos, waterproof leather boots or chelsea boots - practical and sharp'
  if (isCold) return 'cold weather outfit: tailored wool peacoat in charcoal, fine merino turtleneck in cream, dark fitted trousers, brown leather boots, minimal watch - warm and distinguished'
  if (isCool && isWindy) return 'windproof outfit: cotton bomber jacket or harrington jacket, crew-neck sweater, fitted chinos in navy or grey, clean leather sneakers - structured and wind-ready'
  if (isCool) return 'smart layered outfit: cotton crew-neck sweater over oxford shirt, well-fitted chinos, clean white sneakers or loafers, leather watch - polished casual'
  if (isWarm) return 'warm weather outfit: breathable linen shirt in light blue or white, well-fitted chino shorts or light cotton pants, leather sandals or canvas sneakers, simple watch - cool and composed'
  if (isHot) return 'summer cool outfit: lightweight polo shirt or linen camp collar shirt, breathable cotton shorts or light chinos, canvas sneakers or leather sandals, sunglasses - sharp summer comfort'
  return 'clean modern outfit: cream fine-knit cashmere sweater, perfectly fitted navy chinos, brown leather belt, clean white sneakers - polished minimalist style'
}

function getCasualPrompt(gender: string, temp: number): string {
  const isWarm = temp >= 22

  if (gender === 'female') {
    if (isWarm) return 'relaxed casual outfit: oversized vintage graphic tee tucked loosely into high-waisted light wash denim shorts or mom jeans, clean white sneakers, crossbody mini bag, simple hoop earrings - cool weekend vibes'
    return 'cozy casual outfit: oversized soft beige or pale pink cashmere cardigan, simple white t-shirt, high-waisted light wash straight-leg jeans, white sneakers or tan loafers, minimal jewelry - comfortable yet stylish'
  }

  if (isWarm) return 'relaxed casual outfit: soft cotton crew-neck tee in white or heather grey, comfortable well-fitted chino shorts, clean canvas sneakers or slides, simple watch - effortless weekend style'
  return 'relaxed weekend outfit: soft grey cotton sweater or hoodie, well-fitted dark indigo jeans, clean white sneakers, minimal watch - effortlessly put-together'
}

function getEveningPrompt(gender: string, temp: number): string {
  const needsOuterwear = temp < 18

  if (gender === 'female') {
    if (needsOuterwear) return 'elegant evening outfit: romantic midi dress in dusty rose or champagne with flattering draping, structured blazer or elegant coat draped over shoulders, strappy heeled sandals, gold statement earrings, delicate clutch - graceful evening allure'
    return 'chic evening outfit: sleek slip dress in black or deep burgundy, strappy heeled sandals, gold layered necklaces, elegant clutch, subtle smoky makeup look - sophisticated night out'
  }

  if (needsOuterwear) return 'sharp evening outfit: slim-fit black or midnight blue blazer over charcoal turtleneck or dark dress shirt, dark fitted trousers, sleek black leather shoes, minimal watch - sophisticated evening style'
  return 'stylish evening outfit: well-fitted dark button-up shirt with sleeves slightly rolled, slim dark trousers, polished leather loafers or dress shoes, minimal silver watch - relaxed evening elegance'
}

export function getDailyScenarios(weather: WeatherInfo, gender: string): ImageScenario[] {
  return [
    {
      id: 'todays-pick',
      prompt: getTodaysPickPrompt(weather, gender),
    },
    {
      id: 'casual',
      prompt: getCasualPrompt(gender, weather.temp),
    },
    {
      id: 'evening',
      prompt: getEveningPrompt(gender, weather.temp),
    },
  ]
}

/** Label translations for daily scenarios */
export const dailyScenarioLabels: Record<string, Record<string, string>> = {
  'todays-pick': {
    ko: '오늘의 추천',
    en: "Today's Pick",
    ja: '今日のおすすめ',
    zh: '今日推荐',
    es: 'Elección del Día',
  },
  'casual': {
    ko: '캐주얼',
    en: 'Casual',
    ja: 'カジュアル',
    zh: '休闲',
    es: 'Casual',
  },
  'evening': {
    ko: '이브닝',
    en: 'Evening',
    ja: 'イブニング',
    zh: '晚间',
    es: 'Noche',
  },
}
