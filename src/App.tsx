import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import { renderMarkdownToHtml } from './utils/markdown'
import { useAuth } from './contexts/AuthContext'
// supabase client is initialized in lib/supabase.ts and used by AuthContext

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

type Language = 'ko' | 'en'
type Gender = 'male' | 'female' | 'other' | null
type Page = 'landing' | 'input' | 'loading' | 'result' | 'how-to-use' | 'preview' | 'login' | 'signup' | 'profile' | 'subscription-dashboard' | 'style-chat' | 'hair-selection' | 'hair-result'

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
  errorApologyRefund: string
  retry: string
  styleGallery: string
  styleGalleryDesc: string
  generatingStyles: string
  demoMode: string
  backToHome: string
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
  fashionTransform: string
  fashionTransformDesc: string
  generateFashion: string
  generatingFashion: string
  photoRequired: string
  serviceIntroTitle: string
  serviceStep1: string
  serviceStep1Desc: string
  serviceStep2: string
  serviceStep2Desc: string
  serviceStep3: string
  serviceStep3Desc: string
  // Style References
  styleReferenceTitle: string
  styleReferenceDesc: string
  fashionReferenceTitle: string
  fashionReferenceDesc: string
  fashionBrands: string[]
  // Style Labels
  styleLabels: Record<string, string>
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
  previewFashionFound: string
  previewCuriosity1: string
  previewCuriosity2: string
  previewProgress: string
  previewUnlock: string
  previewCompare1: string
  previewCompare2: string
  previewCoffeeNote: string
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
  forgotPassword: string
  authError: string
  passwordMismatch: string
  passwordTooShort: string
  loginSuccess: string
  signupSuccess: string
  checkSpamFolder: string
  goToLogin: string
  continueAsGuest: string
  orContinueWith: string
  googleLogin: string
  myProfile: string
  analysisHistory: string
  noHistory: string
  historySaved: string
  viewResult: string
  fullAnalysis: string
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
  // Free Trial & Upsell
  freeTrialBadge: string
  freeTrialCta: string
  freeTrialDesc: string
  freeTrialRemaining: string
  upsellTitle: string
  upsellSubtitle: string
  upsellFullPackage: string
  upsellFullDesc: string
  upsellDismiss: string
  shareMyResult: string
  freeUploadText: string
  // Subscription
  subscriptionTitle: string
  subscriptionDesc: string
  dailyTagline: string
  subscriptionPrice: string
  subscriptionTrialDays: string
  subscriptionCta: string
  subscriptionActive: string
  subscriptionManage: string
  subscriptionManageDesc: string
  subscriptionCancel: string
  subscriptionCancelConfirm: string
  subscriptionCancelSuccess: string
  subscriptionCanceling: string
  subscriptionCityLabel: string
  subscriptionCityPlaceholder: string
  subscriptionCityRequired: string
  subscriptionFormTitle: string
  subscriptionFormDesc: string
  subscriptionFormStart: string
  subscriptionLoginRequired: string
  // Dashboard
  dashboardTitle: string
  dashboardSubtitle: string
  dashboardLoading: string
  dashboardError: string
  dashboardRetry: string
  dashboardToday: string
  dashboardFeelsLike: string
  dashboardHumidity: string
  dashboardWind: string
  dashboardStyleTip: string
  dashboardBack: string
  dashboardNewDay: string
  // Dashboard Profile
  dashboardProfileTitle: string
  dashboardProfileDesc: string
  dashboardProfileHeight: string
  dashboardProfileWeight: string
  dashboardProfileGender: string
  dashboardProfilePhoto: string
  dashboardProfileSave: string
  dashboardProfileSaving: string
  dashboardProfileComplete: string
  dashboardProfileIncomplete: string
  dashboardProfileEdit: string
  dashboardProfilePhotoChange: string
  subscriptionCanceledNotice: string
  // Dashboard Gallery
  dashboardGalleryTitle: string
  dashboardGalleryEmpty: string
  dashboardGalleryTodaysPick: string
  dashboardGalleryCasual: string
  dashboardGalleryEvening: string
  // Preview (free image)
  previewFreeLabel: string
  previewBlurredLabel: string
  previewUnlockAll: string
  // Favorites
  favoriteSaved: string
  favoriteRemoved: string
  favoritesTitle: string
  favoritesEmpty: string
  favoritesGallery: string
  saveImage: string
  // Before/After Gallery
  galleryBefore: string
  galleryAfter: string
  // Referral
  referralTitle: string
  referralDesc: string
  referralInvited: string
  referralCredits: string
  referralCopyLink: string
  referralInlineText: string
  referralCreditAvailable: string
  chatTitle: string
  chatPlaceholder: string
  chatSend: string
  chatBuyTokens: string
  chatTokensLeft: string
  chatWelcome: string
  chatExample1: string
  chatExample2: string
  chatExample3: string
  chatNoTokens: string
  chatCardTitle: string
  chatCardDesc: string
  // Before/After Gallery & CTA
  beforeAfterTitle: string
  beforeLabel: string
  afterLabel: string
  showcaseTitle: string
  showcaseDesc: string
  galleryTitle: string
  gallerySubtitle: string
  galleryBadgeOutfit: string
  galleryBadgeDaily: string
  galleryCta: string
  galleryResultTime: string
  // Trust Signals
  trustTitle: string
  trustRating: string
  trustRatingCount: string
  trustSpeed: string
  trustSpeedDesc: string
  trustRefund: string
  trustRefundDesc: string
  trustAI: string
  trustAIDesc: string
  trustGlobal: string
  trustGlobalDesc: string
  // SEO meta
  metaTitle: string
  metaDescription: string
  timerTitle: string
  timerDesc: string
  unlockAllStyles: string
  blurredRemaining: string
  // Footer
  footerLegal: string
  footerTerms: string
  footerPrivacy: string
  footerRefund: string
  footerCopyright: string
  // Hero badges
  badgeRunway: string
  badgePersonalized: string
  badgeWeather: string
  // Situation hooks
  situationTitle: string
  situation1: string
  situation2: string
  situation3: string
  situation4: string
  situationCta: string
  // SNS Share Card
  shareCardTitle: string
  shareCardCta: string
  shareToInstagram: string
  // A/B Paywall
  abUrgencyText: string
  // Style DNA
  styleDnaTitle: string
  styleDnaSeason: string
  styleDnaSeasons: { spring: string; summer: string; autumn: string; winter: string }
  styleDnaBodyType: string
  styleDnaColors: string
  styleDnaSilhouettes: string
  styleDnaShare: string
  heroHeadline: string
  heroSubCta: string
}> = {
  ko: {
    title: 'PERSONAL STYLIST',
    subtitle: '나만의 퍼스널 스타일리스트',
    heroTitle1: 'Your Personal',
    heroTitle2: 'Stylist',
    heroDesc: '사진 한 장으로 30초 만에 나만의 패션 스타일링. AI가 얼굴형, 체형, 퍼스널 컬러를 분석합니다.',
    startBtn: '스타일 분석 시작',
    learnMore: '더 알아보기',
    featuredIn: 'Featured in',
    pathTitle: '당신의 변신 경로를 선택하세요',
    module2Title: '풀 스타일 컨설팅',
    module2Desc: '얼굴형·피부톤 맞춤 패션 변신',
    module2Features: ['퍼스널 컬러·체형 분석', '피부톤 맞춤 패션 3종', '전문 스타일 리포트'],
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
    photoHint: '⚠️ 1인 전신 사진을 권장합니다 (다른 사람이 없는 사진)',
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
    errorApologyRefund: '죄송합니다. 스타일 분석 중 일시적인 오류가 발생했습니다. 결제하신 금액은 자동으로 환불 처리됩니다. 불편을 드려 진심으로 사과드립니다.',
    retry: '다시 시도',
    styleGallery: '스타일 추천',
    styleGalleryDesc: '상황별 맞춤 스타일을 스타일리스트가 제안합니다',
    generatingStyles: '스타일 이미지 생성 중...',
    demoMode: '데모 모드 - 실제 이미지는 API 설정 후 제공됩니다',
    backToHome: '홈으로 돌아가기',
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
    step1Desc: '원하는 스타일 서비스를 선택하세요',
    step2Title: '상황 & 느낌 선택',
    step2Desc: '데이트, 면접, 파티 등 상황과 원하는 분위기를 선택해주세요',
    step3Title: '스타일 분석',
    step3Desc: '스타일리스트가 선택하신 조건에 맞는 최적의 스타일을 분석합니다',
    step4Title: '맞춤 추천',
    step4Desc: '개인화된 패션 코디를 확인하세요',
    getStarted: '시작하기',
    purchaseRequired: '프리미엄 스타일 분석 서비스',
    purchaseBtn: '미리보기 및 분석 시작',
    processingPayment: '결제 처리 중...',
    price: '$4.99',
    fashionTransform: '패션 변환',
    fashionTransformDesc: '내 모습에 다양한 패션 스타일 적용',
    generateFashion: '패션 스타일 생성하기',
    generatingFashion: '패션 스타일 생성 중...',
    photoRequired: '사진을 업로드해주세요',
    serviceIntroTitle: '이렇게 이용하세요',
    serviceStep1: '셀카 업로드',
    serviceStep1Desc: '정면 사진 한 장이면 충분합니다',
    serviceStep2: '스타일 선택',
    serviceStep2Desc: '패션 변환을 선택하세요',
    serviceStep3: '결과 확인',
    serviceStep3Desc: '내 얼굴 그대로, 다양한 스타일을 미리 체험',
    // Style References
    styleReferenceTitle: '프리미엄 스타일 레퍼런스',
    styleReferenceDesc: '세계적인 디자이너 브랜드와 셀러브리티 스타일을 참고하여 최고의 스타일을 추천합니다',
    fashionReferenceTitle: '👗 패션 레퍼런스',
    fashionReferenceDesc: '럭셔리 디자이너 브랜드 스타일 참고',
    fashionBrands: ['Hermès', 'Loro Piana', 'The Row', 'Bottega Veneta', 'Brunello Cucinelli', 'Auralee', 'Lemaire', 'Max Mara', 'Louis Vuitton'],
    styleLabels: {
      'best-match': '베스트 매치',
      'interview': '인터뷰룩',
      'date': '데이트룩',
      'luxury': '럭셔리',
      'casual': '캐주얼',
      'daily': '데일리'
    },
    downloadResult: '결과 리포트 보기',
    shareResult: '공유하기',
    linkCopied: '링크가 복사되었습니다!',
    emailReport: '이메일로 받기',
    emailModalTitle: '리포트를 이메일로 받기',
    emailPlaceholder: '이메일 주소를 입력하세요',
    emailSend: '전송',
    emailSending: '전송 중...',
    emailSuccess: '이메일이 전송되었습니다!',
    emailError: '이메일 전송에 실패했습니다. 다시 시도해주세요.',
    // Preview page translations
    previewTitle: '분석 완료!',
    previewSubtitle: '당신만을 위한 스타일을 찾았어요',
    previewAnalysisComplete: '스타일 분석이 완료되었습니다',
    previewFaceShape: '얼굴형 분석 결과',
    previewFashionFound: '맞춤 패션 코디 3개 준비 완료!',
    previewCuriosity1: '의외의 결과가 나왔어요! 👀',
    previewCuriosity2: '1위 스타일이 궁금하지 않으세요?',
    previewProgress: '87% 완료 - 결과만 확인하면 끝!',
    previewUnlock: '결과 확인하기',
    previewCompare1: '전문 스타일리스트 상담',
    previewCompare2: 'Personal Stylist',
    previewCoffeeNote: '☕ 커피 한 잔 가격으로 미용실 실패 예방!',
    // Share modal
    shareModalTitle: '결과 공유하기',
    shareVia: '공유하기',
    downloadForSocial: '이미지 저장 (Instagram/TikTok용)',
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
    forgotPassword: '비밀번호를 잊으셨나요?',
    authError: '인증 오류가 발생했습니다',
    passwordMismatch: '비밀번호가 일치하지 않습니다',
    passwordTooShort: '비밀번호는 6자 이상이어야 합니다',
    loginSuccess: '로그인되었습니다',
    signupSuccess: '인증 메일을 보냈습니다. 이메일을 확인하고 인증 링크를 클릭해주세요.',
    checkSpamFolder: '메일이 안 보이면 스팸 폴더를 확인해주세요.',
    goToLogin: '로그인하러 가기',
    continueAsGuest: '게스트로 계속하기',
    orContinueWith: '또는',
    googleLogin: 'Google로 계속하기',
    myProfile: '내 프로필',
    analysisHistory: '분석 히스토리',
    noHistory: '저장된 분석 결과가 없습니다',
    historySaved: '분석 결과가 저장되었습니다',
    viewResult: '결과 보기',
    fullAnalysis: '풀 스타일 분석',
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
    cancel: '취소',
    freeTrialBadge: 'FREE',
    freeTrialCta: '무료 스타일 분석 체험',
    freeTrialDesc: '특별 혜택 - 무료 3회 스타일 분석',
    freeTrialRemaining: '무료 {n}회 남음',
    upsellTitle: '결과가 마음에 드셨나요?',
    upsellSubtitle: '더 많은 스타일을 만나보세요',
    upsellFullPackage: '풀 스타일 컨설팅',
    upsellFullDesc: '패션 + 체형 분석',
    upsellDismiss: '나중에 할게요',
    shareMyResult: '내 결과 공유하기',
    freeUploadText: '내 사진 업로드 (무료!)',
    subscriptionTitle: '매일 스타일 추천',
    subscriptionDesc: '날씨 · 체형 · 런웨이 트렌드 기반 매일 아침 스타일 추천',
    dailyTagline: '매일 아침, 오늘의 추천 스타일을 받아보세요',
    subscriptionPrice: '$6.99/월',
    subscriptionTrialDays: '7일 무료 체험',
    subscriptionCta: '무료 체험 시작',
    subscriptionActive: '구독 활성화됨',
    subscriptionManage: '구독 관리',
    subscriptionManageDesc: '결제 수단 변경, 인보이스 확인, 구독 취소를 관리합니다.',
    subscriptionCancel: '구독 취소',
    subscriptionCancelConfirm: '정말 구독을 취소하시겠습니까? 현재 결제 기간이 끝날 때까지 이용 가능합니다.',
    subscriptionCancelSuccess: '구독이 취소되었습니다.',
    subscriptionCanceling: '취소 중...',
    subscriptionCityLabel: '도시',
    subscriptionCityPlaceholder: '서울, 부산, 뉴욕...',
    subscriptionCityRequired: '도시를 입력해주세요',
    subscriptionFormTitle: '구독 정보 입력',
    subscriptionFormDesc: '매일 아침 6시, 날씨에 맞는 스타일을 추천해드립니다',
    subscriptionFormStart: '무료 체험 시작하기',
    subscriptionLoginRequired: '구독하려면 먼저 로그인해주세요',
    dashboardTitle: '오늘의 스타일',
    dashboardSubtitle: '날씨 기반 맞춤 스타일링',
    dashboardLoading: '오늘의 스타일을 준비하고 있어요...',
    dashboardError: '추천을 불러오지 못했습니다',
    dashboardRetry: '다시 시도',
    dashboardToday: '오늘',
    dashboardFeelsLike: '체감',
    dashboardHumidity: '습도',
    dashboardWind: '바람',
    dashboardStyleTip: '오늘의 스타일 추천',
    dashboardBack: '← 홈으로',
    dashboardNewDay: '매일 아침 새로운 스타일이 업데이트됩니다',
    dashboardProfileTitle: '프로필 완성하기',
    dashboardProfileDesc: '프로필을 완성하면 매일 맞춤 의상 이미지를 받을 수 있어요',
    dashboardProfileHeight: '키 (cm)',
    dashboardProfileWeight: '몸무게 (kg)',
    dashboardProfileGender: '성별',
    dashboardProfilePhoto: '전신 사진 업로드',
    dashboardProfileSave: '프로필 저장',
    dashboardProfileSaving: '저장 중...',
    dashboardProfileComplete: '프로필 완성',
    dashboardProfileIncomplete: '프로필 미완성',
    dashboardProfileEdit: '프로필 수정',
    dashboardProfilePhotoChange: '사진 변경',
    subscriptionCanceledNotice: '구독이 취소되었습니다. 현재 결제 기간이 끝날 때까지 매일 스타일 추천을 받으실 수 있습니다.',
    dashboardGalleryTitle: '오늘의 스타일 룩',
    dashboardGalleryEmpty: '내일 아침 6시에 맞춤 스타일이 도착합니다',
    dashboardGalleryTodaysPick: '오늘의 추천',
    dashboardGalleryCasual: '캐주얼',
    dashboardGalleryEvening: '이브닝',
    previewFreeLabel: 'Best Match (무료 미리보기)',
    previewBlurredLabel: '잠금 해제하여 모두 보기',
    previewUnlockAll: '전체 잠금 해제',
    favoriteSaved: '즐겨찾기에 저장됨',
    favoriteRemoved: '즐겨찾기에서 제거됨',
    favoritesTitle: '내 즐겨찾기',
    favoritesEmpty: '아직 즐겨찾기가 없습니다',
    favoritesGallery: '즐겨찾기',
    saveImage: '이미지 저장',
    galleryBefore: 'Before',
    galleryAfter: 'After',
    referralTitle: '친구 초대하고 무료 스타일 받기',
    referralDesc: '친구가 결제하면 무료 스타일링 크레딧을 받아요',
    referralInvited: '명 초대 완료',
    referralCredits: '개 크레딧 보유',
    referralCopyLink: '초대 링크 복사',
    referralInlineText: '친구 초대하고 무료 스타일 받기',
    referralCreditAvailable: '리퍼럴 크레딧 사용 가능',
    chatTitle: 'Style Advisor',
    chatPlaceholder: '스타일 질문을 입력하세요...',
    chatSend: '전송',
    chatBuyTokens: '$0.99로 10회 충전',
    chatTokensLeft: '회 남음',
    chatWelcome: '안녕하세요! 저는 Tom Ford, Grace Coddington 등 세계 최고 스타일리스트들의 전문성을 결합한 AI 스타일 어드바이저입니다. 무엇이든 물어보세요.',
    chatExample1: '오늘 뭐 입지?',
    chatExample2: '이 옷에 어울리는 신발은?',
    chatExample3: '직장 면접 코디 추천해줘',
    chatNoTokens: '메시지 토큰이 없습니다. 충전 후 이용해주세요.',
    chatCardTitle: 'Style Advisor',
    chatCardDesc: 'AI 스타일리스트와 실시간 대화로 맞춤 패션 조언을 받아보세요',
    beforeAfterTitle: 'Before & After',
    beforeLabel: 'BEFORE',
    afterLabel: 'AFTER',
    showcaseTitle: 'AI가 만드는 놀라운 변신',
    showcaseDesc: '사진 한 장으로 나에게 어울리는 스타일을 발견하세요',
    galleryTitle: '실제 변신 결과',
    gallerySubtitle: '사진 한 장으로 이렇게 달라집니다',
    galleryBadgeOutfit: '아웃핏',
    galleryBadgeDaily: '데일리',
    galleryCta: '나도 변신하기',
    galleryResultTime: '30초 만에 결과 확인',
    trustTitle: '왜 고객들이 선택할까요?',
    trustRating: '3회 무료',
    trustRatingCount: '카드 없이 시작',
    trustSpeed: '30초',
    trustSpeedDesc: 'AI 결과 생성',
    trustRefund: '100%',
    trustRefundDesc: '환불 보장',
    trustAI: 'GPT + Gemini',
    trustAIDesc: '듀얼 AI 엔진',
    trustGlobal: '5개 언어',
    trustGlobalDesc: '글로벌 서비스',
    metaTitle: 'PERSONAL STYLIST | 런웨이 패션 스타일링',
    metaDescription: '사진 한 장으로 나만의 스타일을 찾으세요. 첫 방문 무료! 럭셔리 브랜드 영감 패션 코디 3종 추천.',
    timerTitle: '첫 방문 특별 할인',
    timerDesc: '후 종료',
    unlockAllStyles: '모든 스타일 잠금 해제',
    blurredRemaining: '개 스타일 더 보기',
    footerLegal: '법적 고지',
    footerTerms: '이용약관',
    footerPrivacy: '개인정보처리방침',
    footerRefund: '환불 정책',
    footerCopyright: '© 2026 PERSONAL STYLIST. ALL RIGHTS RESERVED.',
    badgeRunway: '런웨이 영감',
    badgePersonalized: '맞춤형',
    badgeWeather: '날씨 연동',
    situationTitle: '첫인상이 달라지는 순간',
    situation1: '중요한 면접을 앞두고 있나요?',
    situation2: '설레는 데이트, 뭘 입어야 할지 모르겠나요?',
    situation3: '새로운 인연 앞에서 자신감이 필요한가요?',
    situation4: '매일 같은 옷, 변화가 필요한 순간인가요?',
    situationCta: '지금 나만의 스타일 찾기',
    shareCardTitle: '나만의 스타일 DNA',
    shareCardCta: '나의 스타일 발견하기',
    shareToInstagram: 'Instagram 공유용 이미지 저장',
    abUrgencyText: '지금만 이 가격',
    styleDnaTitle: '나의 스타일 DNA',
    styleDnaSeason: '퍼스널 컬러 시즌',
    styleDnaSeasons: { spring: '봄 웜톤', summer: '여름 쿨톤', autumn: '가을 웜톤', winter: '겨울 쿨톤' },
    styleDnaBodyType: '체형',
    styleDnaColors: '추천 컬러 팔레트',
    styleDnaSilhouettes: '추천 실루엣',
    styleDnaShare: '스타일 카드 저장',
    heroHeadline: '내 얼굴에 맞는 스타일, AI가 찾아줍니다',
    heroSubCta: '카드 없이 시작 · 3회 무료',
  },
  en: {
    title: 'PERSONAL STYLIST',
    subtitle: 'Your Personal Style Assistant',
    heroTitle1: 'Your Personal',
    heroTitle2: 'Stylist',
    heroDesc: 'Upload one photo. Get personalized fashion styling in 30 seconds. AI analyzes your face shape, body type, and personal color.',
    startBtn: 'Start Transformation',
    learnMore: 'Learn More',
    featuredIn: 'Featured in',
    pathTitle: 'Choose Your Transformation Path',
    module2Title: 'Full Style Consultation',
    module2Desc: 'Fashion looks matched to your face & complexion',
    module2Features: ['Personal color & body analysis', '3 skin tone-matched outfits', 'Expert style report'],
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
    photoHint: '⚠️ Full body photo with only YOU recommended (no other people)',
    height: 'Height',
    heightFeet: 'ft',
    heightInches: 'in',
    weight: 'Weight',
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
    errorApologyRefund: 'We sincerely apologize. A temporary error occurred during style analysis. Your payment will be automatically refunded. We are sorry for the inconvenience.',
    retry: 'Try Again',
    styleGallery: 'Style Recommendations',
    styleGalleryDesc: 'Your stylist suggests personalized styles for different occasions',
    generatingStyles: 'Generating style images...',
    demoMode: 'Demo mode - Real images available after API setup',
    backToHome: 'Back to Home',
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
    step1Desc: 'Choose your style service',
    step2Title: 'Select Occasion & Vibe',
    step2Desc: 'Pick your occasion like date, interview, party and desired mood',
    step3Title: 'Style Analysis',
    step3Desc: 'Your stylist analyzes the best styles based on your selections',
    step4Title: 'Personalized Recommendations',
    step4Desc: 'Get your customized fashion outfits',
    getStarted: 'Get Started',
    purchaseRequired: 'Premium Styling Service',
    purchaseBtn: 'Preview & Start Analysis',
    processingPayment: 'Processing payment...',
    price: '$4.99',
    fashionTransform: 'Fashion Transform',
    fashionTransformDesc: 'Try different fashion styles on your photo',
    generateFashion: 'Generate Fashion Styles',
    generatingFashion: 'Generating fashion styles...',
    photoRequired: 'Please upload a photo',
    serviceIntroTitle: 'How It Works',
    serviceStep1: 'Upload a Selfie',
    serviceStep1Desc: 'One front-facing photo is all you need',
    serviceStep2: 'Choose Your Style',
    serviceStep2Desc: 'Select fashion transformation',
    serviceStep3: 'See Results',
    serviceStep3Desc: 'Preview styles on your actual face instantly',
    // Style References
    styleReferenceTitle: 'Premium Style References',
    styleReferenceDesc: 'We recommend the best styles inspired by world-renowned designer brands and celebrity looks',
    fashionReferenceTitle: '👗 Fashion References',
    fashionReferenceDesc: 'Inspired by luxury designer brands',
    fashionBrands: ['Hermès', 'Loro Piana', 'The Row', 'Bottega Veneta', 'Brunello Cucinelli', 'Auralee', 'Lemaire', 'Max Mara', 'Louis Vuitton'],
    styleLabels: {
      'best-match': 'Best Match',
      'interview': 'Interview',
      'date': 'Date Night',
      'luxury': 'Luxury',
      'casual': 'Casual',
      'daily': 'Daily'
    },
    downloadResult: 'View Style Report',
    shareResult: 'Share',
    linkCopied: 'Link copied!',
    emailReport: 'Email Report',
    emailModalTitle: 'Send Report to Email',
    emailPlaceholder: 'Enter your email address',
    emailSend: 'Send',
    emailSending: 'Sending...',
    emailSuccess: 'Email sent successfully!',
    emailError: 'Failed to send email. Please try again.',
    // Preview page translations
    previewTitle: 'Analysis Complete!',
    previewSubtitle: 'We found styles just for you',
    previewAnalysisComplete: 'Style analysis is complete',
    previewFaceShape: 'Face Shape Analysis',
    previewFashionFound: '3 custom fashion looks ready!',
    previewCuriosity1: 'Surprising results! 👀',
    previewCuriosity2: 'Curious about your #1 style?',
    previewProgress: '87% complete - just unlock to finish!',
    previewUnlock: 'Unlock Results',
    previewCompare1: 'Professional Stylist',
    previewCompare2: 'Personal Stylist',
    previewCoffeeNote: '☕ Prevent salon disasters for the price of a coffee!',
    // Share modal
    shareModalTitle: 'Share Your Results',
    shareVia: 'Share via',
    downloadForSocial: 'Save Image (for Instagram/TikTok)',
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
    forgotPassword: 'Forgot your password?',
    authError: 'Authentication error occurred',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    loginSuccess: 'Successfully logged in',
    signupSuccess: 'Verification email sent. Please check your inbox and click the confirmation link.',
    checkSpamFolder: 'If you don\'t see the email, check your spam folder.',
    goToLogin: 'Go to Login',
    continueAsGuest: 'Continue as Guest',
    orContinueWith: 'or',
    googleLogin: 'Continue with Google',
    myProfile: 'My Profile',
    analysisHistory: 'Analysis History',
    noHistory: 'No saved analysis results',
    historySaved: 'Analysis saved to your history',
    viewResult: 'View Result',
    fullAnalysis: 'Full Style Analysis',
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
    cancel: 'Cancel',
    freeTrialBadge: 'FREE',
    freeTrialCta: 'Try Free Style Analysis',
    freeTrialDesc: 'Special offer - 3 free style analyses',
    freeTrialRemaining: '{n} free left',
    upsellTitle: 'Love your results?',
    upsellSubtitle: 'Discover even more styles',
    upsellFullPackage: 'Full Style Consultation',
    upsellFullDesc: 'Fashion + Body Analysis',
    upsellDismiss: 'Maybe Later',
    shareMyResult: 'Share My Result',
    freeUploadText: 'Upload My Photo (Free!)',
    subscriptionTitle: 'Daily Style',
    subscriptionDesc: 'Runway-inspired outfit picks every morning based on weather & your profile',
    dailyTagline: 'Get your daily style recommendation every morning',
    subscriptionPrice: '$6.99/mo',
    subscriptionTrialDays: '7-day free trial',
    subscriptionCta: 'Start Free Trial',
    subscriptionActive: 'Subscription Active',
    subscriptionManage: 'Manage Subscription',
    subscriptionManageDesc: 'Manage billing, payment method, and cancellation.',
    subscriptionCancel: 'Cancel Subscription',
    subscriptionCancelConfirm: 'Are you sure you want to cancel? You can still use the service until the end of your current billing period.',
    subscriptionCancelSuccess: 'Your subscription has been canceled.',
    subscriptionCanceling: 'Canceling...',
    subscriptionCityLabel: 'City',
    subscriptionCityPlaceholder: 'New York, London, Seoul...',
    subscriptionCityRequired: 'Please enter your city',
    subscriptionFormTitle: 'Set Up Your Daily Style',
    subscriptionFormDesc: 'Every morning at 6AM, get weather-based outfit picks',
    subscriptionFormStart: 'Start Free Trial',
    subscriptionLoginRequired: 'Please log in to subscribe',
    dashboardTitle: "Today's Style",
    dashboardSubtitle: "Runway-inspired outfit for today's weather",
    dashboardLoading: 'Preparing your style...',
    dashboardError: 'Failed to load recommendation',
    dashboardRetry: 'Try Again',
    dashboardToday: 'Today',
    dashboardFeelsLike: 'Feels',
    dashboardHumidity: 'Humidity',
    dashboardWind: 'Wind',
    dashboardStyleTip: "Today's Style Pick",
    dashboardBack: '← Home',
    dashboardNewDay: 'A new style is curated for you every morning',
    dashboardProfileTitle: 'Complete Your Profile',
    dashboardProfileDesc: 'Complete your profile to receive daily outfit images',
    dashboardProfileHeight: 'Height (cm)',
    dashboardProfileWeight: 'Weight (kg)',
    dashboardProfileGender: 'Gender',
    dashboardProfilePhoto: 'Upload Full-Body Photo',
    dashboardProfileSave: 'Save Profile',
    dashboardProfileSaving: 'Saving...',
    dashboardProfileComplete: 'Profile Complete',
    dashboardProfileIncomplete: 'Profile Incomplete',
    dashboardProfileEdit: 'Edit Profile',
    dashboardProfilePhotoChange: 'Change Photo',
    subscriptionCanceledNotice: 'Subscription canceled. Daily style emails continue until the end of your billing period.',
    dashboardGalleryTitle: "Today's Style Looks",
    dashboardGalleryEmpty: 'Your personalized styles arrive tomorrow at 6AM',
    dashboardGalleryTodaysPick: "Today's Pick",
    dashboardGalleryCasual: 'Casual',
    dashboardGalleryEvening: 'Evening',
    previewFreeLabel: 'Best Match (Free Preview)',
    previewBlurredLabel: 'Unlock to see all',
    previewUnlockAll: 'Unlock All Styles',
    favoriteSaved: 'Saved to favorites',
    favoriteRemoved: 'Removed from favorites',
    favoritesTitle: 'My Favorites',
    favoritesEmpty: 'No favorites yet',
    favoritesGallery: 'Favorites',
    saveImage: 'Save Image',
    galleryBefore: 'Before',
    galleryAfter: 'After',
    referralTitle: 'Invite Friends, Get Free Styles',
    referralDesc: 'Earn a free styling credit when your friend makes a purchase',
    referralInvited: ' friends invited',
    referralCredits: ' credits available',
    referralCopyLink: 'Copy Invite Link',
    referralInlineText: 'Invite friends & get free styles',
    referralCreditAvailable: 'Referral credit available',
    chatTitle: 'Style Advisor',
    chatPlaceholder: 'Ask your style question...',
    chatSend: 'Send',
    chatBuyTokens: 'Get 10 messages for $0.99',
    chatTokensLeft: ' left',
    chatWelcome: 'Hello! I\'m an AI style advisor combining the expertise of Tom Ford, Grace Coddington, and the world\'s top stylists. Ask me anything about fashion, outfits, or styling.',
    chatExample1: 'What should I wear today?',
    chatExample2: 'What shoes go with this outfit?',
    chatExample3: 'Style me for a job interview',
    chatNoTokens: 'No messages remaining. Purchase tokens to continue.',
    chatCardTitle: 'Style Advisor',
    chatCardDesc: 'Chat with an AI stylist for personalized fashion advice in real time',
    beforeAfterTitle: 'Before & After',
    beforeLabel: 'BEFORE',
    afterLabel: 'AFTER',
    showcaseTitle: 'Amazing AI Transformations',
    showcaseDesc: 'Discover your perfect style with just one photo',
    galleryTitle: 'Real Transformation Results',
    gallerySubtitle: 'See how one photo changes everything',
    galleryBadgeOutfit: 'Outfit',
    galleryBadgeDaily: 'Daily',
    galleryCta: 'Try My Transformation',
    galleryResultTime: 'Results in 30 seconds',
    trustTitle: 'Why Customers Choose Us',
    trustRating: '3x Free',
    trustRatingCount: 'No Card Required',
    trustSpeed: '30s',
    trustSpeedDesc: 'AI Results',
    trustRefund: '100%',
    trustRefundDesc: 'Refund Guarantee',
    trustAI: 'GPT + Gemini',
    trustAIDesc: 'Dual AI Engine',
    trustGlobal: '5 Languages',
    trustGlobalDesc: 'Global Service',
    metaTitle: 'AI Personal Stylist | Fashion Recommendations',
    metaDescription: 'Find your perfect style with one photo. Free first try! Luxury fashion outfit recommendations.',
    timerTitle: 'First Visit Special',
    timerDesc: ' left',
    unlockAllStyles: 'Unlock All Styles',
    blurredRemaining: ' more styles',
    footerLegal: 'LEGAL',
    footerTerms: 'Terms of Service',
    footerPrivacy: 'Privacy Policy',
    footerRefund: 'Refund Policy',
    footerCopyright: '© 2026 PERSONAL STYLIST. ALL RIGHTS RESERVED.',
    badgeRunway: 'RUNWAY-INSPIRED',
    badgePersonalized: 'PERSONALIZED',
    badgeWeather: 'WEATHER-AWARE',
    situationTitle: 'The moment your first impression changes',
    situation1: 'Got a big interview coming up?',
    situation2: 'Exciting date night, but nothing to wear?',
    situation3: 'Need confidence before meeting someone new?',
    situation4: 'Same outfits every day — ready for a change?',
    situationCta: 'Find My Style Now',
    shareCardTitle: 'My Style DNA',
    shareCardCta: 'Discover Your Style',
    shareToInstagram: 'Save Image for Instagram',
    abUrgencyText: 'Limited time offer',
    styleDnaTitle: 'Your Style DNA',
    styleDnaSeason: 'Personal Color Season',
    styleDnaSeasons: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
    styleDnaBodyType: 'Body Type',
    styleDnaColors: 'Recommended Colors',
    styleDnaSilhouettes: 'Best Silhouettes',
    styleDnaShare: 'Save Style Card',
    heroHeadline: 'See Your Best Look — AI-Powered Personal Styling',
    heroSubCta: 'No card required · 3x free',
  }
}

