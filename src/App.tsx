import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import { renderMarkdownToHtml } from './utils/markdown'
import { useAuth } from './contexts/AuthContext'
import { supabase } from './lib/supabase'

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
type Page = 'landing' | 'input' | 'loading' | 'result' | 'hair-selection' | 'hair-result' | 'how-to-use' | 'preview' | 'hair-preview' | 'login' | 'signup' | 'profile'

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
  heightFeet: string
  heightInches: string
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
  hairPrice: string
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
  emailReport: string
  emailModalTitle: string
  emailPlaceholder: string
  emailSend: string
  emailSending: string
  emailSuccess: string
  emailError: string
  // Preview page (Value Gate + Curiosity Gap)
  previewTitle: string
  previewSubtitle: string
  previewAnalysisComplete: string
  previewFaceShape: string
  previewHairStylesFound: string
  previewFashionFound: string
  previewCuriosity1: string
  previewCuriosity2: string
  previewProgress: string
  previewUnlock: string
  previewCompare1: string
  previewCompare2: string
  previewCoffeeNote: string
  hairPreviewTitle: string
  hairPreviewSubtitle: string
  hairPreviewCuriosity: string
  hairPreviewUnlock: string
  // Share modal
  shareModalTitle: string
  shareVia: string
  downloadForSocial: string
  copyLink: string
  copiedToClipboard: string
  // Auth
  login: string
  signup: string
  logout: string
  email: string
  password: string
  confirmPassword: string
  loginTitle: string
  signupTitle: string
  loginBtn: string
  signupBtn: string
  noAccount: string
  haveAccount: string
  authError: string
  passwordMismatch: string
  passwordTooShort: string
  loginSuccess: string
  signupSuccess: string
  continueAsGuest: string
  orContinueWith: string
  googleLogin: string
  myProfile: string
  analysisHistory: string
  noHistory: string
  historySaved: string
  accountSettings: string
  resetPassword: string
  resetPasswordDesc: string
  resetPasswordBtn: string
  resetPasswordSent: string
  deleteAccount: string
  deleteAccountDesc: string
  deleteAccountBtn: string
  deleteAccountConfirm: string
  newPassword: string
  confirmNewPassword: string
  updatePasswordBtn: string
  passwordUpdated: string
  cancel: string
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
    heightFeet: '',
    heightInches: '',
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
    purchaseBtn: '미리보기 및 분석 시작',
    processingPayment: '결제 처리 중...',
    price: '$4.99',
    hairPrice: '$2.99',
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
    linkCopied: '링크가 복사되었습니다!',
    emailReport: '📧 이메일로 받기',
    emailModalTitle: '리포트를 이메일로 받기',
    emailPlaceholder: '이메일 주소를 입력하세요',
    emailSend: '전송',
    emailSending: '전송 중...',
    emailSuccess: '이메일이 전송되었습니다!',
    emailError: '이메일 전송에 실패했습니다. 다시 시도해주세요.',
    // Preview page translations
    previewTitle: '분석 완료!',
    previewSubtitle: '당신만을 위한 스타일을 찾았어요',
    previewAnalysisComplete: 'AI 분석이 완료되었습니다',
    previewFaceShape: '얼굴형 분석 결과',
    previewHairStylesFound: '어울리는 헤어스타일 5개 발견!',
    previewFashionFound: '맞춤 패션 코디 6개 준비 완료!',
    previewCuriosity1: '의외의 결과가 나왔어요! 👀',
    previewCuriosity2: '1위 스타일이 궁금하지 않으세요?',
    previewProgress: '87% 완료 - 결과만 확인하면 끝!',
    previewUnlock: '결과 확인하기',
    previewCompare1: '전문 스타일리스트 상담',
    previewCompare2: 'Personal Stylist',
    previewCoffeeNote: '☕ 커피 한 잔 가격으로 미용실 실패 예방!',
    hairPreviewTitle: '헤어스타일 분석 완료!',
    hairPreviewSubtitle: '당신에게 어울리는 스타일을 찾았어요',
    hairPreviewCuriosity: '이 중 1개는 예상 못 하셨을 거예요! 👀',
    hairPreviewUnlock: '헤어스타일 확인하기',
    // Share modal
    shareModalTitle: '결과 공유하기',
    shareVia: '공유하기',
    downloadForSocial: '📷 이미지 저장 (Instagram/TikTok용)',
    copyLink: '🔗 링크 복사',
    copiedToClipboard: '클립보드에 복사되었습니다!',
    // Auth
    login: '로그인',
    signup: '회원가입',
    logout: '로그아웃',
    email: '이메일',
    password: '비밀번호',
    confirmPassword: '비밀번호 확인',
    loginTitle: '로그인',
    signupTitle: '회원가입',
    loginBtn: '로그인',
    signupBtn: '가입하기',
    noAccount: '계정이 없으신가요?',
    haveAccount: '이미 계정이 있으신가요?',
    authError: '인증 오류가 발생했습니다',
    passwordMismatch: '비밀번호가 일치하지 않습니다',
    passwordTooShort: '비밀번호는 6자 이상이어야 합니다',
    loginSuccess: '로그인되었습니다',
    signupSuccess: '가입이 완료되었습니다',
    continueAsGuest: '게스트로 계속하기',
    orContinueWith: '또는',
    googleLogin: 'Google로 계속하기',
    myProfile: '내 프로필',
    analysisHistory: '분석 히스토리',
    noHistory: '저장된 분석 결과가 없습니다',
    historySaved: '분석 결과가 저장되었습니다',
    accountSettings: '계정 설정',
    resetPassword: '비밀번호 재설정',
    resetPasswordDesc: '가입하신 이메일로 비밀번호 재설정 링크를 보내드립니다.',
    resetPasswordBtn: '재설정 링크 보내기',
    resetPasswordSent: '비밀번호 재설정 링크가 이메일로 발송되었습니다.',
    deleteAccount: '회원 탈퇴',
    deleteAccountDesc: '계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.',
    deleteAccountBtn: '계정 삭제',
    deleteAccountConfirm: '정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    newPassword: '새 비밀번호',
    confirmNewPassword: '새 비밀번호 확인',
    updatePasswordBtn: '비밀번호 변경',
    passwordUpdated: '비밀번호가 변경되었습니다.',
    cancel: '취소'
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
    height: 'Height',
    heightFeet: 'ft',
    heightInches: 'in',
    weight: 'Weight (lbs)',
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
    purchaseBtn: 'Preview & Start Analysis',
    processingPayment: 'Processing payment...',
    price: '$4.99',
    hairPrice: '$2.99',
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
    linkCopied: 'Link copied!',
    emailReport: '📧 Email Report',
    emailModalTitle: 'Send Report to Email',
    emailPlaceholder: 'Enter your email address',
    emailSend: 'Send',
    emailSending: 'Sending...',
    emailSuccess: 'Email sent successfully!',
    emailError: 'Failed to send email. Please try again.',
    // Preview page translations
    previewTitle: 'Analysis Complete!',
    previewSubtitle: 'We found styles just for you',
    previewAnalysisComplete: 'AI analysis is complete',
    previewFaceShape: 'Face Shape Analysis',
    previewHairStylesFound: '5 matching hairstyles found!',
    previewFashionFound: '6 custom fashion looks ready!',
    previewCuriosity1: 'Surprising results! 👀',
    previewCuriosity2: 'Curious about your #1 style?',
    previewProgress: '87% complete - just unlock to finish!',
    previewUnlock: 'Unlock Results',
    previewCompare1: 'Professional Stylist',
    previewCompare2: 'Personal Stylist',
    previewCoffeeNote: '☕ Prevent salon disasters for the price of a coffee!',
    hairPreviewTitle: 'Hairstyle Analysis Complete!',
    hairPreviewSubtitle: 'We found styles that suit you',
    hairPreviewCuriosity: 'One of these will surprise you! 👀',
    hairPreviewUnlock: 'Unlock Hairstyles',
    // Share modal
    shareModalTitle: 'Share Your Results',
    shareVia: 'Share via',
    downloadForSocial: '📷 Save Image (for Instagram/TikTok)',
    copyLink: '🔗 Copy Link',
    copiedToClipboard: 'Copied to clipboard!',
    // Auth
    login: 'Login',
    signup: 'Sign Up',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    loginTitle: 'Welcome Back',
    signupTitle: 'Create Account',
    loginBtn: 'Login',
    signupBtn: 'Sign Up',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    authError: 'Authentication error occurred',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    loginSuccess: 'Successfully logged in',
    signupSuccess: 'Account created successfully',
    continueAsGuest: 'Continue as Guest',
    orContinueWith: 'or',
    googleLogin: 'Continue with Google',
    myProfile: 'My Profile',
    analysisHistory: 'Analysis History',
    noHistory: 'No saved analysis results',
    historySaved: 'Analysis saved to your history',
    accountSettings: 'Account Settings',
    resetPassword: 'Reset Password',
    resetPasswordDesc: 'We will send a password reset link to your email.',
    resetPasswordBtn: 'Send Reset Link',
    resetPasswordSent: 'Password reset link has been sent to your email.',
    deleteAccount: 'Delete Account',
    deleteAccountDesc: 'Deleting your account will permanently remove all your data.',
    deleteAccountBtn: 'Delete Account',
    deleteAccountConfirm: 'Are you sure you want to delete your account? This action cannot be undone.',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    updatePasswordBtn: 'Update Password',
    passwordUpdated: 'Password has been updated.',
    cancel: 'Cancel'
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
    heightFeet: '',
    heightInches: '',
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
    purchaseBtn: 'プレビュー＆分析開始',
    processingPayment: '支払い処理中...',
    price: '$4.99',
    hairPrice: '$2.99',
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
    linkCopied: 'リンクがコピーされました！',
    emailReport: '📧 メールで受け取る',
    emailModalTitle: 'レポートをメールで受け取る',
    emailPlaceholder: 'メールアドレスを入力',
    emailSend: '送信',
    emailSending: '送信中...',
    emailSuccess: 'メールを送信しました！',
    emailError: 'メール送信に失敗しました。再度お試しください。',
    // Preview page translations
    previewTitle: '分析完了！',
    previewSubtitle: 'あなただけのスタイルを見つけました',
    previewAnalysisComplete: 'AI分析が完了しました',
    previewFaceShape: '顔型分析結果',
    previewHairStylesFound: 'お似合いのヘアスタイル5つ発見！',
    previewFashionFound: 'カスタムファッション6点準備完了！',
    previewCuriosity1: '意外な結果が出ました！👀',
    previewCuriosity2: '1位のスタイルが気になりませんか？',
    previewProgress: '87%完了 - 結果を確認するだけ！',
    previewUnlock: '結果を確認',
    previewCompare1: 'プロスタイリスト相談',
    previewCompare2: 'Personal Stylist',
    previewCoffeeNote: '☕ コーヒー1杯の価格で美容室の失敗を防止！',
    hairPreviewTitle: 'ヘアスタイル分析完了！',
    hairPreviewSubtitle: 'お似合いのスタイルを見つけました',
    hairPreviewCuriosity: 'この中の1つは予想外かも！👀',
    hairPreviewUnlock: 'ヘアスタイルを確認',
    // Share modal
    shareModalTitle: '結果をシェア',
    shareVia: 'シェアする',
    downloadForSocial: '📷 画像を保存 (Instagram/TikTok用)',
    copyLink: '🔗 リンクをコピー',
    copiedToClipboard: 'クリップボードにコピーしました！',
    // Auth
    login: 'ログイン',
    signup: '新規登録',
    logout: 'ログアウト',
    email: 'メールアドレス',
    password: 'パスワード',
    confirmPassword: 'パスワード確認',
    loginTitle: 'ログイン',
    signupTitle: 'アカウント作成',
    loginBtn: 'ログイン',
    signupBtn: '登録する',
    noAccount: 'アカウントをお持ちでないですか？',
    haveAccount: 'すでにアカウントをお持ちですか？',
    authError: '認証エラーが発生しました',
    passwordMismatch: 'パスワードが一致しません',
    passwordTooShort: 'パスワードは6文字以上必要です',
    loginSuccess: 'ログインしました',
    signupSuccess: 'アカウントが作成されました',
    continueAsGuest: 'ゲストとして続ける',
    orContinueWith: 'または',
    googleLogin: 'Googleで続ける',
    myProfile: 'マイプロフィール',
    analysisHistory: '分析履歴',
    noHistory: '保存された分析結果はありません',
    historySaved: '分析結果が保存されました',
    accountSettings: 'アカウント設定',
    resetPassword: 'パスワードリセット',
    resetPasswordDesc: 'パスワードリセットリンクをメールでお送りします。',
    resetPasswordBtn: 'リセットリンクを送信',
    resetPasswordSent: 'パスワードリセットリンクがメールで送信されました。',
    deleteAccount: 'アカウント削除',
    deleteAccountDesc: 'アカウントを削除すると、すべてのデータが永久に削除されます。',
    deleteAccountBtn: 'アカウントを削除',
    deleteAccountConfirm: '本当にアカウントを削除しますか？この操作は取り消せません。',
    newPassword: '新しいパスワード',
    confirmNewPassword: '新しいパスワードの確認',
    updatePasswordBtn: 'パスワードを変更',
    passwordUpdated: 'パスワードが変更されました。',
    cancel: 'キャンセル'
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
    heightFeet: '',
    heightInches: '',
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
    purchaseBtn: '预览并开始分析',
    processingPayment: '支付处理中...',
    price: '$4.99',
    hairPrice: '$2.99',
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
    linkCopied: '链接已复制！',
    emailReport: '📧 发送到邮箱',
    emailModalTitle: '将报告发送到邮箱',
    emailPlaceholder: '请输入邮箱地址',
    emailSend: '发送',
    emailSending: '发送中...',
    emailSuccess: '邮件已发送！',
    emailError: '邮件发送失败，请重试。',
    // Preview page translations
    previewTitle: '分析完成！',
    previewSubtitle: '我们为您找到了专属风格',
    previewAnalysisComplete: 'AI分析已完成',
    previewFaceShape: '脸型分析结果',
    previewHairStylesFound: '发现5款适合您的发型！',
    previewFashionFound: '6套定制时尚搭配已就绪！',
    previewCuriosity1: '出乎意料的结果！👀',
    previewCuriosity2: '想知道您的第1名风格吗？',
    previewProgress: '87%完成 - 只需解锁查看结果！',
    previewUnlock: '查看结果',
    previewCompare1: '专业造型师咨询',
    previewCompare2: 'Personal Stylist',
    previewCoffeeNote: '☕ 一杯咖啡的价格，避免美发失败！',
    hairPreviewTitle: '发型分析完成！',
    hairPreviewSubtitle: '我们找到了适合您的风格',
    hairPreviewCuriosity: '其中1款会让您惊喜！👀',
    hairPreviewUnlock: '查看发型',
    // Share modal
    shareModalTitle: '分享结果',
    shareVia: '分享到',
    downloadForSocial: '📷 保存图片 (用于Instagram/TikTok)',
    copyLink: '🔗 复制链接',
    copiedToClipboard: '已复制到剪贴板！',
    // Auth
    login: '登录',
    signup: '注册',
    logout: '退出登录',
    email: '邮箱',
    password: '密码',
    confirmPassword: '确认密码',
    loginTitle: '登录',
    signupTitle: '创建账户',
    loginBtn: '登录',
    signupBtn: '注册',
    noAccount: '还没有账户？',
    haveAccount: '已有账户？',
    authError: '认证错误',
    passwordMismatch: '密码不匹配',
    passwordTooShort: '密码至少需要6个字符',
    loginSuccess: '登录成功',
    signupSuccess: '注册成功',
    continueAsGuest: '以游客身份继续',
    orContinueWith: '或',
    googleLogin: '使用Google继续',
    myProfile: '我的资料',
    analysisHistory: '分析历史',
    noHistory: '暂无保存的分析结果',
    historySaved: '分析结果已保存',
    accountSettings: '账户设置',
    resetPassword: '重置密码',
    resetPasswordDesc: '我们将向您的邮箱发送密码重置链接。',
    resetPasswordBtn: '发送重置链接',
    resetPasswordSent: '密码重置链接已发送到您的邮箱。',
    deleteAccount: '删除账户',
    deleteAccountDesc: '删除账户将永久删除所有数据。',
    deleteAccountBtn: '删除账户',
    deleteAccountConfirm: '确定要删除账户吗？此操作无法撤销。',
    newPassword: '新密码',
    confirmNewPassword: '确认新密码',
    updatePasswordBtn: '更新密码',
    passwordUpdated: '密码已更新。',
    cancel: '取消'
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
    heightFeet: '',
    heightInches: '',
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
    purchaseBtn: 'Vista Previa e Iniciar Análisis',
    processingPayment: 'Procesando pago...',
    price: '$4.99',
    hairPrice: '$2.99',
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
    linkCopied: '¡Enlace copiado!',
    emailReport: '📧 Enviar por Email',
    emailModalTitle: 'Enviar Informe por Email',
    emailPlaceholder: 'Ingresa tu correo electrónico',
    emailSend: 'Enviar',
    emailSending: 'Enviando...',
    emailSuccess: '¡Email enviado correctamente!',
    emailError: 'Error al enviar el email. Inténtalo de nuevo.',
    // Preview page translations
    previewTitle: '¡Análisis Completo!',
    previewSubtitle: 'Encontramos estilos perfectos para ti',
    previewAnalysisComplete: 'El análisis de IA está completo',
    previewFaceShape: 'Análisis de Forma de Cara',
    previewHairStylesFound: '¡5 peinados compatibles encontrados!',
    previewFashionFound: '¡6 looks de moda personalizados listos!',
    previewCuriosity1: '¡Resultados sorprendentes! 👀',
    previewCuriosity2: '¿Curioso por tu estilo #1?',
    previewProgress: '87% completo - ¡solo desbloquea para terminar!',
    previewUnlock: 'Desbloquear Resultados',
    previewCompare1: 'Estilista Profesional',
    previewCompare2: 'Personal Stylist',
    previewCoffeeNote: '☕ ¡Evita desastres en el salón por el precio de un café!',
    hairPreviewTitle: '¡Análisis de Peinado Completo!',
    hairPreviewSubtitle: 'Encontramos estilos que te quedan bien',
    hairPreviewCuriosity: '¡Uno de estos te sorprenderá! 👀',
    hairPreviewUnlock: 'Desbloquear Peinados',
    // Share modal
    shareModalTitle: 'Compartir Resultados',
    shareVia: 'Compartir en',
    downloadForSocial: '📷 Guardar Imagen (para Instagram/TikTok)',
    copyLink: '🔗 Copiar Enlace',
    copiedToClipboard: '¡Copiado al portapapeles!',
    // Auth
    login: 'Iniciar Sesión',
    signup: 'Registrarse',
    logout: 'Cerrar Sesión',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    loginTitle: 'Bienvenido',
    signupTitle: 'Crear Cuenta',
    loginBtn: 'Iniciar Sesión',
    signupBtn: 'Registrarse',
    noAccount: '¿No tienes una cuenta?',
    haveAccount: '¿Ya tienes una cuenta?',
    authError: 'Error de autenticación',
    passwordMismatch: 'Las contraseñas no coinciden',
    passwordTooShort: 'La contraseña debe tener al menos 6 caracteres',
    loginSuccess: 'Sesión iniciada correctamente',
    signupSuccess: 'Cuenta creada correctamente',
    continueAsGuest: 'Continuar como Invitado',
    orContinueWith: 'o',
    googleLogin: 'Continuar con Google',
    myProfile: 'Mi Perfil',
    analysisHistory: 'Historial de Análisis',
    noHistory: 'No hay resultados de análisis guardados',
    historySaved: 'Análisis guardado en tu historial',
    accountSettings: 'Configuración de Cuenta',
    resetPassword: 'Restablecer Contraseña',
    resetPasswordDesc: 'Enviaremos un enlace de restablecimiento a tu correo.',
    resetPasswordBtn: 'Enviar Enlace',
    resetPasswordSent: 'El enlace de restablecimiento se ha enviado a tu correo.',
    deleteAccount: 'Eliminar Cuenta',
    deleteAccountDesc: 'Eliminar tu cuenta borrará permanentemente todos tus datos.',
    deleteAccountBtn: 'Eliminar Cuenta',
    deleteAccountConfirm: '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.',
    newPassword: 'Nueva Contraseña',
    confirmNewPassword: 'Confirmar Nueva Contraseña',
    updatePasswordBtn: 'Actualizar Contraseña',
    passwordUpdated: 'La contraseña ha sido actualizada.',
    cancel: 'Cancelar'
  }
}

