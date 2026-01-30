import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import { renderMarkdownToHtml } from './utils/markdown'

// IndexedDB 헬퍼 함수 (큰 데이터 저장용)
const DB_NAME = 'StylistStudioDB'
const STORE_NAME = 'pendingData'

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

const saveToIndexedDB = async (data: object): Promise<void> => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({ id: 'pendingAnalysis', ...data })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const loadFromIndexedDB = async (): Promise<object | null> => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get('pendingAnalysis')
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

const clearIndexedDB = async (): Promise<void> => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete('pendingAnalysis')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

type Language = 'ko' | 'en' | 'ja' | 'zh' | 'es'
type Gender = 'male' | 'female' | 'other' | null
type Page = 'landing' | 'input' | 'loading' | 'result' | 'hair-selection' | 'hair-result' | 'how-to-use'

// 헤어스타일 상황 옵션
interface HairOccasion {
  id: string
  icon: string
  labelKo: string
  labelEn: string
}

// 헤어스타일 느낌 옵션
interface HairVibe {
  id: string
  icon: string
  labelKo: string
  labelEn: string
}

const hairOccasions: HairOccasion[] = [
  { id: 'daily', icon: '☀️', labelKo: '데일리', labelEn: 'Daily' },
  { id: 'date', icon: '💕', labelKo: '데이트', labelEn: 'Date' },
  { id: 'interview', icon: '💼', labelKo: '면접', labelEn: 'Interview' },
  { id: 'party', icon: '🎉', labelKo: '파티', labelEn: 'Party' },
  { id: 'wedding', icon: '💒', labelKo: '결혼식', labelEn: 'Wedding' },
  { id: 'vacation', icon: '🏖️', labelKo: '휴가', labelEn: 'Vacation' },
]

const hairVibes: HairVibe[] = [
  { id: 'elegant', icon: '✨', labelKo: '우아한', labelEn: 'Elegant' },
  { id: 'cute', icon: '🎀', labelKo: '귀여운', labelEn: 'Cute' },
  { id: 'chic', icon: '🖤', labelKo: '시크한', labelEn: 'Chic' },
  { id: 'natural', icon: '🌿', labelKo: '자연스러운', labelEn: 'Natural' },
  { id: 'trendy', icon: '🔥', labelKo: '트렌디', labelEn: 'Trendy' },
  { id: 'classic', icon: '👑', labelKo: '클래식', labelEn: 'Classic' },
]