// REMOVED: ja, zh, es translations (pivot to ko/en only)
// languageNames reduced to ko/en
const languageNames: Record<Language, string> = {
  ko: '한국어',
  en: 'EN'
}

/* DELETED ja/zh/es translation blocks below - search git history for recovery
  ja: {
    title: 'PERSONAL STYLIST',
    subtitle: 'あなただけのスタイリスト',
    heroTitle1: 'Your Personal',
    heroTitle2: 'Stylist',
    heroDesc: '写真1枚で30秒。AIが顔の形、体型、パーソナルカラーを分析し、あなただけのファッションスタイリング。',
    startBtn: '変身を開始',
    learnMore: '詳細を見る',
    featuredIn: '掲載メディア',
    pathTitle: '変身パスを選択',
    module2Title: 'フルスタイルコンサル',
    module2Desc: '顔型・肌色に合ったファッション変身',
    module2Features: ['パーソナルカラー・体型分析', '肌色カスタムファッション3種', '専門スタイルレポート'],
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
    photoHint: '⚠️ 1人の全身写真を推奨（他の人が写っていない写真）',
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
    errorApologyRefund: '大変申し訳ございません。スタイル分析中に一時的なエラーが発生しました。お支払い金額は自動的に返金処理されます。ご不便をおかけし誠に申し訳ございません。',
    retry: '再試行',
    styleGallery: 'スタイル提案',
    styleGalleryDesc: 'シーン別のおすすめスタイルをスタイリストがご提案します',
    generatingStyles: 'スタイル画像を生成中...',
    demoMode: 'デモモード - 実際の画像はAPI設定後に表示されます',
    backToHome: 'ホームに戻る',
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
    step1Desc: 'スタイルサービスを選択',
    step2Title: 'シーン＆雰囲気選択',
    step2Desc: 'デート、面接、パーティーなどのシーンと雰囲気を選択',
    step3Title: 'スタイル分析',
    step3Desc: 'スタイリストが最適なスタイルを分析します',
    step4Title: 'パーソナライズ提案',
    step4Desc: 'カスタマイズされたファッションを確認',
    getStarted: '始める',
    purchaseRequired: 'プレミアムスタイリングサービス',
    purchaseBtn: 'プレビュー＆分析開始',
    processingPayment: '支払い処理中...',
    price: '$4.99',
    fashionTransform: 'ファッション変換',
    fashionTransformDesc: '写真に様々なファッションスタイルを適用',
    generateFashion: 'ファッションスタイルを生成',
    generatingFashion: 'ファッションスタイル生成中...',
    photoRequired: '写真をアップロードしてください',
    serviceIntroTitle: 'ご利用方法',
    serviceStep1: 'セルフィーをアップロード',
    serviceStep1Desc: '正面写真1枚でOK',
    serviceStep2: 'スタイルを選択',
    serviceStep2Desc: 'ファッション変換を選択',
    serviceStep3: '結果を確認',
    serviceStep3Desc: 'あなたの顔のまま様々なスタイルをプレビュー',
    // Style References
    styleReferenceTitle: 'プレミアムスタイルリファレンス',
    styleReferenceDesc: '世界的なデザイナーブランドとセレブリティスタイルを参考に最高のスタイルをご提案',
    fashionReferenceTitle: '👗 ファッションリファレンス',
    fashionReferenceDesc: 'ラグジュアリーデザイナーブランドを参考',
    fashionBrands: ['Hermès', 'Loro Piana', 'The Row', 'Bottega Veneta', 'Brunello Cucinelli', 'Auralee', 'Lemaire', 'Max Mara', 'Louis Vuitton'],
    styleLabels: {
      'best-match': 'ベストマッチ',
      'interview': 'インタビュー',
      'date': 'デートルック',
      'luxury': 'ラグジュアリー',
      'casual': 'カジュアル',
      'daily': 'デイリー'
    },
    downloadResult: 'スタイルレポートを見る',
    shareResult: 'シェア',
    linkCopied: 'リンクがコピーされました！',
    emailReport: 'メールで受け取る',
    emailModalTitle: 'レポートをメールで受け取る',
    emailPlaceholder: 'メールアドレスを入力',
    emailSend: '送信',
    emailSending: '送信中...',
    emailSuccess: 'メールを送信しました！',
    emailError: 'メール送信に失敗しました。再度お試しください。',
    // Preview page translations
    previewTitle: '分析完了！',
    previewSubtitle: 'あなただけのスタイルを見つけました',
    previewAnalysisComplete: 'スタイル分析が完了しました',
    previewFaceShape: '顔型分析結果',
    previewFashionFound: 'カスタムファッション3点準備完了！',
    previewCuriosity1: '意外な結果が出ました！👀',
    previewCuriosity2: '1位のスタイルが気になりませんか？',
    previewProgress: '87%完了 - 結果を確認するだけ！',
    previewUnlock: '結果を確認',
    previewCompare1: 'プロスタイリスト相談',
    previewCompare2: 'Personal Stylist',
    previewCoffeeNote: '☕ コーヒー1杯の価格で美容室の失敗を防止！',
    // Share modal
    shareModalTitle: '結果をシェア',
    shareVia: 'シェアする',
    downloadForSocial: '画像を保存 (Instagram/TikTok用)',
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
    forgotPassword: 'パスワードをお忘れですか？',
    authError: '認証エラーが発生しました',
    passwordMismatch: 'パスワードが一致しません',
    passwordTooShort: 'パスワードは6文字以上必要です',
    loginSuccess: 'ログインしました',
    signupSuccess: '認証メールを送信しました。メールを確認して認証リンクをクリックしてください。',
    checkSpamFolder: 'メールが届かない場合は迷惑メールフォルダをご確認ください。',
    goToLogin: 'ログインへ',
    continueAsGuest: 'ゲストとして続ける',
    orContinueWith: 'または',
    googleLogin: 'Googleで続ける',
    myProfile: 'マイプロフィール',
    analysisHistory: '分析履歴',
    noHistory: '保存された分析結果はありません',
    historySaved: '分析結果が保存されました',
    viewResult: '結果を見る',
    fullAnalysis: 'フルスタイル分析',
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
    cancel: 'キャンセル',
    freeTrialBadge: 'FREE',
    freeTrialCta: '無料スタイル分析を体験',
    freeTrialDesc: '特別特典 - 無料スタイル分析3回',
    freeTrialRemaining: '残り{n}回無料',
    upsellTitle: '結果はいかがでしたか？',
    upsellSubtitle: 'もっと多くのスタイルを発見',
    upsellFullPackage: 'フルスタイルコンサル',
    upsellFullDesc: 'ファッション + 体型分析',
    upsellDismiss: 'また今度',
    shareMyResult: '結果をシェア',
    freeUploadText: '写真をアップロード（無料！）',
    subscriptionTitle: '毎日のスタイル提案',
    subscriptionDesc: '天気・体型・ランウェイトレンドに基づくスタイル提案',
    dailyTagline: '毎朝、今日のおすすめスタイルをお届けします',
    subscriptionPrice: '$6.99/月',
    subscriptionTrialDays: '7日間無料体験',
    subscriptionCta: '無料体験を始める',
    subscriptionActive: 'サブスク有効',
    subscriptionManage: 'サブスク管理',
    subscriptionManageDesc: 'お支払い方法の変更、請求書の確認、解約を管理します。',
    subscriptionCancel: 'サブスク解約',
    subscriptionCancelConfirm: '本当に解約しますか？現在の請求期間の終了まで引き続きご利用いただけます。',
    subscriptionCancelSuccess: 'サブスクリプションが解約されました。',
    subscriptionCanceling: '解約中...',
    subscriptionCityLabel: '都市',
    subscriptionCityPlaceholder: '東京、大阪、ソウル...',
    subscriptionCityRequired: '都市を入力してください',
    subscriptionFormTitle: '毎日スタイル設定',
    subscriptionFormDesc: '毎朝6時に天気に合わせたスタイルをお届け',
    subscriptionFormStart: '無料体験を始める',
    subscriptionLoginRequired: '購読するにはログインしてください',
    dashboardTitle: '今日のスタイル',
    dashboardSubtitle: '天気に基づくスタイリング',
    dashboardLoading: '今日のスタイルを準備中...',
    dashboardError: 'おすすめの読み込みに失敗しました',
    dashboardRetry: 'もう一度',
    dashboardToday: '今日',
    dashboardFeelsLike: '体感',
    dashboardHumidity: '湿度',
    dashboardWind: '風',
    dashboardStyleTip: '今日のスタイル提案',
    dashboardBack: '← ホームへ',
    dashboardNewDay: '毎朝新しいスタイルが届きます',
    dashboardProfileTitle: 'プロフィールを完成',
    dashboardProfileDesc: 'プロフィールを完成させると毎日コーデ画像が届きます',
    dashboardProfileHeight: '身長 (cm)',
    dashboardProfileWeight: '体重 (kg)',
    dashboardProfileGender: '性別',
    dashboardProfilePhoto: '全身写真をアップロード',
    dashboardProfileSave: 'プロフィール保存',
    dashboardProfileSaving: '保存中...',
    dashboardProfileComplete: 'プロフィール完了',
    dashboardProfileIncomplete: 'プロフィール未完了',
    dashboardProfileEdit: 'プロフィール編集',
    dashboardProfilePhotoChange: '写真変更',
    subscriptionCanceledNotice: 'サブスクリプションがキャンセルされました。現在の請求期間が終了するまで毎日のスタイル提案を受け取れます。',
    dashboardGalleryTitle: '今日のスタイルルック',
    dashboardGalleryEmpty: '明日朝6時にパーソナルスタイルが届きます',
    dashboardGalleryTodaysPick: '今日のおすすめ',
    dashboardGalleryCasual: 'カジュアル',
    dashboardGalleryEvening: 'イブニング',
    previewFreeLabel: 'ベストマッチ（無料プレビュー）',
    previewBlurredLabel: 'ロック解除してすべて見る',
    previewUnlockAll: '全スタイルをロック解除',
    favoriteSaved: 'お気に入りに保存しました',
    favoriteRemoved: 'お気に入りから削除しました',
    favoritesTitle: 'お気に入り',
    favoritesEmpty: 'まだお気に入りがありません',
    favoritesGallery: 'お気に入り',
    saveImage: '画像を保存',
    galleryBefore: 'Before',
    galleryAfter: 'After',
    referralTitle: '友達を招待して無料スタイルをゲット',
    referralDesc: '友達が購入すると無料スタイリングクレジットがもらえます',
    referralInvited: '人招待済み',
    referralCredits: 'クレジット利用可能',
    referralCopyLink: '招待リンクをコピー',
    referralInlineText: '友達を招待して無料スタイルをゲット',
    referralCreditAvailable: 'リファラルクレジット利用可能',
    chatTitle: 'Style Advisor',
    chatPlaceholder: 'スタイルの質問を入力...',
    chatSend: '送信',
    chatBuyTokens: '$0.99で10回チャージ',
    chatTokensLeft: '回残り',
    chatWelcome: 'こんにちは！トム・フォード、グレース・コディントンなど世界最高のスタイリストの専門知識を融合したAIスタイルアドバイザーです。何でもお気軽にどうぞ。',
    chatExample1: '今日何を着ればいい？',
    chatExample2: 'この服に合う靴は？',
    chatExample3: '面接のコーデを提案して',
    chatNoTokens: 'メッセージトークンがありません。チャージしてください。',
    chatCardTitle: 'Style Advisor',
    chatCardDesc: 'AIスタイリストとリアルタイムチャットでパーソナルファッションアドバイス',
    beforeAfterTitle: 'ビフォー＆アフター',
    beforeLabel: 'BEFORE',
    afterLabel: 'AFTER',
    showcaseTitle: 'AIが作る驚きの変身',
    showcaseDesc: '写真1枚であなたに似合うスタイルを発見',
    galleryTitle: '実際の変身結果',
    gallerySubtitle: '写真1枚でこんなに変わります',
    galleryBadgeOutfit: 'コーデ',
    galleryBadgeDaily: 'デイリー',
    galleryCta: '私も変身する',
    galleryResultTime: '30秒で結果確認',
    trustTitle: 'お客様が選ぶ理由',
    trustRating: '3回無料',
    trustRatingCount: 'カード不要',
    trustSpeed: '30秒',
    trustSpeedDesc: 'AI結果生成',
    trustRefund: '100%',
    trustRefundDesc: '返金保証',
    trustAI: 'GPT + Gemini',
    trustAIDesc: 'デュアルAIエンジン',
    trustGlobal: '5言語',
    trustGlobalDesc: 'グローバルサービス',
    metaTitle: 'AIパーソナルスタイリスト | ファッション提案',
    metaDescription: '写真1枚であなたに似合うスタイルを発見。初回無料！ファッションコーディネート提案。',
    timerTitle: '初回限定割引',
    timerDesc: 'で終了',
    unlockAllStyles: '全スタイルをロック解除',
    blurredRemaining: 'つのスタイルをもっと見る',
    footerLegal: '法的情報',
    footerTerms: '利用規約',
    footerPrivacy: 'プライバシーポリシー',
    footerRefund: '返金ポリシー',
    footerCopyright: '© 2026 PERSONAL STYLIST. ALL RIGHTS RESERVED.',
    badgeRunway: 'ランウェイ発',
    badgePersonalized: 'パーソナライズ',
    badgeWeather: '天気連動',
    situationTitle: '第一印象が変わる瞬間',
    situation1: '大事な面接を控えていますか？',
    situation2: 'ドキドキのデート、何を着ればいい？',
    situation3: '新しい出会いの前に自信が欲しい？',
    situation4: '毎日同じ服、そろそろ変化が必要？',
    situationCta: '自分だけのスタイルを見つける',
    shareCardTitle: '私のスタイルDNA',
    shareCardCta: 'あなたのスタイルを発見',
    shareToInstagram: 'Instagram共有用画像を保存',
    abUrgencyText: '今だけこの価格',
    styleDnaTitle: 'あなたのスタイルDNA',
    styleDnaSeason: 'パーソナルカラーシーズン',
    styleDnaSeasons: { spring: 'スプリング', summer: 'サマー', autumn: 'オータム', winter: 'ウィンター' },
    styleDnaBodyType: '体型',
    styleDnaColors: 'おすすめカラー',
    styleDnaSilhouettes: 'おすすめシルエット',
    styleDnaShare: 'スタイルカードを保存',
    heroHeadline: 'あなたに似合うスタイル、AIが見つけます',
    heroSubCta: 'カード不要 · 3回無料',
  },
  zh: {
    title: 'PERSONAL STYLIST',
    subtitle: '您的私人造型师',
    heroTitle1: 'Your Personal',
    heroTitle2: 'Stylist',
    heroDesc: '一张照片，30秒出结果。AI分析你的脸型、体型和个人色彩，打造专属穿搭方案。',
    startBtn: '开始蜕变',
    learnMore: '了解更多',
    featuredIn: '媒体报道',
    pathTitle: '选择您的蜕变之路',
    module2Title: '全套风格咨询',
    module2Desc: '根据脸型·肤色定制时尚穿搭',
    module2Features: ['个人色彩·体型分析', '3种肤色定制穿搭', '专业风格报告'],
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
    photoHint: '⚠️ 建议上传单人全身照（照片中没有其他人）',
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
    errorApologyRefund: '非常抱歉，样式分析过程中出现了暂时性错误。您的付款将自动退款处理。给您带来不便，我们深表歉意。',
    retry: '重试',
    styleGallery: '风格推荐',
    styleGalleryDesc: '造型师为您推荐不同场合的穿搭风格',
    generatingStyles: '正在生成风格图片...',
    demoMode: '演示模式 - 设置API后显示真实图片',
    backToHome: '返回首页',
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
    step1Desc: '选择您的造型服务',
    step2Title: '选择场合和氛围',
    step2Desc: '选择约会、面试、派对等场合和想要的氛围',
    step3Title: '风格分析',
    step3Desc: '造型师根据您的选择分析最佳风格',
    step4Title: '个性化推荐',
    step4Desc: '查看定制的时尚搭配',
    getStarted: '开始',
    purchaseRequired: '高级造型服务',
    purchaseBtn: '预览并开始分析',
    processingPayment: '支付处理中...',
    price: '$4.99',
    fashionTransform: '时尚变换',
    fashionTransformDesc: '在您的照片上尝试不同时尚风格',
    generateFashion: '生成时尚风格',
    generatingFashion: '正在生成时尚风格...',
    photoRequired: '请上传照片',
    serviceIntroTitle: '使用方法',
    serviceStep1: '上传自拍',
    serviceStep1Desc: '一张正面照片就够了',
    serviceStep2: '选择风格',
    serviceStep2Desc: '选择时尚变换',
    serviceStep3: '查看结果',
    serviceStep3Desc: '保留您的面容，即时预览各种风格',
    // Style References
    styleReferenceTitle: '高端风格参考',
    styleReferenceDesc: '参考世界顶级设计师品牌和明星造型，为您推荐最佳风格',
    fashionReferenceTitle: '👗 时尚参考',
    fashionReferenceDesc: '参考奢侈品牌设计风格',
    fashionBrands: ['Hermès', 'Loro Piana', 'The Row', 'Bottega Veneta', 'Brunello Cucinelli', 'Auralee', 'Lemaire', 'Max Mara', 'Louis Vuitton'],
    styleLabels: {
      'best-match': '最佳搭配',
      'interview': '面试装',
      'date': '约会装',
      'luxury': '奢华',
      'casual': '休闲',
      'daily': '日常'
    },
    downloadResult: '查看风格报告',
    shareResult: '分享',
    linkCopied: '链接已复制！',
    emailReport: '发送到邮箱',
    emailModalTitle: '将报告发送到邮箱',
    emailPlaceholder: '请输入邮箱地址',
    emailSend: '发送',
    emailSending: '发送中...',
    emailSuccess: '邮件已发送！',
    emailError: '邮件发送失败，请重试。',
    // Preview page translations
    previewTitle: '分析完成！',
    previewSubtitle: '我们为您找到了专属风格',
    previewAnalysisComplete: '风格分析已完成',
    previewFaceShape: '脸型分析结果',
    previewFashionFound: '3套定制时尚搭配已就绪！',
    previewCuriosity1: '出乎意料的结果！👀',
    previewCuriosity2: '想知道您的第1名风格吗？',
    previewProgress: '87%完成 - 只需解锁查看结果！',
    previewUnlock: '查看结果',
    previewCompare1: '专业造型师咨询',
    previewCompare2: 'Personal Stylist',
    previewCoffeeNote: '☕ 一杯咖啡的价格，避免美发失败！',
    // Share modal
    shareModalTitle: '分享结果',
    shareVia: '分享到',
    downloadForSocial: '保存图片 (用于Instagram/TikTok)',
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
    forgotPassword: '忘记密码？',
    authError: '认证错误',
    passwordMismatch: '密码不匹配',
    passwordTooShort: '密码至少需要6个字符',
    loginSuccess: '登录成功',
    signupSuccess: '验证邮件已发送。请检查您的收件箱并点击确认链接。',
    checkSpamFolder: '如果没有收到邮件，请检查垃圾邮件文件夹。',
    goToLogin: '去登录',
    continueAsGuest: '以游客身份继续',
    orContinueWith: '或',
    googleLogin: '使用Google继续',
    myProfile: '我的资料',
    analysisHistory: '分析历史',
    noHistory: '暂无保存的分析结果',
    historySaved: '分析结果已保存',
    viewResult: '查看结果',
    fullAnalysis: '全面风格分析',
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
    cancel: '取消',
    freeTrialBadge: 'FREE',
    freeTrialCta: '免费体验风格分析',
    freeTrialDesc: '特别优惠 - 免费3次风格分析',
    freeTrialRemaining: '剩余{n}次免费',
    upsellTitle: '对结果满意吗？',
    upsellSubtitle: '发现更多风格',
    upsellFullPackage: '全套风格咨询',
    upsellFullDesc: '时尚 + 体型分析',
    upsellDismiss: '以后再说',
    shareMyResult: '分享我的结果',
    freeUploadText: '上传我的照片（免费！）',
    subscriptionTitle: '每日穿搭推荐',
    subscriptionDesc: '基于天气·体型·秀场趋势的每日穿搭推荐',
    dailyTagline: '每天早晨，接收今日推荐穿搭',
    subscriptionPrice: '$6.99/月',
    subscriptionTrialDays: '7天免费试用',
    subscriptionCta: '开始免费试用',
    subscriptionActive: '订阅已激活',
    subscriptionManage: '管理订阅',
    subscriptionManageDesc: '管理付款方式、查看发票和取消订阅。',
    subscriptionCancel: '取消订阅',
    subscriptionCancelConfirm: '确定要取消订阅吗？您可以继续使用到当前计费周期结束。',
    subscriptionCancelSuccess: '订阅已取消。',
    subscriptionCanceling: '取消中...',
    subscriptionCityLabel: '城市',
    subscriptionCityPlaceholder: '北京、上海、首尔...',
    subscriptionCityRequired: '请输入您的城市',
    subscriptionFormTitle: '设置每日穿搭',
    subscriptionFormDesc: '每天早上6点，根据天气推荐穿搭',
    subscriptionFormStart: '开始免费试用',
    subscriptionLoginRequired: '请先登录以订阅',
    dashboardTitle: '今日穿搭',
    dashboardSubtitle: '基于天气的穿搭推荐',
    dashboardLoading: '正在准备今日穿搭...',
    dashboardError: '加载推荐失败',
    dashboardRetry: '重试',
    dashboardToday: '今天',
    dashboardFeelsLike: '体感',
    dashboardHumidity: '湿度',
    dashboardWind: '风速',
    dashboardStyleTip: '今日穿搭推荐',
    dashboardBack: '← 返回首页',
    dashboardNewDay: '每天早上为你更新新的穿搭',
    dashboardProfileTitle: '完善个人资料',
    dashboardProfileDesc: '完善资料后每天可收到穿搭图片',
    dashboardProfileHeight: '身高 (cm)',
    dashboardProfileWeight: '体重 (kg)',
    dashboardProfileGender: '性别',
    dashboardProfilePhoto: '上传全身照',
    dashboardProfileSave: '保存资料',
    dashboardProfileSaving: '保存中...',
    dashboardProfileComplete: '资料已完善',
    dashboardProfileIncomplete: '资料未完善',
    dashboardProfileEdit: '编辑资料',
    dashboardProfilePhotoChange: '更换照片',
    subscriptionCanceledNotice: '订阅已取消。在当前计费周期结束前，您将继续收到每日穿搭推荐。',
    dashboardGalleryTitle: '今日穿搭图',
    dashboardGalleryEmpty: '明天早上6点将收到专属穿搭推荐',
    dashboardGalleryTodaysPick: '今日推荐',
    dashboardGalleryCasual: '休闲',
    dashboardGalleryEvening: '晚间',
    previewFreeLabel: '最佳搭配（免费预览）',
    previewBlurredLabel: '解锁查看全部',
    previewUnlockAll: '解锁全部风格',
    favoriteSaved: '已保存到收藏',
    favoriteRemoved: '已从收藏中移除',
    favoritesTitle: '我的收藏',
    favoritesEmpty: '暂无收藏',
    favoritesGallery: '收藏',
    saveImage: '保存图片',
    galleryBefore: 'Before',
    galleryAfter: 'After',
    referralTitle: '邀请好友，获得免费造型',
    referralDesc: '好友购买后您将获得免费造型积分',
    referralInvited: '位好友已邀请',
    referralCredits: '个积分可用',
    referralCopyLink: '复制邀请链接',
    referralInlineText: '邀请好友获得免费造型',
    referralCreditAvailable: '推荐积分可用',
    chatTitle: 'Style Advisor',
    chatPlaceholder: '输入你的穿搭问题...',
    chatSend: '发送',
    chatBuyTokens: '$0.99充值10次',
    chatTokensLeft: '次剩余',
    chatWelcome: '你好！我是融合了Tom Ford、Grace Coddington等世界顶级造型师专业知识的AI风格顾问。随时提问吧。',
    chatExample1: '今天穿什么好？',
    chatExample2: '这件衣服配什么鞋？',
    chatExample3: '推荐面试穿搭',
    chatNoTokens: '消息次数已用完，请充值后继续。',
    chatCardTitle: 'Style Advisor',
    chatCardDesc: '与AI造型师实时对话，获取个性化时尚建议',
    beforeAfterTitle: '变身前后对比',
    beforeLabel: '变身前',
    afterLabel: '变身后',
    showcaseTitle: 'AI打造惊艳变身',
    showcaseDesc: '一张照片发现最适合你的风格',
    galleryTitle: '真实变身效果',
    gallerySubtitle: '一张照片就能如此不同',
    galleryBadgeOutfit: '穿搭',
    galleryBadgeDaily: '日常',
    galleryCta: '我也要变身',
    galleryResultTime: '30秒出结果',
    trustTitle: '为什么客户选择我们？',
    trustRating: '3次免费',
    trustRatingCount: '无需绑卡',
    trustSpeed: '30秒',
    trustSpeedDesc: 'AI生成结果',
    trustRefund: '100%',
    trustRefundDesc: '退款保障',
    trustAI: 'GPT + Gemini',
    trustAIDesc: '双AI引擎',
    trustGlobal: '5种语言',
    trustGlobalDesc: '全球服务',
    metaTitle: 'AI个人造型师 | 时尚推荐',
    metaDescription: '一张照片发现最适合你的风格。首次免费！奢华时尚穿搭推荐。',
    timerTitle: '首次访问特惠',
    timerDesc: '后结束',
    unlockAllStyles: '解锁全部风格',
    blurredRemaining: '个风格等你解锁',
    footerLegal: '法律信息',
    footerTerms: '服务条款',
    footerPrivacy: '隐私政策',
    footerRefund: '退款政策',
    footerCopyright: '© 2026 PERSONAL STYLIST. ALL RIGHTS RESERVED.',
    badgeRunway: '秀场灵感',
    badgePersonalized: '个性定制',
    badgeWeather: '天气感知',
    situationTitle: '第一印象改变的瞬间',
    situation1: '即将迎来重要的面试？',
    situation2: '心动的约会，却不知道穿什么？',
    situation3: '遇见新朋友前需要自信？',
    situation4: '每天穿一样的衣服，是时候改变了？',
    situationCta: '立即找到我的风格',
    shareCardTitle: '我的风格DNA',
    shareCardCta: '发现你的风格',
    shareToInstagram: '保存Instagram分享图片',
    abUrgencyText: '限时优惠',
    styleDnaTitle: '你的风格DNA',
    styleDnaSeason: '个人色彩季节',
    styleDnaSeasons: { spring: '春季暖色调', summer: '夏季冷色调', autumn: '秋季暖色调', winter: '冬季冷色调' },
    styleDnaBodyType: '体型',
    styleDnaColors: '推荐色彩',
    styleDnaSilhouettes: '推荐轮廓',
    styleDnaShare: '保存风格卡片',
    heroHeadline: 'AI为你找到最适合的风格',
    heroSubCta: '无需绑卡 · 3次免费',
  },
  es: {
    title: 'PERSONAL STYLIST',
    subtitle: 'Tu estilista personal',
    heroTitle1: 'Your Personal',
    heroTitle2: 'Stylist',
    heroDesc: 'Una foto, 30 segundos. La IA analiza tu rostro, cuerpo y colorimetría personal para crear tu estilo ideal de moda.',
    startBtn: 'Iniciar Transformación',
    learnMore: 'Saber Más',
    featuredIn: 'Destacado en',
    pathTitle: 'Elige Tu Camino de Transformación',
    module2Title: 'Consulta de Estilo Completa',
    module2Desc: 'Moda según tu rostro y complexión',
    module2Features: ['Análisis de color y cuerpo', '3 outfits según tu tono', 'Informe de estilo experto'],
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
    photoHint: '⚠️ Se recomienda foto de cuerpo completo solo de ti (sin otras personas)',
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
    errorApologyRefund: 'Lo sentimos mucho. Ocurrió un error temporal durante el análisis de estilo. Su pago será reembolsado automáticamente. Pedimos disculpas por las molestias.',
    retry: 'Reintentar',
    styleGallery: 'Recomendaciones de Estilo',
    styleGalleryDesc: 'Tu estilista sugiere estilos personalizados para diferentes ocasiones',
    generatingStyles: 'Generando imágenes de estilo...',
    demoMode: 'Modo demo - Imágenes reales disponibles después de configurar API',
    backToHome: 'Volver al inicio',
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
    step1Desc: 'Elige tu servicio de estilo',
    step2Title: 'Seleccionar Ocasión y Estilo',
    step2Desc: 'Elige tu ocasión como cita, entrevista, fiesta y el ambiente deseado',
    step3Title: 'Análisis de Estilo',
    step3Desc: 'Tu estilista analiza los mejores estilos según tus selecciones',
    step4Title: 'Recomendaciones Personalizadas',
    step4Desc: 'Obtén tus outfits personalizados',
    getStarted: 'Comenzar',
    purchaseRequired: 'Servicio de Estilismo Premium',
    purchaseBtn: 'Vista Previa e Iniciar Análisis',
    processingPayment: 'Procesando pago...',
    price: '$4.99',
    fashionTransform: 'Transformación de Moda',
    fashionTransformDesc: 'Prueba diferentes estilos de moda en tu foto',
    generateFashion: 'Generar Estilos de Moda',
    generatingFashion: 'Generando estilos de moda...',
    photoRequired: 'Por favor sube una foto',
    serviceIntroTitle: 'Como Funciona',
    serviceStep1: 'Sube un Selfie',
    serviceStep1Desc: 'Solo necesitas una foto frontal',
    serviceStep2: 'Elige tu Estilo',
    serviceStep2Desc: 'Selecciona cambio de moda',
    serviceStep3: 'Ver Resultados',
    serviceStep3Desc: 'Vista previa de estilos en tu rostro al instante',
    // Style References
    styleReferenceTitle: 'Referencias de Estilo Premium',
    styleReferenceDesc: 'Recomendamos los mejores estilos inspirados en marcas de diseñadores de renombre mundial y celebridades',
    fashionReferenceTitle: '👗 Referencias de Moda',
    fashionReferenceDesc: 'Inspirado en marcas de diseñadores de lujo',
    fashionBrands: ['Hermès', 'Loro Piana', 'The Row', 'Bottega Veneta', 'Brunello Cucinelli', 'Auralee', 'Lemaire', 'Max Mara', 'Louis Vuitton'],
    styleLabels: {
      'best-match': 'Mejor Combinación',
      'interview': 'Entrevista',
      'date': 'Cita',
      'luxury': 'Lujo',
      'casual': 'Casual',
      'daily': 'Diario'
    },
    downloadResult: 'Ver Informe de Estilo',
    shareResult: 'Compartir',
    linkCopied: '¡Enlace copiado!',
    emailReport: 'Enviar por Email',
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
    previewFashionFound: '¡3 looks de moda personalizados listos!',
    previewCuriosity1: '¡Resultados sorprendentes! 👀',
    previewCuriosity2: '¿Curioso por tu estilo #1?',
    previewProgress: '87% completo - ¡solo desbloquea para terminar!',
    previewUnlock: 'Desbloquear Resultados',
    previewCompare1: 'Estilista Profesional',
    previewCompare2: 'Personal Stylist',
    previewCoffeeNote: '☕ ¡Evita desastres en el salón por el precio de un café!',
    // Share modal
    shareModalTitle: 'Compartir Resultados',
    shareVia: 'Compartir en',
    downloadForSocial: 'Guardar Imagen (para Instagram/TikTok)',
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
    forgotPassword: '¿Olvidaste tu contraseña?',
    authError: 'Error de autenticación',
    passwordMismatch: 'Las contraseñas no coinciden',
    passwordTooShort: 'La contraseña debe tener al menos 6 caracteres',
    loginSuccess: 'Sesión iniciada correctamente',
    signupSuccess: 'Correo de verificación enviado. Revisa tu bandeja y haz clic en el enlace de confirmación.',
    checkSpamFolder: 'Si no ves el correo, revisa tu carpeta de spam.',
    goToLogin: 'Ir a iniciar sesión',
    continueAsGuest: 'Continuar como Invitado',
    orContinueWith: 'o',
    googleLogin: 'Continuar con Google',
    myProfile: 'Mi Perfil',
    analysisHistory: 'Historial de Análisis',
    noHistory: 'No hay resultados de análisis guardados',
    historySaved: 'Análisis guardado en tu historial',
    viewResult: 'Ver Resultado',
    fullAnalysis: 'Análisis de Estilo Completo',
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
    cancel: 'Cancelar',
    freeTrialBadge: 'FREE',
    freeTrialCta: 'Prueba Análisis de Estilo Gratis',
    freeTrialDesc: 'Oferta especial - 3 análisis de estilo gratis',
    freeTrialRemaining: '{n} gratis restantes',
    upsellTitle: '¿Te gustan los resultados?',
    upsellSubtitle: 'Descubre aún más estilos',
    upsellFullPackage: 'Consulta de Estilo Completa',
    upsellFullDesc: 'Moda + Análisis Corporal',
    upsellDismiss: 'Quizás Después',
    shareMyResult: 'Compartir Mi Resultado',
    freeUploadText: 'Subir Mi Foto (¡Gratis!)',
    subscriptionTitle: 'Estilo Diario',
    subscriptionDesc: 'Outfits inspirados en runway según el clima y tu perfil',
    dailyTagline: 'Recibe tu estilo recomendado cada mañana',
    subscriptionPrice: '$6.99/mes',
    subscriptionTrialDays: '7 días de prueba gratis',
    subscriptionCta: 'Iniciar Prueba Gratis',
    subscriptionActive: 'Suscripción Activa',
    subscriptionManage: 'Gestionar Suscripción',
    subscriptionManageDesc: 'Gestiona el método de pago, facturas y cancelación.',
    subscriptionCancel: 'Cancelar Suscripción',
    subscriptionCancelConfirm: '¿Seguro que quieres cancelar? Puedes seguir usando el servicio hasta el final del período de facturación actual.',
    subscriptionCancelSuccess: 'Tu suscripción ha sido cancelada.',
    subscriptionCanceling: 'Cancelando...',
    subscriptionCityLabel: 'Ciudad',
    subscriptionCityPlaceholder: 'Madrid, Barcelona, México...',
    subscriptionCityRequired: 'Por favor ingresa tu ciudad',
    subscriptionFormTitle: 'Configura Tu Estilo Diario',
    subscriptionFormDesc: 'Cada mañana a las 6AM, outfits según el clima',
    subscriptionFormStart: 'Iniciar Prueba Gratis',
    subscriptionLoginRequired: 'Inicia sesión para suscribirte',
    dashboardTitle: 'Estilo de Hoy',
    dashboardSubtitle: 'Outfit según el clima de hoy',
    dashboardLoading: 'Preparando tu estilo...',
    dashboardError: 'No se pudo cargar la recomendación',
    dashboardRetry: 'Reintentar',
    dashboardToday: 'Hoy',
    dashboardFeelsLike: 'Sensación',
    dashboardHumidity: 'Humedad',
    dashboardWind: 'Viento',
    dashboardStyleTip: 'Estilo del Día',
    dashboardBack: '← Inicio',
    dashboardNewDay: 'Cada mañana un nuevo estilo para ti',
    dashboardProfileTitle: 'Completa Tu Perfil',
    dashboardProfileDesc: 'Completa tu perfil para recibir imágenes de outfits personalizados',
    dashboardProfileHeight: 'Altura (cm)',
    dashboardProfileWeight: 'Peso (kg)',
    dashboardProfileGender: 'Género',
    dashboardProfilePhoto: 'Subir Foto de Cuerpo Completo',
    dashboardProfileSave: 'Guardar Perfil',
    dashboardProfileSaving: 'Guardando...',
    dashboardProfileComplete: 'Perfil Completo',
    dashboardProfileIncomplete: 'Perfil Incompleto',
    dashboardProfileEdit: 'Editar Perfil',
    dashboardProfilePhotoChange: 'Cambiar Foto',
    subscriptionCanceledNotice: 'Suscripción cancelada. Los correos de estilo diario continuarán hasta el final de tu período de facturación.',
    dashboardGalleryTitle: 'Looks de Hoy',
    dashboardGalleryEmpty: 'Tus estilos personalizados llegan mañana a las 6AM',
    dashboardGalleryTodaysPick: 'Elección del Día',
    dashboardGalleryCasual: 'Casual',
    dashboardGalleryEvening: 'Noche',
    previewFreeLabel: 'Mejor Combinación (Vista Previa Gratis)',
    previewBlurredLabel: 'Desbloquear para ver todo',
    previewUnlockAll: 'Desbloquear Todos los Estilos',
    favoriteSaved: 'Guardado en favoritos',
    favoriteRemoved: 'Eliminado de favoritos',
    favoritesTitle: 'Mis Favoritos',
    favoritesEmpty: 'Aún no hay favoritos',
    favoritesGallery: 'Favoritos',
    saveImage: 'Guardar Imagen',
    galleryBefore: 'Before',
    galleryAfter: 'After',
    referralTitle: 'Invita amigos y obtén estilos gratis',
    referralDesc: 'Gana un crédito de estilo gratis cuando tu amigo realice una compra',
    referralInvited: ' amigos invitados',
    referralCredits: ' créditos disponibles',
    referralCopyLink: 'Copiar enlace de invitación',
    referralInlineText: 'Invita amigos y obtén estilos gratis',
    referralCreditAvailable: 'Crédito de referido disponible',
    chatTitle: 'Style Advisor',
    chatPlaceholder: 'Escribe tu pregunta de estilo...',
    chatSend: 'Enviar',
    chatBuyTokens: '10 mensajes por $0.99',
    chatTokensLeft: ' restantes',
    chatWelcome: 'Hola! Soy un asesor de estilo AI que combina la experiencia de Tom Ford, Grace Coddington y los mejores estilistas del mundo. Pregunta lo que quieras.',
    chatExample1: 'Que me pongo hoy?',
    chatExample2: 'Que zapatos van con este outfit?',
    chatExample3: 'Look para entrevista de trabajo',
    chatNoTokens: 'No quedan mensajes. Compra tokens para continuar.',
    chatCardTitle: 'Style Advisor',
    chatCardDesc: 'Chatea con un estilista AI para consejos de moda personalizados en tiempo real',
    beforeAfterTitle: 'Antes y Después',
    beforeLabel: 'ANTES',
    afterLabel: 'DESPUÉS',
    showcaseTitle: 'Transformaciones increíbles con IA',
    showcaseDesc: 'Descubre tu estilo perfecto con solo una foto',
    galleryTitle: 'Resultados reales de transformación',
    gallerySubtitle: 'Mira cómo una foto lo cambia todo',
    galleryBadgeOutfit: 'Outfit',
    galleryBadgeDaily: 'Diario',
    galleryCta: 'Quiero mi transformación',
    galleryResultTime: 'Resultados en 30 segundos',
    trustTitle: '¿Por qué nos eligen?',
    trustRating: '3x Gratis',
    trustRatingCount: 'Sin tarjeta',
    trustSpeed: '30s',
    trustSpeedDesc: 'Resultados IA',
    trustRefund: '100%',
    trustRefundDesc: 'Garantía de reembolso',
    trustAI: 'GPT + Gemini',
    trustAIDesc: 'Doble motor IA',
    trustGlobal: '5 Idiomas',
    trustGlobalDesc: 'Servicio global',
    metaTitle: 'Estilista Personal IA | Recomendaciones de Moda',
    metaDescription: 'Encuentra tu estilo perfecto con una foto. ¡Primera vez gratis! Recomendaciones de moda de lujo.',
    timerTitle: 'Oferta de primera visita',
    timerDesc: ' restante',
    unlockAllStyles: 'Desbloquear todos los estilos',
    blurredRemaining: ' estilos más',
    footerLegal: 'LEGAL',
    footerTerms: 'Terminos de Servicio',
    footerPrivacy: 'Politica de Privacidad',
    footerRefund: 'Politica de Reembolso',
    footerCopyright: '© 2026 PERSONAL STYLIST. ALL RIGHTS RESERVED.',
    badgeRunway: 'PASARELA',
    badgePersonalized: 'PERSONALIZADO',
    badgeWeather: 'CLIMA-ADAPTADO',
    situationTitle: 'El momento en que tu primera impresion cambia',
    situation1: 'Tienes una entrevista importante?',
    situation2: 'Una cita emocionante y no sabes que ponerte?',
    situation3: 'Necesitas confianza antes de conocer a alguien?',
    situation4: 'La misma ropa todos los dias — listo para un cambio?',
    situationCta: 'Encuentra mi estilo ahora',
    shareCardTitle: 'Mi Estilo DNA',
    shareCardCta: 'Descubre Tu Estilo',
    shareToInstagram: 'Guardar imagen para Instagram',
    abUrgencyText: 'Oferta por tiempo limitado',
    styleDnaTitle: 'Tu Estilo DNA',
    styleDnaSeason: 'Temporada de Color Personal',
    styleDnaSeasons: { spring: 'Primavera', summer: 'Verano', autumn: 'Otoño', winter: 'Invierno' },
    styleDnaBodyType: 'Tipo de Cuerpo',
    styleDnaColors: 'Colores Recomendados',
    styleDnaSilhouettes: 'Mejores Siluetas',
    styleDnaShare: 'Guardar Tarjeta de Estilo',
    heroHeadline: 'Tu mejor look, descubierto por IA',
    heroSubCta: 'Sin tarjeta · 3 veces gratis',
  }
  END OF DELETED BLOCK */

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
- AI-generated fashion outfit previews