const languageNames: Record<Language, string> = {
  ko: '한국어',
  en: 'EN',
  ja: '日本語',
  zh: '中文',
  es: 'ES'
}

// Legal Policy Content
const policyContent = {
  terms: {
    title: 'Terms of Service',
    lastUpdated: 'January 30, 2026',
    content: `
## 1. Acceptance of Terms

By accessing or using PERSONAL STYLIST ("Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.

## 2. Service Description

PERSONAL STYLIST is an AI-powered styling consultation service that provides:
- Personalized style analysis based on uploaded photos
- AI-generated hairstyle previews
- AI-generated fashion outfit recommendations

The Service uses artificial intelligence to generate suggestions and visual previews. Results are for entertainment and reference purposes only.

## 3. Payment & Billing

- Payments are processed securely through Polar (polar.sh)
- All prices are in USD and include applicable taxes
- Payment is required before accessing premium features
- By completing a purchase, you agree to Polar's terms of service

## 4. Digital Products & Delivery

- All products are digital and delivered instantly upon payment
- Generated images and analysis reports are available immediately after processing
- You may download and save your results for personal use

## 5. User Responsibilities

You agree to:
- Provide accurate information
- Upload only photos you have the right to use
- Use the Service for lawful purposes only
- Not attempt to reverse-engineer or exploit the Service

## 6. Intellectual Property

- AI-generated images are provided for your personal use
- You may share your results on social media with attribution
- The Service, including its AI models and design, remains our property

## 7. Privacy

Your use of the Service is also governed by our Privacy Policy. Uploaded photos are processed securely and not stored permanently.

## 8. Disclaimers

- The Service is provided "as is" without warranties
- AI-generated results may vary and are not guaranteed to be accurate
- We are not responsible for styling decisions made based on our suggestions

## 9. Limitation of Liability

To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.

## 10. Changes to Terms

We may update these Terms at any time. Continued use of the Service constitutes acceptance of updated Terms.

## 11. Contact

For questions about these Terms, please reach out through our website.
    `
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'January 30, 2026',
    content: `
## 1. Information We Collect

**Information You Provide:**
- Photos uploaded for styling analysis
- Basic measurements (height, weight, gender)
- Language preference
- Payment information (processed by Polar)

**Automatically Collected:**
- Device and browser information
- Usage analytics (via Google Analytics)
- Session data for service functionality

## 2. How We Use Your Information

- To provide AI-powered styling recommendations
- To process payments through Polar
- To improve our Service and AI models
- To communicate service updates

## 3. Photo Processing

**Important:**
- Uploaded photos are sent to AI providers (OpenAI, Google) for processing
- Photos are processed in real-time and not permanently stored on our servers
- Generated images are temporarily cached to enable downloads
- We do not use your photos for AI training

## 4. Third-Party Services

We use the following third-party services:

| Service | Purpose | Privacy Policy |
|---------|---------|----------------|
| Polar | Payment processing | polar.sh/legal/privacy |
| OpenAI | AI analysis | openai.com/privacy |
| Google (Gemini) | Image generation | policies.google.com/privacy |
| Google Analytics | Usage analytics | policies.google.com/privacy |
| Cloudflare | Hosting & CDN | cloudflare.com/privacypolicy |

## 5. Data Retention

- Session data: Deleted after browser session ends
- Generated images: Temporarily cached, deleted within 24 hours
- Payment records: Retained by Polar per their policies
- Analytics: Anonymized, retained per Google Analytics policies

## 6. Your Rights

You have the right to:
- Request deletion of any stored data
- Opt out of analytics tracking
- Access information about your data

## 7. Security

We implement industry-standard security measures:
- HTTPS encryption for all data transmission
- Secure API communication with AI providers
- No permanent storage of sensitive photos

## 8. Children's Privacy

The Service is not intended for users under 13 years of age. We do not knowingly collect information from children.

## 9. International Users

The Service is operated from the United States. By using the Service, you consent to data processing in the US.

## 10. Changes to This Policy

We may update this Privacy Policy periodically. We will notify users of significant changes.

## 11. Contact

For privacy inquiries, please reach out through our website.
    `
  },
  refund: {
    title: 'Refund Policy',
    lastUpdated: 'January 30, 2026',
    content: `
## Digital Product Refund Policy

Thank you for using PERSONAL STYLIST. Please read our refund policy carefully before making a purchase.

## 1. Nature of Our Products

PERSONAL STYLIST provides **digital services** including:
- AI-powered style analysis reports
- AI-generated hairstyle preview images
- AI-generated fashion outfit previews

These are **instant digital deliverables** that cannot be "returned" once generated.

## 2. Automatic Refunds

We automatically process full refunds when our service fails to deliver results:
- **Text analysis failure**: If the style report fails to generate
- **Image generation failure**: If AI fails to create hairstyle or fashion images
- **Technical errors**: Any server-side errors preventing service delivery

When automatic refund is triggered:
- You will receive a refund notification email
- The refund is processed immediately
- No action required from you

## 3. Refund Eligibility

**Full Refund Available When:**
- Technical failure prevents delivery of your results (automatic)
- Payment was processed but service was not provided
- Duplicate charges occurred

**Refunds NOT Available When:**
- You are unsatisfied with AI-generated style suggestions
- You changed your mind after purchase
- You did not like how a hairstyle or outfit looked on your photo
- Results differ from your expectations
- **Email address errors** (see below)

## 4. Email Address Policy

**Important:** Payment confirmation and result emails are sent to the email address you provide during checkout.

- You are responsible for entering a correct email address
- **Typos in email addresses do NOT qualify for refunds**
- If you don't receive emails, check your spam folder first
- We cannot resend emails to a different address for security reasons

Please double-check your email address before completing payment.

## 5. Why Limited Refunds?

Once you upload your photo and we process it through AI:
- Computing resources have been consumed
- AI generation costs have been incurred
- Digital results have been delivered to you

Unlike physical products, digital services cannot be "returned."

## 6. How to Request a Refund

If you believe you qualify for a refund:

1. Contact us within **7 days** of purchase
2. Include:
   - Your payment confirmation/receipt
   - Description of the issue
   - Screenshots if applicable

We will review your request within 3 business days.

## 7. Refund Processing

Approved refunds are processed through Polar, our payment provider:
- Refunds typically appear within 5-10 business days
- Refund will be credited to your original payment method
- Processing time depends on your bank/card issuer

## 8. Dispute Resolution

Before filing a payment dispute:
- Please contact us first through our website
- We aim to resolve all issues fairly and promptly
- Chargebacks without prior contact may result in account restrictions

## 9. Repeat Customer Discount

Unsatisfied with your results? Instead of a refund, we offer:
- **50% discount** on your next purchase (code: COMEBACK50)
- This allows you to try again with a different photo

## 10. Contact Us

For refund requests or questions, please contact us through our website. We typically respond within 1-3 business days.

---

*This policy is designed to be fair to both customers and our service. We appreciate your understanding.*
    `
  }
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
  const [isFullPaid, setIsFullPaid] = useState(false)
  const [isHairPaid, setIsHairPaid] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [policyModal, setPolicyModal] = useState<'terms' | 'privacy' | 'refund' | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareToast, setShareToast] = useState('')
  const [emailError, setEmailError] = useState('')
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [heightFeet, setHeightFeet] = useState('')
  const [heightInches, setHeightInches] = useState('')
  const [weightLbs, setWeightLbs] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hairPhotoRef = useRef<HTMLInputElement>(null)
  const t = translations[lang]

  // Auth state
  const { user, signIn, signUp, signInWithGoogle, signOut, resetPassword, updatePassword, deleteAccount, updateProfile: updateAuthProfile, profile: authProfile, isSupabaseConfigured } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [authSuccess, setAuthSuccess] = useState('')

  // 단위 설정 (영어 사용자는 선택 가능, 기본값: 영어는 imperial, 그 외는 metric)
  const [useMetric, setUseMetric] = useState(() => lang !== 'en')
  const isImperial = !useMetric

  const feetInchesToCm = (feet: string, inches: string): string => {
    const ft = parseFloat(feet) || 0
    const inch = parseFloat(inches) || 0
    const totalInches = (ft * 12) + inch
    const cm = Math.round(totalInches * 2.54)
    return cm > 0 ? cm.toString() : ''
  }

  const lbsToKg = (lbs: string): string => {
    const pounds = parseFloat(lbs) || 0
    const kg = Math.round(pounds * 0.453592)
    return kg > 0 ? kg.toString() : ''
  }

  // 영어 사용자: feet/inches, lbs 입력 시 자동 변환
  useEffect(() => {
    if (isImperial) {
      const cmValue = feetInchesToCm(heightFeet, heightInches)
      if (cmValue) {
        setProfile(prev => ({ ...prev, height: cmValue }))
      }
    }
  }, [heightFeet, heightInches, isImperial])

  useEffect(() => {
    if (isImperial) {
      const kgValue = lbsToKg(weightLbs)
      if (kgValue) {
        setProfile(prev => ({ ...prev, weight: kgValue }))
      }
    }
  }, [weightLbs, isImperial])

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
      const polarCheckoutId = urlParams.get('checkout_id')

      // checkout_id 저장 (환불 시 필요)
      if (polarCheckoutId) {
        setCheckoutId(polarCheckoutId)
        localStorage.setItem('lastCheckoutId', polarCheckoutId)
      }

      // 결제 확인 이메일 전송 (비동기, 실패해도 진행)
      if (polarCheckoutId) {
        (async () => {
          try {
            const checkoutInfoRes = await fetch(`/api/checkout-info?id=${polarCheckoutId}`)
            if (checkoutInfoRes.ok) {
              const checkoutInfo = await checkoutInfoRes.json()
              if (checkoutInfo.email) {
                await fetch('/api/send-payment-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: checkoutInfo.email,
                    productType: purchasedProductType,
                    amount: checkoutInfo.amount,
                    currency: checkoutInfo.currency || 'USD',
                    language: lang
                  })
                })
              }
            }
          } catch (e) {
            console.error('Failed to send payment confirmation email:', e)
          }
        })()
      }

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
                setIsHairPaid(true)
                await clearIndexedDB()
                localStorage.removeItem('pendingAnalysisFlag')
                localStorage.removeItem('productType')

                // URL 정리 후 헤어 결과 생성 시작
                window.history.replaceState({ page: 'loading' }, '', '#loading')
                setPageState('loading')
                setTimeout(() => {
                  startHairGenerationAfterPayment(savedData, polarCheckoutId)
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
              setIsFullPaid(true)
              await clearIndexedDB()
              localStorage.removeItem('pendingAnalysisFlag')
              localStorage.removeItem('productType')

              // URL 정리 후 바로 분석 시작
              window.history.replaceState({ page: 'loading' }, '', '#loading')
              setPageState('loading')
              // 약간의 딜레이 후 분석 시작 (상태 업데이트 대기)
              setTimeout(() => {
                startAnalysisAfterPayment(savedData, polarCheckoutId)
              }, 100)
              return
            }
          } catch (e) {
            console.error('Failed to load saved data from IndexedDB:', e)
          }
          // 저장된 데이터 없으면 입력 페이지로
          if (purchasedProductType === 'hair') {
            setIsHairPaid(true)
            setPageState('hair-selection')
            window.history.replaceState({ page: 'hair-selection' }, '', '#hair-selection')
          } else {
            setIsFullPaid(true)
            setPageState('input')
            window.history.replaceState({ page: 'input' }, '', '#input')
          }
        })()
        return
      }
      // 저장된 데이터 없으면 입력 페이지로
      if (purchasedProductType === 'hair') {
        setIsHairPaid(true)
        setPageState('hair-selection')
        window.history.replaceState({ page: 'hair-selection' }, '', '#hair-selection')
      } else {
        setIsFullPaid(true)
        setPageState('input')
        window.history.replaceState({ page: 'input' }, '', '#input')
      }
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
  const startAnalysisAfterPayment = async (profileData: typeof profile, paymentCheckoutId?: string | null) => {
    setError('')
    setStyleImages([])
    setLoadingProgress(0)
    setLoadingStep('')
    setPage('loading')

    const activeCheckoutId = paymentCheckoutId || checkoutId || localStorage.getItem('lastCheckoutId')

    // 자동 환불 처리 함수
    const processAutoRefund = async (reason: string) => {
      if (!activeCheckoutId) {
        console.error('No checkout ID available for refund')
        return
      }
      try {
        console.log('[Auto-Refund] Processing refund for checkout:', activeCheckoutId)
        const refundRes = await fetch('/api/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutId: activeCheckoutId, reason })
        })
        if (refundRes.ok) {
          console.log('[Auto-Refund] Refund processed successfully')
          localStorage.removeItem('lastCheckoutId')
          setCheckoutId(null)
        } else {
          console.error('[Auto-Refund] Refund failed:', await refundRes.text())
        }
      } catch (e) {
        console.error('[Auto-Refund] Error processing refund:', e)
      }
    }

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
        // 텍스트 분석 실패 - 자동 환불
        await processAutoRefund('Text analysis failed - API error')
        throw new Error('Analysis failed')
      }

      const analyzeData = await analyzeResponse.json()
      if (!analyzeData.report) {
        // 리포트 생성 실패 - 자동 환불
        await processAutoRefund('Report generation failed - empty response')
        throw new Error('No report generated')
      }
      setReport(analyzeData.report)

      // Save to history if user is logged in (do not await - don't block UI)
      saveAnalysisToHistory('full', analyzeData.report, null, null, {
        height: profileData.height,
        weight: profileData.weight,
        gender: profileData.gender,
        language: lang
      })

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

      // 리포트 성공 후 checkout ID 정리 (환불 불가 상태)
      localStorage.removeItem('lastCheckoutId')
      setCheckoutId(null)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(lang === 'ko'
        ? '분석 중 오류가 발생했습니다. 자동으로 환불 처리됩니다.'
        : 'An error occurred during analysis. Your payment will be automatically refunded.')
      setPage('input')
    }
  }

  // 결제 후 헤어 스타일 생성 (Hair Only 상품)
  const startHairGenerationAfterPayment = async (savedData: {
    hairPhoto?: string; selectedOccasion?: string; selectedVibe?: string; gender?: Gender
  }, paymentCheckoutId?: string | null) => {
    setIsGeneratingHair(true)

    const activeCheckoutId = paymentCheckoutId || checkoutId || localStorage.getItem('lastCheckoutId')

    // 자동 환불 처리 함수
    const processAutoRefund = async (reason: string) => {
      if (!activeCheckoutId) {
        console.error('No checkout ID available for refund')
        return
      }
      try {
        console.log('[Auto-Refund] Processing refund for checkout:', activeCheckoutId)
        const refundRes = await fetch('/api/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutId: activeCheckoutId, reason })
        })
        if (refundRes.ok) {
          console.log('[Auto-Refund] Refund processed successfully')
          localStorage.removeItem('lastCheckoutId')
          setCheckoutId(null)
        } else {
          console.error('[Auto-Refund] Refund failed:', await refundRes.text())
        }
      } catch (e) {
        console.error('[Auto-Refund] Error processing refund:', e)
      }
    }

    const occasion = savedData.selectedOccasion || 'daily'
    const vibe = savedData.selectedVibe || 'natural'
    const hairGender = savedData.gender || 'male'

    // 데모 추천 가져오기
    const demoRecommendations = getHairDemoRecommendations(occasion, vibe, lang, hairGender as Gender)
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
          if (data.images && data.images.length > 0) {
            setGeneratedHairImages(data.images)
            // 성공 후 checkout ID 정리
            localStorage.removeItem('lastCheckoutId')
            setCheckoutId(null)
          } else {
            // 이미지 생성 실패 - 자동 환불
            await processAutoRefund('Hair style generation failed - no images returned')
            setGeneratedHairImages([])
            setError(lang === 'ko'
              ? '헤어스타일 생성에 실패했습니다. 자동으로 환불 처리됩니다.'
              : 'Hair style generation failed. Your payment will be automatically refunded.')
          }
        } else {
          // API 오류 - 자동 환불
          await processAutoRefund('Hair style generation failed - API error')
          setGeneratedHairImages([])
          setError(lang === 'ko'
            ? '헤어스타일 생성에 실패했습니다. 자동으로 환불 처리됩니다.'
            : 'Hair style generation failed. Your payment will be automatically refunded.')
        }
      } catch (e) {
        console.error('Hair generation error:', e)
        // 예외 발생 - 자동 환불
        await processAutoRefund('Hair style generation failed - exception')
        setGeneratedHairImages([])
        setError(lang === 'ko'
          ? '헤어스타일 생성에 실패했습니다. 자동으로 환불 처리됩니다.'
          : 'Hair style generation failed. Your payment will be automatically refunded.')
      }
    }

    setIsGeneratingHair(false)
    setPage('hair-result')

    // Save hair analysis to history (after navigating to results)
    if (generatedHairImages.length > 0) {
      saveAnalysisToHistory('hair', null, null, generatedHairImages.map((img, i) => ({
        id: `hair-${i}`,
        label: img.style,
        imageUrl: img.imageUrl
      })), {
        occasion: selectedOccasion,
        vibe: selectedVibe,
        gender: profile.gender,
        language: lang
      })
    }
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

      // Save to history if user is logged in (do not await - don't block UI)
      saveAnalysisToHistory('full', analyzeData.report, null, null, {
        height: profile.height,
        weight: profile.weight,
        gender: profile.gender,
        language: lang
      })

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
    if (isFullPaid) {
      performAnalysis()
    } else {
      // 결제가 안된 경우 프리뷰 페이지로 이동 (Value Gate)
      setPage('preview')
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
    setHeightFeet('')
    setHeightInches('')
    setWeightLbs('')
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
    setIsFullPaid(false)
    setIsHairPaid(false)
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

  // 결과 공유 - 모달 열기
  const handleShareResult = () => {
    setShowShareModal(true)
  }

  // 소셜 미디어 공유 데이터
  const getShareData = () => {
    const titles: Record<Language, string> = {
      ko: 'AI가 추천한 나만의 스타일! 🪄',
      en: 'My AI-recommended style! 🪄',
      ja: 'AIがおすすめする私だけのスタイル！🪄',
      zh: 'AI推荐的我的专属风格！🪄',
      es: '¡Mi estilo recomendado por IA! 🪄'
    }
    const texts: Record<Language, string> = {
      ko: 'AI가 내 얼굴에 맞는 헤어스타일과 패션을 추천해줬어요! 당신도 체험해보세요!',
      en: 'AI recommended hairstyles and fashion that suit my face! Try it yourself!',
      ja: 'AIが私の顔に合うヘアスタイルとファッションをおすすめしてくれました！あなたも試してみて！',
      zh: 'AI为我推荐了适合我脸型的发型和时尚！你也来试试吧！',
      es: '¡La IA me recomendó peinados y moda que se adaptan a mi rostro! ¡Pruébalo tú también!'
    }
    return {
      title: titles[lang],
      text: texts[lang],
      url: 'https://kstylist.cc'
    }
  }

  // 플랫폼별 공유 함수
  const shareToFacebook = () => {
    const { url } = getShareData()
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
  }

  const shareToX = () => {
    const { text, url } = getShareData()
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
  }

  const shareToWhatsApp = () => {
    const { text, url } = getShareData()
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
  }

  const shareToThreads = () => {
    const { text, url } = getShareData()
    window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
  }

  const shareToiMessage = () => {
    const { text, url } = getShareData()
    window.location.href = `sms:&body=${encodeURIComponent(text + ' ' + url)}`
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText('https://kstylist.cc')
      setShareToast(t.copiedToClipboard)
      setTimeout(() => setShareToast(''), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const handleNativeShare = async () => {
    const shareData = getShareData()
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err)
        }
      }
    }
  }

  // 이미지 다운로드 (Instagram/TikTok용)
  const downloadFirstImage = async () => {
    const images = [
      ...styleImages.map(s => s.imageUrl).filter(Boolean) as string[],
      ...transformedHairstyles.map(s => s.imageUrl).filter(Boolean) as string[]
    ]
    if (images.length > 0) {
      try {
        const response = await fetch(images[0])
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ai-stylist-result-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        setShareToast(t.copiedToClipboard.replace('클립보드에', '').replace('已复制到剪贴板', '已下载').replace('Copied to clipboard', 'Downloaded') || 'Downloaded!')
        setTimeout(() => setShareToast(''), 2000)
      } catch (err) {
        console.error('Download failed:', err)
      }
    }
  }

  // 이메일로 리포트 전송
  const handleSendEmail = async () => {
    if (!emailInput || isSendingEmail) return

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailInput)) {
      setEmailError(t.emailError)
      return
    }

    setIsSendingEmail(true)
    setEmailError('')

    try {
      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          report,
          language: lang
        })
      })

      if (response.ok) {
        setEmailSent(true)
        setTimeout(() => {
          setShowEmailModal(false)
          setEmailSent(false)
          setEmailInput('')
        }, 2000)
      } else {
        setEmailError(t.emailError)
      }
    } catch {
      setEmailError(t.emailError)
    } finally {
      setIsSendingEmail(false)
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

    // 사진이 있고 헤어 결제 완료된 경우 바로 결과 생성
    if (hairPhoto && isHairPaid) {
      setPage('loading')
      startHairGenerationAfterPayment({
        hairPhoto,
        selectedOccasion,
        selectedVibe,
        gender: profile.gender
      })
      return
    }

    // 사진이 있고 결제 안됨 → 프리뷰 페이지로 이동 (Value Gate)
    if (hairPhoto && !isHairPaid) {
      setPage('hair-preview')
      return
    }

    // 사진 없이 데모 모드로 진행하는 경우 (기존 로직)
    if (!hairPhoto) {
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
    const hairGender = profile.gender || 'male'
    const demoRecommendations = getHairDemoRecommendations(selectedOccasion, selectedVibe, lang, hairGender)
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
            gender: hairGender,
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

    // Save hair analysis to history after images are set
    saveAnalysisToHistory('hair', null, null, generatedHairImages.map((img, i) => ({
      id: `hair-${i}`,
      label: img.style,
      imageUrl: img.imageUrl
    })), {
      occasion: selectedOccasion,
      vibe: selectedVibe,
      language: lang
    })

    setPage('hair-result')
  }

  // 데모용 헤어스타일 추천
  const getHairDemoRecommendations = (occasion: string, vibe: string, language: string, gender: Gender): string[] => {
    // 남성용 스타일
    const maleRecommendations: Record<string, Record<string, string[]>> = {
      ko: {
        'daily-elegant': ['클래식 투블럭', '단정한 사이드파트', '깔끔한 댄디컷', '포마드 스타일', '슬릭백'],
        'daily-cute': ['소프트 투블럭', '내추럴 가르마', '에어리 숏컷', '레이어드 숏', '플러피 프린지'],
        'daily-chic': ['언더컷 사이드파트', '텍스쳐드 크롭', '모던 퀴프', '클린 페이드', '슬릭 사이드'],
        'daily-natural': ['내추럴 숏컷', '자연스러운 투블럭', '에어 펌', '소프트 웨이브', '캐주얼 레이어드'],
        'daily-trendy': ['멀렛 스타일', '울프컷', '허쉬컷', '커튼 뱅', '텍스쳐드 프린지'],
        'daily-classic': ['클래식 사이드파트', '올백 스타일', '젠틀맨 컷', '타임리스 크롭', '클래식 테이퍼'],
        'date-elegant': ['포마드 사이드파트', '슬릭백', '클래식 퀴프', '단정한 레이어드', '엘레강트 웨이브'],
        'date-cute': ['소프트 뱅', '내추럴 파마', '플러피 숏', '에어리 레이어드', '캐주얼 투블럭'],
        'date-chic': ['웨트룩 스타일', '샤프 언더컷', '모던 슬릭백', '텍스쳐드 퀴프', '클린 페이드'],
        'date-natural': ['자연스러운 웨이브', '루즈 스타일', '캐주얼 레이어드', '비치 웨이브', '소프트 컬'],
        'date-trendy': ['커튼 뱅', '울프 펌', '레이어드 멀렛', 'K-스타일 펌', '텍스쳐드 숏'],
        'date-classic': ['클래식 포마드', '젠틀맨 슬릭백', '빈티지 사이드파트', '올드스쿨 스타일', '레트로 웨이브'],
        'interview-elegant': ['깔끔한 사이드파트', '단정한 투블럭', '프로페셔널 크롭', '클린 테이퍼', '비즈니스 스타일'],
        'interview-cute': ['소프트 레이어드', '내추럴 숏', '깔끔한 가르마', '에어리 크롭', '단정한 프린지'],
        'interview-chic': ['샤프 사이드파트', '모던 언더컷', '클린 슬릭백', '미니멀 크롭', '프로 페이드'],
        'interview-natural': ['자연스러운 숏', '소프트 사이드파트', '내추럴 레이어드', '클린 웨이브', '캐주얼 크롭'],
        'interview-trendy': ['모던 투블럭', '텍스쳐드 사이드파트', '트렌디 크롭', '클린 레이어드', '스마트 스타일'],
        'interview-classic': ['클래식 비즈니스 컷', '젠틀맨 사이드파트', '포멀 슬릭백', '타임리스 크롭', '클래식 테이퍼'],
        'party-elegant': ['글램 슬릭백', '볼륨 퀴프', '스타일리시 포마드', '엘레강트 웨이브', '럭셔리 사이드파트'],
        'party-cute': ['플러피 스타일', '소프트 펌', '캐주얼 웨이브', '에어리 스타일', '내추럴 볼륨'],
        'party-chic': ['웨트룩 슬릭백', '샤프 언더컷', '모던 퀴프', '텍스쳐드 스타일', '클린 하이페이드'],
        'party-natural': ['자연스러운 웨이브', '루즈 컬', '비치 스타일', '캐주얼 볼륨', '에어드라이 룩'],
        'party-trendy': ['울프 스타일', '멀렛 펌', '커튼 뱅', '레이어드 텍스쳐', 'K-스타일'],
        'party-classic': ['올드스쿨 포마드', '빈티지 슬릭백', '레트로 퀴프', '클래식 웨이브', '젠틀맨 스타일'],
        'wedding-elegant': ['포멀 사이드파트', '클래식 슬릭백', '우아한 포마드', '엘레강트 퀴프', '웨딩 스타일'],
        'wedding-cute': ['소프트 스타일', '내추럴 웨이브', '깔끔한 레이어드', '에어리 볼륨', '로맨틱 숏'],
        'wedding-chic': ['모던 슬릭백', '샤프 사이드파트', '클린 언더컷', '미니멀 스타일', '세련된 크롭'],
        'wedding-natural': ['자연스러운 스타일', '소프트 웨이브', '캐주얼 사이드파트', '내추럴 볼륨', '에어드라이 룩'],
        'wedding-trendy': ['트렌디 사이드파트', '모던 텍스쳐', '스타일리시 크롭', '컨템포러리 스타일', '모던 웨이브'],
        'wedding-classic': ['클래식 젠틀맨', '타임리스 사이드파트', '포멀 포마드', '빈티지 슬릭백', '올드스쿨 웨이브'],
        'vacation-elegant': ['리조트 스타일', '비치 슬릭백', '썸머 사이드파트', '엘레강트 웨이브', '휴양지 룩'],
        'vacation-cute': ['비치 웨이브', '캐주얼 숏', '서머 레이어드', '플레이풀 스타일', '선샤인 룩'],
        'vacation-chic': ['웨트룩 비치', '쿨 슬릭백', '모던 비치 스타일', '클린 숏', '서머 언더컷'],
        'vacation-natural': ['솔트 스프레이 웨이브', '자연스러운 비치헤어', '에어드라이 스타일', '캐주얼 웨이브', '서퍼 룩'],
        'vacation-trendy': ['비치 울프', '서머 멀렛', '트렌디 비치', '페스티벌 스타일', '홀리데이 룩'],
        'vacation-classic': ['클래식 비치 웨이브', '젠틀맨 리조트', '타임리스 서머', '빈티지 비치', '올드스쿨 휴양지'],
      },
      en: {
        'daily-elegant': ['Classic Two-Block', 'Neat Side Part', 'Clean Dandy Cut', 'Pomade Style', 'Slick Back'],
        'daily-cute': ['Soft Two-Block', 'Natural Part', 'Airy Short Cut', 'Layered Short', 'Fluffy Fringe'],
        'daily-chic': ['Undercut Side Part', 'Textured Crop', 'Modern Quiff', 'Clean Fade', 'Sleek Side'],
        'daily-natural': ['Natural Short Cut', 'Casual Two-Block', 'Air Perm', 'Soft Waves', 'Casual Layered'],
        'daily-trendy': ['Mullet Style', 'Wolf Cut', 'Hush Cut', 'Curtain Bangs', 'Textured Fringe'],
        'daily-classic': ['Classic Side Part', 'Slick Back Style', 'Gentleman Cut', 'Timeless Crop', 'Classic Taper'],
        'date-elegant': ['Pomade Side Part', 'Slick Back', 'Classic Quiff', 'Neat Layered', 'Elegant Wave'],
        'date-cute': ['Soft Bangs', 'Natural Perm', 'Fluffy Short', 'Airy Layered', 'Casual Two-Block'],
        'date-chic': ['Wet Look Style', 'Sharp Undercut', 'Modern Slick Back', 'Textured Quiff', 'Clean Fade'],
        'date-natural': ['Natural Waves', 'Loose Style', 'Casual Layered', 'Beach Waves', 'Soft Curls'],
        'date-trendy': ['Curtain Bangs', 'Wolf Perm', 'Layered Mullet', 'K-Style Perm', 'Textured Short'],
        'date-classic': ['Classic Pomade', 'Gentleman Slick Back', 'Vintage Side Part', 'Old School Style', 'Retro Wave'],
        'interview-elegant': ['Clean Side Part', 'Neat Two-Block', 'Professional Crop', 'Clean Taper', 'Business Style'],
        'interview-cute': ['Soft Layered', 'Natural Short', 'Clean Part', 'Airy Crop', 'Neat Fringe'],
        'interview-chic': ['Sharp Side Part', 'Modern Undercut', 'Clean Slick Back', 'Minimal Crop', 'Pro Fade'],
        'interview-natural': ['Natural Short', 'Soft Side Part', 'Natural Layered', 'Clean Wave', 'Casual Crop'],
        'interview-trendy': ['Modern Two-Block', 'Textured Side Part', 'Trendy Crop', 'Clean Layered', 'Smart Style'],
        'interview-classic': ['Classic Business Cut', 'Gentleman Side Part', 'Formal Slick Back', 'Timeless Crop', 'Classic Taper'],
        'party-elegant': ['Glam Slick Back', 'Volume Quiff', 'Stylish Pomade', 'Elegant Wave', 'Luxury Side Part'],
        'party-cute': ['Fluffy Style', 'Soft Perm', 'Casual Wave', 'Airy Style', 'Natural Volume'],
        'party-chic': ['Wet Look Slick Back', 'Sharp Undercut', 'Modern Quiff', 'Textured Style', 'Clean High Fade'],
        'party-natural': ['Natural Waves', 'Loose Curls', 'Beach Style', 'Casual Volume', 'Air Dry Look'],
        'party-trendy': ['Wolf Style', 'Mullet Perm', 'Curtain Bangs', 'Layered Texture', 'K-Style'],
        'party-classic': ['Old School Pomade', 'Vintage Slick Back', 'Retro Quiff', 'Classic Wave', 'Gentleman Style'],
        'wedding-elegant': ['Formal Side Part', 'Classic Slick Back', 'Elegant Pomade', 'Elegant Quiff', 'Wedding Style'],
        'wedding-cute': ['Soft Style', 'Natural Wave', 'Clean Layered', 'Airy Volume', 'Romantic Short'],
        'wedding-chic': ['Modern Slick Back', 'Sharp Side Part', 'Clean Undercut', 'Minimal Style', 'Sleek Crop'],
        'wedding-natural': ['Natural Style', 'Soft Wave', 'Casual Side Part', 'Natural Volume', 'Air Dry Look'],
        'wedding-trendy': ['Trendy Side Part', 'Modern Texture', 'Stylish Crop', 'Contemporary Style', 'Modern Wave'],
        'wedding-classic': ['Classic Gentleman', 'Timeless Side Part', 'Formal Pomade', 'Vintage Slick Back', 'Old School Wave'],
        'vacation-elegant': ['Resort Style', 'Beach Slick Back', 'Summer Side Part', 'Elegant Wave', 'Vacation Look'],
        'vacation-cute': ['Beach Waves', 'Casual Short', 'Summer Layered', 'Playful Style', 'Sunshine Look'],
        'vacation-chic': ['Wet Look Beach', 'Cool Slick Back', 'Modern Beach Style', 'Clean Short', 'Summer Undercut'],
        'vacation-natural': ['Salt Spray Waves', 'Natural Beach Hair', 'Air Dry Style', 'Casual Waves', 'Surfer Look'],
        'vacation-trendy': ['Beach Wolf', 'Summer Mullet', 'Trendy Beach', 'Festival Style', 'Holiday Look'],
        'vacation-classic': ['Classic Beach Waves', 'Gentleman Resort', 'Timeless Summer', 'Vintage Beach', 'Old School Vacation'],
      }
    }

    // 여성용 스타일
    const femaleRecommendations: Record<string, Record<string, string[]>> = {
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
    const recommendations = gender === 'male' ? maleRecommendations : femaleRecommendations
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

  // Auth handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    setIsAuthSubmitting(true)

    const { error } = await signIn(authEmail, authPassword)

    if (error) {
      setAuthError(error.message || t.authError)
    } else {
      setAuthSuccess(t.loginSuccess)
      setAuthEmail('')
      setAuthPassword('')
      setTimeout(() => {
        setPage('landing')
        setAuthSuccess('')
      }, 1000)
    }
    setIsAuthSubmitting(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')

    if (authPassword.length < 6) {
      setAuthError(t.passwordTooShort)
      return
    }

    if (authPassword !== authConfirmPassword) {
      setAuthError(t.passwordMismatch)
      return
    }

    setIsAuthSubmitting(true)
    const { error } = await signUp(authEmail, authPassword)

    if (error) {
      setAuthError(error.message || t.authError)
    } else {
      setAuthSuccess(t.signupSuccess)
      setAuthEmail('')
      setAuthPassword('')
      setAuthConfirmPassword('')
      setTimeout(() => {
        setPage('landing')
        setAuthSuccess('')
      }, 1500)
    }
    setIsAuthSubmitting(false)
  }

  const handleLogout = async () => {
    await signOut()
    setPage('landing')
  }

  const handleGoogleLogin = async () => {
    setAuthError('')
    setAuthSuccess('')
    const { error } = await signInWithGoogle()
    if (error) {
      setAuthError(error.message || t.authError)
    }
  }

  const handleResetPassword = async () => {
    if (!user?.email) return
    setAuthError('')
    setAuthSuccess('')
    setIsAuthSubmitting(true)

    const { error } = await resetPassword(user.email)

    if (error) {
      setAuthError(error.message || t.authError)
    } else {
      setAuthSuccess(t.resetPasswordSent)
    }
    setIsAuthSubmitting(false)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')

    if (newPassword.length < 6) {
      setAuthError(t.passwordTooShort)
      return
    }

    if (newPassword !== confirmNewPassword) {
      setAuthError(t.passwordMismatch)
      return
    }

    setIsAuthSubmitting(true)
    const { error } = await updatePassword(newPassword)

    if (error) {
      setAuthError(error.message || t.authError)
    } else {
      setAuthSuccess(t.passwordUpdated)
      setNewPassword('')
      setConfirmNewPassword('')
    }
    setIsAuthSubmitting(false)
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm(t.deleteAccountConfirm)) return

    setIsAuthSubmitting(true)
    const { error } = await deleteAccount()

    if (error) {
      setAuthError(error.message || t.authError)
      setIsAuthSubmitting(false)
    } else {
      setPage('landing')
      setIsAuthSubmitting(false)
    }
  }

  // Save analysis to history for logged-in users
  const saveAnalysisToHistory = async (
    analysisType: 'full' | 'hair',
    reportContent: string | null,
    styleImagesData: { id: string; label: string; imageUrl: string | null }[] | null,
    hairImagesData: { id: string; label: string; imageUrl: string | null }[] | null,
    inputData: Record<string, unknown>
  ) => {
    if (!user || !supabase) return

    try {
      const { error } = await supabase.from('analysis_history').insert({
        user_id: user.id,
        analysis_type: analysisType,
        report_content: reportContent,
        style_images: styleImagesData,
        hair_images: hairImagesData,
        input_data: inputData
      })

      if (error) {
        console.error('Failed to save analysis history:', error)
      } else {
        console.log('Analysis saved to history')
      }

      // Also update user profile with the latest analysis data
      if (profile.height || profile.weight || profile.gender) {
        await updateAuthProfile({
          height_cm: profile.height ? parseInt(profile.height) : null,
          weight_kg: profile.weight ? parseInt(profile.weight) : null,
          gender: profile.gender,
          preferred_language: lang
        })
      }
    } catch (e) {
      console.error('Error saving analysis:', e)
    }
  }

  // Login Page
  if (page === 'login') {
    return (
      <div className="app-container auth-page">
        <header className="app-header">
          <div className="logo" onClick={() => setPage('landing')} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="currentColor">
                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.1288 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"/>
              </svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
        </header>

        <main className="auth-content">
          <div className="profile-form auth-form">
            <h2>{t.loginTitle}</h2>

            {authError && <div className="auth-error">{authError}</div>}
            {authSuccess && <div className="auth-success">{authSuccess}</div>}

            <button
              type="button"
              className="btn-google"
              onClick={handleGoogleLogin}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t.googleLogin}
            </button>

            <div className="auth-divider">
              <span>{t.orContinueWith}</span>
            </div>

            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="auth-email">{t.email}</label>
                <input
                  id="auth-email"
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="input-group">
                <label htmlFor="auth-password">{t.password}</label>
                <input
                  id="auth-password"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="btn-gold submit-btn"
                disabled={isAuthSubmitting}
              >
                {isAuthSubmitting ? '...' : t.loginBtn}
              </button>
            </form>

            <div className="auth-switch">
              <span>{t.noAccount}</span>
              <button onClick={() => { setPage('signup'); setAuthError(''); setAuthSuccess(''); }}>
                {t.signup}
              </button>
            </div>

            <div className="auth-guest">
              <button onClick={() => setPage('landing')} className="btn-outline-sm">
                {t.continueAsGuest}
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Signup Page
  if (page === 'signup') {
    return (
      <div className="app-container auth-page">
        <header className="app-header">
          <div className="logo" onClick={() => setPage('landing')} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="currentColor">
                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.1288 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"/>
              </svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
        </header>

        <main className="auth-content">
          <div className="profile-form auth-form">
            <h2>{t.signupTitle}</h2>

            {authError && <div className="auth-error">{authError}</div>}
            {authSuccess && <div className="auth-success">{authSuccess}</div>}

            <button
              type="button"
              className="btn-google"
              onClick={handleGoogleLogin}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t.googleLogin}
            </button>

            <div className="auth-divider">
              <span>{t.orContinueWith}</span>
            </div>

            <form onSubmit={handleSignup}>
              <div className="input-group">
                <label htmlFor="signup-email">{t.email}</label>
                <input
                  id="signup-email"
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="input-group">
                <label htmlFor="signup-password">{t.password}</label>
                <input
                  id="signup-password"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              <div className="input-group">
                <label htmlFor="signup-confirm-password">{t.confirmPassword}</label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn-gold submit-btn"
                disabled={isAuthSubmitting}
              >
                {isAuthSubmitting ? '...' : t.signupBtn}
              </button>
            </form>

            <div className="auth-switch">
              <span>{t.haveAccount}</span>
              <button onClick={() => { setPage('login'); setAuthError(''); setAuthSuccess(''); }}>
                {t.login}
              </button>
            </div>

            <div className="auth-guest">
              <button onClick={() => setPage('landing')} className="btn-outline-sm">
                {t.continueAsGuest}
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Profile Page
  if (page === 'profile') {
    return (
      <div className="app-container auth-page">
        <header className="app-header">
          <div className="logo" onClick={() => setPage('landing')} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="currentColor">
                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.1288 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"/>
              </svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
          <div className="header-actions">
            <button onClick={handleLogout} className="btn-outline-sm">
              {t.logout}
            </button>
          </div>
        </header>

        <main className="auth-content">
          <div className="profile-form">
            <h2>{t.myProfile}</h2>

            {authError && <div className="auth-error">{authError}</div>}
            {authSuccess && <div className="auth-success">{authSuccess}</div>}

            <div className="profile-info">
              <div className="profile-field">
                <label>{t.email}</label>
                <span>{user?.email}</span>
              </div>
              {authProfile?.height_cm && (
                <div className="profile-field">
                  <label>{t.height}</label>
                  <span>{authProfile.height_cm} cm</span>
                </div>
              )}
              {authProfile?.weight_kg && (
                <div className="profile-field">
                  <label>{t.weight}</label>
                  <span>{authProfile.weight_kg} kg</span>
                </div>
              )}
              {authProfile?.gender && (
                <div className="profile-field">
                  <label>{t.gender}</label>
                  <span>{authProfile.gender === 'male' ? t.male : authProfile.gender === 'female' ? t.female : t.other}</span>
                </div>
              )}
            </div>

            <div className="profile-section">
              <h3>{t.analysisHistory}</h3>
              <p className="no-history">{t.noHistory}</p>
            </div>

            <div className="profile-section account-settings">
              <h3>{t.accountSettings}</h3>

              <form onSubmit={handleUpdatePassword} className="password-change-form">
                <div className="input-group">
                  <label htmlFor="new-password">{t.newPassword}</label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="confirm-new-password">{t.confirmNewPassword}</label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-outline-sm"
                  disabled={isAuthSubmitting || !newPassword || !confirmNewPassword}
                >
                  {t.updatePasswordBtn}
                </button>
              </form>

              <div className="setting-item" style={{ marginTop: '1.5rem' }}>
                <div className="setting-info">
                  <strong>{t.resetPassword}</strong>
                  <p>{t.resetPasswordDesc}</p>
                </div>
                <button
                  onClick={handleResetPassword}
                  className="btn-outline-sm"
                  disabled={isAuthSubmitting}
                >
                  {t.resetPasswordBtn}
                </button>
              </div>

              <div className="setting-item danger">
                <div className="setting-info">
                  <strong>{t.deleteAccount}</strong>
                  <p>{t.deleteAccountDesc}</p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  className="btn-danger"
                  disabled={isAuthSubmitting}
                >
                  {t.deleteAccountBtn}
                </button>
              </div>
            </div>

            <button onClick={() => setPage('landing')} className="btn-gold">
              {t.backToHome}
            </button>
          </div>
        </main>
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
            {isSupabaseConfigured && (
              user ? (
                <div className="auth-buttons">
                  <button onClick={() => setPage('profile')} className="btn-primary-sm">
                    {t.myProfile}
                  </button>
                  <button onClick={handleLogout} className="btn-outline-sm">
                    {t.logout}
                  </button>
                </div>
              ) : (
                <div className="auth-buttons">
                  <button onClick={() => setPage('login')} className="btn-outline-sm">
                    {t.login}
                  </button>
                  <button onClick={() => setPage('signup')} className="btn-primary-sm">
                    {t.signup}
                  </button>
                </div>
              )
            )}
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
                <h5>LEGAL</h5>
                <a href="#" onClick={(e) => { e.preventDefault(); setPolicyModal('terms') }}>Terms of Service</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setPolicyModal('privacy') }}>Privacy Policy</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setPolicyModal('refund') }}>Refund Policy</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 PERSONAL STYLIST. ALL RIGHTS RESERVED.</span>
          </div>
        </footer>

        {/* Policy Modal */}
        {policyModal && (
          <div className="policy-modal-overlay" onClick={() => setPolicyModal(null)}>
            <div className="policy-modal" onClick={(e) => e.stopPropagation()}>
              <button className="policy-modal-close" onClick={() => setPolicyModal(null)}>×</button>
              <h1>{policyContent[policyModal].title}</h1>
              <p className="policy-updated">Last Updated: {policyContent[policyModal].lastUpdated}</p>
              <div
                className="policy-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(policyContent[policyModal].content) }}
              />
            </div>
          </div>
        )}
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
              {heightFeet || heightInches ? (
                <>
                  <span>{heightFeet || '0'}'{heightInches || '0'}"</span>
                  <span>{weightLbs || '0'} lbs</span>
                </>
              ) : (
                <>
                  <span>{profile.height} cm</span>
                  <span>{profile.weight} kg</span>
                </>
              )}
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
          {report && (
            <button
              className="btn-outline"
              onClick={() => {
                setShowEmailModal(true)
                setEmailSent(false)
                setEmailError('')
              }}
            >
              {t.emailReport}
            </button>
          )}
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

        {/* Email Modal */}
        {showEmailModal && (
          <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
            <div className="modal-content email-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowEmailModal(false)}>×</button>
              <h2>{t.emailModalTitle}</h2>
              {emailSent ? (
                <div className="email-success">
                  <span className="success-icon">✓</span>
                  <p>{t.emailSuccess}</p>
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    className="email-input"
                    placeholder={t.emailPlaceholder}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                  />
                  {emailError && <p className="email-error">{emailError}</p>}
                  <button
                    className="btn-gold email-send-btn"
                    onClick={handleSendEmail}
                    disabled={isSendingEmail || !emailInput}
                  >
                    {isSendingEmail ? t.emailSending : t.emailSend}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
            <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()} style={{
              maxWidth: '400px',
              padding: '2rem'
            }}>
              <button className="modal-close" onClick={() => setShowShareModal(false)}>×</button>
              <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>{t.shareModalTitle}</h2>

              {/* Mobile native share */}
              {'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    marginBottom: '1rem',
                    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
                    color: '#1a1a2e',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  📤 {t.shareVia}
                </button>
              )}

              <p style={{
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                {t.shareVia}
              </p>

              {/* Social media grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                {/* Facebook */}
                <button
                  onClick={shareToFacebook}
                  style={{
                    aspectRatio: '1',
                    background: '#1877F2',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    color: '#fff',
                    fontSize: '1.5rem',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>

                {/* X (Twitter) */}
                <button
                  onClick={shareToX}
                  style={{
                    aspectRatio: '1',
                    background: '#000',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    color: '#fff',
                    fontSize: '1.5rem',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </button>

                {/* WhatsApp */}
                <button
                  onClick={shareToWhatsApp}
                  style={{
                    aspectRatio: '1',
                    background: '#25D366',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    color: '#fff',
                    fontSize: '1.5rem',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </button>

                {/* Threads */}
                <button
                  onClick={shareToThreads}
                  style={{
                    aspectRatio: '1',
                    background: '#000',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    color: '#fff',
                    fontSize: '1.5rem',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.88-.73 2.088-1.146 3.5-1.208 1.028-.045 1.964.062 2.79.32-.09-.573-.26-1.075-.51-1.494-.403-.672-1.04-1.1-1.955-1.316l.305-2.023c1.36.162 2.478.803 3.227 1.756l.006.007.007.008c.632.788.994 1.756 1.136 2.86.376.18.727.39 1.05.63.89.661 1.57 1.502 2.015 2.508.753 1.706.776 4.405-1.37 6.503-1.812 1.77-4.123 2.535-7.267 2.56zm1.342-9.123c-.722.032-1.34.205-1.79.501-.394.26-.59.563-.572.88.018.333.208.612.55.808.392.224.94.336 1.548.302 1.032-.055 1.82-.424 2.343-1.096.306-.393.52-.876.642-1.44-.844-.212-1.725-.3-2.72-.255z"/>
                  </svg>
                </button>
              </div>

              {/* Second row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                {/* iMessage */}
                <button
                  onClick={shareToiMessage}
                  style={{
                    padding: '0.75rem',
                    background: '#34C759',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                  </svg>
                  iMessage
                </button>

                {/* Copy Link */}
                <button
                  onClick={copyShareLink}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {t.copyLink}
                </button>
              </div>

              {/* Download for Instagram/TikTok */}
              <button
                onClick={downloadFirstImage}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {t.downloadForSocial}
              </button>

              {/* Toast notification */}
              {shareToast && (
                <div style={{
                  position: 'fixed',
                  bottom: '2rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.9)',
                  color: '#fff',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  zIndex: 1001
                }}>
                  {shareToast}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Hair Preview Page (Hair Only - Value Gate + Curiosity Gap)
  if (page === 'hair-preview') {
    const selectedOccasionData = hairOccasions.find(o => o.id === selectedOccasion)
    const selectedVibeData = hairVibes.find(v => v.id === selectedVibe)

    const handleHairPayment = async () => {
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
    }

    return (
      <div className="app-container">
        <header className="app-header">
          <button className="back-btn" onClick={() => setPage('hair-selection')}>
            ← {t.backToHome}
          </button>
          <div className="logo" onClick={handleRestart} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="currentColor">
                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.1288 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"/>
              </svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
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

        <div className="input-page-content">
          <div className="input-hero">
            <span className="input-tag">ANALYSIS COMPLETE</span>
            <h1 className="input-title">
              {t.hairPreviewTitle}
            </h1>
            <p className="input-desc">{t.hairPreviewSubtitle}</p>
          </div>

          <div className="profile-form" style={{ textAlign: 'center' }}>
            {/* Photo & Options Summary */}
            <div className="profile-summary" style={{ marginBottom: '2rem' }}>
              {hairPhoto && (
                <img src={hairPhoto} alt="Hair" className="result-photo" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <div className="profile-info">
                {selectedOccasionData && (
                  <span>{selectedOccasionData.icon} {lang === 'ko' ? selectedOccasionData.labelKo : selectedOccasionData.labelEn}</span>
                )}
                {selectedVibeData && (
                  <span>{selectedVibeData.icon} {lang === 'ko' ? selectedVibeData.labelKo : selectedVibeData.labelEn}</span>
                )}
              </div>
            </div>

            {/* Found Items */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '2rem'
            }}>
              <span style={{
                background: 'rgba(212, 175, 55, 0.15)',
                color: '#d4af37',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                ✓ {t.previewHairStylesFound}
              </span>
            </div>

            {/* Blurred Preview */}
            <div style={{
              background: 'rgba(212, 175, 55, 0.05)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                {[1,2,3,4,5].map((i) => (
                  <div key={i} style={{
                    aspectRatio: '1',
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(212, 114, 140, 0.3))',
                    borderRadius: '12px',
                    filter: 'blur(6px)'
                  }}>
                  </div>
                ))}
              </div>

              <p style={{
                color: 'rgba(26, 26, 26, 0.6)',
                fontSize: '0.9rem',
                fontStyle: 'italic',
                margin: 0
              }}>
                {t.hairPreviewCuriosity}
              </p>
            </div>

            {/* Service Info */}
            <div style={{
              background: 'rgba(212, 175, 55, 0.1)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(212, 175, 55, 0.3)'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#d4af37', fontWeight: '600' }}>
                {t.previewCompare2}
              </p>
              <p style={{ margin: 0, color: '#d4af37', fontWeight: '700', fontSize: '1.5rem' }}>
                {t.hairPrice}
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleHairPayment}
              disabled={isProcessingPayment}
              className="btn-gold submit-btn"
            >
              {isProcessingPayment ? t.processingPayment : `${t.hairPreviewUnlock} - ${t.hairPrice}`}
            </button>
          </div>
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

          {/* Share Modal for Hair Result */}
          {showShareModal && (
            <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
              <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()} style={{
                maxWidth: '400px',
                padding: '2rem'
              }}>
                <button className="modal-close" onClick={() => setShowShareModal(false)}>×</button>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>{t.shareModalTitle}</h2>

                {'share' in navigator && (
                  <button onClick={handleNativeShare} style={{
                    width: '100%', padding: '1rem', marginBottom: '1rem',
                    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
                    color: '#1a1a2e', border: 'none', borderRadius: '12px',
                    fontSize: '1rem', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                  }}>📤 {t.shareVia}</button>
                )}

                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', textAlign: 'center' }}>{t.shareVia}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <button onClick={shareToFacebook} style={{ aspectRatio: '1', background: '#1877F2', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </button>
                  <button onClick={shareToX} style={{ aspectRatio: '1', background: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </button>
                  <button onClick={shareToWhatsApp} style={{ aspectRatio: '1', background: '#25D366', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </button>
                  <button onClick={shareToThreads} style={{ aspectRatio: '1', background: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.88-.73 2.088-1.146 3.5-1.208 1.028-.045 1.964.062 2.79.32-.09-.573-.26-1.075-.51-1.494-.403-.672-1.04-1.1-1.955-1.316l.305-2.023c1.36.162 2.478.803 3.227 1.756l.006.007.007.008c.632.788.994 1.756 1.136 2.86.376.18.727.39 1.05.63.89.661 1.57 1.502 2.015 2.508.753 1.706.776 4.405-1.37 6.503-1.812 1.77-4.123 2.535-7.267 2.56zm1.342-9.123c-.722.032-1.34.205-1.79.501-.394.26-.59.563-.572.88.018.333.208.612.55.808.392.224.94.336 1.548.302 1.032-.055 1.82-.424 2.343-1.096.306-.393.52-.876.642-1.44-.844-.212-1.725-.3-2.72-.255z"/></svg>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <button onClick={shareToiMessage} style={{ padding: '0.75rem', background: '#34C759', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.9rem', fontWeight: '500' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                    iMessage
                  </button>
                  <button onClick={copyShareLink} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.9rem', fontWeight: '500' }}>
                    {t.copyLink}
                  </button>
                </div>

                <button onClick={downloadFirstImage} style={{
                  width: '100%', padding: '1rem',
                  background: 'linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D)',
                  border: 'none', borderRadius: '12px', cursor: 'pointer', color: '#fff', fontSize: '0.95rem', fontWeight: '600'
                }}>{t.downloadForSocial}</button>

                {shareToast && (
                  <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.9)', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', fontSize: '0.9rem', zIndex: 1001 }}>{shareToast}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Preview Page (Full Package - Value Gate + Curiosity Gap)
  if (page === 'preview') {
    const faceShapes = ['Oval', 'Round', 'Square', 'Heart', 'Long']
    const faceShapeKo: Record<string, string> = {
      'Oval': '계란형',
      'Round': '둥근형',
      'Square': '각진형',
      'Heart': '하트형',
      'Long': '긴형'
    }
    const simulatedFaceShape = faceShapes[Math.floor(Date.now() / 10000) % faceShapes.length]
    const displayFaceShape = lang === 'ko' ? faceShapeKo[simulatedFaceShape] : simulatedFaceShape

    return (
      <div className="app-container">
        <header className="app-header">
          <button className="back-btn" onClick={() => setPage('input')}>
            ← {t.backToHome}
          </button>
          <div className="logo" onClick={handleRestart} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="currentColor">
                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.1288 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"/>
              </svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
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

        <div className="input-page-content">
          <div className="input-hero">
            <span className="input-tag">ANALYSIS COMPLETE</span>
            <h1 className="input-title">
              {t.previewTitle}
            </h1>
            <p className="input-desc">{t.previewSubtitle}</p>
          </div>

          <div className="profile-form" style={{ textAlign: 'center' }}>
            {/* Profile Summary */}
            <div className="profile-summary" style={{ marginBottom: '2rem' }}>
              {profile.photo && (
                <img src={profile.photo} alt="Profile" className="result-photo" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <div className="profile-info">
                <span>{displayFaceShape} {t.previewFaceShape}</span>
                <span>{profile.height} cm / {profile.weight} kg</span>
              </div>
            </div>

            {/* Found Items */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: '2rem'
            }}>
              <span style={{
                background: 'rgba(212, 175, 55, 0.15)',
                color: '#d4af37',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                ✓ {t.previewHairStylesFound}
              </span>
              <span style={{
                background: 'rgba(212, 175, 55, 0.15)',
                color: '#d4af37',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                ✓ {t.previewFashionFound}
              </span>
            </div>

            {/* Blurred Preview */}
            <div style={{
              background: 'rgba(212, 175, 55, 0.05)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
              <p style={{
                color: 'var(--charcoal)',
                fontSize: '1rem',
                marginBottom: '1rem',
                fontWeight: '600'
              }}>
                {t.previewCuriosity1}
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                {[1,2,3,4,5].map((i) => (
                  <div key={i} style={{
                    aspectRatio: '1',
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(212, 114, 140, 0.3))',
                    borderRadius: '12px',
                    filter: 'blur(6px)',
                    position: 'relative'
                  }}>
                  </div>
                ))}
              </div>

              <p style={{
                color: 'rgba(26, 26, 26, 0.6)',
                fontSize: '0.9rem',
                fontStyle: 'italic'
              }}>
                {t.previewCuriosity2}
              </p>
            </div>

            {/* Service Info */}
            <div style={{
              background: 'rgba(212, 175, 55, 0.1)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(212, 175, 55, 0.3)'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#d4af37', fontWeight: '600' }}>
                {t.previewCompare2}
              </p>
              <p style={{ margin: 0, color: '#d4af37', fontWeight: '700', fontSize: '1.5rem' }}>
                {t.price}
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => handlePayment('full')}
              disabled={isProcessingPayment}
              className="btn-gold submit-btn"
            >
              {isProcessingPayment ? t.processingPayment : `${t.previewUnlock} - ${t.price}`}
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

              {/* Unit Toggle (영어 사용자용) */}
              {lang === 'en' && (
                <div className="input-group" style={{ marginBottom: '0.5rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: 'rgba(26, 26, 26, 0.05)',
                    borderRadius: '8px',
                    padding: '0.5rem'
                  }}>
                    <button
                      type="button"
                      onClick={() => setUseMetric(false)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: !useMetric ? 'rgba(212, 175, 55, 0.3)' : 'transparent',
                        color: !useMetric ? '#d4af37' : 'rgba(26, 26, 26, 0.6)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: !useMetric ? '600' : '400',
                        transition: 'all 0.2s'
                      }}
                    >
                      ft / lbs
                    </button>
                    <span style={{ color: 'rgba(26, 26, 26, 0.3)' }}>|</span>
                    <button
                      type="button"
                      onClick={() => setUseMetric(true)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: useMetric ? 'rgba(212, 175, 55, 0.3)' : 'transparent',
                        color: useMetric ? '#d4af37' : 'rgba(26, 26, 26, 0.6)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: useMetric ? '600' : '400',
                        transition: 'all 0.2s'
                      }}
                    >
                      cm / kg
                    </button>
                  </div>
                </div>
              )}

              {isImperial ? (
                <div className="input-group">
                  <label>{t.height}</label>
                  <div className="imperial-height-inputs">
                    <div className="imperial-input">
                      <input
                        id="height-feet"
                        type="number"
                        placeholder="5"
                        value={heightFeet}
                        onChange={(e) => setHeightFeet(e.target.value)}
                        min="0"
                        max="8"
                      />
                      <span className="unit-label">{t.heightFeet}</span>
                    </div>
                    <div className="imperial-input">
                      <input
                        id="height-inches"
                        type="number"
                        placeholder="7"
                        value={heightInches}
                        onChange={(e) => setHeightInches(e.target.value)}
                        min="0"
                        max="11"
                      />
                      <span className="unit-label">{t.heightInches}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="input-group">
                  <label htmlFor="height">{lang === 'en' ? 'Height (cm)' : t.height}</label>
                  <input
                    id="height"
                    type="number"
                    placeholder="170"
                    value={profile.height}
                    onChange={(e) => setProfile(prev => ({ ...prev, height: e.target.value }))}
                  />
                </div>
              )}

              {isImperial ? (
                <div className="input-group">
                  <label htmlFor="weight-lbs">{t.weight}</label>
                  <input
                    id="weight-lbs"
                    type="number"
                    placeholder="150"
                    value={weightLbs}
                    onChange={(e) => setWeightLbs(e.target.value)}
                  />
                </div>
              ) : (
                <div className="input-group">
                  <label htmlFor="weight">{lang === 'en' ? 'Weight (kg)' : t.weight}</label>
                  <input
                    id="weight"
                    type="number"
                    placeholder="65"
                    value={profile.weight}
                    onChange={(e) => setProfile(prev => ({ ...prev, weight: e.target.value }))}
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn-gold submit-btn"
                disabled={!isFormValid || isProcessingPayment}
              >
                {isProcessingPayment
                  ? t.processingPayment
                  : isFullPaid
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