const translations: Record<Language, {
  title: string
  subtitle: string
  heroTitle1: string
  heroTitle2: string
  heroDesc: string
  startBtn: string
  learnMore: string
  featuredIn: string
  pathTitle: string
  module1Title: string
  module1Desc: string
  module1Features: string[]
  module2Title: string
  module2Desc: string
  module2Features: string[]
  bestValue: string
  explore: string
  algorithmTag: string
  algorithmTitle: string
  algorithmDesc: string
  feature1Title: string
  feature1Desc: string
  feature2Title: string
  feature2Desc: string
  feature3Title: string
  feature3Desc: string
  feature4Title: string
  feature4Desc: string
  uploadPhoto: string
  photoHint: string
  height: string
  weight: string
  gender: string
  male: string
  female: string
  other: string
  startAnalysis: string
  analyzing: string
  analyzingDesc: string
  report: string
  restart: string
  error: string
  retry: string
  styleGallery: string
  styleGalleryDesc: string
  generatingStyles: string
  demoMode: string
  backToHome: string
  hairStyling: string
  hairSelectTitle: string
  hairSelectDesc: string
  selectOccasion: string
  selectVibe: string
  getRecommendation: string
  hairResultTitle: string
  hairResultDesc: string
  selectedOptions: string
  recommendedStyles: string
  tryAnother: string
  fashionSelectTitle: string
  fashionSelectDesc: string
  selectFashionOccasion: string
  getFashionRecommendation: string
  fashionResultTitle: string
  fashionResultDesc: string
  recommendedOutfits: string
  howToUseTitle: string
  howToUseDesc: string
  step1Title: string
  step1Desc: string
  step2Title: string
  step2Desc: string
  step3Title: string
  step3Desc: string
  step4Title: string
  step4Desc: string
  getStarted: string
  purchaseRequired: string
  purchaseBtn: string
  processingPayment: string
  price: string
  hairstyleTransform: string
  hairstyleTransformDesc: string
  fashionTransform: string
  fashionTransformDesc: string
  generateHairstyles: string
  generateFashion: string
  generatingHairstyles: string
  generatingFashion: string
  photoRequired: string
  serviceIntroTitle: string
  serviceStep1: string
  serviceStep1Desc: string
  serviceStep2: string
  serviceStep2Desc: string
  serviceStep3: string
  serviceStep3Desc: string
  downloadResult: string
  shareResult: string
  linkCopied: string
}> = {
  ko: {
    title: 'PERSONAL STYLIST',
    subtitle: '나만의 퍼스널 스타일리스트',
    heroTitle1: 'Your Personal',
    heroTitle2: 'Stylist',
    heroDesc: '럭셔리 패션 트랜스포메이션을 경험하세요. 맞춤형 헤어 스타일링부터 큐레이팅된 런웨이 워드로브까지, 당신의 진화가 시작됩니다.',
    startBtn: '스타일 분석 시작',
    learnMore: '더 알아보기',
    featuredIn: 'Featured in',
    pathTitle: '당신의 변신 경로를 선택하세요',
    module1Title: '헤어 스타일링',
    module1Desc: '헤어스타일 변환에 집중하고 싶다면',
    module1Features: ['헤어스타일 5종 생성', '나만의 얼굴에 적용', '즉시 결과 확인'],
    module2Title: '풀 스타일 컨설팅',
    module2Desc: '헤어 + 패션 완벽 변신 패키지',
    module2Features: ['전문 분석 리포트', '헤어스타일 5종', '상황별 패션 4종', '피부톤·체형 분석'],
    bestValue: '베스트',
    explore: '시작하기',
    algorithmTag: '알고리즘',
    algorithmTitle: '개인 우아함의 미래',
    algorithmDesc: '우리의 스타일리스트는 최신 패션 전문성을 바탕으로 당신만의 룩을 큐레이팅합니다. 트렌드를 따르는 것이 아니라, 당신의 미적 잠재력을 발견합니다.',
    feature1Title: '정밀 분석',
    feature1Desc: '완벽한 테일러링 핏을 위한 고급 얼굴 매핑 및 체형 추적.',
    feature2Title: '큐레이팅 팔레트',
    feature2Desc: '당신의 피부톤과 환경 조명에 최적화된 색채 과학.',
    feature3Title: '글로벌 트렌드',
    feature3Desc: '파리, 밀라노, 도쿄 패션위크의 런웨이 데이터 실시간 반영.',
    feature4Title: '독점 액세스',
    feature4Desc: '당신의 프로필에 맞춤 큐레이팅된 한정판 디자이너 콜라보레이션.',
    uploadPhoto: '사진 업로드',
    photoHint: '전신 사진을 올리면 패션 추천도 받을 수 있어요',
    height: '키 (cm)',
    weight: '몸무게 (kg)',
    gender: '성별',
    male: '남성',
    female: '여성',
    other: '선택안함',
    startAnalysis: '스타일 분석 시작하기',
    analyzing: '분석 중...',
    analyzingDesc: '전문 스타일리스트가 당신의 스타일을 분석하고 있습니다',
    report: '전문 스타일 분석 리포트',
    restart: '다시 분석하기',
    error: '분석 중 오류가 발생했습니다',
    retry: '다시 시도',
    styleGallery: '스타일 추천',
    styleGalleryDesc: '상황별 맞춤 스타일을 스타일리스트가 제안합니다',
    generatingStyles: '스타일 이미지 생성 중...',
    demoMode: '데모 모드 - 실제 이미지는 API 설정 후 제공됩니다',
    backToHome: '홈으로 돌아가기',
    hairStyling: '헤어 스타일링',
    hairSelectTitle: '나만의 헤어스타일 찾기',
    hairSelectDesc: '상황과 원하는 느낌을 선택하면 스타일리스트가 맞춤 헤어스타일을 추천해드립니다',
    selectOccasion: '어떤 상황인가요?',
    selectVibe: '어떤 느낌을 원하세요?',
    getRecommendation: '헤어스타일 추천받기',
    hairResultTitle: '맞춤 헤어스타일 추천',
    hairResultDesc: '선택하신 상황과 느낌에 맞는 헤어스타일입니다',
    selectedOptions: '선택 옵션',
    recommendedStyles: '추천 스타일',
    tryAnother: '다른 스타일 찾기',
    fashionSelectTitle: '상황별 패션 큐레이션',
    fashionSelectDesc: '상황을 선택하면 스타일리스트가 맞춤 패션을 추천해드립니다',
    selectFashionOccasion: '어떤 상황인가요?',
    getFashionRecommendation: '패션 추천받기',
    fashionResultTitle: '맞춤 패션 추천',
    fashionResultDesc: '선택하신 상황에 맞는 스타일링입니다',
    recommendedOutfits: '추천 코디',
    howToUseTitle: '이용 가이드',
    howToUseDesc: '퍼스널 스타일리스트와 함께 나만의 스타일을 찾아보세요',
    step1Title: '모듈 선택',
    step1Desc: '헤어 스타일링 또는 패션 큐레이션 중 원하는 서비스를 선택하세요',
    step2Title: '상황 & 느낌 선택',
    step2Desc: '데이트, 면접, 파티 등 상황과 원하는 분위기를 선택해주세요',
    step3Title: '스타일 분석',
    step3Desc: '스타일리스트가 선택하신 조건에 맞는 최적의 스타일을 분석합니다',
    step4Title: '맞춤 추천',
    step4Desc: '개인화된 헤어스타일과 패션 코디를 확인하세요',
    getStarted: '시작하기',
    purchaseRequired: '프리미엄 스타일 분석 서비스',
    purchaseBtn: '결제하고 분석 시작',
    processingPayment: '결제 처리 중...',
    price: '$9.99',
    hairstyleTransform: '💇 헤어스타일 변환',
    hairstyleTransformDesc: '내 얼굴에 다양한 헤어스타일 적용',
    fashionTransform: '👔 패션 변환',
    fashionTransformDesc: '내 모습에 다양한 패션 스타일 적용',
    generateHairstyles: '헤어스타일 생성하기',
    generateFashion: '패션 스타일 생성하기',
    generatingHairstyles: '헤어스타일 생성 중...',
    generatingFashion: '패션 스타일 생성 중...',
    photoRequired: '사진을 업로드해주세요',
    serviceIntroTitle: '이렇게 이용하세요',
    serviceStep1: '셀카 업로드',
    serviceStep1Desc: '정면 사진 한 장이면 충분합니다',
    serviceStep2: '스타일 선택',
    serviceStep2Desc: '헤어 또는 패션 변환을 선택하세요',
    serviceStep3: '결과 확인',
    serviceStep3Desc: '내 얼굴 그대로, 다양한 스타일을 미리 체험',
    downloadResult: '📥 결과 저장',
    shareResult: '📤 공유하기',
    linkCopied: '링크가 복사되었습니다!'
  },
  en: {
    title: 'PERSONAL STYLIST',
    subtitle: 'Your Personal Style Assistant',
    heroTitle1: 'Your Personal',
    heroTitle2: 'Stylist',
    heroDesc: 'Experience a luxurious fashion transformation powered by expert styling. From bespoke hair engineering to curated runway wardrobes, your evolution begins here.',
    startBtn: 'Start Transformation',
    learnMore: 'Learn More',
    featuredIn: 'Featured in',
    pathTitle: 'Choose Your Transformation Path',
    module1Title: 'Hair Styling',
    module1Desc: 'Focus on finding your perfect hairstyle',
    module1Features: ['5 hairstyle transformations', 'Applied to your face', 'Instant results'],
    module2Title: 'Full Style Consultation',
    module2Desc: 'Complete hair + fashion makeover package',
    module2Features: ['Expert analysis report', '5 hairstyles', '4 fashion looks', 'Skin tone & body analysis'],
    bestValue: 'BEST',
    explore: 'Get Started',
    algorithmTag: 'The Method',
    algorithmTitle: 'The Future of Personal Elegance',
    algorithmDesc: 'Our stylist combines cutting-edge technology with high-fashion expertise to curate your unique look. We don\'t just follow trends—we calculate your aesthetic potential.',
    feature1Title: 'Precision Analysis',
    feature1Desc: 'Advanced facial mapping and skeletal tracking for the perfect tailoring fit.',
    feature2Title: 'Curated Palette',
    feature2Desc: 'Chromatic science optimized for your unique skin tone and environmental lighting.',
    feature3Title: 'Global Trends',
    feature3Desc: 'Real-time ingestion of runway data from Paris, Milan, and Tokyo fashion weeks.',
    feature4Title: 'Exclusive Access',
    feature4Desc: 'Priority access to limited-edition designer collaborations curated for your profile.',
    uploadPhoto: 'Upload Photo',
    photoHint: 'Upload full body photo for fashion recommendations too',
    height: 'Height (cm)',
    weight: 'Weight (kg)',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    startAnalysis: 'Start Style Analysis',
    analyzing: 'Analyzing...',
    analyzingDesc: 'Our expert stylist is analyzing your style',
    report: 'Expert Style Analysis Report',
    restart: 'Analyze Again',
    error: 'An error occurred during analysis',
    retry: 'Try Again',
    styleGallery: 'Style Recommendations',
    styleGalleryDesc: 'Your stylist suggests personalized styles for different occasions',
    generatingStyles: 'Generating style images...',
    demoMode: 'Demo mode - Real images available after API setup',
    backToHome: 'Back to Home',
    hairStyling: 'Hair Styling',
    hairSelectTitle: 'Find Your Perfect Hairstyle',
    hairSelectDesc: 'Select your occasion and desired vibe, and your stylist will recommend personalized hairstyles',
    selectOccasion: 'What\'s the occasion?',
    selectVibe: 'What vibe do you want?',
    getRecommendation: 'Get Hair Recommendations',
    hairResultTitle: 'Personalized Hair Recommendations',
    hairResultDesc: 'Hairstyles matching your selected occasion and vibe',
    selectedOptions: 'Selected Options',
    recommendedStyles: 'Recommended Styles',
    tryAnother: 'Try Another Style',
    fashionSelectTitle: 'Fashion Curation by Occasion',
    fashionSelectDesc: 'Select the occasion and your stylist will recommend personalized fashion',
    selectFashionOccasion: 'What\'s the occasion?',
    getFashionRecommendation: 'Get Fashion Recommendations',
    fashionResultTitle: 'Personalized Fashion Recommendations',
    fashionResultDesc: 'Styling that matches your selected occasion',
    recommendedOutfits: 'Recommended Outfits',
    howToUseTitle: 'How to Use',
    howToUseDesc: 'Find your unique style with your Personal Stylist',
    step1Title: 'Select Module',
    step1Desc: 'Choose between Hair Styling or Fashion Curation',
    step2Title: 'Select Occasion & Vibe',
    step2Desc: 'Pick your occasion like date, interview, party and desired mood',
    step3Title: 'Style Analysis',
    step3Desc: 'Your stylist analyzes the best styles based on your selections',
    step4Title: 'Personalized Recommendations',
    step4Desc: 'Get your customized hairstyles and fashion outfits',
    getStarted: 'Get Started',
    purchaseRequired: 'Premium Styling Service',
    purchaseBtn: 'Purchase & Start Analysis',
    processingPayment: 'Processing payment...',
    price: '$9.99',
    hairstyleTransform: '💇 Hairstyle Transform',
    hairstyleTransformDesc: 'Try different hairstyles on your photo',
    fashionTransform: '👔 Fashion Transform',
    fashionTransformDesc: 'Try different fashion styles on your photo',
    generateHairstyles: 'Generate Hairstyles',
    generateFashion: 'Generate Fashion Styles',
    generatingHairstyles: 'Generating hairstyles...',
    generatingFashion: 'Generating fashion styles...',
    photoRequired: 'Please upload a photo',
    serviceIntroTitle: 'How It Works',
    serviceStep1: 'Upload a Selfie',
    serviceStep1Desc: 'One front-facing photo is all you need',
    serviceStep2: 'Choose Your Style',
    serviceStep2Desc: 'Select hair or fashion transformation',
    serviceStep3: 'See Results',
    serviceStep3Desc: 'Preview styles on your actual face instantly',
    downloadResult: '📥 Save Results',
    shareResult: '📤 Share',
    linkCopied: 'Link copied!'
  },
  ja: {
    title: 'PERSONAL STYLIST',
    subtitle: 'あなただけのスタイリスト',
    heroTitle1: 'Your Personal',
    heroTitle2: 'Stylist',
    heroDesc: 'プロのスタイリングによるラグジュアリーなファッション変身を体験してください。オーダーメイドのヘアエンジニアリングからキュレートされたランウェイワードローブまで。',
    startBtn: '変身を開始',
    learnMore: '詳細を見る',
    featuredIn: '掲載メディア',
    pathTitle: '変身パスを選択',
    module1Title: 'ヘアスタイリング',
    module1Desc: '理想のヘアスタイルを見つけたい方に',
    module1Features: ['ヘアスタイル5種生成', 'あなたの顔に適用', '即座に結果確認'],
    module2Title: 'フルスタイルコンサル',
    module2Desc: 'ヘア＋ファッション完全変身パッケージ',
    module2Features: ['専門分析レポート', 'ヘアスタイル5種', 'シーン別ファッション4種', '肌色・体型分析'],
    bestValue: 'おすすめ',
    explore: '始める',
    algorithmTag: 'メソッド',
    algorithmTitle: 'パーソナルエレガンスの未来',
    algorithmDesc: '私たちのスタイリストは、最先端テクノロジーとハイファッションの専門知識を組み合わせて、あなただけのルックをキュレートします。',
    feature1Title: '精密分析',
    feature1Desc: '完璧なテーラリングフィットのための高度な顔マッピング。',
    feature2Title: 'キュレートパレット',
    feature2Desc: 'あなたの肌色と環境照明に最適化された色彩科学。',
    feature3Title: 'グローバルトレンド',
    feature3Desc: 'パリ、ミラノ、東京ファッションウィークのランウェイデータをリアルタイムで取り込み。',
    feature4Title: '限定アクセス',
    feature4Desc: 'あなたのプロフィールに合わせてキュレートされた限定版デザイナーコラボレーション。',
    uploadPhoto: '写真をアップロード',
    photoHint: '全身写真でファッション提案も受けられます',
    height: '身長 (cm)',
    weight: '体重 (kg)',
    gender: '性別',
    male: '男性',
    female: '女性',
    other: '回答しない',
    startAnalysis: 'スタイル分析を開始',
    analyzing: '分析中...',
    analyzingDesc: 'スタイリストがあなたのスタイルを分析しています',
    report: 'スタイル分析レポート',
    restart: '再分析する',
    error: '分析中にエラーが発生しました',
    retry: '再試行',
    styleGallery: 'スタイル提案',
    styleGalleryDesc: 'シーン別のおすすめスタイルをスタイリストがご提案します',
    generatingStyles: 'スタイル画像を生成中...',
    demoMode: 'デモモード - 実際の画像はAPI設定後に表示されます',
    backToHome: 'ホームに戻る',
    hairStyling: 'ヘアスタイリング',
    hairSelectTitle: 'あなたにぴったりのヘアスタイル',
    hairSelectDesc: 'シーンと雰囲気を選んで、スタイリストがおすすめのヘアスタイルをご提案します',
    selectOccasion: 'どんなシーンですか？',
    selectVibe: 'どんな雰囲気がお好みですか？',
    getRecommendation: 'ヘアスタイルを提案する',
    hairResultTitle: 'おすすめヘアスタイル',
    hairResultDesc: '選択されたシーンと雰囲気に合うヘアスタイルです',
    selectedOptions: '選択オプション',
    recommendedStyles: 'おすすめスタイル',
    tryAnother: '別のスタイルを探す',
    fashionSelectTitle: 'シーン別ファッションキュレーション',
    fashionSelectDesc: 'シーンを選んで、スタイリストがおすすめファッションをご提案します',
    selectFashionOccasion: 'どんなシーンですか？',
    getFashionRecommendation: 'ファッションを提案する',
    fashionResultTitle: 'おすすめファッション',
    fashionResultDesc: '選択されたシーンに合うスタイリングです',
    recommendedOutfits: 'おすすめコーデ',
    howToUseTitle: 'ご利用ガイド',
    howToUseDesc: 'パーソナルスタイリストと一緒にあなただけのスタイルを見つけましょう',
    step1Title: 'モジュール選択',
    step1Desc: 'ヘアスタイリングまたはファッションキュレーションを選択',
    step2Title: 'シーン＆雰囲気選択',
    step2Desc: 'デート、面接、パーティーなどのシーンと雰囲気を選択',
    step3Title: 'スタイル分析',
    step3Desc: 'スタイリストが最適なスタイルを分析します',
    step4Title: 'パーソナライズ提案',
    step4Desc: 'カスタマイズされたヘアスタイルとファッションを確認',
    getStarted: '始める',
    purchaseRequired: 'プレミアムスタイリングサービス',
    purchaseBtn: '購入して分析開始',
    processingPayment: '支払い処理中...',
    price: '$9.99',
    hairstyleTransform: '💇 ヘアスタイル変換',
    hairstyleTransformDesc: '写真に様々なヘアスタイルを適用',
    fashionTransform: '👔 ファッション変換',
    fashionTransformDesc: '写真に様々なファッションスタイルを適用',
    generateHairstyles: 'ヘアスタイルを生成',
    generateFashion: 'ファッションスタイルを生成',
    generatingHairstyles: 'ヘアスタイル生成中...',
    generatingFashion: 'ファッションスタイル生成中...',
    photoRequired: '写真をアップロードしてください',
    serviceIntroTitle: 'ご利用方法',
    serviceStep1: 'セルフィーをアップロード',
    serviceStep1Desc: '正面写真1枚でOK',
    serviceStep2: 'スタイルを選択',
    serviceStep2Desc: 'ヘアまたはファッション変換を選択',
    serviceStep3: '結果を確認',
    serviceStep3Desc: 'あなたの顔のまま様々なスタイルをプレビュー',
    downloadResult: '📥 結果を保存',
    shareResult: '📤 シェア',
    linkCopied: 'リンクがコピーされました！'
  },
  zh: {
    title: 'PERSONAL STYLIST',
    subtitle: '您的私人造型师',
    heroTitle1: 'Your Personal',
    heroTitle2: 'Stylist',
    heroDesc: '体验专业造型驱动的奢华时尚蜕变。从定制发型工程到精选秀场衣橱，您的进化从这里开始。',
    startBtn: '开始蜕变',
    learnMore: '了解更多',
    featuredIn: '媒体报道',
    pathTitle: '选择您的蜕变之路',
    module1Title: '发型设计',
    module1Desc: '专注于找到您的完美发型',
    module1Features: ['5种发型变换', '应用到您的脸上', '即时查看结果'],
    module2Title: '全套风格咨询',
    module2Desc: '发型 + 时尚完整改造套餐',
    module2Features: ['专业分析报告', '5种发型', '4种场合穿搭', '肤色体型分析'],
    bestValue: '最佳',
    explore: '开始',
    algorithmTag: '方法',
    algorithmTitle: '个人优雅的未来',
    algorithmDesc: '我们的造型师将前沿科技与高级时尚专业知识相结合，为您打造独特造型。我们不只是追随潮流——我们计算您的美学潜力。',
    feature1Title: '精准分析',
    feature1Desc: '先进的面部映射和体型追踪，实现完美剪裁。',
    feature2Title: '精选调色板',
    feature2Desc: '针对您独特肤色和环境光线优化的色彩科学。',
    feature3Title: '全球趋势',
    feature3Desc: '实时摄取巴黎、米兰和东京时装周的T台数据。',
    feature4Title: '专属访问',
    feature4Desc: '优先获得为您的个人资料精选的限量版设计师合作款。',
    uploadPhoto: '上传照片',
    photoHint: '上传全身照还可获得时尚推荐',
    height: '身高 (cm)',
    weight: '体重 (kg)',
    gender: '性别',
    male: '男',
    female: '女',
    other: '不愿透露',
    startAnalysis: '开始风格分析',
    analyzing: '分析中...',
    analyzingDesc: '造型师正在分析您的风格',
    report: '风格分析报告',
    restart: '重新分析',
    error: '分析过程中发生错误',
    retry: '重试',
    styleGallery: '风格推荐',
    styleGalleryDesc: '造型师为您推荐不同场合的穿搭风格',
    generatingStyles: '正在生成风格图片...',
    demoMode: '演示模式 - 设置API后显示真实图片',
    backToHome: '返回首页',
    hairStyling: '发型设计',
    hairSelectTitle: '找到您的完美发型',
    hairSelectDesc: '选择场合和想要的感觉，造型师将为您推荐个性化发型',
    selectOccasion: '什么场合？',
    selectVibe: '想要什么感觉？',
    getRecommendation: '获取发型推荐',
    hairResultTitle: '个性化发型推荐',
    hairResultDesc: '符合您选择的场合和感觉的发型',
    selectedOptions: '已选选项',
    recommendedStyles: '推荐发型',
    tryAnother: '尝试其他风格',
    fashionSelectTitle: '场合时尚策划',
    fashionSelectDesc: '选择场合，造型师将为您推荐个性化时尚',
    selectFashionOccasion: '什么场合？',
    getFashionRecommendation: '获取时尚推荐',
    fashionResultTitle: '个性化时尚推荐',
    fashionResultDesc: '符合您选择场合的搭配',
    recommendedOutfits: '推荐搭配',
    howToUseTitle: '使用指南',
    howToUseDesc: '与您的专属造型师一起找到您的独特风格',
    step1Title: '选择模块',
    step1Desc: '选择发型设计或时尚策划',
    step2Title: '选择场合和氛围',
    step2Desc: '选择约会、面试、派对等场合和想要的氛围',
    step3Title: '风格分析',
    step3Desc: '造型师根据您的选择分析最佳风格',
    step4Title: '个性化推荐',
    step4Desc: '查看定制的发型和时尚搭配',
    getStarted: '开始',
    purchaseRequired: '高级造型服务',
    purchaseBtn: '购买并开始分析',
    processingPayment: '支付处理中...',
    price: '$9.99',
    hairstyleTransform: '💇 发型变换',
    hairstyleTransformDesc: '在您的照片上尝试不同发型',
    fashionTransform: '👔 时尚变换',
    fashionTransformDesc: '在您的照片上尝试不同时尚风格',
    generateHairstyles: '生成发型',
    generateFashion: '生成时尚风格',
    generatingHairstyles: '正在生成发型...',
    generatingFashion: '正在生成时尚风格...',
    photoRequired: '请上传照片',
    serviceIntroTitle: '使用方法',
    serviceStep1: '上传自拍',
    serviceStep1Desc: '一张正面照片就够了',
    serviceStep2: '选择风格',
    serviceStep2Desc: '选择发型或时尚变换',
    serviceStep3: '查看结果',
    serviceStep3Desc: '保留您的面容，即时预览各种风格',
    downloadResult: '📥 保存结果',
    shareResult: '📤 分享',
    linkCopied: '链接已复制！'
  },
  es: {
    title: 'PERSONAL STYLIST',
    subtitle: 'Tu estilista personal',
    heroTitle1: 'Your Personal',
    heroTitle2: 'Stylist',
    heroDesc: 'Experimenta una lujosa transformación de moda impulsada por estilismo experto. Desde ingeniería capilar a medida hasta guardarropas de pasarela curados.',
    startBtn: 'Iniciar Transformación',
    learnMore: 'Saber Más',
    featuredIn: 'Destacado en',
    pathTitle: 'Elige Tu Camino de Transformación',
    module1Title: 'Estilismo Capilar',
    module1Desc: 'Enfócate en encontrar tu peinado perfecto',
    module1Features: ['5 transformaciones de peinado', 'Aplicado a tu rostro', 'Resultados instantáneos'],
    module2Title: 'Consulta de Estilo Completa',
    module2Desc: 'Paquete completo de cabello + moda',
    module2Features: ['Informe de análisis', '5 peinados', '4 looks de moda', 'Análisis de tono y cuerpo'],
    bestValue: 'MEJOR',
    explore: 'Comenzar',
    algorithmTag: 'El Método',
    algorithmTitle: 'El Futuro de la Elegancia Personal',
    algorithmDesc: 'Nuestro estilista combina tecnología de vanguardia con experiencia en alta moda para curar tu look único.',
    feature1Title: 'Análisis Preciso',
    feature1Desc: 'Mapeo facial avanzado y seguimiento esquelético para el ajuste perfecto.',
    feature2Title: 'Paleta Curada',
    feature2Desc: 'Ciencia cromática optimizada para tu tono de piel único.',
    feature3Title: 'Tendencias Globales',
    feature3Desc: 'Ingesta en tiempo real de datos de pasarela de París, Milán y Tokio.',
    feature4Title: 'Acceso Exclusivo',
    feature4Desc: 'Acceso prioritario a colaboraciones de diseñadores de edición limitada.',
    uploadPhoto: 'Subir foto',
    photoHint: 'Sube foto de cuerpo completo para recomendaciones de moda',
    height: 'Altura (cm)',
    weight: 'Peso (kg)',
    gender: 'Género',
    male: 'Masculino',
    female: 'Femenino',
    other: 'Otro',
    startAnalysis: 'Iniciar análisis de estilo',
    analyzing: 'Analizando...',
    analyzingDesc: 'El estilista está analizando tu estilo',
    report: 'Informe de Análisis de Estilo',
    restart: 'Analizar de nuevo',
    error: 'Ocurrió un error durante el análisis',
    retry: 'Reintentar',
    styleGallery: 'Recomendaciones de Estilo',
    styleGalleryDesc: 'Tu estilista sugiere estilos personalizados para diferentes ocasiones',
    generatingStyles: 'Generando imágenes de estilo...',
    demoMode: 'Modo demo - Imágenes reales disponibles después de configurar API',
    backToHome: 'Volver al inicio',
    hairStyling: 'Estilismo Capilar',
    hairSelectTitle: 'Encuentra Tu Peinado Perfecto',
    hairSelectDesc: 'Selecciona la ocasión y el estilo deseado, y tu estilista recomendará peinados personalizados',
    selectOccasion: '¿Cuál es la ocasión?',
    selectVibe: '¿Qué estilo deseas?',
    getRecommendation: 'Obtener Recomendaciones',
    hairResultTitle: 'Recomendaciones Personalizadas',
    hairResultDesc: 'Peinados que coinciden con tu ocasión y estilo seleccionados',
    selectedOptions: 'Opciones Seleccionadas',
    recommendedStyles: 'Estilos Recomendados',
    tryAnother: 'Probar Otro Estilo',
    fashionSelectTitle: 'Moda por Ocasión',
    fashionSelectDesc: 'Selecciona la ocasión y tu estilista recomendará moda personalizada',
    selectFashionOccasion: '¿Cuál es la ocasión?',
    getFashionRecommendation: 'Obtener Recomendaciones',
    fashionResultTitle: 'Recomendaciones de Moda',
    fashionResultDesc: 'Estilismo que coincide con tu ocasión',
    recommendedOutfits: 'Outfits Recomendados',
    howToUseTitle: 'Guía de Uso',
    howToUseDesc: 'Encuentra tu estilo único con tu Estilista Personal',
    step1Title: 'Seleccionar Módulo',
    step1Desc: 'Elige entre Estilismo Capilar o Curación de Moda',
    step2Title: 'Seleccionar Ocasión y Estilo',
    step2Desc: 'Elige tu ocasión como cita, entrevista, fiesta y el ambiente deseado',
    step3Title: 'Análisis de Estilo',
    step3Desc: 'Tu estilista analiza los mejores estilos según tus selecciones',
    step4Title: 'Recomendaciones Personalizadas',
    step4Desc: 'Obtén tus peinados y outfits personalizados',
    getStarted: 'Comenzar',
    purchaseRequired: 'Servicio de Estilismo Premium',
    purchaseBtn: 'Comprar e Iniciar Análisis',
    processingPayment: 'Procesando pago...',
    price: '$9.99',
    hairstyleTransform: '💇 Transformación de Peinado',
    hairstyleTransformDesc: 'Prueba diferentes peinados en tu foto',
    fashionTransform: '👔 Transformación de Moda',
    fashionTransformDesc: 'Prueba diferentes estilos de moda en tu foto',
    generateHairstyles: 'Generar Peinados',
    generateFashion: 'Generar Estilos de Moda',
    generatingHairstyles: 'Generando peinados...',
    generatingFashion: 'Generando estilos de moda...',
    photoRequired: 'Por favor sube una foto',
    serviceIntroTitle: 'Como Funciona',
    serviceStep1: 'Sube un Selfie',
    serviceStep1Desc: 'Solo necesitas una foto frontal',
    serviceStep2: 'Elige tu Estilo',
    serviceStep2Desc: 'Selecciona cambio de peinado o moda',
    serviceStep3: 'Ver Resultados',
    serviceStep3Desc: 'Vista previa de estilos en tu rostro al instante',
    downloadResult: '📥 Guardar',
    shareResult: '📤 Compartir',
    linkCopied: '¡Enlace copiado!'
  }
}