These are **instant digital deliverables** that cannot be "returned" once generated.

## 2. Automatic Refunds

We automatically process full refunds when our service fails to deliver results:
- **Text analysis failure**: If the style report fails to generate
- **Image generation failure**: If AI fails to create fashion images
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
- You did not like how an outfit looked on your photo
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

// GA4 custom event tracking
// ─── 360° frame-sequence spin viewer ─────────────────────────────
// Expects frames at `${basePath}/frame-00.webp` … zero-padded, evenly
// spaced rotations (see docs/MODEL_PROMPTS.md). Renders nothing until
// the first frame actually exists, so the section is safe to ship
// before the assets do.
function SpinViewer({ basePath, frameCount, hint }: { basePath: string; frameCount: number; hint: string }) {
  const [frame, setFrame] = useState(0)
  const [ready, setReady] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const dragRef = useRef<{ startX: number; startFrame: number } | null>(null)

  const frameSrc = useCallback(
    (i: number) => `${basePath}/frame-${String(((i % frameCount) + frameCount) % frameCount).padStart(2, '0')}.webp`,
    [basePath, frameCount]
  )

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setReady(true)
      for (let i = 1; i < frameCount; i++) {
        const pre = new Image()
        pre.src = frameSrc(i)
      }
    }
    img.onerror = () => setReady(false)
    img.src = frameSrc(0)
  }, [frameSrc, frameCount])

  // Slow auto-rotate until the user grabs it (skipped under reduced motion)
  useEffect(() => {
    if (!ready || interacted) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setFrame(f => f + 1), 180)
    return () => window.clearInterval(id)
  }, [ready, interacted])

  if (!ready) return null

  const onPointerDown = (e: React.PointerEvent) => {
    setInteracted(true)
    dragRef.current = { startX: e.clientX, startFrame: frame }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const deltaFrames = Math.round((e.clientX - dragRef.current.startX) / 12)
    setFrame(dragRef.current.startFrame + deltaFrames)
  }
  const onPointerUp = () => { dragRef.current = null }

  return (
    <div className="spin-viewer-wrap">
      <div
        className="spin-viewer"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label="360 degree style view"
      >
        <img src={frameSrc(frame)} alt="" className="spin-frame" draggable={false} />
        <span className="spin-badge">360°</span>
      </div>
      <p className="spin-hint">{hint}</p>
    </div>
  )
}

// Web Push — VAPID 공개키 (개인키는 Cloudflare env VAPID_PRIVATE_JWK)
const VAPID_PUBLIC_KEY = 'BLE73tVfXimofiQLw_mR2ypde8zZH3Dmj_cmYfFQbdH3c4yr16f9O3CEhzAdL8txTVC-dzQLYwLNVCztSVCEVBM'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

// 날씨 → 한 줄 코디 팁 (정적 매핑 — AI 비용 없음)
function getWeatherTip(temp: number, condition: string, lang: 'ko' | 'en'): string {
  const rain = condition === 'Rain' || condition === 'Drizzle' || condition === 'Thunderstorm'
  const snow = condition === 'Snow'
  if (lang === 'ko') {
    if (snow) return '방수 아우터와 따뜻한 부츠의 날'
    if (rain) return '레인 아우터와 딥톤이 어울리는 날'
    if (temp >= 28) return '린넨과 밝은 컬러가 어울리는 날'
    if (temp >= 22) return '가벼운 셔츠 한 장이면 충분한 날'
    if (temp >= 15) return '얇은 니트나 가디건이 어울리는 날'
    if (temp >= 8) return '트렌치나 가벼운 코트의 날'
    if (temp >= 0) return '울 코트와 레이어링의 날'
    return '패딩과 목도리가 필요한 날'
  }
  if (snow) return 'a day for waterproof outers and warm boots'
  if (rain) return 'a day for rain shells and deep tones'
  if (temp >= 28) return 'a day for linen and light colors'
  if (temp >= 22) return 'a light shirt kind of day'
  if (temp >= 15) return 'a day for fine knits and cardigans'
  if (temp >= 8) return 'trench and light coat weather'
  if (temp >= 0) return 'wool coat and layering weather'
  return 'a day for padded coats and scarves'
}

// ─── Hair styling (restored) ─────────────────────────────────────
// 아이콘 이모지는 선택 옵션 데이터로만 사용 (CLAUDE.md 허용 범위)
const hairOccasions = [
  { id: 'daily', icon: '☀️', labelKo: '데일리', labelEn: 'Daily' },
  { id: 'date', icon: '💕', labelKo: '데이트', labelEn: 'Date' },
  { id: 'interview', icon: '💼', labelKo: '면접', labelEn: 'Interview' },
  { id: 'party', icon: '🎉', labelKo: '파티', labelEn: 'Party' },
  { id: 'wedding', icon: '💒', labelKo: '결혼식', labelEn: 'Wedding' },
  { id: 'vacation', icon: '🏖️', labelKo: '휴가', labelEn: 'Vacation' },
] as const

const hairVibes = [
  { id: 'elegant', icon: '✨', labelKo: '우아한', labelEn: 'Elegant' },
  { id: 'cute', icon: '🎀', labelKo: '귀여운', labelEn: 'Cute' },
  { id: 'chic', icon: '🖤', labelKo: '시크한', labelEn: 'Chic' },
  { id: 'natural', icon: '🌿', labelKo: '자연스러운', labelEn: 'Natural' },
  { id: 'trendy', icon: '🔥', labelKo: '트렌디', labelEn: 'Trendy' },
  { id: 'classic', icon: '👑', labelKo: '클래식', labelEn: 'Classic' },
] as const

// 상황×느낌×성별 → 백엔드 스타일명 3종 (+UI 라벨). 백엔드가 인덱스별
// 기장/질감 변주를 더하므로 이름은 방향만 제시하면 된다.
function buildHairStyles(occasion: string, vibe: string, gender: string, lang: 'ko' | 'en') {
  const base = `${vibe} ${occasion}`
  if (gender === 'female') {
    return [
      { name: `${base} face-framing layered medium cut`, label: lang === 'ko' ? '레이어드 미디엄' : 'Layered Medium' },
      { name: `${base} soft waved long style`, label: lang === 'ko' ? '소프트 웨이브' : 'Soft Waves' },
      { name: `${base} sleek shoulder-length bob`, label: lang === 'ko' ? '슬릭 보브' : 'Sleek Bob' },
    ]
  }
  return [
    { name: `${base} clean tapered short cut`, label: lang === 'ko' ? '클린 테이퍼드' : 'Clean Taper' },
    { name: `${base} natural textured medium cut`, label: lang === 'ko' ? '내추럴 미디엄' : 'Natural Medium' },
    { name: `${base} refined side-part style`, label: lang === 'ko' ? '사이드 파트' : 'Side Part' },
  ]
}

// 날씨 → 대기(atmosphere) 버킷 — 랜딩 히어로의 분위기를 결정
type WeatherBucket = 'clear-warm' | 'clear-cold' | 'clouds' | 'rain' | 'snow' | 'night'

function getWeatherBucket(condition: string, temp: number, hour: number): WeatherBucket {
  if (condition === 'Snow') return 'snow'
  if (condition === 'Rain' || condition === 'Drizzle' || condition === 'Thunderstorm') return 'rain'
  const night = hour >= 21 || hour < 6
  if (night) return 'night'
  if (condition === 'Clear') return temp >= 15 ? 'clear-warm' : 'clear-cold'
  return 'clouds'
}

// 날씨 × 시간대 → 히어로 카피 (정적 매트릭스 — AI 비용 없음)
// 아침/낮(05-17)은 "오늘" 프레임, 저녁/밤(17-05)은 "내일 아침" 프레임
function getWeatherCopy(
  weather: { city: string; temp: number; condition: string },
  lang: 'ko' | 'en',
  hour: number
): { eyebrow: string; sub: string; cta: string } {
  const { city, temp, condition } = weather
  const evening = hour >= 17 || hour < 5
  const condWord: Record<string, [string, string]> = {
    Clear: ['맑음', 'clear'], Clouds: ['흐림', 'cloudy'], Rain: ['비', 'rain'],
    Drizzle: ['이슬비', 'drizzle'], Thunderstorm: ['뇌우', 'storms'], Snow: ['눈', 'snow'],
    Mist: ['안개', 'mist'], Fog: ['안개', 'fog'], Haze: ['연무', 'haze'],
  }
  const cw = condWord[condition] || (lang === 'ko' ? ['흐림', 'cloudy'] : ['흐림', 'cloudy'])
  const now = new Date()
  const dateStr = lang === 'ko'
    ? `${now.getMonth() + 1}월 ${now.getDate()}일`
    : now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const eyebrow = `${dateStr}${city ? ` ${city}` : ''} · ${temp}°C ${lang === 'ko' ? cw[0] : cw[1]}`

  const rain = condition === 'Rain' || condition === 'Drizzle'
  const storm = condition === 'Thunderstorm'
  const snow = condition === 'Snow'

  let sub: string
  if (lang === 'ko') {
    if (snow) sub = evening ? '내일 아침 눈길 출근, 옷 고민만은 미리 끝내두세요.' : '눈 오는 날, 방수 아우터에도 내 톤이 있습니다.'
    else if (storm) sub = evening ? '폭우가 지나가면 내일 아침이 옵니다. 내일 입을 옷, 미리 받아두세요.' : '이런 날 옷 고민은 사치죠. 30초 만에 오늘의 룩을 정해드립니다.'
    else if (rain) sub = evening ? '내일도 비 소식. 아침에 고민하기 전에 코디를 받아두세요.' : '비 오는 날엔 딥톤이 답입니다. 내 톤에 맞는 레인 룩을 확인하세요.'
    else if (temp >= 28) sub = evening ? '내일도 더위는 계속됩니다. 내일 아침 코디, 자기 전에 받아두세요.' : '28°C부터는 컬러가 절반입니다. 내게 맞는 밝은 톤을 확인하세요.'
    else if (temp >= 22) sub = evening ? '내일 아침 옷장 앞 3분, 저희가 없애드립니다.' : '셔츠 한 장의 계절 — 문제는 어떤 색이냐는 것.'
    else if (temp >= 15) sub = evening ? '환절기 아침은 늘 헷갈리죠. 내일 기온에 맞춘 코디를 받아보세요.' : '얇은 니트의 날씨. 내 퍼스널 컬러로 고르면 달라집니다.'
    else if (temp >= 8) sub = evening ? '내일 아침은 더 쌀쌀합니다. 레이어링까지 정해서 보내드릴게요.' : '트렌치의 계절입니다. 내 톤의 아우터를 확인하세요.'
    else sub = evening ? '내일 아침 추운 출근길, 옷 고민 없이 나가세요.' : '추울수록 컬러가 얼굴을 살립니다. 코트 아래 배색을 확인하세요.'
  } else {
    if (snow) sub = evening ? 'Snowy commute tomorrow — settle the outfit question tonight.' : 'Snow day — even waterproof outers have your shade.'
    else if (storm) sub = evening ? 'The storm passes, tomorrow comes. Have tomorrow\'s outfit ready.' : 'No time to debate outfits in this weather. Your look, decided in 30 seconds.'
    else if (rain) sub = evening ? 'Rain again tomorrow. Get tomorrow\'s outfit before the morning scramble.' : 'Rain calls for deep tones. See the rain look that matches your palette.'
    else if (temp >= 28) sub = evening ? 'The heat holds tomorrow. Get tomorrow\'s look before bed.' : 'Past 28°C, color does half the work. Find your light tones.'
    else if (temp >= 22) sub = evening ? 'Tomorrow\'s three minutes at the closet — gone.' : 'One-shirt weather. The question is which color.'
    else if (temp >= 15) sub = evening ? 'In-between weather confuses every morning. Get tomorrow\'s look, matched to the forecast.' : 'Fine-knit weather. Chosen in your palette, it lands differently.'
    else if (temp >= 8) sub = evening ? 'Colder tomorrow morning. We\'ll send the look, layers included.' : 'Trench season is here. See outerwear in your tones.'
    else sub = evening ? 'Freezing commute tomorrow — walk out without the debate.' : 'The colder it gets, the more color carries your face.'
  }

  const cta = lang === 'ko'
    ? (evening ? '내일 아침 코디 받기 — 무료' : '오늘의 코디 받기 — 무료')
    : (evening ? "Get Tomorrow's Look — Free" : "Get Today's Look — Free")

  return { eyebrow, sub, cta }
}

function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any  // gtag is loaded by GA4 script in index.html
    if (typeof w?.gtag === 'function') {
      w.gtag('event', eventName, params)
    }
  } catch { /* noop */ }
}

// GA4 user properties
function setUserProperties(props: Record<string, string | number>) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    if (typeof w?.gtag === 'function') {
      w.gtag('set', 'user_properties', props)
    }
  } catch { /* noop */ }
}

// Style DNA parser — extracts structured data from markdown report
interface StyleDNA {
  season: 'spring' | 'summer' | 'autumn' | 'winter' | null
  bodyType: string | null
  colors: string[]
  silhouettes: string[]
}

const COLOR_NAME_TO_HEX: Record<string, string> = {
  navy: '#001f3f', coral: '#FF7F50', beige: '#F5F5DC', ivory: '#FFFFF0',
  burgundy: '#800020', olive: '#808000', camel: '#C19A6B', charcoal: '#36454F',
  cream: '#FFFDD0', khaki: '#C3B091', sage: '#BCB88A', terracotta: '#E2725B',
  rust: '#B7410E', mauve: '#E0B0FF', taupe: '#483C32', blush: '#DE5D83',
  peach: '#FFCBA4', lavender: '#E6E6FA', teal: '#008080', forest: '#228B22',
  plum: '#8E4585', wine: '#722F37', chocolate: '#7B3F00', sand: '#C2B280',
  rose: '#FF007F', mint: '#3EB489', dusty: '#B2996E', emerald: '#50C878',
  sapphire: '#0F52BA', slate: '#708090', stone: '#928E85', powder: '#B0E0E6',
  denim: '#1560BD', espresso: '#4E312D', honey: '#EB9605', oatmeal: '#D4C5A9',
  white: '#FFFFFF', black: '#000000', red: '#E74C3C', blue: '#3498DB',
  green: '#27AE60', pink: '#FF69B4', yellow: '#F1C40F', orange: '#E67E22',
  brown: '#8B4513', grey: '#95A5A6', gray: '#95A5A6', gold: '#D4AF37',
  silver: '#C0C0C0', tan: '#D2B48C', maroon: '#800000', indigo: '#4B0082',
}

function colorNameToHex(name: string): string | null {
  const lower = name.toLowerCase().trim()
  return COLOR_NAME_TO_HEX[lower] || null
}

const SEASON_KEYWORDS: Record<string, 'spring' | 'summer' | 'autumn' | 'winter'> = {
  coral: 'spring', peach: 'spring', warm: 'spring', golden: 'spring', honey: 'spring',
  camel: 'spring', ivory: 'spring', apricot: 'spring',
  lavender: 'summer', powder: 'summer', cool: 'summer', rose: 'summer', mauve: 'summer',
  dusty: 'summer', slate: 'summer', periwinkle: 'summer',
  terracotta: 'autumn', rust: 'autumn', olive: 'autumn', burgundy: 'autumn', forest: 'autumn',
  khaki: 'autumn', chocolate: 'autumn', espresso: 'autumn',
  navy: 'winter', black: 'winter', emerald: 'winter', sapphire: 'winter', wine: 'winter',
  plum: 'winter', charcoal: 'winter', cobalt: 'winter',
}