const languageNames: Record<Language, string> = {
  ko: '한국어',
  en: 'EN',
  ja: '日本語',
  zh: '中文',
  es: 'ES'
}

interface UserProfile {
  photo: string | null
  height: string
  weight: string
  gender: Gender
}

interface StyleImage {
  id: string
  label: string
  imageUrl: string | null
  isDemo: boolean
}

function App() {
  const [lang, setLang] = useState<Language>('en')
  const [page, setPageState] = useState<Page>('landing')
  const [profile, setProfile] = useState<UserProfile>({
    photo: null,
    height: '',
    weight: '',
    gender: null
  })
  const [report, setReport] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [styleImages, setStyleImages] = useState<StyleImage[]>([])
  const [isGeneratingStyles, setIsGeneratingStyles] = useState(false)
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null)
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null)
  const [hairRecommendations, setHairRecommendations] = useState<string[]>([])
  const [hairPhoto, setHairPhoto] = useState<string | null>(null)
  const [generatedHairImages, setGeneratedHairImages] = useState<{style: string, imageUrl: string | null}[]>([])
  const [isGeneratingHair, setIsGeneratingHair] = useState(false)
  const [transformedHairstyles, setTransformedHairstyles] = useState<{id: string, label: string, imageUrl: string | null}[]>([])
  const [isTransformingHair, setIsTransformingHair] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStep, setLoadingStep] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hairPhotoRef = useRef<HTMLInputElement>(null)
  const t = translations[lang]

  // Polar Checkout Configuration (Sandbox 환경)
  // Product ID: cca7d48e-6758-4e83-a375-807ab70615ea
  // 체크아웃은 /api/create-checkout API를 통해 동적으로 생성됨

  // 뒤로가기 지원을 위한 페이지 변경 함수
  const setPage = useCallback((newPage: Page) => {
    setPageState(newPage)
    window.history.pushState({ page: newPage }, '', `#${newPage}`)
  }, [])

  // 브라우저 뒤로가기 이벤트 처리
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.page) {
        setPageState(event.state.page)
      } else {
        setPageState('landing')
      }
    }

    window.addEventListener('popstate', handlePopState)

    // 결제 성공 후 리다이렉트 처리
    const urlParams = new URLSearchParams(window.location.search)
    const customerSessionToken = urlParams.get('customer_session_token')
    const paymentSuccess = urlParams.get('payment')

    if (customerSessionToken || paymentSuccess === 'success') {
      // 결제 성공
      localStorage.setItem('paidCustomer', 'true')
      const purchasedProductType = urlParams.get('type') || localStorage.getItem('productType') || 'full'

      // 결제 성공 - IndexedDB에서 저장된 폼 데이터 복원 (사진 포함)
      const hasPendingData = localStorage.getItem('pendingAnalysisFlag')
      if (hasPendingData) {
        // async 처리를 위한 IIFE
        (async () => {
          try {
            const savedData = await loadFromIndexedDB() as {
              height: string; weight: string; gender: Gender; photo: string | null;
              hairPhoto?: string; selectedOccasion?: string; selectedVibe?: string; productType?: string
            } | null

            if (savedData) {
              // Hair Only 상품인 경우
              if (purchasedProductType === 'hair' && savedData.hairPhoto) {
                setHairPhoto(savedData.hairPhoto)
                setSelectedOccasion(savedData.selectedOccasion || null)
                setSelectedVibe(savedData.selectedVibe || null)
                setProfile(prev => ({ ...prev, gender: savedData.gender }))
                setIsPaid(true)
                await clearIndexedDB()
                localStorage.removeItem('pendingAnalysisFlag')
                localStorage.removeItem('productType')

                // URL 정리 후 헤어 결과 생성 시작
                window.history.replaceState({ page: 'loading' }, '', '#loading')
                setPageState('loading')
                setTimeout(() => {
                  startHairGenerationAfterPayment(savedData)
                }, 100)
                return
              }

              // Full 상품인 경우 (기존 로직)
              setProfile({
                height: savedData.height,
                weight: savedData.weight,
                gender: savedData.gender,
                photo: savedData.photo
              })
              setIsPaid(true)
              await clearIndexedDB()
              localStorage.removeItem('pendingAnalysisFlag')
              localStorage.removeItem('productType')

              // URL 정리 후 바로 분석 시작
              window.history.replaceState({ page: 'loading' }, '', '#loading')
              setPageState('loading')
              // 약간의 딜레이 후 분석 시작 (상태 업데이트 대기)
              setTimeout(() => {
                startAnalysisAfterPayment(savedData)
              }, 100)
              return
            }
          } catch (e) {
            console.error('Failed to load saved data from IndexedDB:', e)
          }
          // 저장된 데이터 없으면 입력 페이지로
          setIsPaid(true)
          setPageState('input')
          window.history.replaceState({ page: 'input' }, '', '#input')
        })()
        return
      }
      // 저장된 데이터 없으면 입력 페이지로
      setIsPaid(true)
      setPageState('input')
      window.history.replaceState({ page: 'input' }, '', '#input')
      return
    }

    // 초기 상태 설정
    const hash = window.location.hash.slice(1) as Page
    if (hash && ['landing', 'input', 'hair-selection', 'hair-result', 'how-to-use', 'result'].includes(hash)) {
      setPageState(hash)
    } else {
      window.history.replaceState({ page: 'landing' }, '', '#landing')
    }

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 로딩 프로그레스 타이머 (자연스러운 진행률 표시)
  useEffect(() => {
    if (page !== 'loading') return

    const steps = lang === 'ko'
      ? ['프로필 분석 시작...', '체형 및 컬러 분석 중...', '퍼스널 스타일 계산 중...', '맞춤 스타일 이미지 생성 중...', '스타일 리포트 작성 중...', '마무리 중...']
      : ['Starting analysis...', 'Analyzing body type & colors...', 'Calculating personal style...', 'Generating style images...', 'Creating style report...', 'Finalizing...']

    let progress = 0
    let stepIdx = 0

    const interval = setInterval(() => {
      // Increment by random amount (faster at start, slower near end)
      const increment = progress < 30 ? Math.random() * 6 + 3
        : progress < 60 ? Math.random() * 4 + 2
        : progress < 85 ? Math.random() * 2 + 1
        : Math.random() * 0.5 + 0.2

      progress = Math.min(progress + increment, 92) // Cap at 92%
      setLoadingProgress(Math.round(progress))

      // Update step text periodically
      const newStepIdx = Math.min(Math.floor(progress / 16), steps.length - 1)
      if (newStepIdx !== stepIdx) {
        stepIdx = newStepIdx
        setLoadingStep(steps[stepIdx])
      }
    }, 600)

    // Set initial step
    setLoadingStep(steps[0])

    return () => clearInterval(interval)
  }, [page, lang])

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, photo: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // Polar 결제 처리
  const handlePayment = async (productType: 'full' | 'hair' = 'full') => {
    setIsProcessingPayment(true)
    try {
      // 결제 전 폼 데이터 저장 (IndexedDB - 사진 포함 가능)
      const dataToSave = {
        height: profile.height,
        weight: profile.weight,
        gender: profile.gender,
        photo: profile.photo,  // IndexedDB는 큰 데이터도 저장 가능
        productType  // 어떤 상품을 구매했는지 저장
      }
      await saveToIndexedDB(dataToSave)
      localStorage.setItem('pendingAnalysisFlag', 'true')  // 플래그만 localStorage에
      localStorage.setItem('productType', productType)  // 상품 타입 저장

      // 백엔드 API로 체크아웃 URL 가져오기
      const checkoutResponse = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType,
          successUrl: `${window.location.origin}/?payment=success&type=${productType}`
        })
      })

      const checkoutData = await checkoutResponse.json()

      if (!checkoutResponse.ok || !checkoutData.url) {
        throw new Error(checkoutData.message || 'Failed to create checkout session')
      }

      // 결제 페이지로 직접 리다이렉트 (가장 안정적)
      window.location.href = checkoutData.url
    } catch (error) {
      console.error('Payment error:', error)
      setIsProcessingPayment(false)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(lang === 'ko'
        ? `결제 오류: ${errorMessage}`
        : `Payment error: ${errorMessage}`)
    }
  }

  // 결제 후 분석 수행 (프로필 데이터를 직접 받음)
  const startAnalysisAfterPayment = async (profileData: typeof profile) => {
    setError('')
    setStyleImages([])
    setLoadingProgress(0)
    setLoadingStep('')
    setPage('loading')

    try {
      // Step 1: Text analysis first
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: profileData.photo,
          height: profileData.height,
          weight: profileData.weight,
          gender: profileData.gender,
          language: lang
        })
      })

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed')
      }

      const analyzeData = await analyzeResponse.json()
      if (analyzeData.report) {
        setReport(analyzeData.report)
      }

      setLoadingProgress(100)
      setLoadingStep(lang === 'ko' ? '완료!' : 'Complete!')
      await new Promise(resolve => setTimeout(resolve, 400))
      setPage('result')

      // Step 2: Generate style images AND hairstyles AFTER showing result page
      setIsGeneratingStyles(true)
      setIsTransformingHair(true)

      // Generate fashion styles and hairstyles in parallel
      const [stylesResult, hairResult] = await Promise.allSettled([
        fetch('/api/generate-styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            height: profileData.height,
            weight: profileData.weight,
            gender: profileData.gender,
            photo: profileData.photo,
            language: lang
          })
        }),
        fetch('/api/transform-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo: profileData.photo,
            type: 'hairstyle',
            gender: profileData.gender,
            language: lang
          })
        })
      ])

      // Handle fashion styles
      if (stylesResult.status === 'fulfilled') {
        if (stylesResult.value.ok) {
          const stylesData = await stylesResult.value.json()
          console.log('[Fashion] Success:', stylesData)
          setStyleImages(stylesData.styles || [])
        } else {
          console.error('[Fashion] API error:', stylesResult.value.status, await stylesResult.value.text())
        }
      } else {
        console.error('[Fashion] Fetch failed:', stylesResult.reason)
      }
      setIsGeneratingStyles(false)

      // Handle hairstyles
      if (hairResult.status === 'fulfilled') {
        if (hairResult.value.ok) {
          const hairData = await hairResult.value.json()
          console.log('[Hair] Success:', hairData)
          setTransformedHairstyles(hairData.results || [])
        } else {
          console.error('[Hair] API error:', hairResult.value.status, await hairResult.value.text())
        }
      } else {
        console.error('[Hair] Fetch failed:', hairResult.reason)
      }
      setIsTransformingHair(false)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(lang === 'ko' ? '분석 중 오류가 발생했습니다' : 'An error occurred during analysis')
      setPage('input')
    }
  }

  // 결제 후 헤어 스타일 생성 (Hair Only 상품)
  const startHairGenerationAfterPayment = async (savedData: {
    hairPhoto?: string; selectedOccasion?: string; selectedVibe?: string; gender?: Gender
  }) => {
    setIsGeneratingHair(true)

    const occasion = savedData.selectedOccasion || 'daily'
    const vibe = savedData.selectedVibe || 'natural'

    // 데모 추천 가져오기
    const demoRecommendations = getHairDemoRecommendations(occasion, vibe, lang)
    setHairRecommendations(demoRecommendations)

    // 사진으로 AI 이미지 생성
    if (savedData.hairPhoto) {
      try {
        const response = await fetch('/api/generate-hair-styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo: savedData.hairPhoto,
            occasion,
            vibe,
            gender: savedData.gender,
            styles: demoRecommendations,
            language: lang
          })
        })

        if (response.ok) {
          const data = await response.json()
          setGeneratedHairImages(data.images || [])
        }
      } catch {
        setGeneratedHairImages([])
      }
    }

    setIsGeneratingHair(false)
    setPage('hair-result')
  }

  // 실제 분석 수행 함수
  const performAnalysis = async () => {
    setPage('loading')
    setError('')
    setStyleImages([])
    setLoadingProgress(0)
    setLoadingStep('')

    try {
      // Step 1: Text analysis first
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: profile.photo,
          height: profile.height,
          weight: profile.weight,
          gender: profile.gender,
          language: lang
        })
      })

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed')
      }

      const analyzeData = await analyzeResponse.json()
      setReport(analyzeData.report)

      setLoadingProgress(100)
      setLoadingStep(lang === 'ko' ? '완료!' : 'Complete!')
      await new Promise(resolve => setTimeout(resolve, 400))
      setPage('result')

      // Step 2: Generate style images AND hairstyles AFTER showing result page
      setIsGeneratingStyles(true)
      setIsTransformingHair(true)

      // Generate fashion styles and hairstyles in parallel
      const [stylesResult, hairResult] = await Promise.allSettled([
        fetch('/api/generate-styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            height: profile.height,
            weight: profile.weight,
            gender: profile.gender,
            photo: profile.photo,
            language: lang
          })
        }),
        fetch('/api/transform-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo: profile.photo,
            type: 'hairstyle',
            gender: profile.gender,
            language: lang
          })
        })
      ])

      // Handle fashion styles
      if (stylesResult.status === 'fulfilled') {
        if (stylesResult.value.ok) {
          const stylesData = await stylesResult.value.json()
          console.log('[Fashion] Success:', stylesData)
          setStyleImages(stylesData.styles || [])
        } else {
          console.error('[Fashion] API error:', stylesResult.value.status, await stylesResult.value.text())
        }
      } else {
        console.error('[Fashion] Fetch failed:', stylesResult.reason)
      }
      setIsGeneratingStyles(false)

      // Handle hairstyles
      if (hairResult.status === 'fulfilled') {
        if (hairResult.value.ok) {
          const hairData = await hairResult.value.json()
          console.log('[Hair] Success:', hairData)
          setTransformedHairstyles(hairData.results || [])
        } else {
          console.error('[Hair] API error:', hairResult.value.status, await hairResult.value.text())
        }
      } else {
        console.error('[Hair] Fetch failed:', hairResult.reason)
      }
      setIsTransformingHair(false)
    } catch (err) {
      console.error('Error:', err)
      setError(t.error)
      setPage('input')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 결제가 완료된 경우 바로 분석 시작
    if (isPaid) {
      performAnalysis()
    } else {
      // 결제가 안된 경우 결제 창 열기
      handlePayment()
    }
  }

  const generateStyleImages = async () => {
    setIsGeneratingStyles(true)
    try {
      const response = await fetch('/api/generate-styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          height: profile.height,
          weight: profile.weight,
          gender: profile.gender,
          photo: profile.photo,
          language: lang
        })
      })

      if (response.ok) {
        const data = await response.json()
        setStyleImages(data.styles || [])
      }
    } catch (err) {
      console.error('Error generating styles:', err)
    } finally {
      setIsGeneratingStyles(false)
    }
  }

  // 헤어스타일 변환 (3x3 그리드)
  const transformHairstyles = async () => {
    if (!profile.photo) {
      setError(lang === 'ko' ? '사진이 필요합니다' : 'Photo is required')
      return
    }
    setIsTransformingHair(true)
    try {
      const response = await fetch('/api/transform-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: profile.photo,
          type: 'hairstyle',
          gender: profile.gender,
          language: lang
        })
      })
      if (response.ok) {
        const data = await response.json()
        setTransformedHairstyles(data.results || [])
      }
    } catch (err) {
      console.error('Error transforming hairstyles:', err)
    } finally {
      setIsTransformingHair(false)
    }
  }

  // 패션 변환 (3x3 그리드)
  const handleRestart = () => {
    setProfile({ photo: null, height: '', weight: '', gender: null })
    setReport('')
    setError('')
    setStyleImages([])
    setIsGeneratingStyles(false)
    setSelectedOccasion(null)
    setSelectedVibe(null)
    setHairRecommendations([])
    setHairPhoto(null)
    setGeneratedHairImages([])
    setTransformedHairstyles([])
    setPage('landing')
  }

  // 결과 다운로드 (이미지 URL들을 새 탭에서 열기)
  const handleDownloadResult = async (imageUrls: string[]) => {
    const validUrls = imageUrls.filter(url => url)
    if (validUrls.length === 0) return

    // 각 이미지를 다운로드
    for (let i = 0; i < validUrls.length; i++) {
      try {
        const response = await fetch(validUrls[i])
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `stylist-result-${i + 1}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Download failed:', err)
      }
    }
  }

  // 결과 공유
  const handleShareResult = async () => {
    const shareData = {
      title: 'AI Stylist - 나만의 스타일 추천',
      text: '🪄 AI가 내 얼굴에 맞는 헤어스타일과 패션을 추천해줬어요! 당신도 체험해보세요!',
      url: 'https://kstylist.cc'
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // 사용자가 취소한 경우 무시
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err)
        }
      }
    } else {
      // Web Share API 미지원 시 클립보드에 복사
      try {
        await navigator.clipboard.writeText(shareData.url)
        alert(t.linkCopied)
      } catch (err) {
        console.error('Copy failed:', err)
      }
    }
  }

  // 헤어 사진 업로드 처리
  const handleHairPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setHairPhoto(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleHairRecommendation = async () => {
    if (!selectedOccasion || !selectedVibe) return

    // 사진이 있고 결제 안 됐으면 결제 진행
    if (hairPhoto && !isPaid) {
      setIsProcessingPayment(true)
      try {
        // 결제 전 데이터 저장
        const dataToSave = {
          hairPhoto,
          selectedOccasion,
          selectedVibe,
          gender: profile.gender,
          productType: 'hair'
        }
        await saveToIndexedDB(dataToSave)
        localStorage.setItem('pendingAnalysisFlag', 'true')
        localStorage.setItem('productType', 'hair')

        // 결제 페이지로 리다이렉트
        const checkoutResponse = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productType: 'hair',
            successUrl: `${window.location.origin}/?payment=success&type=hair`
          })
        })

        const checkoutData = await checkoutResponse.json()
        if (!checkoutResponse.ok || !checkoutData.url) {
          throw new Error(checkoutData.message || 'Failed to create checkout session')
        }

        window.location.href = checkoutData.url
      } catch (error) {
        console.error('Payment error:', error)
        setIsProcessingPayment(false)
        setError(lang === 'ko' ? '결제 오류가 발생했습니다' : 'Payment error occurred')
      }
      return
    }

    // 결제 완료된 경우 또는 사진 없는 경우 (데모)
    setPage('loading')
    setIsGeneratingHair(true)

    // 데모 추천 가져오기
    const demoRecommendations = getHairDemoRecommendations(selectedOccasion, selectedVibe, lang)
    setHairRecommendations(demoRecommendations)

    // 사진이 있으면 AI 이미지 생성 시도
    if (hairPhoto) {
      try {
        const response = await fetch('/api/generate-hair-styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo: hairPhoto,
            occasion: selectedOccasion,
            vibe: selectedVibe,
            gender: profile.gender,
            styles: demoRecommendations,
            language: lang
          })
        })

        if (response.ok) {
          const data = await response.json()
          setGeneratedHairImages(data.images || [])
        }
      } catch {
        // AI 이미지 생성 실패 시 빈 배열
        setGeneratedHairImages([])
      }
    }

    setIsGeneratingHair(false)
    setPage('hair-result')
  }

  // 데모용 헤어스타일 추천
  const getHairDemoRecommendations = (occasion: string, vibe: string, language: string): string[] => {
    const recommendations: Record<string, Record<string, string[]>> = {
      ko: {
        'daily-elegant': ['클래식 웨이브 롱헤어', '단정한 로우번', '볼륨 레이어드컷', '사이드 스윕 뱅', '엘레강트 하프업'],
        'daily-cute': ['볼륨 단발머리', '리본 포니테일', '부드러운 C컬 단발', '에어리 뱅헤어', '플러피 레이어드'],
        'daily-chic': ['슬릭백 포니테일', '웨트룩 숏컷', '미니멀 스트레이트', '로우 테일', '클린 밥컷'],
        'daily-natural': ['내추럴 웨이브', '에어리 레이어드', '소프트 히피펌', '루즈 컬', '자연스러운 롱헤어'],
        'daily-trendy': ['울프컷', '허쉬컷', '페이스 프레이밍 레이어', '샤기컷', '멀렛 스타일'],
        'daily-classic': ['클래식 밥컷', '우아한 시니용', '타임리스 롱 레이어', '프렌치 밥', '클래식 포니테일'],
        'date-elegant': ['로맨틱 웨이브', '반묶음 하프업', '공주머리 스타일', '소프트 업스타일', '글램 컬'],
        'date-cute': ['트윈 번 스타일', '리본 하프업', '볼륨 뱅헤어', '피치 컬', '플라워 핀 스타일'],
        'date-chic': ['슬릭 포니테일', '센터파팅 스트레이트', '젖은 머리 스타일링', '모던 밥', '샤프 레이어드'],
        'date-natural': ['비치 웨이브', '루즈한 브레이드', '자연스러운 컬', '에어리 웨이브', '소프트 레이어'],
        'date-trendy': ['텍스쳐드 밥', 'Y2K 스타일', '페이스 레이어드', '울프 웨이브', '청키 하이라이트'],
        'date-classic': ['헐리웃 웨이브', '프렌치 트위스트', '엘레강스 업스타일', '빈티지 컬', '클래식 시니용'],
        'interview-elegant': ['단정한 로우번', '깔끔한 포니테일', '프로페셔널 밥컷', '슬릭 하프업', '클린 레이어드'],
        'interview-cute': ['소프트 웨이브 단발', '단정한 하프업', '깔끔한 내추럴 컬', '에어리 밥', '소프트 뱅'],
        'interview-chic': ['슬릭 로우번', '미니멀 스트레이트', '파워 밥컷', '샤프 포니', '모던 업두'],
        'interview-natural': ['내추럴 스트레이트', '소프트 레이어드', '깔끔한 웨이브', '클린 롱헤어', '자연스러운 밥'],
        'interview-trendy': ['모던 밥컷', '클린 레이어드', '프레시 미디움', '텍스쳐드 롱', '세미 업스타일'],
        'interview-classic': ['클래식 시니용', '프렌치 롤', '엘레강트 업두', '타임리스 번', '포멀 포니테일'],
        'party-elegant': ['글램 웨이브', '크리스탈 업스타일', '할리우드 컬', '스파클 업두', '글래머러스 다운'],
        'party-cute': ['스파클 트윈테일', '글리터 번', '페스티벌 브레이드', '큐티 포니', '펑키 피그테일'],
        'party-chic': ['슬릭백 하이포니', '젖은 머리 룩', '에지 언더컷 스타일', '볼드 밥', '샤프 업스타일'],
        'party-natural': ['비치 웨이브', '보헤미안 브레이드', '루즈한 컬', '히피 스타일', '자유로운 웨이브'],
        'party-trendy': ['네온 하이라이트', 'Y2K 업두', '글로시 스트레이트', '사이버펑크 스타일', '홀로그램 헤어'],
        'party-classic': ['올드 할리우드 웨이브', '빈티지 업두', '레트로 컬', '클래식 글램', '티아라 스타일'],
        'wedding-elegant': ['브라이덜 업두', '로맨틱 사이드번', '진주 헤어피스 스타일', '베일 업스타일', '프린세스 웨이브'],
        'wedding-cute': ['플라워 크라운 스타일', '소프트 컬 다운두', '리본 하프업', '페어리 스타일', '로맨틱 브레이드'],
        'wedding-chic': ['슬릭 시니용', '모던 로우번', '미니멀 업스타일', '클린 웨이브', '세련된 포니'],
        'wedding-natural': ['가든 웨이브', '루즈한 브레이드 업두', '보헤미안 다운스타일', '야생화 스타일', '내추럴 컬'],
        'wedding-trendy': ['글래스 헤어', '페이스 프레이밍 업두', '모던 하프업', '아방가르드 스타일', '텍스쳐드 업두'],
        'wedding-classic': ['클래식 시니용', '빈티지 롤 업두', '엘레강트 프렌치 트위스트', '로열 업스타일', '그레이스풀 번'],
        'vacation-elegant': ['비치 웨이브', '실크 스카프 랩', '리조트 업스타일', '선셋 웨이브', '엘레강트 브레이드'],
        'vacation-cute': ['피그테일 브레이드', '버킷햇 스타일 웨이브', '선샤인 포니테일', '플레이풀 번', '서머 트윈테일'],
        'vacation-chic': ['웨트룩 스타일', '슬릭 로우번', '미니멀 비치 스타일', '쿨 포니테일', '모던 브레이드'],
        'vacation-natural': ['솔트 스프레이 웨이브', '자연스러운 컬', '에어드라이 스타일', '비치 컬', '자유로운 롱헤어'],
        'vacation-trendy': ['Y2K 클립 스타일', '버터플라이 클립 룩', '레이어드 반다나', '네온 액센트', '펑키 업두'],
        'vacation-classic': ['그레이스 켈리 스카프룩', '클래식 비치 웨이브', '타임리스 포니테일', '빈티지 리조트룩', '엘레강트 선햇 스타일'],
      },
      en: {
        'daily-elegant': ['Classic Wave Long Hair', 'Neat Low Bun', 'Volume Layered Cut', 'Side Swept Bangs', 'Elegant Half-Up'],
        'daily-cute': ['Volume Bob', 'Ribbon Ponytail', 'Soft C-Curl Bob', 'Airy Bangs', 'Fluffy Layered'],
        'daily-chic': ['Slicked Back Ponytail', 'Wet Look Short Cut', 'Minimal Straight', 'Low Tail', 'Clean Bob'],
        'daily-natural': ['Natural Wave', 'Airy Layered', 'Soft Hippie Perm', 'Loose Curls', 'Natural Long Hair'],
        'daily-trendy': ['Wolf Cut', 'Hush Cut', 'Face Framing Layers', 'Shag Cut', 'Mullet Style'],
        'daily-classic': ['Classic Bob Cut', 'Elegant Chignon', 'Timeless Long Layers', 'French Bob', 'Classic Ponytail'],
        'date-elegant': ['Romantic Waves', 'Half-Up Half-Down', 'Princess Style', 'Soft Upstyle', 'Glam Curls'],
        'date-cute': ['Twin Bun Style', 'Ribbon Half-Up', 'Volume Bangs', 'Peach Curls', 'Flower Pin Style'],
        'date-chic': ['Sleek Ponytail', 'Center Part Straight', 'Wet Hair Styling', 'Modern Bob', 'Sharp Layered'],
        'date-natural': ['Beach Waves', 'Loose Braid', 'Natural Curls', 'Airy Waves', 'Soft Layers'],
        'date-trendy': ['Textured Bob', 'Y2K Style', 'Face Layered', 'Wolf Waves', 'Chunky Highlights'],
        'date-classic': ['Hollywood Waves', 'French Twist', 'Elegance Upstyle', 'Vintage Curls', 'Classic Chignon'],
        'interview-elegant': ['Neat Low Bun', 'Clean Ponytail', 'Professional Bob', 'Sleek Half-Up', 'Clean Layered'],
        'interview-cute': ['Soft Wave Bob', 'Neat Half-Up', 'Clean Natural Curl', 'Airy Bob', 'Soft Bangs'],
        'interview-chic': ['Sleek Low Bun', 'Minimal Straight', 'Power Bob', 'Sharp Pony', 'Modern Updo'],
        'interview-natural': ['Natural Straight', 'Soft Layered', 'Clean Waves', 'Clean Long Hair', 'Natural Bob'],
        'interview-trendy': ['Modern Bob', 'Clean Layered', 'Fresh Medium', 'Textured Long', 'Semi Upstyle'],
        'interview-classic': ['Classic Chignon', 'French Roll', 'Elegant Updo', 'Timeless Bun', 'Formal Ponytail'],
        'party-elegant': ['Glam Waves', 'Crystal Upstyle', 'Hollywood Curls', 'Sparkle Updo', 'Glamorous Down'],
        'party-cute': ['Sparkle Twin Tails', 'Glitter Bun', 'Festival Braids', 'Cutie Pony', 'Funky Pigtails'],
        'party-chic': ['Slicked High Pony', 'Wet Look', 'Edgy Undercut Style', 'Bold Bob', 'Sharp Upstyle'],
        'party-natural': ['Beach Waves', 'Bohemian Braids', 'Loose Curls', 'Hippie Style', 'Free Waves'],
        'party-trendy': ['Neon Highlights', 'Y2K Updo', 'Glossy Straight', 'Cyberpunk Style', 'Hologram Hair'],
        'party-classic': ['Old Hollywood Waves', 'Vintage Updo', 'Retro Curls', 'Classic Glam', 'Tiara Style'],
        'wedding-elegant': ['Bridal Updo', 'Romantic Side Bun', 'Pearl Hairpiece Style', 'Veil Upstyle', 'Princess Waves'],
        'wedding-cute': ['Flower Crown Style', 'Soft Curl Down-do', 'Ribbon Half-Up', 'Fairy Style', 'Romantic Braids'],
        'wedding-chic': ['Sleek Chignon', 'Modern Low Bun', 'Minimal Upstyle', 'Clean Waves', 'Sleek Pony'],
        'wedding-natural': ['Garden Waves', 'Loose Braid Updo', 'Bohemian Down Style', 'Wildflower Style', 'Natural Curls'],
        'wedding-trendy': ['Glass Hair', 'Face Framing Updo', 'Modern Half-Up', 'Avant-Garde Style', 'Textured Updo'],
        'wedding-classic': ['Classic Chignon', 'Vintage Roll Updo', 'Elegant French Twist', 'Royal Upstyle', 'Graceful Bun'],
        'vacation-elegant': ['Beach Waves', 'Silk Scarf Wrap', 'Resort Upstyle', 'Sunset Waves', 'Elegant Braids'],
        'vacation-cute': ['Pigtail Braids', 'Bucket Hat Wave', 'Sunshine Ponytail', 'Playful Buns', 'Summer Twin Tails'],
        'vacation-chic': ['Wet Look Style', 'Sleek Low Bun', 'Minimal Beach Style', 'Cool Ponytail', 'Modern Braids'],
        'vacation-natural': ['Salt Spray Waves', 'Natural Curls', 'Air Dry Style', 'Beach Curls', 'Free Long Hair'],
        'vacation-trendy': ['Y2K Clip Style', 'Butterfly Clip Look', 'Layered Bandana', 'Neon Accent', 'Funky Updo'],
        'vacation-classic': ['Grace Kelly Scarf Look', 'Classic Beach Waves', 'Timeless Ponytail', 'Vintage Resort Look', 'Elegant Sun Hat Style'],
      }
    }

    const key = `${occasion}-${vibe}`
    const langKey = language === 'ko' ? 'ko' : 'en'
    return recommendations[langKey]?.[key] || recommendations[langKey]?.['daily-natural'] || []
  }

  const isFormValid = profile.photo && profile.height && profile.weight && profile.gender

  // How to Use Page
  if (page === 'how-to-use') {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo" onClick={handleRestart} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="currentColor">
                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.1288 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"/>
              </svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
          <button className="back-btn" onClick={() => setPage('landing')}>
            ← {t.backToHome}
          </button>
        </header>

        <div className="how-to-use-content">
          <div className="how-to-use-hero">
            <span className="input-tag">GUIDE</span>
            <h1 className="input-title">{t.howToUseTitle}</h1>
            <p className="input-desc">{t.howToUseDesc}</p>
          </div>

          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">🎯</div>
              <h3>{t.step1Title}</h3>
              <p>{t.step1Desc}</p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">✨</div>
              <h3>{t.step2Title}</h3>
              <p>{t.step2Desc}</p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">🤖</div>
              <h3>{t.step3Title}</h3>
              <p>{t.step3Desc}</p>
            </div>

            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-icon">💎</div>
              <h3>{t.step4Title}</h3>
              <p>{t.step4Desc}</p>
            </div>
          </div>

          <div className="how-to-use-actions">
            <button className="btn-gold" onClick={() => setPage('landing')}>
              {t.getStarted}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Landing Page
  if (page === 'landing') {
    return (
      <div className="landing-page">
        {/* Header */}
        <header className="landing-header">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="currentColor">
                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.1288 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"/>
              </svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#algorithm">Algorithm</a>
          </div>
          <div className="header-actions">
            <div className="lang-selector">
              {(Object.keys(languageNames) as Language[]).map((code) => (
                <button
                  key={code}
                  className={`lang-btn-sm ${lang === code ? 'active' : ''}`}
                  onClick={() => setLang(code)}
                >
                  {languageNames[code]}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              {t.startBtn}
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-image">
            <div className="hero-image-bg"></div>
            <div className="glass-card">
              <span className="glass-tag">PERSONAL STYLING</span>
              <p className="glass-text">Your Style, Reimagined</p>
            </div>
            <div className="slider-handle">
              <div className="slider-dot"></div>
            </div>
          </div>
          <div className="hero-content">
            <span className="hero-tag">DIGITAL ATELIER</span>
            <h1 className="hero-title">
              {t.heroTitle1} <br />
              <span className="text-gradient">{t.heroTitle2}</span>
            </h1>
            <p className="hero-desc">{t.heroDesc}</p>
            <div className="hero-buttons">
              <button className="btn-dark" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                {t.startBtn}
              </button>
              <button className="btn-outline" onClick={() => setPage('how-to-use')}>
                {t.learnMore}
              </button>
            </div>
            <div className="featured-in">
              <span className="magazine">VOGUE</span>
              <span className="magazine">BAZAAR</span>
              <span className="magazine">ELLE</span>
              <span className="magazine">WWD</span>
            </div>
          </div>
        </section>

        {/* Service Intro Section */}
        <section className="service-intro-section">
          <h2 className="section-title">{t.serviceIntroTitle}</h2>
          <div className="section-divider"></div>
          <div className="service-steps">
            <div className="service-step">
              <div className="service-step-icon">1</div>
              <h3>{t.serviceStep1}</h3>
              <p>{t.serviceStep1Desc}</p>
            </div>
            <div className="service-step-arrow">→</div>
            <div className="service-step">
              <div className="service-step-icon">2</div>
              <h3>{t.serviceStep2}</h3>
              <p>{t.serviceStep2Desc}</p>
            </div>
            <div className="service-step-arrow">→</div>
            <div className="service-step">
              <div className="service-step-icon">3</div>
              <h3>{t.serviceStep3}</h3>
              <p>{t.serviceStep3Desc}</p>
            </div>
          </div>
        </section>

        {/* Path Section */}
        <section className="path-section" id="features">
          <h2 className="section-title">{t.pathTitle}</h2>
          <div className="section-divider"></div>
          <div className="path-grid">
            <div className="path-card" onClick={() => setPage('hair-selection')}>
              <div className="path-image path-image-1"></div>
              <div className="path-overlay"></div>
              <div className="path-content">
                <div className="path-glass">
                  <div className="path-header">
                    <span className="path-module">HAIR ONLY</span>
                    <span className="path-price">$4.99</span>
                  </div>
                  <h3 className="path-title">{t.module1Title}</h3>
                  <p className="path-desc">{t.module1Desc}</p>
                  <ul className="path-features">
                    {t.module1Features.map((feature, i) => (
                      <li key={i}>✓ {feature}</li>
                    ))}
                  </ul>
                  <div className="path-explore">
                    {t.explore} <span>→</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="path-card featured" onClick={() => setPage('input')}>
              <div className="path-image path-image-2"></div>
              <div className="path-overlay"></div>
              <div className="path-content">
                <div className="path-glass">
                  <div className="path-header">
                    <span className="path-module">FULL PACKAGE</span>
                    <span className="path-badge">{t.bestValue}</span>
                    <span className="path-price best">$9.99</span>
                  </div>
                  <h3 className="path-title">{t.module2Title}</h3>
                  <p className="path-desc">{t.module2Desc}</p>
                  <ul className="path-features">
                    {t.module2Features.map((feature, i) => (
                      <li key={i}>✓ {feature}</li>
                    ))}
                  </ul>
                  <div className="path-explore">
                    {t.explore} <span>→</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-content">
            <div className="footer-brand">
              <h2 className="footer-logo">{t.title}</h2>
              <p className="footer-desc">{t.subtitle}</p>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <h5>DISCOVER</h5>
                <a href="#">Pathways</a>
                <a href="#">Collections</a>
              </div>
              <div className="footer-col">
                <h5>COMPANY</h5>
                <a href="#">About</a>
                <a href="#">Contact</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2024 PERSONAL STYLIST. ALL RIGHTS RESERVED.</span>
          </div>
        </footer>
      </div>
    )
  }

  // Loading Page
  if (page === 'loading') {
    return (
      <div className="app-container">
        <div className="loading-page">
          <div className="spinner"></div>
          <h2>{t.analyzing}</h2>
          <p>{loadingStep || t.analyzingDesc}</p>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${loadingProgress}%` }}></div>
          </div>
          <span className="progress-text">{loadingProgress}%</span>
        </div>
      </div>
    )
  }

  // Result Page
  if (page === 'result') {
    return (
      <div className="app-container result-container">
        <header className="app-header">
          <div className="logo" onClick={handleRestart} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="currentColor">
                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.1288 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"/>
              </svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
          <h1 className="page-title">{t.report}</h1>
          <div className="lang-selector">
            {(Object.keys(languageNames) as Language[]).map((code) => (
              <button
                key={code}
                className={`lang-btn-sm ${lang === code ? 'active' : ''}`}
                onClick={() => setLang(code)}
              >
                {languageNames[code]}
              </button>
            ))}
          </div>
        </header>

        <div className="report-section">
          <div className="profile-summary">
            {profile.photo && (
              <img src={profile.photo} alt="Profile" className="result-photo" />
            )}
            <div className="profile-info">
              <span>{profile.height} cm</span>
              <span>{profile.weight} kg</span>
            </div>
          </div>

          <div className="report-content" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(report) }} />
        </div>

        <div className="style-gallery-section">
          <div className="style-gallery-header">
            <h2>{t.styleGallery}</h2>
            <p>{t.styleGalleryDesc}</p>
          </div>

          {isGeneratingStyles ? (
            <div className="style-loading">
              <div className="spinner small"></div>
              <span>{t.generatingStyles}</span>
              <div className="progress-bar-container small" style={{ marginTop: '0.75rem', width: '200px' }}>
                <div className="progress-bar animated" style={{ animationDuration: '25s' }}></div>
              </div>
              <span style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem' }}>
                {lang === 'ko' ? '6개 스타일 생성 중 (약 20-30초)' : 'Generating 6 styles (~20-30 seconds)'}
              </span>
            </div>
          ) : styleImages.length > 0 && styleImages.some(s => s.imageUrl) ? (
            <>
              <div className="style-grid">
                {styleImages.map((style) => (
                  <div key={style.id} className="style-card">
                    <div className="style-image-container">
                      {style.imageUrl ? (
                        <img src={style.imageUrl} alt={style.label} className="style-image" />
                      ) : (
                        <div className="style-placeholder">
                          <span className="style-icon">👔</span>
                        </div>
                      )}
                    </div>
                    <span className="style-label">{style.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="style-generate-prompt">
              <p style={{ marginBottom: '1rem', opacity: 0.7 }}>
                {lang === 'ko'
                  ? '패션 스타일 이미지를 생성하려면 아래 버튼을 클릭하세요'
                  : 'Click below to generate fashion style images'}
              </p>
              <button className="btn-gold" onClick={generateStyleImages}>
                {lang === 'ko' ? '🎨 스타일 이미지 생성' : '🎨 Generate Style Images'}
              </button>
            </div>
          )}
        </div>

        {/* Hairstyle Transform Section */}
        {profile.photo && (
          <div className="transform-section">
            <div className="transform-header">
              <h2>{t.hairstyleTransform}</h2>
              <p>{t.hairstyleTransformDesc}</p>
            </div>

            {isTransformingHair ? (
              <div className="style-loading">
                <div className="spinner small"></div>
                <span>{t.generatingHairstyles}</span>
                <div className="progress-bar-container small" style={{ marginTop: '0.75rem', width: '200px' }}>
                  <div className="progress-bar animated" style={{ animationDuration: '20s' }}></div>
                </div>
                <span style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem' }}>
                  {lang === 'ko' ? '5개 헤어스타일 생성 중 (약 15-20초)' : 'Generating 5 hairstyles (~15-20 seconds)'}
                </span>
              </div>
            ) : transformedHairstyles.length > 0 ? (
              <div className="transform-grid">
                {transformedHairstyles.map((style) => (
                  <div key={style.id} className="transform-card">
                    <div className="transform-image-container">
                      {style.imageUrl ? (
                        <img src={style.imageUrl} alt={style.label} className="transform-image" />
                      ) : (
                        <div className="transform-placeholder">
                          <span className="transform-icon">💇</span>
                        </div>
                      )}
                    </div>
                    <span className="transform-label">{style.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <button className="btn-gold" onClick={transformHairstyles}>
                {t.generateHairstyles}
              </button>
            )}
          </div>
        )}

        <div className="result-actions">
          {(styleImages.some(s => s.imageUrl) || transformedHairstyles.some(s => s.imageUrl)) && (
            <>
              <button
                className="btn-outline"
                onClick={() => handleDownloadResult([
                  ...styleImages.map(s => s.imageUrl).filter(Boolean) as string[],
                  ...transformedHairstyles.map(s => s.imageUrl).filter(Boolean) as string[]
                ])}
              >
                {t.downloadResult}
              </button>
              <button className="btn-outline" onClick={handleShareResult}>
                {t.shareResult}
              </button>
            </>
          )}
          <button className="btn-dark" onClick={handleRestart}>
            {t.restart}
          </button>
        </div>
      </div>
    )
  }

  // Hair Selection Page
  if (page === 'hair-selection') {
    const getOccasionLabel = (o: HairOccasion) => lang === 'ko' ? o.labelKo : o.labelEn
    const getVibeLabel = (v: HairVibe) => lang === 'ko' ? v.labelKo : v.labelEn

    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo" onClick={handleRestart} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="currentColor">
                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.1288 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"/>
              </svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
          <button className="back-btn" onClick={() => setPage('landing')}>
            ← {t.backToHome}
          </button>
        </header>

        <div className="hair-selection-content">
          <div className="hair-hero">
            <span className="input-tag">HAIR STYLING</span>
            <h1 className="input-title">{t.hairSelectTitle}</h1>
            <p className="input-desc">{t.hairSelectDesc}</p>
          </div>

          <div className="hair-selection-form">
            <div className="selection-section">
              <h3 className="selection-title">{t.selectOccasion}</h3>
              <div className="option-grid">
                {hairOccasions.map((occasion) => (
                  <button
                    key={occasion.id}
                    className={`option-card ${selectedOccasion === occasion.id ? 'active' : ''}`}
                    onClick={() => setSelectedOccasion(occasion.id)}
                  >
                    <span className="option-icon">{occasion.icon}</span>
                    <span className="option-label">{getOccasionLabel(occasion)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="selection-section">
              <h3 className="selection-title">{t.selectVibe}</h3>
              <div className="option-grid">
                {hairVibes.map((vibe) => (
                  <button
                    key={vibe.id}
                    className={`option-card ${selectedVibe === vibe.id ? 'active' : ''}`}
                    onClick={() => setSelectedVibe(vibe.id)}
                  >
                    <span className="option-icon">{vibe.icon}</span>
                    <span className="option-label">{getVibeLabel(vibe)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="gender-selection">
              <h3 className="selection-title">{t.gender}</h3>
              <div className="gender-options">
                <button
                  type="button"
                  className={`gender-btn ${profile.gender === 'male' ? 'active' : ''}`}
                  onClick={() => setProfile(prev => ({ ...prev, gender: 'male' }))}
                >
                  {t.male}
                </button>
                <button
                  type="button"
                  className={`gender-btn ${profile.gender === 'female' ? 'active' : ''}`}
                  onClick={() => setProfile(prev => ({ ...prev, gender: 'female' }))}
                >
                  {t.female}
                </button>
                <button
                  type="button"
                  className={`gender-btn ${profile.gender === 'other' ? 'active' : ''}`}
                  onClick={() => setProfile(prev => ({ ...prev, gender: 'other' }))}
                >
                  {t.other}
                </button>
              </div>
            </div>

            <div className="photo-upload-section">
              <h3 className="selection-title">
                {lang === 'ko' ? '내 사진 업로드 (선택)' : 'Upload My Photo (Optional)'}
              </h3>
              <p className="photo-upload-desc">
                {lang === 'ko'
                  ? '사진을 올리면 스타일리스트가 추천 헤어스타일을 미리보기로 보여드립니다'
                  : 'Upload your photo and your stylist will show recommended hairstyles as previews'}
              </p>
              <div
                className={`mini-photo-upload ${hairPhoto ? 'has-photo' : ''}`}
                onClick={() => hairPhotoRef.current?.click()}
              >
                {hairPhoto ? (
                  <img src={hairPhoto} alt="My photo" className="mini-photo-preview" />
                ) : (
                  <div className="mini-photo-placeholder">
                    <span>📷</span>
                    <span>{lang === 'ko' ? '클릭하여 업로드' : 'Click to upload'}</span>
                  </div>
                )}
              </div>
              <input
                ref={hairPhotoRef}
                type="file"
                accept="image/*"
                onChange={handleHairPhotoUpload}
                className="hidden-input"
              />
            </div>

            <button
              className="btn-gold submit-btn"
              onClick={handleHairRecommendation}
              disabled={!selectedOccasion || !selectedVibe}
            >
              {t.getRecommendation}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Hair Result Page
  if (page === 'hair-result') {
    const selectedOccasionData = hairOccasions.find(o => o.id === selectedOccasion)
    const selectedVibeData = hairVibes.find(v => v.id === selectedVibe)
    const getOccasionLabel = (o: HairOccasion) => lang === 'ko' ? o.labelKo : o.labelEn
    const getVibeLabel = (v: HairVibe) => lang === 'ko' ? v.labelKo : v.labelEn

    return (
      <div className="app-container result-container">
        <header className="app-header">
          <div className="logo" onClick={handleRestart} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="currentColor">
                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.1288 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"/>
              </svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
          <h1 className="page-title">{t.hairResultTitle}</h1>
          <div className="lang-selector">
            {(Object.keys(languageNames) as Language[]).map((code) => (
              <button
                key={code}
                className={`lang-btn-sm ${lang === code ? 'active' : ''}`}
                onClick={() => setLang(code)}
              >
                {languageNames[code]}
              </button>
            ))}
          </div>
        </header>

        <div className="hair-result-content">
          <div className="selected-options-card">
            <h3>{t.selectedOptions}</h3>
            <div className="selected-tags">
              {selectedOccasionData && (
                <span className="selected-tag">
                  {selectedOccasionData.icon} {getOccasionLabel(selectedOccasionData)}
                </span>
              )}
              {selectedVibeData && (
                <span className="selected-tag">
                  {selectedVibeData.icon} {getVibeLabel(selectedVibeData)}
                </span>
              )}
            </div>
          </div>

          <div className="hair-recommendations">
            <h3>{t.recommendedStyles}</h3>
            <div className="recommendation-grid">
              {hairRecommendations.map((style, index) => (
                <div key={index} className="recommendation-card">
                  <div className="recommendation-number">{index + 1}</div>
                  <div className="recommendation-content">
                    <h4>{style}</h4>
                    <p>{t.hairResultDesc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hairPhoto && (
            <div className="ai-generated-section">
              <h3>{lang === 'ko' ? 'AI 스타일 합성' : 'AI Style Synthesis'}</h3>
              {isGeneratingHair ? (
                <div className="generating-indicator">
                  <div className="loading-spinner"></div>
                  <p>{lang === 'ko' ? 'AI가 스타일을 합성 중입니다...' : 'AI is synthesizing styles...'}</p>
                </div>
              ) : generatedHairImages.length > 0 ? (
                <div className="generated-images-grid">
                  {generatedHairImages.map((item, index) => (
                    <div key={index} className="generated-image-card">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.style} className="generated-image" />
                      ) : (
                        <div className="generated-placeholder">
                          <span>🎨</span>
                          <span>{item.style}</span>
                        </div>
                      )}
                      <p className="generated-style-name">{item.style}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ai-coming-soon">
                  <p>{lang === 'ko' ? '업로드한 사진에 AI 스타일 합성 기능이 곧 제공됩니다' : 'AI style synthesis for your uploaded photo coming soon'}</p>
                  <div className="uploaded-photo-preview">
                    <img src={hairPhoto} alt="Uploaded" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="result-actions">
            {generatedHairImages.some(img => img.imageUrl) && (
              <>
                <button
                  className="btn-outline"
                  onClick={() => handleDownloadResult(
                    generatedHairImages.map(img => img.imageUrl).filter(Boolean) as string[]
                  )}
                >
                  {t.downloadResult}
                </button>
                <button className="btn-outline" onClick={handleShareResult}>
                  {t.shareResult}
                </button>
              </>
            )}
            <button className="btn-outline" onClick={() => {
              setSelectedOccasion(null)
              setSelectedVibe(null)
              setHairRecommendations([])
              setPage('hair-selection')
            }}>
              {t.tryAnother}
            </button>
            <button className="btn-dark" onClick={handleRestart}>
              {t.backToHome}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Input Page
  return (
    <div className="app-container input-container">
      <header className="app-header">
        <div className="logo" onClick={handleRestart} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">
            <svg viewBox="0 0 48 48" fill="currentColor">
              <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.1288 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"/>
            </svg>
          </div>
          <span className="logo-text">{t.title}</span>
        </div>
        <button className="back-btn" onClick={() => setPage('landing')}>
          ← {t.backToHome}
        </button>
      </header>

      <div className="input-page-content">
        <div className="input-hero">
          <span className="input-tag">STYLE ANALYSIS</span>
          <h1 className="input-title">
            {t.heroTitle1} <span className="text-gradient">{t.heroTitle2}</span>
          </h1>
          <p className="input-desc">{t.subtitle}</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError('')}>{t.retry}</button>
          </div>
        )}

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="photo-section">
              <div
                className={`photo-upload ${isDragging ? 'dragging' : ''}`}
                onClick={handlePhotoClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {profile.photo ? (
                  <img src={profile.photo} alt="Profile" className="photo-preview" />
                ) : (
                  <div className="photo-placeholder">
                    <span className="camera-icon">{isDragging ? '📥' : '📷'}</span>
                    <span>{t.uploadPhoto}</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden-input"
              />
              <p className="photo-hint">{t.photoHint}</p>
            </div>

            <div className="input-section">
              <div className="input-group">
                <label>{t.gender}</label>
                <div className="gender-options">
                  <button
                    type="button"
                    className={`gender-btn ${profile.gender === 'male' ? 'active' : ''}`}
                    onClick={() => setProfile(prev => ({ ...prev, gender: 'male' }))}
                  >
                    {t.male}
                  </button>
                  <button
                    type="button"
                    className={`gender-btn ${profile.gender === 'female' ? 'active' : ''}`}
                    onClick={() => setProfile(prev => ({ ...prev, gender: 'female' }))}
                  >
                    {t.female}
                  </button>
                  <button
                    type="button"
                    className={`gender-btn ${profile.gender === 'other' ? 'active' : ''}`}
                    onClick={() => setProfile(prev => ({ ...prev, gender: 'other' }))}
                  >
                    {t.other}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="height">{t.height}</label>
                <input
                  id="height"
                  type="number"
                  placeholder="170"
                  value={profile.height}
                  onChange={(e) => setProfile(prev => ({ ...prev, height: e.target.value }))}
                />
              </div>

              <div className="input-group">
                <label htmlFor="weight">{t.weight}</label>
                <input
                  id="weight"
                  type="number"
                  placeholder="65"
                  value={profile.weight}
                  onChange={(e) => setProfile(prev => ({ ...prev, weight: e.target.value }))}
                />
              </div>

              {/* 결제 안내 */}
              {!isPaid && (
                <div className="payment-info" style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(212, 175, 55, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#d4af37', fontWeight: '600' }}>
                    {t.purchaseRequired}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                    {t.price}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="btn-gold submit-btn"
                disabled={!isFormValid || isProcessingPayment}
              >
                {isProcessingPayment
                  ? t.processingPayment
                  : isPaid
                    ? t.startAnalysis
                    : t.purchaseBtn}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App