function parseStyleDNA(report: string): StyleDNA {
  const result: StyleDNA = { season: null, bodyType: null, colors: [], silhouettes: [] }
  if (!report) return result

  const lower = report.toLowerCase()

  // Season detection from keywords in the report
  if (lower.includes('spring') || lower.includes('봄') || lower.includes('スプリング') || lower.includes('春')) result.season = 'spring'
  else if (lower.includes('summer') || lower.includes('여름') || lower.includes('サマー') || lower.includes('夏')) result.season = 'summer'
  else if (lower.includes('autumn') || lower.includes('fall') || lower.includes('가을') || lower.includes('オータム') || lower.includes('秋')) result.season = 'autumn'
  else if (lower.includes('winter') || lower.includes('겨울') || lower.includes('ウィンター') || lower.includes('冬')) result.season = 'winter'

  // Fallback: detect season from color keywords
  if (!result.season) {
    const seasonVotes: Record<string, number> = { spring: 0, summer: 0, autumn: 0, winter: 0 }
    for (const [kw, season] of Object.entries(SEASON_KEYWORDS)) {
      if (lower.includes(kw)) seasonVotes[season]++
    }
    const maxSeason = Object.entries(seasonVotes).sort((a, b) => b[1] - a[1])[0]
    if (maxSeason && maxSeason[1] > 0) result.season = maxSeason[0] as StyleDNA['season']
  }

  // Body type detection
  const bodyPatterns = [
    /body\s*type[:\s]*([^\n,.]+)/i,
    /체형[:\s]*([^\n,.]+)/i,
    /体型[:\s]*([^\n,.]+)/i,
    /(hourglass|triangle|inverted\s*triangle|rectangle|round|oval|pear|apple)/i,
    /(모래시계|삼각형|역삼각형|직사각형|둥근형|타원형)/,
  ]
  for (const pat of bodyPatterns) {
    const m = report.match(pat)
    if (m) { result.bodyType = m[1].trim().replace(/\*+/g, '').trim(); break }
  }

  // Color extraction — find color names mentioned in recommendations
  const colorSection = report.match(/(?:추천\s*컬러|recommended\s*color|color\s*palette|컬러\s*팔레트|おすすめカラー|推荐色彩)[:\s]*([^\n]+(?:\n[^\n#]*)*)/i)
  const colorText = colorSection ? colorSection[1] : report
  const foundColors: string[] = []
  for (const colorName of Object.keys(COLOR_NAME_TO_HEX)) {
    if (colorText.toLowerCase().includes(colorName) && foundColors.length < 8) {
      foundColors.push(colorName)
    }
  }
  result.colors = foundColors.length > 0 ? foundColors : ['navy', 'beige', 'burgundy', 'olive', 'cream']

  // Silhouette extraction
  const silhouettePatterns = [
    /(?:추천\s*실루엣|silhouette|실루엣|シルエット|轮廓)[:\s]*([^\n]+(?:\n[^\n#]*)*)/i,
    /(?:best\s*fit|핏|フィット)[:\s]*([^\n]+)/i,
  ]
  for (const pat of silhouettePatterns) {
    const m = report.match(pat)
    if (m) {
      result.silhouettes = m[1].split(/[,·•-]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40).slice(0, 5)
      break
    }
  }
  if (result.silhouettes.length === 0) {
    // Fallback: common silhouettes from general context
    const silhouetteKeywords = ['A-line', 'straight', 'tailored', 'oversized', 'slim fit', 'wide leg', 'fitted', 'relaxed']
    for (const kw of silhouetteKeywords) {
      if (lower.includes(kw.toLowerCase())) result.silhouettes.push(kw)
    }
  }

  return result
}

// GA4 SPA virtual pageview — page_title & page_location 포함해야 GA4 표준 리포트에 표시됨
function trackPageView(pageName: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    if (typeof w?.gtag === 'function') {
      w.gtag('event', 'page_view', {
        page_title: pageName,
        page_location: `${window.location.origin}/${pageName}`,
      })
    }
  } catch { /* noop */ }
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
  const [colorPalette, setColorPalette] = useState<{ bestColors: string[]; avoidColors: string[] } | null>(null)
  // 12타입 시즌 라벨 (API 제공, parseStyleDNA는 폴백) — 공유 카드의 정체성 헤드라인
  const [seasonInfo, setSeasonInfo] = useState<{ base: string; label_en: string; label_ko: string } | null>(null)
  // 히어로 날씨 미리보기 (Cloudflare 위치 기반, 권한 팝업 없음)
  const [weatherPreview, setWeatherPreview] = useState<{ city: string; temp: number; condition: string } | null>(null)
  // 아침 푸시 알림 상태
  const [pushStatus, setPushStatus] = useState<'idle' | 'working' | 'enabled' | 'unsupported'>('idle')
  // 내 옷장
  const [wardrobeItems, setWardrobeItems] = useState<Array<{ id: string; description: string; category: string | null; image_url: string }>>([])
  const [wardrobeUploading, setWardrobeUploading] = useState(false)
  const wardrobeInputRef = useRef<HTMLInputElement>(null)
  // 헤어 스타일 (복구): 선택 상태 + 결과
  const [hairOccasion, setHairOccasion] = useState('daily')
  const [hairVibe, setHairVibe] = useState('natural')
  const [hairImages, setHairImages] = useState<Array<{ style: string; label: string; imageUrl: string | null }>>([])
  const [isGeneratingHair, setIsGeneratingHair] = useState(false)
  const hairPhotoInputRef = useRef<HTMLInputElement>(null)
  // 아웃핏 피드백 (오늘의 룩 학습 루프)
  const [outfitFeedback, setOutfitFeedback] = useState<Record<string, 'like' | 'dislike'>>({})
  // 히어로 필름 (에셋 배치 전이면 슬라이더로 폴백)
  const [heroVideoOk, setHeroVideoOk] = useState(true)
  const [error, setError] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [styleImages, setStyleImages] = useState<StyleImage[]>([])
  const [isGeneratingStyles, setIsGeneratingStyles] = useState(false)
  const [styleGenProgress, setStyleGenProgress] = useState(0)
  const [styleGenStep, setStyleGenStep] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStep, setLoadingStep] = useState('')
  const [isFullPaid, setIsFullPaid] = useState(false)
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
  const t = translations[lang]

  // Auth state
  const { user, session, signIn, signUp, signInWithGoogle, signOut, resetPassword, updatePassword, deleteAccount, profile: authProfile, isSupabaseConfigured } = useAuth()

  // 인증 필요 API 호출용 헤더 — 세션 JWT를 서버가 검증 (body의 email/user_id는 신뢰 안 함)
  const authHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  })
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [authSuccess, setAuthSuccess] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  // 단위 설정 (영어 사용자는 선택 가능, 기본값: 영어는 imperial, 그 외는 metric)
  const [useMetric, setUseMetric] = useState(() => lang !== 'en')
  const isImperial = !useMetric

  // Free Trial state (3회 무료)
  const [freeTrialCount, setFreeTrialCount] = useState(() => {
    // 기존 사용자 마이그레이션: boolean → number
    const oldFlag = localStorage.getItem('stylist_free_trial_used')
    const stored = localStorage.getItem('stylist_free_trial_count')
    if (stored !== null) return Math.min(parseInt(stored, 10) || 0, 3)
    if (oldFlag === 'true') {
      localStorage.setItem('stylist_free_trial_count', '1')
      return 1
    }
    return 0
  })
  const freeTrialRemaining = 3 - freeTrialCount
  const [isFreeTrial, setIsFreeTrial] = useState(false)

  // Subscription state
  const [isSubscribed, setIsSubscribed] = useState(() => localStorage.getItem('stylist_subscription_active') === 'true')
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false)
  const [subscriptionCity, setSubscriptionCity] = useState('')

  // 구독 모달 도시 프리필 — 날씨 프리뷰가 이미 도시를 알고 있음 (확인만 하면 되는 모달로)
  useEffect(() => {
    if (weatherPreview?.city) {
      setSubscriptionCity(prev => prev || weatherPreview.city)
    }
  }, [weatherPreview?.city])
  const [subscriptionCityError, setSubscriptionCityError] = useState('')
  const [dailyStyle, setDailyStyle] = useState<{ recommendation: string; weather: { temp: number; feels_like: number; humidity: number; condition: string; description: string; icon: string; wind_speed: number }; city: string; date: string; outfit_images?: Array<{ id: string; label: string; url: string }> } | null>(null)
  const [isDailyStyleLoading, setIsDailyStyleLoading] = useState(false)
  const [dailyStyleError, setDailyStyleError] = useState('')

  // Dashboard profile form state
  const [dashProfileHeight, setDashProfileHeight] = useState('')
  const [dashProfileWeight, setDashProfileWeight] = useState('')
  const [dashProfileGender, setDashProfileGender] = useState<Gender>(null)
  const [dashProfilePhoto, setDashProfilePhoto] = useState<string | null>(null)
  const [dashProfilePhotoUrl, setDashProfilePhotoUrl] = useState<string | null>(null)
  const [isDashProfileSaving, setIsDashProfileSaving] = useState(false)
  const [isDashProfileEditing, setIsDashProfileEditing] = useState(false)
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)
  const [dashProfileComplete, setDashProfileComplete] = useState(false)
  const [dashCanceledAt, setDashCanceledAt] = useState<string | null>(null)

  // Favorites state
  const [favorites, setFavorites] = useState<Array<{ id: string; image_url: string; image_type: string; label: string | null }>>([])
  const [favoriteToast, setFavoriteToast] = useState('')
  const [favoriteUrls, setFavoriteUrls] = useState<Set<string>>(new Set())


  // Hero Before/After slider state
  const [heroSliderPos, setHeroSliderPos] = useState(50)
  const heroSliderRef = useRef<HTMLDivElement>(null)

  // First-visit timer discount
  const [timerEnd, setTimerEnd] = useState<number | null>(() => {
    const stored = localStorage.getItem('stylist_first_visit_timer')
    if (stored) {
      const end = parseInt(stored, 10)
      if (end > Date.now()) return end
      return null // expired
    }
    return null
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_timerText, setTimerText] = useState('')

  // Referral state
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralStats, setReferralStats] = useState({ total: 0, credits: 0 })
  const [referralToast, setReferralToast] = useState('')

  // Fullscreen image viewer
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)

  // Style Chat state
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatTokens, setChatTokens] = useState(() => {
    const stored = localStorage.getItem('stylist_chat_tokens')
    return stored ? parseInt(stored, 10) || 0 : 0
  })
  const [chatLoading, setChatLoading] = useState(false)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)

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

  // Dynamic SEO meta tags — update on language change
  useEffect(() => {
    document.title = t.metaTitle
    document.documentElement.lang = lang
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', t.metaDescription)
  }, [lang, t.metaTitle, t.metaDescription])

  // GA4 User Properties — set on mount and when relevant state changes
  useEffect(() => {
    const userType = isSubscribed ? 'subscriber' : isFullPaid ? 'paid' : 'free'
    setUserProperties({
      user_type: userType,
      trial_remaining: freeTrialRemaining,
    })
  }, [isSubscribed, isFullPaid, freeTrialRemaining])

  // GA4 gender user property
  useEffect(() => {
    if (profile.gender) {
      setUserProperties({ gender: profile.gender })
    }
  }, [profile.gender])

  // GA4 Scroll depth tracking (landing page only)
  useEffect(() => {
    if (page !== 'landing') return
    const thresholds = [25, 50, 75, 100]
    const fired = new Set<number>()
    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return
      const pct = Math.round((scrollTop / docHeight) * 100)
      for (const t of thresholds) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t)
          trackEvent('scroll_depth', { percent: t, page: 'landing' })
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [page])

  // GA4 Page engagement time tracking
  useEffect(() => {
    const startTime = Date.now()
    return () => {
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      if (elapsed >= 3) {
        trackEvent('page_engagement', { page, engagement_time_sec: elapsed })
      }
    }
  }, [page])

  // GA4 Form abandonment tracking
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const hasPhoto = !!profile.photo
        const isPaymentPage = page === 'preview'
        if (hasPhoto && !isFullPaid && isPaymentPage) {
          trackEvent('form_abandonment', { page, has_photo: true, funnel_product: 'full' })
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [page, profile.photo, isFullPaid])

  // Paywall view tracking
  useEffect(() => {
    if (page === 'preview') {
      trackEvent('paywall_view', { page })
    }
  }, [page])

  // Paywall impression on the result page's locked-images panel —
  // premium_cta_clicked had no matching impression, so CTR was unmeasurable
  useEffect(() => {
    if (page === 'result' && !isFullPaid) {
      trackEvent('paywall_impression', { placement: 'result_locked' })
    }
  }, [page, isFullPaid])

  useEffect(() => {
    if (page === 'result' && !isSubscribed) {
      trackEvent('paywall_impression', { placement: 'daily_bridge' })
    }
  }, [page, isSubscribed])

  // 홈 = 오늘: 구독자가 파라미터 없이 열면 랜딩 대신 오늘의 코디로 —
  // "오늘 뭐 입지?"의 답이 첫 화면이어야 한다. 결제 리다이렉트(?payment=...)나
  // 딥링크 해시가 있으면 기존 흐름을 방해하지 않는다.
  useEffect(() => {
    const hasParams = window.location.search.length > 1
    const hash = window.location.hash
    const hasDeepLink = hash && hash !== '#landing' && !hash.includes('access_token')
    if (!hasParams && !hasDeepLink && localStorage.getItem('stylist_subscription_active') === 'true') {
      window.history.replaceState({ page: 'subscription-dashboard' }, '', '#subscription-dashboard')
      setPageState('subscription-dashboard')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 푸시 지원 여부 + 기존 구독 확인 (대시보드 진입 시)
  useEffect(() => {
    if (page !== 'subscription-dashboard') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushStatus('unsupported')
      return
    }
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        if (sub && Notification.permission === 'granted') setPushStatus('enabled')
      })
      .catch(() => { /* ignore */ })
  }, [page])

  // 내 옷장 로드 (대시보드 진입 시)
  useEffect(() => {
    if (page !== 'subscription-dashboard' || !user || !session?.access_token) return
    fetch('/api/wardrobe', { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : null))
      .then((data: { items?: Array<{ id: string; description: string; category: string | null; image_url: string }> } | null) => {
        if (data?.items) setWardrobeItems(data.items)
      })
      .catch(() => { /* 옷장은 부가 기능 */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user?.id, session?.access_token])

  // 옷 사진 업로드 → 서버가 비전으로 아이템 설명 생성
  const handleWardrobeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setWardrobeUploading(true)
    trackEvent('wardrobe_upload_start', { count: wardrobeItems.length })
    try {
      // 클라이언트 다운스케일 — 옷 인식엔 1024px면 충분
      const dataUri = await new Promise<string>((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          URL.revokeObjectURL(url)
          const maxDim = 1024
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.82))
        }
        img.onerror = reject
        img.src = url
      })
      const res = await fetch('/api/wardrobe', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ photo: dataUri }),
      })
      if (!res.ok) throw new Error(`wardrobe ${res.status}`)
      const data = await res.json() as { item: { id: string; description: string; category: string | null; image_url: string } }
      setWardrobeItems(prev => [data.item, ...prev])
      trackEvent('wardrobe_item_added', { category: data.item.category || 'unknown' })
    } catch (err) {
      console.error('Wardrobe upload failed:', err)
      setError(lang === 'ko' ? '옷 등록에 실패했어요. 다시 시도해주세요.' : 'Failed to add item. Please try again.')
    } finally {
      setWardrobeUploading(false)
    }
  }

  const handleWardrobeDelete = async (id: string) => {
    setWardrobeItems(prev => prev.filter(i => i.id !== id))
    try {
      await fetch('/api/wardrobe', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id }),
      })
    } catch { /* 목록에선 이미 제거됨 — 다음 로드에서 동기화 */ }
  }

  // 헤어 스타일 생성 — 무료 체험 카운터 공유 (3회), 3종 모두 공개 (바이럴 훅)
  const handleHairGenerate = async () => {
    if (!profile.photo || !profile.gender) return
    if (!isFullPaid && freeTrialRemaining <= 0) {
      setError(lang === 'ko' ? '무료 체험을 모두 사용했어요. 프리미엄으로 계속하세요.' : 'Free tries used up — continue with Premium.')
      setPage('preview')
      return
    }
    trackEvent('generation_start', { type: 'hair', paid: isFullPaid })
    setIsGeneratingHair(true)
    setError('')
    const styles = buildHairStyles(hairOccasion, hairVibe, profile.gender, lang)
    try {
      const res = await fetch('/api/generate-hair-styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: profile.photo,
          styles: styles.map(s => s.name),
          gender: profile.gender,
        }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json() as { images: Array<{ style: string; imageUrl: string | null }> }
      const merged = data.images.map((img, i) => ({ ...img, label: styles[i]?.label || img.style }))
      if (!merged.some(m => m.imageUrl)) throw new Error('no images')
      setHairImages(merged)
      if (!isFullPaid) {
        const newCount = freeTrialCount + 1
        setFreeTrialCount(newCount)
        localStorage.setItem('stylist_free_trial_count', String(newCount))
      }
      trackEvent('generation_complete', { type: 'hair' })
      trackEvent('result_view', { type: 'hair', is_paid: isFullPaid })
      setPage('hair-result')
    } catch (e) {
      console.error('Hair generation failed:', e)
      trackEvent('generation_error', { type: 'hair' })
      setError(lang === 'ko' ? '헤어 스타일 생성에 실패했어요. 다시 시도해주세요.' : 'Hair generation failed. Please try again.')
    } finally {
      setIsGeneratingHair(false)
    }
  }

  // 헤어용 사진 업로드 (프로필 사진 재사용, 없으면 새로 업로드)
  const handleHairPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProfile(prev => ({ ...prev, photo: reader.result as string }))
    reader.readAsDataURL(file)
  }

  // 오늘의 룩 피드백 — 다음 추천이 이 기록을 학습한다
  const handleOutfitFeedback = async (scenarioId: string, verdict: 'like' | 'dislike', label: string) => {
    if (!dailyStyle?.date) return
    setOutfitFeedback(prev => ({ ...prev, [scenarioId]: verdict }))
    trackEvent('outfit_feedback', { scenario: scenarioId, verdict })
    try {
      await fetch('/api/outfit-feedback', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          sent_date: dailyStyle.date,
          scenario_id: scenarioId,
          verdict,
          outfit_label: label,
        }),
      })
    } catch (e) {
      console.error('Outfit feedback failed:', e)
    }
  }

  // 아침 알림 켜기 — 권한 요청 → 푸시 구독 → 서버 저장
  const enableMorningPush = async () => {
    try {
      setPushStatus('working')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPushStatus('idle')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
      const res = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (!res.ok) throw new Error(`push-subscribe ${res.status}`)
      trackEvent('push_enabled')
      setPushStatus('enabled')
    } catch (e) {
      console.error('Push setup failed:', e)
      setPushStatus('idle')
    }
  }

  // 날씨 카피 (eyebrow/sub/CTA) — weatherPreview 도착 후 파생
  const weatherCopy = weatherPreview ? getWeatherCopy(weatherPreview, lang, new Date().getHours()) : null

  // 히어로 날씨 미리보기 — 30분 캐시, 실패 시 조용히 생략
  useEffect(() => {
    try {
      const cached = localStorage.getItem('stylist_weather_preview')
      if (cached) {
        const { data, ts } = JSON.parse(cached) as { data: { city: string; temp: number; condition: string }; ts: number }
        if (Date.now() - ts < 30 * 60 * 1000) {
          setWeatherPreview(data)
          return
        }
      }
    } catch { /* ignore corrupt cache */ }
    fetch('/api/weather-preview')
      .then(r => (r.ok ? r.json() : null))
      .then((data: { city: string; temp: number; condition: string } | null) => {
        if (data && typeof data.temp === 'number') {
          setWeatherPreview(data)
          localStorage.setItem('stylist_weather_preview', JSON.stringify({ data, ts: Date.now() }))
        }
      })
      .catch(() => { /* 위젯은 필수가 아님 */ })
  }, [])

  // Polar Checkout Configuration (Sandbox 환경)
  // Product ID: cca7d48e-6758-4e83-a375-807ab70615ea
  // 체크아웃은 /api/create-checkout API를 통해 동적으로 생성됨

  // 뒤로가기 지원을 위한 페이지 변경 함수
  const setPage = useCallback((newPage: Page) => {
    setPageState(newPage)
    window.history.pushState({ page: newPage }, '', `#${newPage}`)
    trackPageView(newPage)
    if (newPage === 'landing') trackEvent('funnel_step', { step_name: 'landing_view', step_number: 1 })
  }, [])

  // 브라우저 뒤로가기 이벤트 처리
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const targetPage = event.state?.page
      if (targetPage) {
        // Skip loading page on back navigation — go to landing instead
        if (targetPage === 'loading') {
          setPageState('landing')
          window.history.replaceState({ page: 'landing' }, '', '#landing')
        } else {
          setPageState(targetPage)
        }
      } else {
        setPageState('landing')
      }
    }

    window.addEventListener('popstate', handlePopState)

    // 결제 성공 후 리다이렉트 처리
    const urlParams = new URLSearchParams(window.location.search)
    // Clean up legacy persistent flag (no longer used)
    localStorage.removeItem('work_style_paid')

    // 리퍼럴 코드 캡처 — 유효한 코드만 저장 + 무료 체험 리셋
    const refCode = urlParams.get('ref')
    if (refCode) {
      // URL에서 ref 파라미터 즉시 제거 (깔끔한 URL 유지)
      urlParams.delete('ref')
      const cleanSearch = urlParams.toString()
      window.history.replaceState({}, '', window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '') + window.location.hash)

      // API로 코드 유효성 검증 후에만 저장 + 리셋
      fetch(`/api/referral?code=${encodeURIComponent(refCode)}`)
        .then(res => res.json())
        .then((data: unknown) => {
          const result = data as { valid?: boolean }
          if (result.valid) {
            localStorage.setItem('stylist_referral_code', refCode)
            // 리퍼럴 코드 사용 시 무료 체험 카운터 리셋
            localStorage.setItem('stylist_free_trial_count', '0')
            localStorage.removeItem('stylist_free_trial_used')
            setFreeTrialCount(0)
          }
        })
        .catch(() => { /* 검증 실패 시 무시 — 리셋 안 함 */ })
    }

    const customerSessionToken = urlParams.get('customer_session_token')
    const paymentSuccess = urlParams.get('payment')

    if (customerSessionToken || paymentSuccess === 'success') {
      // 결제 성공 — URL 파라미터 즉시 제거 (새로고침 시 재트리거 방지)
      const cleanUrl = window.location.pathname + (window.location.hash || '#landing')
      window.history.replaceState({}, '', cleanUrl)

      trackEvent('checkout_return', { type: urlParams.get('type') || 'unknown' })
      localStorage.setItem('paidCustomer', 'true')
      const purchasedProductType = urlParams.get('type') || localStorage.getItem('productType') || 'full'
      const polarCheckoutId = urlParams.get('checkout_id')

      // checkout_id 저장 (환불 시 필요)
      if (polarCheckoutId) {
        setCheckoutId(polarCheckoutId)
        localStorage.setItem('lastCheckoutId', polarCheckoutId)
      }

      // 리퍼럴 전환 기록 (비동기)
      const storedRefCode = localStorage.getItem('stylist_referral_code')
      if (storedRefCode) {
        (async () => {
          try {
            // 결제 이메일 조회
            let refEmail = user?.email || ''
            if (!refEmail && polarCheckoutId) {
              try {
                const infoRes = await fetch(`/api/checkout-info?id=${polarCheckoutId}`)
                if (infoRes.ok) {
                  const info = await infoRes.json() as { email?: string }
                  if (info.email) refEmail = info.email
                }
              } catch { /* ignore */ }
            }
            if (refEmail) {
              await fetch('/api/referral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  referral_code: storedRefCode,
                  referred_email: refEmail,
                  referred_user_id: user?.id || '',
                  purchase_type: purchasedProductType,
                  checkout_id: polarCheckoutId || '',
                }),
              })
            }
            localStorage.removeItem('stylist_referral_code')
          } catch (e) {
            console.error('Failed to record referral:', e)
          }
        })()
      }

      // 챗 토큰 결제 성공 처리
      if (purchasedProductType === 'chat_tokens') {
        trackEvent('purchase', { product: 'chat_tokens', currency: 'USD', value: 0.99 })
        setChatTokens(prev => {
          const newTokens = prev + 10
          localStorage.setItem('stylist_chat_tokens', String(newTokens))
          return newTokens
        })
        localStorage.removeItem('productType')
        window.history.replaceState({ page: 'style-chat' }, '', '#style-chat')
        setPageState('style-chat')
        return
      }

      // 구독 결제 성공 처리
      const subscriptionParam = urlParams.get('subscription')
      if (subscriptionParam === 'active' || purchasedProductType === 'daily_style') {
        trackEvent('purchase', { product: 'daily_style', currency: 'USD', value: 6.99 })
        localStorage.setItem('stylist_subscription_active', 'true')
        if (polarCheckoutId) {
          localStorage.setItem('stylist_subscription_checkout_id', polarCheckoutId)
        }
        setIsSubscribed(true)

        // 구독 데이터를 백엔드에 저장 (비동기)
        const pendingSubData = localStorage.getItem('pending_subscription_data')
        if (pendingSubData) {
          (async () => {
            try {
              const subData = JSON.parse(pendingSubData)
              subData.polar_checkout_id = polarCheckoutId
              // 이메일이 없으면 Polar checkout에서 가져오기
              if (!subData.email && polarCheckoutId) {
                try {
                  const infoRes = await fetch(`/api/checkout-info?id=${polarCheckoutId}`)
                  if (infoRes.ok) {
                    const info = await infoRes.json()
                    if (info.email) subData.email = info.email
                  }
                } catch { /* ignore */ }
              }
              if (subData.email) {
                await fetch('/api/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(subData),
                })
              }
              localStorage.removeItem('pending_subscription_data')
            } catch (e) {
              console.error('Failed to save subscription data:', e)
            }
          })()
        }

        // URL 정리 후 구독 대시보드로 이동
        window.history.replaceState({ page: 'subscription-dashboard' }, '', '#subscription-dashboard')
        setPageState('subscription-dashboard')
        return
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
              height: string; weight: string; gender: Gender; photo: string | null; productType?: string
            } | null

            if (savedData) {
              trackEvent('purchase', { product: 'full_style', currency: 'USD', value: 4.99 })
              trackEvent('funnel_step', { step_name: 'purchase', step_number: 5, funnel_product: purchasedProductType })

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
          setIsFullPaid(true)
          setPageState('input')
          window.history.replaceState({ page: 'input' }, '', '#input')
        })()
        return
      }
      // 저장된 데이터 없으면 입력 페이지로
      setIsFullPaid(true)
      setPageState('input')
      window.history.replaceState({ page: 'input' }, '', '#input')
      return
    }

    // OAuth 콜백 처리 (Google 로그인 등)
    // OAuth 리다이렉트 후 URL hash에 access_token이 포함되어 있음
    const hash = window.location.hash
    if (hash && (hash.includes('access_token=') || hash.includes('refresh_token=') || hash.includes('error_description='))) {
      // Supabase가 OAuth 토큰을 처리하도록 대기
      // onAuthStateChange에서 자동으로 세션이 설정됨
      // URL 정리는 Supabase가 처리한 후에 수행
      console.log('OAuth callback detected, waiting for Supabase to process...')

      // Supabase가 토큰을 처리한 후 URL 정리
      setTimeout(() => {
        window.history.replaceState({ page: 'landing' }, '', '#landing')
        setPageState('landing')
      }, 1000)
      return () => window.removeEventListener('popstate', handlePopState)
    }

    // 초기 상태 설정 — 새로고침 시 데이터 없는 페이지는 랜딩으로 리다이렉트
    const hashPage = window.location.hash.slice(1) as Page
    // Only restore pages that make sense without session data
    const persistablePages = ['landing', 'how-to-use', 'login', 'signup', 'profile']
    if (hashPage && persistablePages.includes(hashPage)) {
      setPageState(hashPage)
    } else {
      window.history.replaceState({ page: 'landing' }, '', '#landing')
    }
    trackEvent('funnel_step', { step_name: 'landing_view', step_number: 1 })

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Sync language to subscriber records whenever user changes language
  useEffect(() => {
    if (!user?.email || !isSubscribed) return
    // Debounce: only sync after 500ms of no changes
    const timer = setTimeout(() => {
      fetch('/api/update-subscriber-profile', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          email: user.email,
          user_id: user.id || undefined,
          preferred_language: lang,
        }),
      }).catch(() => {})
    }, 500)
    return () => clearTimeout(timer)
  }, [lang, user?.email, isSubscribed])

  // Fetch referral code on login
  useEffect(() => {
    if (!user?.id) {
      setReferralCode(null)
      setReferralStats({ total: 0, credits: 0 })
      return
    }
    (async () => {
      try {
        const res = await fetch(`/api/referral?user_id=${user.id}`)
        if (res.ok) {
          const data = await res.json() as { code: string; total_referrals: number; available_credits: number }
          setReferralCode(data.code)
          setReferralStats({ total: data.total_referrals, credits: data.available_credits })
        }
      } catch (e) {
        console.error('Failed to fetch referral code:', e)
      }
    })()
  }, [user?.id])

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

  // 패션 스타일 생성 프로그레스 타이머
  useEffect(() => {
    if (!isGeneratingStyles) {
      setStyleGenProgress(0)
      setStyleGenStep('')
      return
    }

    const steps = lang === 'ko'
      ? ['스타일 분석 중...', '컬러 팔레트 선정 중...', '코디 이미지 생성 중...', '실루엣 최적화 중...', '마무리 중...']
      : ['Analyzing style...', 'Selecting color palette...', 'Generating outfit images...', 'Optimizing silhouettes...', 'Finalizing...']

    let progress = 0
    let stepIdx = 0
    setStyleGenStep(steps[0])

    const interval = setInterval(() => {
      const increment = progress < 20 ? Math.random() * 5 + 2
        : progress < 50 ? Math.random() * 3 + 1.5
        : progress < 75 ? Math.random() * 2 + 0.8
        : Math.random() * 0.4 + 0.2
      progress = Math.min(progress + increment, 95)
      setStyleGenProgress(Math.round(progress))

      const newStepIdx = Math.min(Math.floor(progress / 20), steps.length - 1)
      if (newStepIdx !== stepIdx) {
        stepIdx = newStepIdx
        setStyleGenStep(steps[stepIdx])
      }
    }, 800)

    return () => clearInterval(interval)
  }, [isGeneratingStyles, lang])

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
      trackEvent('photo_upload', { funnel: 'full_style' })
      trackEvent('funnel_step', { step_name: 'photo_upload', step_number: 2, funnel_product: 'full' })
      processFile(file)
    }
  }

  const handlePhotoClick = () => {
    trackEvent('photo_upload_click', { page: 'input' })
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
  const handlePayment = async (productType: 'full' = 'full') => {
    // 리퍼럴 크레딧 보유 시 결제 없이 바로 분석 진행
    if (user && referralStats.credits > 0) {
      setIsProcessingPayment(true)
      try {
        const creditRes = await fetch('/api/referral', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ action: 'use_credit', user_id: user.id })
        })
        if (creditRes.ok) {
          const creditData = await creditRes.json() as { success: boolean; credits_remaining: number }
          if (creditData.success) {
            trackEvent('referral_credit_redeemed', { credits_remaining: creditData.credits_remaining })
            setReferralStats(prev => ({ ...prev, credits: creditData.credits_remaining }))
            setIsProcessingPayment(false)
            await startAnalysisAfterPayment(profile)
            return
          }
        }
        // 크레딧 차감 실패 (이미 소진 등) — 일반 결제로 진행
      } catch (e) {
        console.error('Failed to redeem referral credit:', e)
      }
      setIsProcessingPayment(false)
    }

    trackEvent('begin_checkout', { product: productType, currency: 'USD', value: 4.99 })
    trackEvent('funnel_step', { step_name: 'begin_checkout', step_number: 4, funnel_product: productType })
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
    trackEvent('generation_start', { type: 'full_style' })
    // 결제 1회 사용 제한: 새로고침 시 재사용 방지를 위해 localStorage만 제거.
    // isFullPaid는 유지 — 이번 세션의 결과는 프리미엄(블러 해제)으로 보여야 함
    localStorage.removeItem('paidCustomer')

    setError('')
    setStyleImages([])
    setLoadingProgress(0)
    setLoadingStep('')
    setPage('loading')

    const activeCheckoutId = paymentCheckoutId || checkoutId || localStorage.getItem('lastCheckoutId')

    // 자동 환불 처리 함수
    const processAutoRefund = async (reason: string) => {
      trackEvent('refund_initiated', { reason, type: 'full_style' })
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
        trackEvent('generation_error', { type: 'full_style', reason: 'api_error' })
        await processAutoRefund('Text analysis failed - API error')
        throw new Error('Analysis failed')
      }

      const analyzeData = await analyzeResponse.json()
      if (!analyzeData.report) {
        // 리포트 생성 실패 - 자동 환불
        trackEvent('generation_error', { type: 'full_style', reason: 'empty_response' })
        await processAutoRefund('Report generation failed - empty response')
        throw new Error('No report generated')
      }
      setReport(analyzeData.report)
      if (analyzeData.colorPalette) setColorPalette(analyzeData.colorPalette)
      if (analyzeData.season) setSeasonInfo(analyzeData.season)
      setIsFullPaid(true)

      setLoadingProgress(100)
      setLoadingStep(lang === 'ko' ? '완료!' : 'Complete!')
      await new Promise(resolve => setTimeout(resolve, 400))
      trackEvent('generation_complete', { type: 'full_style' })
      trackEvent('result_view', { type: 'full_style', is_paid: true })
      trackEvent('funnel_step', { step_name: 'result_view', step_number: 6, funnel_product: 'full' })
      setPage('result')

      // Step 2: Generate fashion style images
      setIsGeneratingStyles(true)

      try {
        const stylesResponse = await fetch('/api/generate-styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            height: profileData.height,
            weight: profileData.weight,
            gender: profileData.gender,
            photo: profileData.photo,
            language: lang
          })
        })
        if (stylesResponse.ok) {
          const stylesData = await stylesResponse.json()
          console.log('[Fashion] Success:', stylesData)
          const styles = stylesData.results || stylesData.styles || []
          setStyleImages(styles)
        } else {
          console.error('[Fashion] API error:', stylesResponse.status)
        }
      } catch (err) {
        console.error('[Fashion] Fetch failed:', err)
      }
      setStyleGenProgress(100)
      setStyleGenStep(lang === 'ko' ? '완료!' : 'Complete!')
      await new Promise(resolve => setTimeout(resolve, 300))
      setIsGeneratingStyles(false)

      // 리포트 성공 후 checkout ID 정리 (환불 불가 상태)
      localStorage.removeItem('lastCheckoutId')
      setCheckoutId(null)
    } catch (err) {
      console.error('Analysis error:', err)
      // 분석 실패(자동 환불됨) — 프리미엄 상태 해제
      setIsFullPaid(false)
      setError(t.errorApologyRefund)
      setPage('input')
    }
  }

  // 구독 폼 열기
  const handleSubscription = () => {
    if (!user) {
      setError(t.subscriptionLoginRequired)
      setPage('login')
      return
    }
    if (isSubscribed) {
      setPage('subscription-dashboard')
      loadDailyStyle()
      return
    }
    trackEvent('select_item', { item_category: 'daily_style' })
    trackEvent('sub_form_view')
    setSubscriptionCity('')
    setSubscriptionCityError('')
    setShowSubscriptionForm(true)
  }

  const loadDailyStyle = async () => {
    const email = user?.email
    if (!email) {
      setDailyStyleError(t.subscriptionLoginRequired)
      return
    }
    setIsDailyStyleLoading(true)
    setDailyStyleError('')
    try {
      const res = await fetch(`/api/daily-style?email=${encodeURIComponent(email)}&lang=${lang}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setDailyStyle(data)
    } catch {
      setDailyStyleError(t.dashboardError)
    } finally {
      setIsDailyStyleLoading(false)
    }
  }

  // Auto-load daily style + check profile when dashboard page is shown
  useEffect(() => {
    if (page === 'subscription-dashboard' && isSubscribed) {
      trackEvent('sub_dashboard_view')
      // Load daily style if not loaded
      if (!dailyStyle && !isDailyStyleLoading) {
        loadDailyStyle()
      }
      // Fetch profile completion status from server
      if (user?.email) {
        (async () => {
          try {
            const res = await fetch(`/api/subscription-status?email=${encodeURIComponent(user.email!)}`)
            if (res.ok) {
              const data = await res.json()
              setDashProfileComplete(data.profile_complete || false)
              if (data.height_cm) setDashProfileHeight(String(data.height_cm))
              if (data.weight_kg) setDashProfileWeight(String(data.weight_kg))
              if (data.gender) setDashProfileGender(data.gender)
              if (data.canceled_at) setDashCanceledAt(data.canceled_at)
              // Load profile photo from R2
              if (data.has_photo) {
                setDashProfilePhotoUrl(`/api/profile-photo?email=${encodeURIComponent(user.email!)}&t=${Date.now()}`)
              }
              // Auto-sync language preference on dashboard load
              if (data.preferred_language !== lang) {
                fetch('/api/update-subscriber-profile', {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({ email: user.email, preferred_language: lang }),
                }).catch(() => {})
              }
            }
          } catch { /* ignore */ }
        })()
      }
    }
  }, [page, isSubscribed])

  // Dashboard profile save
  const dashProfilePhotoRef = useRef<HTMLInputElement>(null)

  const handleDashProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const photoData = ev.target?.result as string
      setDashProfilePhoto(photoData)
      // ALWAYS auto-save photo immediately — this is critical for daily recommendations
      const email = user?.email
      if (!email) return
      setIsDashProfileSaving(true)
      try {
        const res = await fetch('/api/update-subscriber-profile', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            email,
            user_id: user?.id || undefined,
            height_cm: dashProfileHeight ? parseInt(dashProfileHeight, 10) : undefined,
            weight_kg: dashProfileWeight ? parseInt(dashProfileWeight, 10) : undefined,
            gender: dashProfileGender || undefined,
            photo: photoData,
            preferred_language: lang,
          }),
        })
        if (res.ok) {
          setDashProfilePhotoUrl(`/api/profile-photo?email=${encodeURIComponent(email)}&t=${Date.now()}`)
          setDashProfilePhoto(null)
          setDashProfileComplete(true)
        }
      } catch (err) {
        console.error('Auto-save photo error:', err)
      } finally {
        setIsDashProfileSaving(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDashProfileSave = async () => {
    const email = user?.email
    if (!email) return
    setIsDashProfileSaving(true)
    try {
      const res = await fetch('/api/update-subscriber-profile', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          email,
          user_id: user?.id || undefined,
          height_cm: dashProfileHeight ? parseInt(dashProfileHeight, 10) : undefined,
          weight_kg: dashProfileWeight ? parseInt(dashProfileWeight, 10) : undefined,
          gender: dashProfileGender || undefined,
          photo: dashProfilePhoto || undefined,
          preferred_language: lang,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setDashProfileComplete(data.profile_complete)
        if (data.profile_complete) trackEvent('sub_profile_complete')
        // Refresh profile photo URL with cache-busting timestamp
        if (dashProfilePhoto) {
          setDashProfilePhotoUrl(`/api/profile-photo?email=${encodeURIComponent(email)}&t=${Date.now()}`)
          setDashProfilePhoto(null)
        }
        // After profile save, load today's style recommendation
        if (data.profile_complete && !dailyStyle) {
          loadDailyStyle()
        }
      }
    } catch (e) {
      console.error('Profile save error:', e)
    } finally {
      setIsDashProfileSaving(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!user?.email) return
    trackEvent('manage_subscription')
    setIsOpeningPortal(true)
    try {
      const res = await fetch('/api/customer-portal', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: user.email }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          window.open(data.url, '_blank')
        }
      }
    } catch (e) {
      console.error('Manage subscription error:', e)
    } finally {
      setIsOpeningPortal(false)
    }
  }

  // Favorites
  const loadFavorites = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/favorite-image?user_id=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setFavorites(data.favorites || [])
        setFavoriteUrls(new Set((data.favorites || []).map((f: { image_url: string }) => f.image_url)))
      }
    } catch (e) {
      console.error('Load favorites error:', e)
    }
  }, [user?.id])

  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
  const toggleFavorite = async (imageUrl: string, imageType: 'style' | 'hair' | 'daily', label?: string) => {
    if (!user?.id || isFavoriteLoading) return
    // Optimistic UI — toggle immediately
    const wasActive = favoriteUrls.has(imageUrl)
    trackEvent('favorite_toggle', { action: wasActive ? 'remove' : 'add', image_type: imageType })
    if (wasActive) {
      setFavoriteUrls(prev => { const next = new Set(prev); next.delete(imageUrl); return next })
    } else {
      setFavoriteUrls(prev => new Set([...prev, imageUrl]))
    }
    setIsFavoriteLoading(true)
    try {
      const res = await fetch('/api/favorite-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          image_url: imageUrl,
          image_type: imageType,
          label: label || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.action === 'added') {
          setFavoriteToast(t.favoriteSaved)
        } else {
          setFavoriteToast(t.favoriteRemoved)
        }
        setTimeout(() => setFavoriteToast(''), 2000)
        // Don't call loadFavorites — local state is already correct
      } else {
        // Revert on error
        if (wasActive) {
          setFavoriteUrls(prev => new Set([...prev, imageUrl]))
        } else {
          setFavoriteUrls(prev => { const next = new Set(prev); next.delete(imageUrl); return next })
        }
      }
    } catch (e) {
      console.error('Toggle favorite error:', e)
      // Revert on error
      if (wasActive) {
        setFavoriteUrls(prev => new Set([...prev, imageUrl]))
      } else {
        setFavoriteUrls(prev => { const next = new Set(prev); next.delete(imageUrl); return next })
      }
    } finally {
      setIsFavoriteLoading(false)
    }
  }

  // Download/save image (works on mobile as wallpaper save)
  const downloadImage = async (imageUrl: string, filename?: string) => {
    trackEvent('image_download', { content_type: filename?.includes('hair') ? 'hair' : filename?.includes('daily') ? 'daily' : 'style' })
    try {
      // Try to add watermark via canvas
      const wmBlob = await addWatermark(imageUrl).catch(() => null)
      if (wmBlob) {
        const url = URL.createObjectURL(wmBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || 'stylist-image.jpg'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }
      // Fallback: download without watermark
      if (imageUrl.startsWith('data:')) {
        const res = await fetch(imageUrl)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || 'stylist-image.jpg'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        const a = document.createElement('a')
        a.href = imageUrl
        a.download = filename || 'stylist-image.jpg'
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (e) {
      console.error('Download error:', e)
      window.open(imageUrl, '_blank')
    }
  }

  // Load favorites when user logs in
  useEffect(() => {
    if (user?.id) loadFavorites()
  }, [user?.id, loadFavorites])

  // 유저 변경 시 실제 구독 상태를 서버에서 확인
  useEffect(() => {
    if (!user?.email) {
      setIsSubscribed(false)
      localStorage.removeItem('stylist_subscription_active')
      return
    }
    (async () => {
      try {
        const res = await fetch(`/api/subscription-status?email=${encodeURIComponent(user.email!)}`)
        if (res.ok) {
          const data = await res.json()
          const active = data.status === 'active' || data.status === 'trialing'
          setIsSubscribed(active)
          if (active) {
            localStorage.setItem('stylist_subscription_active', 'true')
          } else {
            localStorage.removeItem('stylist_subscription_active')
          }
        } else {
          setIsSubscribed(false)
          localStorage.removeItem('stylist_subscription_active')
        }
      } catch {
        // 네트워크 오류 시 localStorage 유지 (오프라인 대비)
      }
    })()
  }, [user?.email])

  // 구독 폼 제출 → 데이터 저장 후 Polar 결제
  const handleSubscriptionSubmit = async () => {
    if (!subscriptionCity.trim()) {
      setSubscriptionCityError(t.subscriptionCityRequired)
      return
    }
    setSubscriptionCityError('')
    setIsProcessingPayment(true)

    try {
      // 구독 데이터를 localStorage에 임시 저장 (결제 후 복원)
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const subscriptionData = {
        email: user?.email || '',
        height_cm: profile.height ? parseInt(profile.height, 10) : null,
        weight_kg: profile.weight ? parseInt(profile.weight, 10) : null,
        gender: profile.gender,
        city: subscriptionCity.trim(),
        timezone,
        preferred_language: lang,
        photo: profile.photo || null,
        user_id: user?.id || null,
      }
      localStorage.setItem('pending_subscription_data', JSON.stringify(subscriptionData))

      trackEvent('sub_city_submit', { city: subscriptionCity.trim() })
      trackEvent('begin_checkout', { product: 'daily_style', currency: 'USD', value: 6.99 })
      // Polar 결제 생성
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: 'daily_style',
          successUrl: `${window.location.origin}/?payment=success&type=daily_style&subscription=active`,
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          setShowSubscriptionForm(false)
          window.location.href = data.url
          return
        }
      }
      setError(lang === 'ko'
        ? '결제 페이지 생성에 실패했습니다. 다시 시도해주세요.'
        : 'Failed to create checkout. Please try again.')
    } catch (e) {
      console.error('Subscription checkout error:', e)
      setError(lang === 'ko'
        ? '결제 처리 중 오류가 발생했습니다.'
        : 'Payment processing error.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // 실제 분석 수행 함수 (결제 완료 후 or 결제 전 미리보기용)
  const performAnalysis = async (destinationPage: 'result' | 'preview' = 'result') => {
    setPage('loading')
    setError('')
    setStyleImages([])
    setLoadingProgress(0)
    setLoadingStep('')

    try {
      // Step 1: Text analysis (always runs — free or paid)
      const analyzePromise = fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: profile.photo,
          height: profile.height || (profile.gender === 'female' ? '162' : '175'),
          weight: profile.weight || (profile.gender === 'female' ? '55' : '72'),
          gender: profile.gender,
          language: lang
        })
      })

      // Step 2: Image generation (always runs — v2: show 1 free, blur rest)
      const stylesPromise = fetch('/api/generate-styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            height: profile.height || (profile.gender === 'female' ? '162' : '175'),
            weight: profile.weight || (profile.gender === 'female' ? '55' : '72'),
            gender: profile.gender,
            photo: profile.photo,
            language: lang
          })
        })

      // Wait for text analysis first
      const analyzeResponse = await analyzePromise

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed')
      }

      const analyzeData = await analyzeResponse.json()
      setReport(analyzeData.report)
      if (analyzeData.colorPalette) setColorPalette(analyzeData.colorPalette)
      if (analyzeData.season) setSeasonInfo(analyzeData.season)

      // Wait for images to finish
      setIsGeneratingStyles(true)

      const [stylesResult] = await Promise.allSettled([stylesPromise])

      // Handle fashion styles
      if (stylesResult.status === 'fulfilled') {
        if (stylesResult.value.ok) {
          const stylesData = await stylesResult.value.json()
          console.log('[Fashion] Success:', stylesData)
          setStyleImages(stylesData.results || stylesData.styles || [])
        } else {
          console.error('[Fashion] API error:', stylesResult.value.status, await stylesResult.value.text())
        }
      } else {
        console.error('[Fashion] Fetch failed:', stylesResult.reason)
      }
      setStyleGenProgress(100)
      setStyleGenStep(lang === 'ko' ? '완료!' : 'Complete!')
      setIsGeneratingStyles(false)

      setLoadingProgress(100)
      setLoadingStep(lang === 'ko' ? '완료!' : 'Complete!')
      await new Promise(resolve => setTimeout(resolve, 400))

      // Go to destination page
      if (destinationPage === 'result') {
        trackEvent('result_view', { type: 'full_style', is_paid: isFullPaid })
        trackEvent('funnel_step', { step_name: 'result_view', step_number: 6, funnel_product: 'full' })
      }
      setPage(destinationPage)
    } catch (err) {
      console.error('Error:', err)
      setError(t.error)
      setPage('input')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    trackEvent('full_input_submit', { has_photo: !!profile.photo, is_paid: isFullPaid })
    trackEvent('funnel_step', { step_name: 'form_submit', step_number: 3, funnel_product: 'full' })

    // v2: 항상 분석 + 이미지 생성 실행, 프론트엔드에서 1장만 공개/나머지 블러
    trackEvent('analysis_started', { is_paid: isFullPaid })
    performAnalysis('result')
  }

  // generateStyleImages removed — v2: images always generated in performAnalysis

  // 패션 변환 (3x3 그리드)
  const handleRestart = () => {
    trackEvent('restart', { from_page: page })
    setProfile({ photo: null, height: '', weight: '', gender: null })
    setHeightFeet('')
    setHeightInches('')
    setWeightLbs('')
    setReport('')
    setError('')
    setStyleImages([])
    setIsGeneratingStyles(false)
    setIsFullPaid(false)
    setIsFreeTrial(false)
    setPage('landing')
  }

  // 결과 리포트 생성 (새 탭에서 보고서 형태로 열기)
  const handleDownloadResult = async (imageUrls: string[], customImages?: { id: string; label: string; imageUrl: string | null }[]) => {
    const validUrls = imageUrls.filter(url => url)
    if (validUrls.length === 0) return

    trackEvent('save_report_click', { image_count: validUrls.length })

    // Build styled report HTML
    const styleLabelsMap: Record<string, string> = {
      'best-match': t.styleLabels['best-match'] || 'Best Match',
      date: t.styleLabels.date || 'Date Night',
      daily: t.styleLabels.daily || 'Daily',
    }

    const allImages = customImages
      ? customImages.filter(s => s.imageUrl).map(s => ({ url: s.imageUrl!, label: s.label, type: 'style' }))
      : styleImages.filter(s => s.imageUrl).map(s => ({ url: s.imageUrl!, label: styleLabelsMap[s.id] || s.label, type: 'style' }))

    const reportTitle = lang === 'ko' ? '나의 스타일 리포트' : 'My Style Report'
    const reportSubtitle = lang === 'ko' ? `${profile.gender === 'female' ? '여성' : '남성'} · ${profile.height}cm · ${profile.weight}kg` : `${profile.gender === 'female' ? 'Female' : 'Male'} · ${profile.height}cm · ${profile.weight}kg`
    const styleSection = lang === 'ko' ? '패션 스타일링' : 'Fashion Styling'
    const brandLine = 'kstylist.cc'

    const styleImgs = allImages.filter(i => i.type === 'style')
    const bestMatch = styleImgs[0]

    // Convert images to data URLs for the report
    const imgDataMap = new Map<string, string>()
    await Promise.all(allImages.slice(0, 8).map(async (img) => {
      try {
        const wmBlob = await addWatermark(img.url).catch(() => null as Blob | null)
        const blob: Blob = wmBlob ?? await fetch(img.url).then(r => r.blob())
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        imgDataMap.set(img.url, dataUrl)
      } catch { /* skip */ }
    }))

    const reportHtml = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${reportTitle} — ${brandLine}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;color:#1a1a1a;line-height:1.6}
.report{max-width:800px;margin:0 auto;padding:2rem 1.5rem}
.header{text-align:center;padding:2rem 0;border-bottom:1px solid #eee;margin-bottom:2rem}
.header h1{font-size:1.6rem;font-weight:700;letter-spacing:-0.02em;margin-bottom:0.25rem}
.header p{font-size:0.85rem;color:#888}
.brand{font-size:0.75rem;color:#b8962e;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem}
.section{margin-bottom:2.5rem}
.section h2{font-size:1.1rem;font-weight:600;margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:1px solid #eee}
.hero{text-align:center;margin-bottom:2rem}
.hero img{max-width:400px;width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.hero .label{display:inline-block;margin-top:0.75rem;font-size:0.85rem;font-weight:600;color:#b8962e}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem}
.card{border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,0.06)}
.card img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block}
.card .label{padding:0.6rem;text-align:center;font-size:0.8rem;font-weight:500;color:#555}
${report ? '.analysis{background:#fff;padding:1.5rem;border-radius:12px;border:1px solid #eee;font-size:0.85rem;line-height:1.8;white-space:pre-wrap}' : ''}
.footer{text-align:center;padding:2rem 0;border-top:1px solid #eee;margin-top:2rem;font-size:0.75rem;color:#aaa}
.print-btn{display:block;margin:2rem auto 0;padding:0.75rem 2rem;background:#1a1518;color:#fff;border:none;border-radius:8px;font-size:0.9rem;cursor:pointer}
@media print{.print-btn{display:none} .card{break-inside:avoid}}
</style>
</head>
<body>
<div class="report">
<div class="header">
<div class="brand">${brandLine}</div>
<h1>${reportTitle}</h1>
<p>${reportSubtitle}</p>
</div>
${bestMatch ? `<div class="hero"><img src="${imgDataMap.get(bestMatch.url) || bestMatch.url}" alt="${bestMatch.label}"><div class="label">${bestMatch.label}</div></div>` : ''}
${report ? `<div class="section"><h2>${lang === 'ko' ? '스타일 분석 요약' : 'Style Analysis Summary'}</h2><div class="analysis">${report.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div></div>` : ''}
${styleImgs.length > 1 ? `<div class="section"><h2>${styleSection}</h2><div class="grid">${styleImgs.slice(1).map(img => `<div class="card"><img src="${imgDataMap.get(img.url) || img.url}" alt="${img.label}"><div class="label">${img.label}</div></div>`).join('')}</div></div>` : ''}
<button class="print-btn" onclick="window.print()">${lang === 'ko' ? 'PDF로 저장 / 인쇄' : 'Save as PDF / Print'}</button>
<div class="footer">${brandLine} — Personal Stylist Report</div>
</div>
</body>
</html>`

    const blob = new Blob([reportHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  // 결과 공유 - 모달 열기
  const handleShareResult = () => {
    trackEvent('share_modal_open', { page: page })
    setShowShareModal(true)
  }

  // 소셜 미디어 공유 데이터
  const getShareData = () => {
    const titles: Record<Language, string> = {
      ko: '나만의 퍼스널 컬러를 발견했어요!',
      en: 'I discovered my personal color season!'
    }
    const texts: Record<Language, string> = {
      ko: '나에게 어울리는 퍼스널 컬러와 스타일을 찾았어요! 당신도 체험해보세요!',
      en: 'I found my perfect personal colors and styles! Try it yourself!'
    }
    const baseUrl = referralCode ? `https://kstylist.cc/?ref=${referralCode}` : 'https://kstylist.cc'
    return {
      title: titles[lang],
      text: texts[lang],
      url: baseUrl
    }
  }

  // 플랫폼별 공유 함수
  const shareToFacebook = () => {
    trackEvent('share', { method: 'facebook', content_type: page })
    const { url } = getShareData()
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
  }

  const shareToX = () => {
    trackEvent('share', { method: 'twitter', content_type: page })
    const { text, url } = getShareData()
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
  }

  const shareToWhatsApp = () => {
    trackEvent('share', { method: 'whatsapp', content_type: page })
    const { text, url } = getShareData()
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
  }

  const shareToThreads = () => {
    trackEvent('share', { method: 'threads', content_type: page })
    const { text, url } = getShareData()
    window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
  }

  const shareToiMessage = () => {
    trackEvent('share', { method: 'imessage', content_type: page })
    const { text, url } = getShareData()
    window.location.href = `sms:&body=${encodeURIComponent(text + ' ' + url)}`
  }

  const copyShareLink = async () => {
    trackEvent('share', { method: 'copy_link', content_type: page })
    try {
      const shareUrl = referralCode ? `https://kstylist.cc/?ref=${referralCode}` : 'https://kstylist.cc'
      await navigator.clipboard.writeText(shareUrl)
      setShareToast(t.copiedToClipboard)
      setTimeout(() => setShareToast(''), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const copyReferralLink = async () => {
    if (!referralCode) return
    trackEvent('referral_copy_link', { code: referralCode })
    try {
      await navigator.clipboard.writeText(`https://kstylist.cc/?ref=${referralCode}`)
      setReferralToast(t.copiedToClipboard)
      setTimeout(() => setReferralToast(''), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  // Style Chat — 새 메시지 시 스크롤
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  // Style Chat — 메시지 전송
  const handleChatSend = async () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    if (chatTokens <= 0) return

    trackEvent('chat_message_sent', { tokens_remaining: chatTokens - 1 })
    const newUserMessage = { role: 'user' as const, content: msg }
    const updatedMessages = [...chatMessages, newUserMessage]
    setChatMessages(updatedMessages)
    setChatInput('')
    setChatLoading(true)

    // 토큰 차감
    const newTokens = chatTokens - 1
    setChatTokens(newTokens)
    localStorage.setItem('stylist_chat_tokens', String(newTokens))

    try {
      const res = await fetch('/api/style-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: updatedMessages.slice(-10),
          language: lang,
        })
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json() as { reply: string }
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: lang === 'ko' ? '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.' : 'Sorry, something went wrong. Please try again.' }])
      // 오류 시 토큰 복구
      const restoredTokens = newTokens + 1
      setChatTokens(restoredTokens)
      localStorage.setItem('stylist_chat_tokens', String(restoredTokens))
    } finally {
      setChatLoading(false)
    }
  }

  // Style Chat — 토큰 구매
  const handleChatBuyTokens = async () => {
    trackEvent('begin_checkout', { product: 'chat_tokens', currency: 'USD', value: 0.99 })
    try {
      localStorage.setItem('productType', 'chat_tokens')
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType: 'chat_tokens' })
      })
      if (!res.ok) throw new Error('Checkout failed')
      const data = await res.json() as { url: string }
      if (data.url) window.location.href = data.url
    } catch {
      setError('Payment service temporarily unavailable')
    }
  }

  // Hero Before/After slider drag handler
  const handleHeroSliderDrag = useCallback((clientX: number) => {
    if (!heroSliderRef.current) return
    const rect = heroSliderRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setHeroSliderPos(pct)
  }, [])

  const handleHeroSliderMouseDown = useCallback(() => {
    const onMove = (e: MouseEvent) => handleHeroSliderDrag(e.clientX)
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [handleHeroSliderDrag])

  const handleHeroSliderTouchStart = useCallback(() => {
    const onMove = (e: TouchEvent) => handleHeroSliderDrag(e.touches[0].clientX)
    const onEnd = () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
    document.addEventListener('touchmove', onMove)
    document.addEventListener('touchend', onEnd)
  }, [handleHeroSliderDrag])

  // Watermark: draw image with subtle branding
  const addWatermark = useCallback(async (imageUrl: string): Promise<Blob> => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = imageUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    // Subtle watermark — bottom-right, semi-transparent
    const fontSize = Math.max(14, Math.round(img.width * 0.025))
    ctx.font = `${fontSize}px -apple-system, sans-serif`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText('kstylist.cc', img.width - fontSize * 0.8, img.height - fontSize * 0.5)
    // Thin shadow for readability on light backgrounds
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.fillText('kstylist.cc', img.width - fontSize * 0.8 + 1, img.height - fontSize * 0.5 + 1)
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.92))
  }, [])

  // Share Card: generate 1080×1920 Instagram Story image
  const generateShareCard = useCallback(async (imageUrl: string): Promise<Blob> => {
    const W = 1080, H = 1920
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Background
    ctx.fillStyle = '#FAFAF8'
    ctx.fillRect(0, 0, W, H)

    // Gold header bar
    const grad = ctx.createLinearGradient(0, 0, W, 0)
    grad.addColorStop(0, '#c9a962')
    grad.addColorStop(1, '#d4af37')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, 8)

    // Title
    ctx.fillStyle = '#1A1A1A'
    ctx.font = 'bold 56px Manrope, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(t.shareCardTitle, W / 2, 120)

    // Decorative line
    ctx.strokeStyle = '#c9a962'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(W / 2 - 80, 150)
    ctx.lineTo(W / 2 + 80, 150)
    ctx.stroke()

    // Style image
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = imageUrl
      })
      const imgY = 200
      const maxImgH = 1300
      const scale = Math.min((W - 80) / img.width, maxImgH / img.height)
      const drawW = img.width * scale
      const drawH = img.height * scale
      const drawX = (W - drawW) / 2
      // Rounded rectangle clip
      ctx.save()
      const r = 24
      ctx.beginPath()
      ctx.moveTo(drawX + r, imgY)
      ctx.lineTo(drawX + drawW - r, imgY)
      ctx.arcTo(drawX + drawW, imgY, drawX + drawW, imgY + r, r)
      ctx.lineTo(drawX + drawW, imgY + drawH - r)
      ctx.arcTo(drawX + drawW, imgY + drawH, drawX + drawW - r, imgY + drawH, r)
      ctx.lineTo(drawX + r, imgY + drawH)
      ctx.arcTo(drawX, imgY + drawH, drawX, imgY + drawH - r, r)
      ctx.lineTo(drawX, imgY + r)
      ctx.arcTo(drawX, imgY, drawX + r, imgY, r)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, drawX, imgY, drawW, drawH)
      ctx.restore()
    } catch { /* image failed, continue with text-only card */ }

    // CTA text
    ctx.fillStyle = '#c9a962'
    ctx.font = 'bold 36px Manrope, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(t.shareCardCta, W / 2, H - 160)

    // Watermark
    ctx.fillStyle = '#4A4A4A'
    ctx.font = '28px Manrope, sans-serif'
    ctx.fillText('kstylist.cc', W / 2, H - 80)

    // Bottom gold bar
    ctx.fillStyle = grad
    ctx.fillRect(0, H - 8, W, 8)

    return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'))
  }, [t.shareCardTitle, t.shareCardCta])

  // Handle share card generation & sharing
  const handleShareCardGenerate = useCallback(async (imageUrl: string) => {
    trackEvent('share_card_generate', { page })
    try {
      const blob = await generateShareCard(imageUrl)
      const file = new File([blob], 'kstylist-style-dna.png', { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t.shareCardTitle, text: t.shareCardCta })
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'kstylist-style-dna.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share card failed:', err)
      }
    }
  }, [generateShareCard, page, t.shareCardTitle, t.shareCardCta])

  // First-visit timer: start 24h countdown on first result view
  useEffect(() => {
    if (page === 'result' && isFreeTrial && !timerEnd) {
      const end = Date.now() + 24 * 60 * 60 * 1000
      localStorage.setItem('stylist_first_visit_timer', end.toString())
      setTimerEnd(end)
    }
  }, [page, isFreeTrial, timerEnd])

  // Timer countdown tick
  useEffect(() => {
    if (!timerEnd) return
    const tick = () => {
      const remaining = timerEnd - Date.now()
      if (remaining <= 0) {
        setTimerText('')
        setTimerEnd(null)
        localStorage.removeItem('stylist_first_visit_timer')
        return
      }
      const h = Math.floor(remaining / 3600000)
      const m = Math.floor((remaining % 3600000) / 60000)
      const s = Math.floor((remaining % 60000) / 1000)
      setTimerText(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [timerEnd])

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
    const images = styleImages.map(s => s.imageUrl).filter(Boolean) as string[]
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

  // Fetch favorites when profile page is opened
  // (Must be before any early returns to satisfy Rules of Hooks)
  useEffect(() => {
    if (page === 'profile' && user) {
      loadFavorites()
    }
  }, [page, user, loadFavorites])

  // 사진 + 성별만 필수 — 키/몸무게는 선택 (미입력 시 성별 기본값으로 실루엣 가이드만 보정)
  const isFormValid = profile.photo && profile.gender

  // Hair Selection Page — 상황/느낌 선택 후 생성
  if (page === 'hair-selection') {
    return (
      <div className="app-container hair-page">
        <header className="app-header">
          <button className="back-btn" onClick={() => setPage('landing')}>← {t.backToHome}</button>
        </header>
        <div className="hair-selection-content">
          <span className="input-tag">HAIR STUDIO</span>
          <h1 className="hair-title">{lang === 'ko' ? '어울리는 헤어를 미리 봅니다' : 'Preview the hair that suits you'}</h1>
          <p className="hair-desc">
            {lang === 'ko'
              ? '사진 한 장으로, 시술 전에 내 얼굴로 확인하세요. 상황과 느낌만 고르면 3가지 스타일을 보여드립니다.'
              : 'One photo — see it on your own face before the salon. Pick an occasion and a vibe; we show three styles.'}
          </p>

          {/* 사진: 프로필 사진 재사용 or 새 업로드 */}
          <div className="hair-photo-row">
            {profile.photo ? (
              <div className="hair-photo-preview">
                <img src={profile.photo} alt="" />
                <button className="hair-photo-change" onClick={() => hairPhotoInputRef.current?.click()}>
                  {lang === 'ko' ? '사진 변경' : 'Change photo'}
                </button>
              </div>
            ) : (
              <button className="hair-photo-add" onClick={() => hairPhotoInputRef.current?.click()}>
                + {lang === 'ko' ? '사진 업로드' : 'Upload photo'}
              </button>
            )}
            <input ref={hairPhotoInputRef} type="file" accept="image/*" onChange={handleHairPhotoUpload} style={{ display: 'none' }} />
          </div>

          {/* 성별 */}
          <div className="hair-gender-row">
            {(['female', 'male'] as const).map(g => (
              <button
                key={g}
                className={`hair-chip${profile.gender === g ? ' selected' : ''}`}
                onClick={() => setProfile(prev => ({ ...prev, gender: g }))}
              >
                {g === 'female' ? (lang === 'ko' ? '여성' : 'Female') : (lang === 'ko' ? '남성' : 'Male')}
              </button>
            ))}
          </div>

          <h3 className="hair-group-label">{lang === 'ko' ? '어떤 상황인가요?' : 'What is the occasion?'}</h3>
          <div className="hair-chip-grid">
            {hairOccasions.map(o => (
              <button
                key={o.id}
                className={`hair-chip${hairOccasion === o.id ? ' selected' : ''}`}
                onClick={() => setHairOccasion(o.id)}
              >
                <span className="hair-chip-icon">{o.icon}</span>
                {lang === 'ko' ? o.labelKo : o.labelEn}
              </button>
            ))}
          </div>

          <h3 className="hair-group-label">{lang === 'ko' ? '어떤 느낌을 원하세요?' : 'What vibe do you want?'}</h3>
          <div className="hair-chip-grid">
            {hairVibes.map(v => (
              <button
                key={v.id}
                className={`hair-chip${hairVibe === v.id ? ' selected' : ''}`}
                onClick={() => setHairVibe(v.id)}
              >
                <span className="hair-chip-icon">{v.icon}</span>
                {lang === 'ko' ? v.labelKo : v.labelEn}
              </button>
            ))}
          </div>

          {error && <div className="error-message">{error}<button onClick={() => setError('')}>{t.retry}</button></div>}

          <button
            className="btn-gold submit-btn hair-generate-btn"
            disabled={!profile.photo || !profile.gender || isGeneratingHair}
            onClick={handleHairGenerate}
          >
            {isGeneratingHair
              ? (lang === 'ko' ? '내 얼굴로 만드는 중... (30초-1분)' : 'Creating on your face... (30-60s)')
              : (lang === 'ko' ? '무료로 헤어 미리보기' : 'Preview Hair — Free')}
          </button>
          {!isFullPaid && (
            <p className="free-trial-caption">
              {lang === 'ko' ? `무료 ${freeTrialRemaining}회 남음` : `${freeTrialRemaining} free left`}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Hair Result Page — 3종 그리드 + 크로스셀
  if (page === 'hair-result') {
    return (
      <div className="app-container hair-page">
        <header className="app-header">
          <button className="back-btn" onClick={() => setPage('hair-selection')}>← {lang === 'ko' ? '다시 고르기' : 'Pick again'}</button>
        </header>
        <div className="hair-result-content">
          <span className="input-tag">HAIR STUDIO</span>
          <h1 className="hair-title">{lang === 'ko' ? '오늘의 헤어 제안 3가지' : 'Three hair directions for you'}</h1>
          <div className="hair-result-grid">
            {hairImages.map((img, i) => (
              <div key={i} className="hair-result-card">
                {img.imageUrl ? (
                  <img src={img.imageUrl} alt={img.label} onClick={() => setFullscreenImage(img.imageUrl)} />
                ) : (
                  <div className="hair-result-missing">{lang === 'ko' ? '생성 실패' : 'Failed'}</div>
                )}
                <div className="hair-result-label">{img.label}</div>
                {img.imageUrl && (
                  <button className="btn-outline hair-save-btn" onClick={() => downloadImage(img.imageUrl!, `hair-${i + 1}.jpg`)}>
                    {lang === 'ko' ? '저장' : 'Save'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 크로스셀: 패션 변환 + 데일리 */}
          <div className="hair-crosssell">
            <button className="btn-gold" onClick={() => { trackEvent('hair_to_fashion_click'); setPage('input') }}>
              {lang === 'ko' ? '패션 스타일도 변환해보기' : 'Try a Fashion Transformation'}
            </button>
            {!isSubscribed && (
              <button className="btn-outline" onClick={() => { trackEvent('hair_to_daily_click'); user ? handleSubscription() : setPage('input') }}>
                {lang === 'ko' ? '매일 아침 코디 받기 — 첫 7일 무료' : 'Daily Morning Looks — First 7 Days Free'}
              </button>
            )}
            <button className="btn-dark" onClick={handleRestart}>{t.backToHome}</button>
          </div>
        </div>

        {/* Fullscreen viewer 재사용 */}
        {fullscreenImage && (
          <div className="fullscreen-overlay" onClick={() => setFullscreenImage(null)}>
            <img src={fullscreenImage} alt="" className="fullscreen-img" />
          </div>
        )}
      </div>
    )
  }

  // Style Chat Page
  if (page === 'style-chat') {
    return (
      <div className="chat-page">
        <header className="chat-header">
          <button className="back-btn" onClick={() => setPage('landing')}>
            ← {t.backToHome}
          </button>
          <h1 className="chat-title">{t.chatTitle}</h1>
          <div className="chat-token-badge">
            {chatTokens > 0 ? `${chatTokens}${t.chatTokensLeft}` : '0'}
          </div>
        </header>

        <div className="chat-container">
          <div className="chat-messages">
            {/* Welcome message */}
            {chatMessages.length === 0 && (
              <div className="chat-welcome">
                <div className="chat-bubble-assistant">
                  <p>{t.chatWelcome}</p>
                </div>
                <div className="chat-examples">
                  <button className="chat-example-btn" onClick={() => { setChatInput(t.chatExample1) }}>
                    {t.chatExample1}
                  </button>
                  <button className="chat-example-btn" onClick={() => { setChatInput(t.chatExample2) }}>
                    {t.chatExample2}
                  </button>
                  <button className="chat-example-btn" onClick={() => { setChatInput(t.chatExample3) }}>
                    {t.chatExample3}
                  </button>
                </div>
              </div>
            )}

            {/* Chat messages */}
            {chatMessages.map((msg, i) => (
              msg.role === 'assistant' ? (
                <div key={i} className="chat-bubble-assistant"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(msg.content) }}
                />
              ) : (
                <div key={i} className="chat-bubble-user">
                  <p>{msg.content}</p>
                </div>
              )
            ))}

            {/* Loading indicator */}
            {chatLoading && (
              <div className="chat-bubble-assistant chat-typing">
                <span></span><span></span><span></span>
              </div>
            )}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Input bar */}
          {chatTokens > 0 ? (
            <div className="chat-input-bar">
              <input
                type="text"
                className="chat-input"
                placeholder={t.chatPlaceholder}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                disabled={chatLoading}
                maxLength={1000}
              />
              <button
                className="chat-send-btn"
                onClick={handleChatSend}
                disabled={!chatInput.trim() || chatLoading}
              >
                {t.chatSend}
              </button>
            </div>
          ) : (
            <div className="chat-input-bar chat-no-tokens">
              <p className="chat-no-tokens-text">{t.chatNoTokens}</p>
              <button className="btn-gold chat-buy-btn" onClick={handleChatBuyTokens}>
                {t.chatBuyTokens}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // How to Use Page
  if (page === 'how-to-use') {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo" onClick={handleRestart} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg className="logo-mark" viewBox="0 0 1024 1024" width="26" height="26" aria-hidden="true"><rect x="442" y="300" width="140" height="480" rx="70" fill="#4a4a63" transform="rotate(-20 512 780)"/><rect x="442" y="300" width="140" height="480" rx="70" fill="#8d7442" transform="rotate(20 512 780)"/><rect x="442" y="248" width="140" height="532" rx="70" fill="#d3b269"/></svg>
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
      trackEvent('login', { method: 'email' })
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
      trackEvent('sign_up', { method: 'email' })
      setAuthSuccess(t.signupSuccess)
      setAuthEmail('')
      setAuthPassword('')
      setAuthConfirmPassword('')
    }
    setIsAuthSubmitting(false)
  }

  const handleLogout = () => {
    console.log('Logout button clicked!')
    // Clear user-specific localStorage data on logout
    // Note: Do NOT remove stylist_free_trial_count — free trial is per-browser, not per-session
    localStorage.removeItem('stylist_subscription_active')
    localStorage.removeItem('stylist_subscription_checkout_id')
    localStorage.removeItem('paidCustomer')
    localStorage.removeItem('lastCheckoutId')
    localStorage.removeItem('pendingAnalysisFlag')
    localStorage.removeItem('productType')
    localStorage.removeItem('pending_subscription_data')
    // Reset state (freeTrialCount is intentionally NOT reset — free trial is per-browser)
    setIsSubscribed(false)
    setStyleImages([])
    setDailyStyle(null)
    setFavorites([])
    setFavoriteUrls(new Set())
    signOut()
  }

  const handleGoogleLogin = async () => {
    setAuthError('')
    setAuthSuccess('')
    setIsAuthSubmitting(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        console.error('Google login error:', error)
        setAuthError(error.message || t.authError)
        setIsAuthSubmitting(false)
      } else {
        trackEvent('login', { method: 'google' })
      }
      // OAuth 리다이렉트가 발생하므로 성공 시 isAuthSubmitting은 리셋되지 않음
    } catch (err) {
      console.error('Unexpected error during Google login:', err)
      setAuthError(t.authError)
      setIsAuthSubmitting(false)
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail) return
    setAuthError('')
    setAuthSuccess('')
    setIsAuthSubmitting(true)

    const { error } = await resetPassword(authEmail)

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

  const handleDeleteAccount = () => {
    if (!window.confirm(t.deleteAccountConfirm)) return
    // deleteAccount이 로컬 정리 + 리다이렉트를 즉시 처리함
    deleteAccount()
  }

  // Save analysis to history for logged-in users
  // Login Page
  if (page === 'login') {
    return (
      <div className="app-container auth-page">
        <header className="app-header">
          <div className="logo" onClick={() => setPage('landing')} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg className="logo-mark" viewBox="0 0 1024 1024" width="26" height="26" aria-hidden="true"><rect x="442" y="300" width="140" height="480" rx="70" fill="#4a4a63" transform="rotate(-20 512 780)"/><rect x="442" y="300" width="140" height="480" rx="70" fill="#8d7442" transform="rotate(20 512 780)"/><rect x="442" y="248" width="140" height="532" rx="70" fill="#d3b269"/></svg>
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

            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword}>
                <div className="input-group">
                  <label htmlFor="forgot-email">{t.email}</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-gold submit-btn"
                  disabled={isAuthSubmitting}
                >
                  {isAuthSubmitting ? '...' : t.resetPasswordBtn}
                </button>

                <div className="auth-switch">
                  <button onClick={() => { setShowForgotPassword(false); setAuthError(''); setAuthSuccess(''); }}>
                    {t.login}
                  </button>
                </div>
              </form>
            ) : (
              <>
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

                  <div className="forgot-password-link">
                    <button type="button" onClick={() => { setShowForgotPassword(true); setAuthError(''); setAuthSuccess(''); }}>
                      {t.forgotPassword}
                    </button>
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
              </>
            )}

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
              <svg className="logo-mark" viewBox="0 0 1024 1024" width="26" height="26" aria-hidden="true"><rect x="442" y="300" width="140" height="480" rx="70" fill="#4a4a63" transform="rotate(-20 512 780)"/><rect x="442" y="300" width="140" height="480" rx="70" fill="#8d7442" transform="rotate(20 512 780)"/><rect x="442" y="248" width="140" height="532" rx="70" fill="#d3b269"/></svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
        </header>

        <main className="auth-content">
          <div className="profile-form auth-form">
            <h2>{t.signupTitle}</h2>

            {authError && <div className="auth-error">{authError}</div>}

            {authSuccess ? (
              <div className="email-confirm-notice">
                <div className="confirm-icon">✉️</div>
                <div className="auth-success">{authSuccess}</div>
                <p className="confirm-hint">{t.checkSpamFolder}</p>
                <button
                  className="btn-gold submit-btn"
                  onClick={() => { setPage('login'); setAuthSuccess(''); }}
                >
                  {t.goToLogin}
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </main>
      </div>
    )
  }

  // Subscription Dashboard Page
  if (page === 'subscription-dashboard') {
    const weatherEmoji: Record<string, string> = {
      'Clear': '☀️', 'Clouds': '☁️', 'Rain': '🌧️', 'Drizzle': '🌦️',
      'Thunderstorm': '⛈️', 'Snow': '❄️', 'Mist': '🌫️', 'Fog': '🌫️',
    }

    const outfitImages = dailyStyle?.outfit_images || []

    return (
      <div className="app-container" style={{ background: 'var(--bg-light)', minHeight: '100vh' }}>
        <div className="dashboard-page">
          <button className="dashboard-back" onClick={() => setPage('landing')}>
            {t.dashboardBack}
          </button>

          <div className="dashboard-header">
            <h1 className="dashboard-title">{t.dashboardTitle}</h1>
            <p className="dashboard-subtitle">{t.dashboardSubtitle}</p>
            {user && pushStatus !== 'unsupported' && (
              <button
                className={`push-toggle-btn${pushStatus === 'enabled' ? ' push-on' : ''}`}
                disabled={pushStatus === 'enabled' || pushStatus === 'working'}
                onClick={enableMorningPush}
              >
                {pushStatus === 'enabled'
                  ? (lang === 'ko' ? '아침 알림 켜짐' : 'Morning alerts on')
                  : pushStatus === 'working'
                    ? (lang === 'ko' ? '설정 중...' : 'Setting up...')
                    : (lang === 'ko' ? '아침 알림 받기' : 'Get morning alerts')}
              </button>
            )}
          </div>

          {/* Hidden file input for profile photo (always rendered) */}
          <input
            ref={dashProfilePhotoRef}
            type="file"
            accept="image/*"
            onChange={handleDashProfilePhotoUpload}
            style={{ display: 'none' }}
          />

          {/* Profile Section — first-time setup OR editable summary */}
          {!isDailyStyleLoading && (
            <>
              {/* Completed profile: show summary with edit button */}
              {dashProfileComplete && !isDashProfileEditing && (
                <div className="dashboard-profile-summary">
                  <div className="dashboard-profile-summary-header">
                    <h3>{t.dashboardProfileTitle}</h3>
                    <button className="dashboard-profile-edit-btn" onClick={() => setIsDashProfileEditing(true)}>
                      {t.dashboardProfileEdit || 'Edit'}
                    </button>
                  </div>
                  <div className="dashboard-profile-summary-content">
                    <div className="dashboard-profile-photo-wrapper" onClick={() => dashProfilePhotoRef.current?.click()} style={{ cursor: 'pointer', position: 'relative' }}>
                      {(dashProfilePhotoUrl || dashProfilePhoto) ? (
                        <img
                          src={dashProfilePhoto || dashProfilePhotoUrl || ''}
                          alt="Profile"
                          className="dashboard-profile-summary-photo"
                        />
                      ) : (
                        <div className="dashboard-profile-summary-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#252540' }}>
                          <span style={{ fontSize: '24px' }}>+</span>
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(201,169,98,0.9)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                        <span>&#x1F4F7;</span>
                      </div>
                    </div>
                    <div className="dashboard-profile-summary-info">
                      {dashProfileHeight && <span>{t.dashboardProfileHeight}: {dashProfileHeight}cm</span>}
                      {dashProfileWeight && <span>{t.dashboardProfileWeight}: {dashProfileWeight}kg</span>}
                      {dashProfileGender && <span>{dashProfileGender === 'male' ? t.male : dashProfileGender === 'female' ? t.female : t.other}</span>}
                    </div>
                  </div>
                  {dashCanceledAt && (
                    <div className="dashboard-cancel-notice">
                      {t.subscriptionCanceledNotice || 'Subscription canceled. Daily style emails continue until your billing period ends.'}
                    </div>
                  )}
                </div>
              )}

              {/* Profile form: first-time OR editing mode */}
              {(!dashProfileComplete || isDashProfileEditing) && (
                <div className={`dashboard-profile-form ${!dashProfileComplete ? 'dashboard-profile-first' : ''}`}>
                  {!dashProfileComplete && (
                    <div className="dashboard-profile-badge">
                      <span>{t.dashboardProfileIncomplete}</span>
                    </div>
                  )}
                  <h3>{dashProfileComplete ? (t.dashboardProfileEdit || 'Edit Profile') : t.dashboardProfileTitle}</h3>
                  <p className="dashboard-profile-desc">{t.dashboardProfileDesc}</p>

                  {/* Current photo preview */}
                  {(dashProfilePhoto || dashProfilePhotoUrl) && (
                    <div className="dashboard-profile-current-photo">
                      <img
                        src={dashProfilePhoto || dashProfilePhotoUrl || ''}
                        alt="Current profile"
                        className="dashboard-profile-photo-preview"
                      />
                    </div>
                  )}

                  <div className="dashboard-profile-fields">
                    <div className="dashboard-profile-row">
                      <label>{t.dashboardProfileHeight}</label>
                      <input
                        type="number"
                        value={dashProfileHeight}
                        onChange={(e) => setDashProfileHeight(e.target.value)}
                        placeholder="170"
                      />
                    </div>
                    <div className="dashboard-profile-row">
                      <label>{t.dashboardProfileWeight}</label>
                      <input
                        type="number"
                        value={dashProfileWeight}
                        onChange={(e) => setDashProfileWeight(e.target.value)}
                        placeholder="65"
                      />
                    </div>
                    <div className="dashboard-profile-row">
                      <label>{t.dashboardProfileGender}</label>
                      <div className="dashboard-profile-gender-btns">
                        {(['male', 'female', 'other'] as const).map(g => (
                          <button
                            key={g}
                            className={`dashboard-gender-btn ${dashProfileGender === g ? 'active' : ''}`}
                            onClick={() => setDashProfileGender(g)}
                          >
                            {g === 'male' ? t.male : g === 'female' ? t.female : t.other}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="dashboard-profile-row">
                      <label>{t.dashboardProfilePhoto}</label>
                      <input
                        ref={dashProfilePhotoRef}
                        type="file"
                        accept="image/*"
                        onChange={handleDashProfilePhotoUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        className="dashboard-photo-upload-btn"
                        onClick={() => dashProfilePhotoRef.current?.click()}
                      >
                        {dashProfilePhoto ? '✓ ' + (t.dashboardProfilePhotoChange || 'Change Photo') : (t.dashboardProfilePhoto)}
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-profile-actions">
                    <button
                      className="dashboard-profile-save-btn"
                      onClick={async () => {
                        await handleDashProfileSave()
                        setIsDashProfileEditing(false)
                      }}
                      disabled={isDashProfileSaving}
                    >
                      {isDashProfileSaving ? t.dashboardProfileSaving : t.dashboardProfileSave}
                    </button>
                    {isDashProfileEditing && (
                      <button
                        className="dashboard-profile-cancel-btn"
                        onClick={() => setIsDashProfileEditing(false)}
                      >
                        {t.cancel || 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {isDailyStyleLoading && (
            <div className="dashboard-loading">
              <div className="dashboard-loading-spinner" />
              <p>{t.dashboardLoading}</p>
            </div>
          )}

          {dailyStyleError && (
            <div className="dashboard-error">
              <p>{dailyStyleError}</p>
              <button onClick={loadDailyStyle}>{t.dashboardRetry}</button>
            </div>
          )}

          {dailyStyle && !isDailyStyleLoading && (
            <>
              <div className="dashboard-weather-card">
                <div className="dashboard-weather-main">
                  <span className="dashboard-weather-emoji">
                    {weatherEmoji[dailyStyle.weather.condition] || '🌤️'}
                  </span>
                  <span className="dashboard-weather-temp">{dailyStyle.weather.temp}°C</span>
                  <span className="dashboard-weather-city">{dailyStyle.city}</span>
                </div>
                <div className="dashboard-weather-details">
                  <span>{t.dashboardFeelsLike} {dailyStyle.weather.feels_like}°C</span>
                  <span>{t.dashboardHumidity} {dailyStyle.weather.humidity}%</span>
                  <span>{t.dashboardWind} {dailyStyle.weather.wind_speed}m/s</span>
                </div>
              </div>

              {/* Outfit Image Gallery */}
              {outfitImages.length > 0 ? (
                <div className="dashboard-gallery">
                  <h3 className="dashboard-gallery-title">{t.dashboardGalleryTitle}</h3>
                  <div className="dashboard-gallery-scroll">
                    {outfitImages.map((img) => (
                      <div key={img.id} className="dashboard-gallery-card">
                        <div className="dashboard-gallery-img-wrap" onClick={() => setFullscreenImage(img.url)}>
                          <img src={img.url} alt={img.label} />
                        </div>
                        <div className="dashboard-gallery-card-footer">
                          <span className="dashboard-gallery-label">{img.label}</span>
                          {user && (
                            <button
                              className={`favorite-btn ${favoriteUrls.has(img.url) ? 'active' : ''}`}
                              onClick={() => toggleFavorite(img.url, 'daily', img.label)}
                            >
                              {favoriteUrls.has(img.url) ? '♥' : '♡'}
                            </button>
                          )}
                        </div>
                        {/* 피드백 → 내일 추천이 학습 */}
                        <div className="outfit-feedback-row">
                          <button
                            className={`outfit-fb-btn${outfitFeedback[img.id] === 'like' ? ' fb-on' : ''}`}
                            onClick={() => handleOutfitFeedback(img.id, 'like', img.label)}
                          >
                            {lang === 'ko' ? '좋아요' : 'Love it'}
                          </button>
                          <button
                            className={`outfit-fb-btn fb-neg${outfitFeedback[img.id] === 'dislike' ? ' fb-on' : ''}`}
                            onClick={() => handleOutfitFeedback(img.id, 'dislike', img.label)}
                          >
                            {lang === 'ko' ? '별로예요' : 'Not for me'}
                          </button>
                        </div>
                        {outfitFeedback[img.id] && (
                          <p className="outfit-fb-note">
                            {lang === 'ko' ? '내일 추천에 반영돼요' : "We'll factor this in tomorrow"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="dashboard-gallery-empty">
                  <p>{t.dashboardGalleryEmpty}</p>
                </div>
              )}

              <div className="dashboard-recommendation">
                <h3>{t.dashboardStyleTip}</h3>
                <div className="dashboard-recommendation-text">
                  {dailyStyle.recommendation.split('\n').map((line, i) => (
                    <p key={i}>{line || '\u00A0'}</p>
                  ))}
                </div>
              </div>

              <p className="dashboard-footer-note">{t.dashboardNewDay}</p>
            </>
          )}

          {/* My Wardrobe — 실제 보유한 옷 위주로 데일리 코디 조합 */}
          {user && (
            <div className="wardrobe-section">
              <h3 className="dashboard-gallery-title">{lang === 'ko' ? '내 옷장' : 'My Wardrobe'}</h3>
              <p className="wardrobe-desc">
                {lang === 'ko'
                  ? '가지고 있는 옷을 등록하면, 매일 아침 코디가 내 옷 위주로 조합돼요. 전부 등록할 필요 없이 자주 입는 옷 몇 벌이면 충분해요.'
                  : 'Add clothes you actually own and your daily looks will be built around them. A few favorites are enough — no need to catalog everything.'}
              </p>
              <div className="wardrobe-grid">
                {wardrobeItems.map((item) => (
                  <div key={item.id} className="wardrobe-item">
                    <img src={item.image_url} alt={item.description} loading="lazy" />
                    <button
                      className="wardrobe-delete"
                      aria-label={lang === 'ko' ? '삭제' : 'Delete'}
                      onClick={() => handleWardrobeDelete(item.id)}
                    >×</button>
                  </div>
                ))}
                {wardrobeItems.length < 12 && (
                  <button
                    className="wardrobe-add"
                    disabled={wardrobeUploading}
                    onClick={() => wardrobeInputRef.current?.click()}
                  >
                    {wardrobeUploading
                      ? (lang === 'ko' ? '분석 중...' : 'Analyzing...')
                      : `+ ${lang === 'ko' ? '옷 추가' : 'Add item'}`}
                  </button>
                )}
              </div>
              {wardrobeItems.length > 0 && (
                <p className="wardrobe-count">{wardrobeItems.length}/12 · {lang === 'ko' ? '내일 아침 코디부터 반영돼요' : 'Applied from tomorrow\'s look'}</p>
              )}
              <input
                ref={wardrobeInputRef}
                type="file"
                accept="image/*"
                onChange={handleWardrobeUpload}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {/* Favorites Section */}
          {favorites.length > 0 && (
            <div className="dashboard-favorites">
              <h3 className="dashboard-gallery-title">{t.favoritesGallery}</h3>
              <div className="dashboard-gallery-scroll">
                {favorites.map((fav) => (
                  <div key={fav.id} className="dashboard-gallery-card">
                    <div className="dashboard-gallery-img-wrap" onClick={() => setFullscreenImage(fav.image_url)}>
                      <img src={fav.image_url} alt={fav.label || ''} />
                    </div>
                    <div className="dashboard-gallery-card-footer">
                      <span className="dashboard-gallery-label">{fav.label || fav.image_type}</span>
                      <button
                        className="favorite-btn active"
                        onClick={() => toggleFavorite(fav.image_url, fav.image_type as 'style' | 'hair' | 'daily', fav.label || undefined)}
                      >
                        ♥
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscription Management */}
          <div className="dashboard-subscription-manage">
            <button
              className="dashboard-manage-btn"
              onClick={handleManageSubscription}
              disabled={isOpeningPortal}
            >
              {isOpeningPortal ? '...' : t.subscriptionManage}
            </button>
          </div>
        </div>

        {/* Fullscreen Image Viewer */}
        {fullscreenImage && (
          <div className="fullscreen-overlay" onClick={() => setFullscreenImage(null)}>
            <div className="fullscreen-actions">
              <button className="fullscreen-action-btn" onClick={(e) => { e.stopPropagation(); downloadImage(fullscreenImage, 'stylist-style.jpg') }}>
                {t.saveImage}
              </button>
              <button className="fullscreen-close" onClick={() => setFullscreenImage(null)}>×</button>
            </div>
            <img src={fullscreenImage} alt="Fullscreen" className="fullscreen-image" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {/* Favorite Toast */}
        {favoriteToast && (
          <div className="favorite-toast">{favoriteToast}</div>
        )}
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
              <svg className="logo-mark" viewBox="0 0 1024 1024" width="26" height="26" aria-hidden="true"><rect x="442" y="300" width="140" height="480" rx="70" fill="#4a4a63" transform="rotate(-20 512 780)"/><rect x="442" y="300" width="140" height="480" rx="70" fill="#8d7442" transform="rotate(20 512 780)"/><rect x="442" y="248" width="140" height="532" rx="70" fill="#d3b269"/></svg>
            </div>
            <span className="logo-text">{t.title}</span>
          </div>
          <div className="header-actions">
            <button type="button" onClick={handleLogout} className="btn-outline-sm">
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


            {/* Favorites Section */}
            <div className="profile-section">
              <h3>{t.favoritesTitle}</h3>
              {favorites.length === 0 ? (
                <p className="no-history">{t.favoritesEmpty}</p>
              ) : (
                <div className="profile-favorites-grid">
                  {favorites.map((fav) => (
                    <div key={fav.id} className="profile-fav-card">
                      <div className="profile-fav-img-wrap" onClick={() => setFullscreenImage(fav.image_url)}>
                        <img src={fav.image_url} alt={fav.label || ''} />
                      </div>
                      <div className="profile-fav-footer">
                        <span className="profile-fav-label">{fav.label || fav.image_type}</span>
                        <button
                          className="favorite-btn active"
                          onClick={() => toggleFavorite(fav.image_url, fav.image_type as 'style' | 'hair' | 'daily', fav.label || undefined)}
                        >
                          ♥
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

              {isSubscribed && (
                <div className="setting-item" style={{ marginTop: '1.5rem' }}>
                  <div className="setting-info">
                    <strong>{t.subscriptionManage}</strong>
                    <p>{t.subscriptionManageDesc || 'Manage billing, payment method, and cancellation.'}</p>
                  </div>
                  <button
                    onClick={handleManageSubscription}
                    className="btn-outline-sm"
                    disabled={isOpeningPortal}
                  >
                    {isOpeningPortal ? '...' : t.subscriptionManage}
                  </button>
                </div>
              )}

              <div className="setting-item" style={{ marginTop: isSubscribed ? '0' : '1.5rem' }}>
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
              <svg className="logo-mark" viewBox="0 0 1024 1024" width="26" height="26" aria-hidden="true"><rect x="442" y="300" width="140" height="480" rx="70" fill="#4a4a63" transform="rotate(-20 512 780)"/><rect x="442" y="300" width="140" height="480" rx="70" fill="#8d7442" transform="rotate(20 512 780)"/><rect x="442" y="248" width="140" height="532" rx="70" fill="#d3b269"/></svg>
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
                  onClick={() => { setLang(code); trackEvent('language_change', { language: code }) }}
                >
                  {languageNames[code]}
                </button>
              ))}
            </div>
            {isSupabaseConfigured && (
              user ? (
                <div className="auth-buttons">
                  <button type="button" onClick={() => { trackEvent('header_click', { button: 'my_profile' }); setPage('profile') }} className="btn-primary-sm">
                    {t.myProfile}
                  </button>
                  <button type="button" onClick={handleLogout} className="btn-outline-sm">
                    {t.logout}
                  </button>
                </div>
              ) : (
                <div className="auth-buttons">
                  <button onClick={() => { trackEvent('header_click', { button: 'login' }); setPage('login') }} className="btn-outline-sm">
                    {t.login}
                  </button>
                  <button onClick={() => { trackEvent('header_click', { button: 'signup' }); setPage('signup') }} className="btn-primary-sm">
                    {t.signup}
                  </button>
                </div>
              )
            )}
            <button className="btn-primary" onClick={() => { trackEvent('landing_start_click'); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}>
              {t.startBtn}
            </button>
          </div>
        </header>

        {/* Hero Section — cinematic dark, word-by-word reveal */}
        <section
          className="hero-cinema"
          data-weather={weatherPreview ? getWeatherBucket(weatherPreview.condition, weatherPreview.temp, new Date().getHours()) : 'clouds'}
          onPointerMove={(e) => {
            if (window.matchMedia('(pointer: fine)').matches) {
              const rect = e.currentTarget.getBoundingClientRect()
              e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`)
              e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`)
            }
          }}
        >
          {/* Weather atmosphere — 장식 레이어 (콘텐츠 뒤, 상호작용 없음) */}
          <div className="hero-atmo-sky" aria-hidden="true"></div>
          <div className={`hero-atmo-active${weatherPreview ? ' on' : ''}`} aria-hidden="true"></div>
          <div className="hero-atmo-glow" aria-hidden="true"></div>
          <div className="hero-atmo-fx-a" aria-hidden="true"></div>
          <div className="hero-atmo-fx-b" aria-hidden="true"></div>

          {/* Weather spine — 데스크톱 좌측 세로 타이포 (에디토리얼 비대칭) */}
          {weatherCopy && (
            <div className="hero-weather-spine" aria-hidden="true">
              <span>{weatherCopy.eyebrow}</span>
            </div>
          )}

          <span className="hero-cinema-badge hero-eyebrow-slot">
            {weatherCopy ? weatherCopy.eyebrow : (lang === 'ko' ? 'AI 퍼스널 컬러 진단' : 'AI PERSONAL COLOR ANALYSIS')}
          </span>
          <h1 className="hero-cinema-headline" aria-label={lang === 'ko' ? '오늘, 뭐 입지?' : 'What to wear today'}>
            {(lang === 'ko' ? ['오늘,', '뭐', '입지?'] : ['WHAT', 'TO', 'WEAR', 'TODAY']).map((word, i, arr) => (
              <span
                key={i}
                aria-hidden="true"
                className={`hero-word${i === arr.length - 1 ? ' hero-word-accent' : ''}`}
                style={{ animationDelay: `${0.15 + i * 0.14}s` }}
              >
                {word}
              </span>
            ))}
          </h1>
          <p className="hero-cinema-sub">
            {weatherCopy
              ? weatherCopy.sub
              : (lang === 'ko'
                ? '사진 한 장이면, AI가 어울리는 스타일을 입혀서 보여드립니다.'
                : 'One photo — AI shows you wearing the styles that suit you.')}
          </p>
          <div className="hero-value-chips">
            <span className="hero-value-chip">{lang === 'ko' ? '매일 아침 날씨별 코디' : 'Daily Weather Outfits'}</span>
            <span className="hero-value-chip">{lang === 'ko' ? '퍼스널 컬러 진단' : 'Color Analysis'}</span>
            <span className="hero-value-chip">{lang === 'ko' ? '내 사진으로 스타일 변환' : 'AI Restyle on Your Photo'}</span>
          </div>
          {heroVideoOk && (
            <video
              className="hero-film"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/gallery/after-female-date.png"
              onError={() => setHeroVideoOk(false)}
              aria-label="AI styled fashion film"
            >
              <source src="/hero-loop.mp4" type="video/mp4" onError={() => setHeroVideoOk(false)} />
            </video>
          )}
          {!heroVideoOk && (
          <div
            className="ba-slider hero-ba-slider"
            ref={heroSliderRef}
            onMouseDown={handleHeroSliderMouseDown}
            onTouchStart={handleHeroSliderTouchStart}
          >
            <img src="/gallery/after-female-date.png" alt="After" className="ba-img ba-after" />
            <div className="ba-before-clip" style={{ width: `${heroSliderPos}%` }}>
              <img src="/gallery/before-female.png" alt="Before" className="ba-img ba-before" style={{ width: `${heroSliderRef.current?.offsetWidth || 480}px` }} />
            </div>
            <div className="ba-handle" style={{ left: `${heroSliderPos}%` }}>
              <div className="ba-handle-line"></div>
              <div className="ba-handle-circle">◀ ▶</div>
              <div className="ba-handle-line"></div>
            </div>
            <span className="ba-label ba-label-before">{t.galleryBefore}</span>
            <span className="ba-label ba-label-after">{t.galleryAfter}</span>
          </div>
          )}
          {isSubscribed ? (
            <div className="hero-cta-row">
              {/* 구독자의 "오늘 뭐 입지?"에 대한 답은 오늘의 추천 — 그게 첫 번째 버튼 */}
              <button className="free-cta-pulse hero-gold-cta" onClick={() => { trackEvent('hero_cta_click', { type: 'todays_style' }); setPage('subscription-dashboard') }}>
                {lang === 'ko' ? '오늘의 코디 보기' : "See Today's Look"}
              </button>
              <button className="hero-ghost-cta" onClick={() => { trackEvent('hero_cta_click', { type: 'free_analysis' }); setPage('input') }}>
                {lang === 'ko' ? '새 분석 시작' : 'New Analysis'}
              </button>
            </div>
          ) : (
            <button className="free-cta-pulse hero-gold-cta" onClick={() => { trackEvent('hero_cta_click', { type: 'free_analysis', weather_copy_variant: weatherPreview ? getWeatherBucket(weatherPreview.condition, weatherPreview.temp, new Date().getHours()) : 'none' }); setPage('input') }}>
              {weatherCopy ? weatherCopy.cta : (lang === 'ko' ? '무료 컬러 분석 시작' : 'Start Free Color Analysis')}
            </button>
          )}
          <div className="hero-trust-signals hero-trust-dark">
            <span>{lang === 'ko' ? '첫 분석 무료' : 'First Analysis Free'}</span>
            <span>{lang === 'ko' ? '30초 완료' : '30 Seconds'}</span>
            <span>{lang === 'ko' ? '즉시 결과' : 'Instant Results'}</span>
          </div>
        </section>

        {/* Services Section — single hero card */}
        <section className="path-section" id="features" ref={(el) => {
          if (el) {
            const card = el.querySelector('.service-hero-card')
            if (!card) return
            const observer = new IntersectionObserver(([entry]) => {
              if (entry.isIntersecting) {
                card.classList.add('visible')
                observer.disconnect()
              }
            }, { threshold: 0.15 })
            observer.observe(el)
          }
        }}>
          <div className="collection-header fade-in-up">
            <span className="collection-eyebrow">THE COLLECTION — FW26</span>
            <p className="collection-line">
              {lang === 'ko'
                ? '이번 시즌의 아틀리에 룩과 에센셜로 스타일링됩니다 · 시즌마다 컬렉션이 바뀝니다'
                : 'Styled with this season\'s atelier looks and essentials · The collection changes every season'}
            </p>
          </div>
          <div className="service-split">
            {/* 좌: 대형 트랜스포메이션 카드 (풀블리드 이미지 + 절제된 타입) */}
            <div className="service-hero-card fade-in-up" onClick={() => { trackEvent('select_item', { item_category: 'premium_report' }); setPage('input') }}>
              <img src="/gallery/service-wide.webp" alt="AI Style Transformation" className="service-hero-img" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = '/gallery/after-female-date.png' }} />
              <div className="service-hero-overlay"></div>
              <div className="service-hero-content">
                <span className="service-hero-tag">SERVICE — TRANSFORM</span>
                <h2 className="service-hero-title">{t.module2Title}</h2>
                <p className="service-hero-desc">{t.module2Desc}</p>
                <div className="service-hero-cta">{t.explore} →</div>
              </div>
            </div>

            {/* 우: 에디토리얼 인덱스 — 카드 박스 없이 헤어라인 룰로 구분 */}
            <div className="service-index">
              <div className="service-index-row fade-in-up" onClick={() => { trackEvent('select_item', { item_category: 'hair' }); setPage('hair-selection') }}>
                <svg className="service-index-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#c9a962" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M8.2 7.6 20 19M8.2 16.4 20 5"/></svg>
                <span className="service-index-label">SERVICE — HAIR</span>
                <h3 className="service-index-title">{lang === 'ko' ? '헤어 스타일 미리보기' : 'Hair Preview'}</h3>
                <p className="service-index-desc">
                  {lang === 'ko' ? '시술 전에 내 얼굴로 3가지 스타일을 확인 — 무료' : 'See three styles on your own face before the salon — free'}
                </p>
                <span className="service-index-arrow">→</span>
              </div>
              <div className="service-index-row fade-in-up" onClick={() => { trackEvent('select_item', { item_category: 'style_chat' }); setPage('style-chat') }}>
                <svg className="service-index-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#c9a962" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.9A8 8 0 1 1 21 12Z"/></svg>
                <span className="service-index-label">SERVICE — ADVISOR</span>
                <h3 className="service-index-title">{t.chatCardTitle}</h3>
                <p className="service-index-desc">{t.chatCardDesc}</p>
                <span className="service-index-arrow">→</span>
              </div>
              <div
                className="service-index-row service-index-daily fade-in-up"
                onClick={() => {
                  if (isSubscribed) {
                    trackEvent('select_item', { item_category: 'daily_dashboard' })
                    setPage('subscription-dashboard')
                  } else if (user) {
                    trackEvent('select_item', { item_category: 'daily_subscribe' })
                    handleSubscription()
                  } else {
                    trackEvent('select_item', { item_category: 'daily_via_analysis' })
                    setPage('input')
                  }
                }}
              >
                <svg className="service-index-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#c9a962" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="m3 8 9 6 9-6"/></svg>
                <span className="service-index-label">SERVICE — DAILY</span>
                <h3 className="service-index-title">{lang === 'ko' ? '매일 아침, 오늘의 코디' : 'What to Wear Today'}</h3>
                <p className="service-index-desc">
                  {isSubscribed
                    ? (lang === 'ko' ? '구독 중 — 오늘의 추천 확인하기' : "Subscribed — see today's look")
                    : weatherPreview
                      ? (lang === 'ko'
                        ? `내일 아침 7시, ${weatherPreview.city} 날씨 기준 코디 도착 — 오늘은 ${getWeatherTip(weatherPreview.temp, weatherPreview.condition, 'ko')} · 첫 7일 무료`
                        : `Tomorrow 7 AM: an outfit for ${weatherPreview.city} — today is ${getWeatherTip(weatherPreview.temp, weatherPreview.condition, 'en')} · First 7 days free`)
                      : (lang === 'ko' ? '날씨와 내 컬러에 맞춘 코디를 매일 아침 이메일로 · 첫 7일 무료' : 'Weather-matched looks in your inbox every morning · First 7 days free')}
                </p>
                <span className="service-index-arrow">→</span>
              </div>
            </div>
          </div>

          {/* 360° style view — renders only when /public/spin frames exist */}
          <SpinViewer
            basePath="/spin/look-01"
            frameCount={24}
            hint={lang === 'ko' ? '드래그해서 360도로 스타일을 살펴보세요' : 'Drag to view the look in 360°'}
          />
        </section>

        <div className="section-divider-full"></div>

        {/* How It Works — 3-step process */}
        <section className="how-it-works-section" ref={(el) => {
          if (el) {
            const items = el.querySelectorAll('.how-title, .how-step, .how-cta')
            const observer = new IntersectionObserver(([entry]) => {
              if (entry.isIntersecting) {
                items.forEach((item, i) => {
                  setTimeout(() => item.classList.add('visible'), i * 120)
                })
                observer.disconnect()
              }
            }, { threshold: 0.2 })
            observer.observe(el)
          }
        }}>
          <h2 className="how-title fade-in-up">{lang === 'ko' ? '이렇게 진행됩니다' : 'How It Works'}</h2>
          <div className="how-steps">
            <div className="how-step fade-in-up">
              <div className="how-step-num">1</div>
              <h3 className="how-step-title">{lang === 'ko' ? '사진 업로드' : 'Upload Photo'}</h3>
              <p className="how-step-desc">{lang === 'ko' ? '셀카 또는 전신 사진 한 장이면 충분합니다' : 'A selfie or full-body photo is all you need'}</p>
            </div>
            <div className="how-step-arrow">→</div>
            <div className="how-step fade-in-up">
              <div className="how-step-num">2</div>
              <h3 className="how-step-title">{lang === 'ko' ? '스타일 분석' : 'Style Analysis'}</h3>
              <p className="how-step-desc">{lang === 'ko' ? '얼굴형, 체형, 피부톤을 종합 분석합니다' : 'Face shape, body type, and skin tone analyzed'}</p>
            </div>
            <div className="how-step-arrow">→</div>
            <div className="how-step fade-in-up">
              <div className="how-step-num">3</div>
              <h3 className="how-step-title">{lang === 'ko' ? '맞춤 결과' : 'Your Results'}</h3>
              <p className="how-step-desc">{lang === 'ko' ? '패션 코디 3종을 받아보세요' : '3 personalized fashion looks delivered'}</p>
            </div>
            <div className="how-step-arrow">→</div>
            <div className="how-step how-step-daily fade-in-up">
              <div className="how-step-num">4</div>
              <h3 className="how-step-title">{lang === 'ko' ? '매일 아침' : 'Every Morning'}</h3>
              <p className="how-step-desc">{lang === 'ko' ? '날씨에 맞춘 코디가 이메일로 도착' : 'Weather-matched looks in your inbox'}</p>
            </div>
          </div>
          <button className="how-cta fade-in-up" onClick={() => { trackEvent('how_cta_click'); setPage('input') }}>
            {t.galleryCta}
          </button>
        </section>

        <div className="section-divider-full"></div>

        {/* Referral Section — logged-in users only */}
        {user && referralCode && (
          <section className="referral-section">
            <h2 className="referral-section-title">{t.referralTitle}</h2>
            <p className="referral-section-desc">{t.referralDesc}</p>
            <div className="referral-stats">
              <span className="referral-stat">{referralStats.total}{t.referralInvited}</span>
              <span className="referral-stat">{referralStats.credits}{t.referralCredits}</span>
            </div>
            <div className="referral-link-box">
              <input
                type="text"
                readOnly
                value={`kstylist.cc/?ref=${referralCode}`}
                className="referral-link-input"
              />
              <button className="referral-copy-btn" onClick={copyReferralLink}>
                {t.referralCopyLink}
              </button>
            </div>
            {referralToast && <div className="referral-toast">{referralToast}</div>}
          </section>
        )}

        {/* Footer */}
        <footer className="landing-footer" ref={(el) => {
          if (el) {
            const items = el.querySelectorAll('.footer-brand, .footer-col, .footer-bottom')
            const observer = new IntersectionObserver(([entry]) => {
              if (entry.isIntersecting) {
                items.forEach((item, i) => {
                  setTimeout(() => item.classList.add('visible'), i * 100)
                })
                observer.disconnect()
              }
            }, { threshold: 0.2 })
            observer.observe(el)
          }
        }}>
          <div className="footer-content">
            <div className="footer-brand fade-in-up">
              <h2 className="footer-logo">{t.title}</h2>
              <p className="footer-desc">{t.subtitle}</p>
            </div>
            <div className="footer-links">
              <div className="footer-col fade-in-up">
                <h5>{t.footerLegal}</h5>
                <a href="#" onClick={(e) => { e.preventDefault(); setPolicyModal('terms') }}>{t.footerTerms}</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setPolicyModal('privacy') }}>{t.footerPrivacy}</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setPolicyModal('refund') }}>{t.footerRefund}</a>
              </div>
            </div>
          </div>
          <div className="footer-business fade-in-up">
            {/* 전자상거래법 표시 의무 — 사업자등록번호·통신판매업신고번호는 발급 후 아래에 추가 */}
            <span>상호: DevPark.MD</span>
            <span className="footer-biz-divider" aria-hidden="true">|</span>
            <span>대표: 박정열</span>
            <span className="footer-biz-divider" aria-hidden="true">|</span>
            <span>문의: mdjypark@gmail.com</span>
          </div>
          <div className="footer-bottom fade-in-up">
            <span>{t.footerCopyright}</span>
          </div>
        </footer>

        {/* Subscription Form Modal */}
        {showSubscriptionForm && (
          <div className="policy-modal-overlay" onClick={() => setShowSubscriptionForm(false)}>
            <div className="subscription-form-modal" onClick={(e) => e.stopPropagation()}>
              <button className="policy-modal-close" onClick={() => setShowSubscriptionForm(false)}>×</button>
              <div className="subscription-form-header">
                <span className="subscription-badge">{t.subscriptionTrialDays}</span>
                <h2>{t.subscriptionFormTitle}</h2>
                <p>{t.subscriptionFormDesc}</p>
              </div>
              <div className="subscription-form-body">
                <label className="subscription-form-label">
                  {t.subscriptionCityLabel}
                  <input
                    type="text"
                    className="subscription-form-input"
                    placeholder={t.subscriptionCityPlaceholder}
                    value={subscriptionCity}
                    onChange={(e) => {
                      setSubscriptionCity(e.target.value)
                      setSubscriptionCityError('')
                    }}
                    autoFocus
                  />
                  {subscriptionCityError && (
                    <span className="subscription-form-error">{subscriptionCityError}</span>
                  )}
                </label>
                <div className="subscription-form-info">
                  <div className="subscription-form-price">
                    <span className="subscription-price">{t.subscriptionPrice}</span>
                    <span className="subscription-form-trial">{t.subscriptionTrialDays}</span>
                  </div>
                </div>
                <button
                  className="subscription-form-submit"
                  onClick={handleSubscriptionSubmit}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? '...' : t.subscriptionFormStart}
                </button>
              </div>
            </div>
          </div>
        )}

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
              <svg className="logo-mark" viewBox="0 0 1024 1024" width="26" height="26" aria-hidden="true"><rect x="442" y="300" width="140" height="480" rx="70" fill="#4a4a63" transform="rotate(-20 512 780)"/><rect x="442" y="300" width="140" height="480" rx="70" fill="#8d7442" transform="rotate(20 512 780)"/><rect x="442" y="248" width="140" height="532" rx="70" fill="#d3b269"/></svg>
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

        <div className="report-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
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

          {/* Style DNA Card */}
          {report && (() => {
            const dna = parseStyleDNA(report)
            return (
              <div className="style-dna-card">
                <h3 className="style-dna-title">{t.styleDnaTitle}</h3>
                {dna.season && (
                  <div className="dna-row">
                    <span className="dna-label">{t.styleDnaSeason}</span>
                    <span className={`dna-season-badge ${dna.season}`}>
                      {t.styleDnaSeasons[dna.season]}
                    </span>
                  </div>
                )}
                {dna.bodyType && (
                  <div className="dna-row">
                    <span className="dna-label">{t.styleDnaBodyType}</span>
                    <span className="dna-value">{dna.bodyType}</span>
                  </div>
                )}
                {dna.colors.length > 0 && (
                  <div className="dna-row dna-colors-row">
                    <span className="dna-label">{t.styleDnaColors}</span>
                    <div className="dna-swatches">
                      {dna.colors.map((c, i) => (
                        <div
                          key={i}
                          className="dna-swatch"
                          style={{ background: colorNameToHex(c) || '#ccc' }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {/* Extended Color Palette — Premium only (30 best + 10 avoid) */}
                {isFullPaid && colorPalette && (
                  <>
                    {colorPalette.bestColors?.length > 0 && (
                      <div className="dna-row dna-palette-row">
                        <span className="dna-label">{lang === 'ko' ? '추천 컬러 팔레트 (30)' : 'Your Best 30 Colors'}</span>
                        <div className="dna-palette-grid">
                          {colorPalette.bestColors.map((hex, i) => (
                            <div key={i} className="dna-palette-swatch" style={{ background: hex }} title={hex} />
                          ))}
                        </div>
                      </div>
                    )}
                    {colorPalette.avoidColors?.length > 0 && (
                      <div className="dna-row dna-palette-row dna-avoid-row">
                        <span className="dna-label">{lang === 'ko' ? '피해야 할 컬러 (10)' : 'Colors to Avoid'}</span>
                        <div className="dna-palette-grid">
                          {colorPalette.avoidColors.map((hex, i) => (
                            <div key={i} className="dna-palette-swatch dna-avoid-swatch" style={{ background: hex }} title={hex} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {/* Palette teaser for free users */}
                {!isFullPaid && colorPalette && colorPalette.bestColors?.length > 0 && (
                  <div className="dna-row dna-palette-teaser">
                    <span className="dna-label">{lang === 'ko' ? '전체 추천 팔레트' : 'Full Color Palette'}</span>
                    <div className="dna-palette-grid dna-palette-blurred">
                      {colorPalette.bestColors.slice(0, 15).map((hex, i) => (
                        <div key={i} className="dna-palette-swatch" style={{ background: hex }} />
                      ))}
                    </div>
                    <p className="dna-palette-lock-hint">
                      {lang === 'ko' ? '프리미엄 리포트에서 30개 추천 + 10개 비추천 컬러 확인' : '30 best + 10 avoid colors in Premium Report'}
                    </p>
                  </div>
                )}
                {dna.silhouettes.length > 0 && (
                  <div className="dna-row dna-silhouettes-row">
                    <span className="dna-label">{t.styleDnaSilhouettes}</span>
                    <div className="dna-silhouette-list">
                      {dna.silhouettes.map((s, i) => (
                        <span key={i} className="dna-silhouette-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  className="btn-gold dna-share-btn"
                  onClick={async () => {
                    trackEvent('share_color_card', { season: dna?.season || 'unknown' })
                    try {
                      const { generateShareCard: genCard } = await import('./utils/shareCard')
                      // API의 12타입 라벨 우선, parseStyleDNA 4계절 추론은 폴백
                      const fallbackLabel = dna?.season ? (dna.season.charAt(0).toUpperCase() + dna.season.slice(1)) + ' ' + (dna.season === 'spring' || dna.season === 'autumn' ? 'Warm' : 'Cool') : 'Unknown'
                      const blob = await genCard({
                        season: seasonInfo?.label_en || fallbackLabel,
                        seasonKo: seasonInfo?.label_ko || (dna?.season ? t.styleDnaSeasons[dna.season as keyof typeof t.styleDnaSeasons] : undefined),
                        palette: (dna?.colors || []).map((c: string) => c).filter(Boolean),
                        bodyType: dna?.bodyType || undefined,
                        format: '9:16'
                      })
                      const file = new File([blob], 'my-personal-color.png', { type: 'image/png' })
                      if (navigator.share && navigator.canShare?.({ files: [file] })) {
                        await navigator.share({ files: [file], title: lang === 'ko' ? '나의 퍼스널 컬러' : 'My Personal Color', text: lang === 'ko' ? '나의 퍼스널 컬러를 발견했어요!' : 'I discovered my personal color!' })
                      } else {
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'my-personal-color.png'
                        a.click()
                        URL.revokeObjectURL(url)
                      }
                    } catch (err) {
                      if ((err as Error).name !== 'AbortError') console.error('Share card failed:', err)
                    }
                  }}
                >
                  {lang === 'ko' ? '컬러 카드 공유' : 'Share Color Card'}
                </button>
              </div>
            )
          })()}

          {report && (
            <div
              className="report-content"
              style={{ display: 'block', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(report) }}
            />
          )}
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
              <div className="progress-bar-container small" style={{ marginTop: '0.75rem', width: '240px' }}>
                <div className="progress-bar" style={{ width: `${styleGenProgress}%`, transition: 'width 0.5s ease-out' }}></div>
              </div>
              <span className="progress-text" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{styleGenProgress}%</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>
                {styleGenStep}
              </span>
            </div>
          ) : styleImages.length > 0 && styleImages.some(s => s.imageUrl) ? (
            <>
              <div className="style-grid">
                {styleImages.map((style, index) => {
                  const isLocked = !isFullPaid && index > 0
                  return (
                    <div key={style.id} className={`style-card ${isLocked ? 'locked' : ''}`}>
                      <div className="style-image-container">
                        {style.imageUrl ? (
                          <>
                            <img
                              src={style.imageUrl}
                              alt={t.styleLabels[style.id] || style.label}
                              className={isLocked ? 'style-image style-image-blurred' : 'style-image'}
                              onClick={() => !isLocked && setFullscreenImage(style.imageUrl)}
                            />
                            {isLocked && (
                              <div className="lock-overlay" onClick={() => handlePayment('full')}>
                                <div className="lock-icon-svg">
                                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                </div>
                                <p className="lock-text">
                                  {lang === 'ko' ? '프리미엄 리포트에서 확인' : 'Available in Premium Report'}
                                </p>
                                <p className="lock-subtext">
                                  {lang === 'ko' ? '이런 코디가 매일 아침 도착합니다' : 'Looks like this arrive every morning'}
                                </p>
                              </div>
                            )}
                            {!isLocked && user && (
                              <button
                                className={`favorite-btn-overlay ${favoriteUrls.has(style.imageUrl) ? 'active' : ''}`}
                                onClick={() => toggleFavorite(style.imageUrl!, 'style', t.styleLabels[style.id] || style.label)}
                              >
                                {favoriteUrls.has(style.imageUrl) ? '♥' : '♡'}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="style-placeholder">
                            <span className="style-icon" aria-hidden="true">S</span>
                          </div>
                        )}
                      </div>
                      <span className="style-label">{t.styleLabels[style.id] || style.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* Premium CTA — 미결제 유저에게 블러 이미지 아래 표시 */}
              {!isFullPaid && (
                <div className="premium-cta-section">
                  <h3 className="premium-cta-title">
                    {lang === 'ko'
                      ? '나머지 스타일과 상세 분석을 확인하세요'
                      : 'Unlock All Styles & Full Analysis'}
                  </h3>
                  <p className="premium-cta-desc">
                    {lang === 'ko'
                      ? 'AI 아웃핏 전체 + 12타입 컬러 진단 + 체형 가이드 + PDF 리포트'
                      : 'All AI outfits + 12-type color analysis + body guide + PDF report'}
                  </p>
                  <div className="premium-cta-price">
                    <span className="price-compare">
                      {lang === 'ko' ? '오프라인 컨설팅 ₩150,000+' : 'In-person consulting $100+'}
                    </span>
                    <span className="price-main">$4.99</span>
                    <span className="price-note">
                      {lang === 'ko' ? '1회 결제 · 환불 보장' : 'One-time · Money-back guarantee'}
                    </span>
                  </div>
                  {user && referralStats.credits > 0 && (
                    <p className="referral-credit-hint">{t.referralCreditAvailable} · {referralStats.credits}</p>
                  )}
                  <button
                    className="premium-cta-button"
                    onClick={() => {
                      trackEvent('premium_cta_clicked', { price: 4.99, trigger: 'result_page', images_locked: styleImages.length - 1 })
                      handlePayment('full')
                    }}
                  >
                    {lang === 'ko' ? '프리미엄 리포트 받기' : 'Get Premium Report'}
                  </button>
                  <p className="premium-cta-guarantee">
                    {lang === 'ko'
                      ? 'PDF 다운로드 · 불만족 시 환불'
                      : 'PDF download · Satisfaction guaranteed'}
                  </p>
                </div>
              )}

              {isFullPaid && (
                <p className="tap-hint">{lang === 'ko' ? '* 이미지를 클릭하면 원본 크기로 볼 수 있습니다' : '* Tap image to view full size'}</p>
              )}

              {/* Daily bridge — 방금 자신의 변신을 본 순간이 데일리 전환의 최적점.
                  무료 사용자 포함 모든 비구독자에게 노출 (기존엔 유료 결제자만 봤음) */}
              {!isSubscribed && (
                <div className="daily-style-upsell daily-bridge">
                  <span className="daily-bridge-eyebrow">WHAT TO WEAR TODAY</span>
                  <h3 className="upsell-title">
                    {(() => {
                      const evening = new Date().getHours() >= 17 || new Date().getHours() < 5
                      if (lang === 'ko') {
                        return evening
                          ? '내일 아침 7시, 옷장 앞에 서기 전에 도착합니다'
                          : '내일 아침엔 내일 날씨에 맞춘 코디가 도착합니다'
                      }
                      return evening
                        ? 'Tomorrow 7 AM — before you face the closet'
                        : "Tomorrow's look arrives matched to tomorrow's weather"
                    })()}
                  </h3>
                  <p className="upsell-desc">
                    {lang === 'ko'
                      ? `${seasonInfo?.label_ko ? `「${seasonInfo.label_ko}」인 당신에게, ` : ''}매일 아침 그날의 날씨${weatherPreview?.city ? ` (${weatherPreview.city})` : ''}에 맞춘 이 수준의 코디가 이메일로 도착합니다.`
                      : `${seasonInfo?.label_en ? `For your ${seasonInfo.label_en} palette — ` : ''}outfits at this level, matched to each morning's weather${weatherPreview?.city ? ` in ${weatherPreview.city}` : ''}, in your inbox.`}
                  </p>
                  <p className="upsell-price">
                    $6.99/{lang === 'ko' ? '월' : 'mo'} · {lang === 'ko' ? '첫 7일 무료' : 'First 7 days free'}
                  </p>
                  <button
                    className="btn-gold"
                    onClick={() => {
                      trackEvent('daily_style_upsell_clicked', { trigger: isFullPaid ? 'after_premium_purchase' : 'free_result' })
                      handleSubscription()
                    }}
                  >
                    {lang === 'ko' ? '7일 무료 체험 시작' : 'Start 7-Day Free Trial'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="style-loading">
              <div className="spinner small"></div>
              <span>{lang === 'ko' ? '스타일 준비 중...' : 'Preparing styles...'}</span>
            </div>
          )}
        </div>

        <div className="result-actions">
          {/* PDF Download — Premium only */}
          {isFullPaid && report && (
            <button
              className="btn-gold"
              onClick={async () => {
                trackEvent('pdf_downloaded')
                const { generatePdfReport } = await import('./utils/pdfReport')
                const dna = (() => { try { return parseStyleDNA(report) } catch { return null } })()
                await generatePdfReport({
                  season: dna?.season || null,
                  seasonLabel: dna?.season ? t.styleDnaSeasons[dna.season as keyof typeof t.styleDnaSeasons] || dna.season : 'Unknown',
                  bodyType: dna?.bodyType || null,
                  colors: dna?.colors || [],
                  silhouettes: dna?.silhouettes || [],
                  bestColors: colorPalette?.bestColors || [],
                  avoidColors: colorPalette?.avoidColors || [],
                  styleImages: styleImages.map(s => ({ label: t.styleLabels[s.id] || s.label, imageUrl: s.imageUrl })),
                  reportText: report,
                  lang
                })
              }}
            >
              {lang === 'ko' ? 'PDF 리포트 다운로드' : 'Download PDF Report'}
            </button>
          )}
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
          {styleImages.some(s => s.imageUrl) && (
            <>
              <button
                className="btn-outline"
                onClick={() => handleDownloadResult(
                  styleImages.map(s => s.imageUrl).filter(Boolean) as string[]
                )}
              >
                {t.downloadResult}
              </button>
              <button className="btn-outline" onClick={handleShareResult}>
                {t.shareResult}
              </button>
              <button
                className="btn-gold"
                onClick={() => handleShareCardGenerate(styleImages.find(s => s.imageUrl)!.imageUrl!)}
              >
                {t.shareToInstagram}
              </button>
            </>
          )}
          <button className="btn-outline" onClick={() => { trackEvent('chat_open', { from_page: 'result' }); setPage('style-chat') }}>
            {t.chatCardTitle}
          </button>
          <button className="btn-dark" onClick={() => { trackEvent('back_to_home_click', { from_page: 'result' }); handleRestart() }}>
            {t.backToHome}
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

        {/* Fullscreen Image Viewer */}
        {fullscreenImage && (
          <div className="fullscreen-overlay" onClick={() => setFullscreenImage(null)}>
            <div className="fullscreen-actions">
              <button className="fullscreen-action-btn" onClick={(e) => { e.stopPropagation(); downloadImage(fullscreenImage, 'stylist-style.jpg') }}>
                {t.saveImage}
              </button>
              <button className="fullscreen-close" onClick={() => setFullscreenImage(null)}>×</button>
            </div>
            <img src={fullscreenImage} alt="Fullscreen" className="fullscreen-image" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {/* Favorite Toast */}
        {favoriteToast && (
          <div className="favorite-toast">{favoriteToast}</div>
        )}
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
              <svg className="logo-mark" viewBox="0 0 1024 1024" width="26" height="26" aria-hidden="true"><rect x="442" y="300" width="140" height="480" rx="70" fill="#4a4a63" transform="rotate(-20 512 780)"/><rect x="442" y="300" width="140" height="480" rx="70" fill="#8d7442" transform="rotate(20 512 780)"/><rect x="442" y="248" width="140" height="532" rx="70" fill="#d3b269"/></svg>
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
                ✓ {t.previewFashionFound}
              </span>
            </div>

            {/* Free Preview Image + Blurred Rest */}
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

              {/* Show first (Best Match) image for free if available */}
              {styleImages.length > 0 && styleImages[0].imageUrl ? (
                <div style={{ marginBottom: '1rem' }}>
                  <div className="preview-free-image">
                    <span className="preview-free-badge">{t.previewFreeLabel}</span>
                    <img
                      src={styleImages[0].imageUrl}
                      alt={styleImages[0].label}
                      style={{ width: '100%', maxWidth: '280px', borderRadius: '12px', border: '2px solid rgba(212, 175, 55, 0.4)' }}
                    />
                    <p style={{ color: '#d4af37', fontWeight: '600', marginTop: '0.5rem' }}>{t.styleLabels[styleImages[0].id] || styleImages[0].label}</p>
                  </div>

                  {/* Blurred remaining images */}
                  <p style={{ color: 'rgba(26, 26, 26, 0.5)', fontSize: '0.85rem', margin: '1rem 0 0.75rem' }}>
                    {t.previewBlurredLabel}
                  </p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '0.5rem',
                  }}>
                    {styleImages.slice(1).map((style) => (
                      <div key={style.id} style={{ position: 'relative' }}>
                        {style.imageUrl ? (
                          <img
                            src={style.imageUrl}
                            alt={style.label}
                            style={{
                              width: '100%',
                              aspectRatio: '1',
                              objectFit: 'cover',
                              borderRadius: '12px',
                              filter: 'blur(12px) brightness(0.7)',
                            }}
                          />
                        ) : (
                          <div style={{
                            aspectRatio: '1',
                            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(212, 114, 140, 0.3))',
                            borderRadius: '12px',
                            filter: 'blur(6px)',
                          }} />
                        )}
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                        }}>
                          🔒
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
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
                    }} />
                  ))}
                </div>
              )}

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
            {user && referralStats.credits > 0 && (
              <p className="referral-credit-hint">{t.referralCreditAvailable} · {referralStats.credits}</p>
            )}
            <button
              onClick={() => { trackEvent('paywall_cta_click', { product: 'full' }); handlePayment('full') }}
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
            <svg className="logo-mark" viewBox="0 0 1024 1024" width="26" height="26" aria-hidden="true"><rect x="442" y="300" width="140" height="480" rx="70" fill="#4a4a63" transform="rotate(-20 512 780)"/><rect x="442" y="300" width="140" height="480" rx="70" fill="#8d7442" transform="rotate(20 512 780)"/><rect x="442" y="248" width="140" height="532" rx="70" fill="#d3b269"/></svg>
          </div>
          <span className="logo-text">{t.title}</span>
        </div>
        <button className="back-btn" onClick={() => setPage('landing')}>
          ← {t.backToHome}
        </button>
      </header>

      <div className="input-page-content">
        <div className="input-hero">
          <span className="input-tag">
            {weatherCopy ? weatherCopy.eyebrow : 'STYLE ANALYSIS'}
          </span>
          {weatherCopy && (
            <p className="input-weather-note">
              {lang === 'ko'
                ? '분석이 끝나면 오늘 날씨 기준 코디부터 보여드립니다'
                : "When the analysis finishes, we'll start with looks for today's weather"}
            </p>
          )}
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
                    <span className="camera-icon" aria-hidden="true">{isDragging ? '+' : 'P'}</span>
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
                    onClick={() => { setProfile(prev => ({ ...prev, gender: 'male' })); trackEvent('gender_select', { gender: 'male', page: 'input' }) }}
                  >
                    {t.male}
                  </button>
                  <button
                    type="button"
                    className={`gender-btn ${profile.gender === 'female' ? 'active' : ''}`}
                    onClick={() => { setProfile(prev => ({ ...prev, gender: 'female' })); trackEvent('gender_select', { gender: 'female', page: 'input' }) }}
                  >
                    {t.female}
                  </button>
                  <button
                    type="button"
                    className={`gender-btn ${profile.gender === 'other' ? 'active' : ''}`}
                    onClick={() => { setProfile(prev => ({ ...prev, gender: 'other' })); trackEvent('gender_select', { gender: 'other', page: 'input' }) }}
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
                    : (lang === 'ko' ? '무료로 내 코디 보기' : 'See My Looks — Free')}
              </button>
              {!isFullPaid && freeTrialRemaining > 0 && (
                <p className="free-trial-caption">
                  {lang === 'ko'
                    ? `무료 분석 ${freeTrialRemaining}회 남음 · 결제 정보 필요 없음`
                    : `${freeTrialRemaining} free ${freeTrialRemaining === 1 ? 'analysis' : 'analyses'} left · No card required`}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App
