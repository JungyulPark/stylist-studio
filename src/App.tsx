import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

type Language = 'ko' | 'en' | 'ja' | 'zh' | 'es'
type Gender = 'male' | 'female' | 'other' | null
type Page = 'landing' | 'input' | 'loading' | 'result' | 'hair-selection' | 'hair-result' | 'fashion-selection' | 'fashion-result' | 'how-to-use'

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

// 패션 상황 옵션
interface FashionOccasion {
  id: string
  icon: string
  labelKo: string
  labelEn: string
}

const fashionOccasions: FashionOccasion[] = [
  { id: 'luxury', icon: '💎', labelKo: '럭셔리', labelEn: 'Luxury' },
  { id: 'interview', icon: '💼', labelKo: '면접', labelEn: 'Interview' },
  { id: 'date', icon: '💕', labelKo: '데이트', labelEn: 'Date' },
  { id: 'business', icon: '🏢', labelKo: '비즈니스', labelEn: 'Business' },
  { id: 'casual', icon: '☕', labelKo: '캐주얼', labelEn: 'Casual' },
  { id: 'party', icon: '🎉', labelKo: '파티', labelEn: 'Party' },
  { id: 'travel', icon: '✈️', labelKo: '여행', labelEn: 'Travel' },
  { id: 'sports', icon: '🏃', labelKo: '스포츠', labelEn: 'Sports' },
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
  module2Title: string
  module2Desc: string
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
  discountPrice: string
  discountBadge: string
  hairstyleTransform: string
  hairstyleTransformDesc: string
  fashionTransform: string
  fashionTransformDesc: string
  generateHairstyles: string
  generateFashion: string
  generatingHairstyles: string
  generatingFashion: string
  photoRequired: string
}> = {
  ko: {
    title: 'AI STYLIST',
    subtitle: '나만의 퍼스널 스타일리스트',
    heroTitle1: 'Your Personal',
    heroTitle2: 'AI Stylist',
    heroDesc: '딥러닝 기반의 럭셔리 패션 트랜스포메이션을 경험하세요. 맞춤형 헤어 스타일링부터 큐레이팅된 런웨이 워드로브까지, 당신의 진화가 시작됩니다.',
    startBtn: '스타일 분석 시작',
    learnMore: '더 알아보기',
    featuredIn: 'Featured in',
    pathTitle: '당신의 변신 경로를 선택하세요',
    module1Title: '헤어 스타일링',
    module1Desc: 'AI 기반 컷과 컬러 발견. 당신의 얼굴형에 완벽한 실루엣을 찾아보세요.',
    module2Title: '패션 큐레이션',
    module2Desc: '맞춤형 워드로브 엔지니어링. 글로벌 트렌드로 실시간 업데이트되는 캡슐 컬렉션.',
    explore: '탐색하기',
    algorithmTag: '알고리즘',
    algorithmTitle: '개인 우아함의 미래',
    algorithmDesc: '우리의 AI는 딥 뉴럴 네트워크와 하이패션 전문성을 결합하여 당신만의 룩을 큐레이팅합니다. 트렌드를 따르는 것이 아니라, 당신의 미적 잠재력을 계산합니다.',
    feature1Title: '정밀 분석',
    feature1Desc: '완벽한 테일러링 핏을 위한 고급 얼굴 매핑 및 체형 추적.',
    feature2Title: '큐레이팅 팔레트',
    feature2Desc: '당신의 피부톤과 환경 조명에 최적화된 색채 과학.',
    feature3Title: '글로벌 트렌드',
    feature3Desc: '파리, 밀라노, 도쿄 패션위크의 런웨이 데이터 실시간 반영.',
    feature4Title: '독점 액세스',
    feature4Desc: '당신의 프로필에 맞춤 큐레이팅된 한정판 디자이너 콜라보레이션.',
    uploadPhoto: '사진 업로드',
    photoHint: '사진을 올려주세요',
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
    styleGallery: 'AI 스타일 추천',
    styleGalleryDesc: '상황별 맞춤 스타일을 AI가 제안합니다',
    generatingStyles: '스타일 이미지 생성 중...',
    demoMode: '데모 모드 - 실제 이미지는 API 설정 후 제공됩니다',
    backToHome: '홈으로 돌아가기',
    hairStyling: '헤어 스타일링',
    hairSelectTitle: '나만의 헤어스타일 찾기',
    hairSelectDesc: '상황과 원하는 느낌을 선택하면 AI가 맞춤 헤어스타일을 추천해드립니다',
    selectOccasion: '어떤 상황인가요?',
    selectVibe: '어떤 느낌을 원하세요?',
    getRecommendation: '헤어스타일 추천받기',
    hairResultTitle: '맞춤 헤어스타일 추천',
    hairResultDesc: '선택하신 상황과 느낌에 맞는 헤어스타일입니다',
    selectedOptions: '선택 옵션',
    recommendedStyles: '추천 스타일',
    tryAnother: '다른 스타일 찾기',
    fashionSelectTitle: '상황별 패션 큐레이션',
    fashionSelectDesc: '상황을 선택하면 AI가 맞춤 패션을 추천해드립니다',
    selectFashionOccasion: '어떤 상황인가요?',
    getFashionRecommendation: '패션 추천받기',
    fashionResultTitle: '맞춤 패션 추천',
    fashionResultDesc: '선택하신 상황에 맞는 스타일링입니다',
    recommendedOutfits: '추천 코디',
    howToUseTitle: '이용 가이드',
    howToUseDesc: 'AI 스타일리스트와 함께 나만의 스타일을 찾아보세요',
    step1Title: '모듈 선택',
    step1Desc: '헤어 스타일링 또는 패션 큐레이션 중 원하는 서비스를 선택하세요',
    step2Title: '상황 & 느낌 선택',
    step2Desc: '데이트, 면접, 파티 등 상황과 원하는 분위기를 선택해주세요',
    step3Title: 'AI 분석',
    step3Desc: 'AI가 선택하신 조건에 맞는 최적의 스타일을 분석합니다',
    step4Title: '맞춤 추천',
    step4Desc: '개인화된 헤어스타일과 패션 코디를 확인하세요',
    getStarted: '시작하기',
    purchaseRequired: '프리미엄 AI 분석 서비스',
    purchaseBtn: '결제하고 분석 시작',
    processingPayment: '결제 처리 중...',
    price: '$6.99',
    discountPrice: '$3.49',
    discountBadge: '재방문 50% 할인!',
    hairstyleTransform: '💇 AI 헤어스타일 변환',
    hairstyleTransformDesc: '내 얼굴에 다양한 헤어스타일 적용',
    fashionTransform: '👔 AI 패션 변환',
    fashionTransformDesc: '내 모습에 다양한 패션 스타일 적용',
    generateHairstyles: '헤어스타일 생성하기',
    generateFashion: '패션 스타일 생성하기',
    generatingHairstyles: '헤어스타일 생성 중...',
    generatingFashion: '패션 스타일 생성 중...',
    photoRequired: '사진을 업로드해주세요'
  },
  en: {
    title: 'AI STYLIST',
    subtitle: 'Your Personal Style Assistant',
    heroTitle1: 'Your Personal',
    heroTitle2: 'AI Stylist',
    heroDesc: 'Experience a luxurious fashion transformation powered by deep-learning aesthetics. From bespoke hair engineering to curated runway wardrobes, your evolution begins here.',
    startBtn: 'Start Transformation',
    learnMore: 'Learn More',
    featuredIn: 'Featured in',
    pathTitle: 'Choose Your Transformation Path',
    module1Title: 'Hair Styling',
    module1Desc: 'AI-driven cut and color discovery. Find the perfect silhouette for your facial architecture.',
    module2Title: 'Fashion Curation',
    module2Desc: 'Bespoke wardrobe engineering. Curated capsule collections updated in real-time by global trends.',
    explore: 'Explore',
    algorithmTag: 'The Algorithm',
    algorithmTitle: 'The Future of Personal Elegance',
    algorithmDesc: 'Our AI combines deep neural networks with high-fashion expertise to curate your unique look. We don\'t just follow trends—we calculate your aesthetic potential.',
    feature1Title: 'Precision Analysis',
    feature1Desc: 'Advanced facial mapping and skeletal tracking for the perfect tailoring fit.',
    feature2Title: 'Curated Palette',
    feature2Desc: 'Chromatic science optimized for your unique skin tone and environmental lighting.',
    feature3Title: 'Global Trends',
    feature3Desc: 'Real-time ingestion of runway data from Paris, Milan, and Tokyo fashion weeks.',
    feature4Title: 'Exclusive Access',
    feature4Desc: 'Priority access to limited-edition designer collaborations curated for your profile.',
    uploadPhoto: 'Upload Photo',
    photoHint: 'Upload your photo',
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
    styleGallery: 'AI Style Recommendations',
    styleGalleryDesc: 'AI suggests personalized styles for different occasions',
    generatingStyles: 'Generating style images...',
    demoMode: 'Demo mode - Real images available after API setup',
    backToHome: 'Back to Home',
    hairStyling: 'Hair Styling',
    hairSelectTitle: 'Find Your Perfect Hairstyle',
    hairSelectDesc: 'Select your occasion and desired vibe, and AI will recommend personalized hairstyles',
    selectOccasion: 'What\'s the occasion?',
    selectVibe: 'What vibe do you want?',
    getRecommendation: 'Get Hair Recommendations',
    hairResultTitle: 'Personalized Hair Recommendations',
    hairResultDesc: 'Hairstyles matching your selected occasion and vibe',
    selectedOptions: 'Selected Options',
    recommendedStyles: 'Recommended Styles',
    tryAnother: 'Try Another Style',
    fashionSelectTitle: 'Fashion Curation by Occasion',
    fashionSelectDesc: 'Select the occasion and AI will recommend personalized fashion',
    selectFashionOccasion: 'What\'s the occasion?',
    getFashionRecommendation: 'Get Fashion Recommendations',
    fashionResultTitle: 'Personalized Fashion Recommendations',
    fashionResultDesc: 'Styling that matches your selected occasion',
    recommendedOutfits: 'Recommended Outfits',
    howToUseTitle: 'How to Use',
    howToUseDesc: 'Find your unique style with AI Stylist',
    step1Title: 'Select Module',
    step1Desc: 'Choose between Hair Styling or Fashion Curation',
    step2Title: 'Select Occasion & Vibe',
    step2Desc: 'Pick your occasion like date, interview, party and desired mood',
    step3Title: 'AI Analysis',
    step3Desc: 'AI analyzes the best styles based on your selections',
    step4Title: 'Personalized Recommendations',
    step4Desc: 'Get your customized hairstyles and fashion outfits',
    getStarted: 'Get Started',
    purchaseRequired: 'Premium AI Analysis Service',
    purchaseBtn: 'Purchase & Start Analysis',
    processingPayment: 'Processing payment...',
    price: '$6.99',
    discountPrice: '$3.49',
    discountBadge: '50% Welcome Back!',
    hairstyleTransform: '💇 AI Hairstyle Transform',
    hairstyleTransformDesc: 'Try different hairstyles on your photo',
    fashionTransform: '👔 AI Fashion Transform',
    fashionTransformDesc: 'Try different fashion styles on your photo',
    generateHairstyles: 'Generate Hairstyles',
    generateFashion: 'Generate Fashion Styles',
    generatingHairstyles: 'Generating hairstyles...',
    generatingFashion: 'Generating fashion styles...',
    photoRequired: 'Please upload a photo'
  },
  ja: {
    title: 'AI STYLIST',
    subtitle: 'あなただけのスタイリスト',
    heroTitle1: 'Your Personal',
    heroTitle2: 'AI Stylist',
    heroDesc: 'ディープラーニングによるラグジュアリーなファッション変身を体験してください。オーダーメイドのヘアエンジニアリングからキュレートされたランウェイワードローブまで。',
    startBtn: '変身を開始',
    learnMore: '詳細を見る',
    featuredIn: '掲載メディア',
    pathTitle: '変身パスを選択',
    module1Title: 'ヘアスタイリング',
    module1Desc: 'AIによるカットとカラーの発見。顔の構造に完璧なシルエットを。',
    module2Title: 'ファッションキュレーション',
    module2Desc: 'オーダーメイドのワードローブ。グローバルトレンドでリアルタイム更新。',
    explore: '探索する',
    algorithmTag: 'アルゴリズム',
    algorithmTitle: 'パーソナルエレガンスの未来',
    algorithmDesc: '私たちのAIは、ディープニューラルネットワークとハイファッションの専門知識を組み合わせて、あなただけのルックをキュレートします。',
    feature1Title: '精密分析',
    feature1Desc: '完璧なテーラリングフィットのための高度な顔マッピング。',
    feature2Title: 'キュレートパレット',
    feature2Desc: 'あなたの肌色と環境照明に最適化された色彩科学。',
    feature3Title: 'グローバルトレンド',
    feature3Desc: 'パリ、ミラノ、東京ファッションウィークのランウェイデータをリアルタイムで取り込み。',
    feature4Title: '限定アクセス',
    feature4Desc: 'あなたのプロフィールに合わせてキュレートされた限定版デザイナーコラボレーション。',
    uploadPhoto: '写真をアップロード',
    photoHint: '写真をアップロードしてください',
    height: '身長 (cm)',
    weight: '体重 (kg)',
    gender: '性別',
    male: '男性',
    female: '女性',
    other: '回答しない',
    startAnalysis: 'スタイル分析を開始',
    analyzing: '分析中...',
    analyzingDesc: 'AIがあなたのスタイルを分析しています',
    report: 'AIスタイル分析レポート',
    restart: '再分析する',
    error: '分析中にエラーが発生しました',
    retry: '再試行',
    styleGallery: 'AIスタイル提案',
    styleGalleryDesc: 'シーン別のおすすめスタイルをAIがご提案します',
    generatingStyles: 'スタイル画像を生成中...',
    demoMode: 'デモモード - 実際の画像はAPI設定後に表示されます',
    backToHome: 'ホームに戻る',
    hairStyling: 'ヘアスタイリング',
    hairSelectTitle: 'あなたにぴったりのヘアスタイル',
    hairSelectDesc: 'シーンと雰囲気を選んで、AIがおすすめのヘアスタイルをご提案します',
    selectOccasion: 'どんなシーンですか？',
    selectVibe: 'どんな雰囲気がお好みですか？',
    getRecommendation: 'ヘアスタイルを提案する',
    hairResultTitle: 'おすすめヘアスタイル',
    hairResultDesc: '選択されたシーンと雰囲気に合うヘアスタイルです',
    selectedOptions: '選択オプション',
    recommendedStyles: 'おすすめスタイル',
    tryAnother: '別のスタイルを探す',
    fashionSelectTitle: 'シーン別ファッションキュレーション',
    fashionSelectDesc: 'シーンを選んで、AIがおすすめファッションをご提案します',
    selectFashionOccasion: 'どんなシーンですか？',
    getFashionRecommendation: 'ファッションを提案する',
    fashionResultTitle: 'おすすめファッション',
    fashionResultDesc: '選択されたシーンに合うスタイリングです',
    recommendedOutfits: 'おすすめコーデ',
    howToUseTitle: 'ご利用ガイド',
    howToUseDesc: 'AIスタイリストと一緒にあなただけのスタイルを見つけましょう',
    step1Title: 'モジュール選択',
    step1Desc: 'ヘアスタイリングまたはファッションキュレーションを選択',
    step2Title: 'シーン＆雰囲気選択',
    step2Desc: 'デート、面接、パーティーなどのシーンと雰囲気を選択',
    step3Title: 'AI分析',
    step3Desc: 'AIが最適なスタイルを分析します',
    step4Title: 'パーソナライズ提案',
    step4Desc: 'カスタマイズされたヘアスタイルとファッションを確認',
    getStarted: '始める',
    purchaseRequired: 'プレミアムAI分析サービス',
    purchaseBtn: '購入して分析開始',
    processingPayment: '支払い処理中...',
    price: '$6.99',
    discountPrice: '$3.49',
    discountBadge: 'リピーター50%割引!',
    hairstyleTransform: '💇 AIヘアスタイル変換',
    hairstyleTransformDesc: '写真に様々なヘアスタイルを適用',
    fashionTransform: '👔 AIファッション変換',
    fashionTransformDesc: '写真に様々なファッションスタイルを適用',
    generateHairstyles: 'ヘアスタイルを生成',
    generateFashion: 'ファッションスタイルを生成',
    generatingHairstyles: 'ヘアスタイル生成中...',
    generatingFashion: 'ファッションスタイル生成中...',
    photoRequired: '写真をアップロードしてください'
  },
  zh: {
    title: 'AI STYLIST',
    subtitle: '您的私人造型师',
    heroTitle1: 'Your Personal',
    heroTitle2: 'AI Stylist',
    heroDesc: '体验深度学习驱动的奢华时尚蜕变。从定制发型工程到精选秀场衣橱，您的进化从这里开始。',
    startBtn: '开始蜕变',
    learnMore: '了解更多',
    featuredIn: '媒体报道',
    pathTitle: '选择您的蜕变之路',
    module1Title: '发型设计',
    module1Desc: 'AI驱动的剪裁和色彩发现。为您的面部结构找到完美轮廓。',
    module2Title: '时尚策划',
    module2Desc: '定制衣橱工程。由全球趋势实时更新的精选胶囊系列。',
    explore: '探索',
    algorithmTag: '算法',
    algorithmTitle: '个人优雅的未来',
    algorithmDesc: '我们的AI将深度神经网络与高级时尚专业知识相结合，为您打造独特造型。我们不只是追随潮流——我们计算您的美学潜力。',
    feature1Title: '精准分析',
    feature1Desc: '先进的面部映射和体型追踪，实现完美剪裁。',
    feature2Title: '精选调色板',
    feature2Desc: '针对您独特肤色和环境光线优化的色彩科学。',
    feature3Title: '全球趋势',
    feature3Desc: '实时摄取巴黎、米兰和东京时装周的T台数据。',
    feature4Title: '专属访问',
    feature4Desc: '优先获得为您的个人资料精选的限量版设计师合作款。',
    uploadPhoto: '上传照片',
    photoHint: '请上传您的照片',
    height: '身高 (cm)',
    weight: '体重 (kg)',
    gender: '性别',
    male: '男',
    female: '女',
    other: '不愿透露',
    startAnalysis: '开始风格分析',
    analyzing: '分析中...',
    analyzingDesc: 'AI正在分析您的风格',
    report: 'AI风格分析报告',
    restart: '重新分析',
    error: '分析过程中发生错误',
    retry: '重试',
    styleGallery: 'AI风格推荐',
    styleGalleryDesc: 'AI为您推荐不同场合的穿搭风格',
    generatingStyles: '正在生成风格图片...',
    demoMode: '演示模式 - 设置API后显示真实图片',
    backToHome: '返回首页',
    hairStyling: '发型设计',
    hairSelectTitle: '找到您的完美发型',
    hairSelectDesc: '选择场合和想要的感觉，AI将为您推荐个性化发型',
    selectOccasion: '什么场合？',
    selectVibe: '想要什么感觉？',
    getRecommendation: '获取发型推荐',
    hairResultTitle: '个性化发型推荐',
    hairResultDesc: '符合您选择的场合和感觉的发型',
    selectedOptions: '已选选项',
    recommendedStyles: '推荐发型',
    tryAnother: '尝试其他风格',
    fashionSelectTitle: '场合时尚策划',
    fashionSelectDesc: '选择场合，AI将为您推荐个性化时尚',
    selectFashionOccasion: '什么场合？',
    getFashionRecommendation: '获取时尚推荐',
    fashionResultTitle: '个性化时尚推荐',
    fashionResultDesc: '符合您选择场合的搭配',
    recommendedOutfits: '推荐搭配',
    howToUseTitle: '使用指南',
    howToUseDesc: '与AI造型师一起找到您的独特风格',
    step1Title: '选择模块',
    step1Desc: '选择发型设计或时尚策划',
    step2Title: '选择场合和氛围',
    step2Desc: '选择约会、面试、派对等场合和想要的氛围',
    step3Title: 'AI分析',
    step3Desc: 'AI根据您的选择分析最佳风格',
    step4Title: '个性化推荐',
    step4Desc: '查看定制的发型和时尚搭配',
    getStarted: '开始',
    purchaseRequired: '高级AI分析服务',
    purchaseBtn: '购买并开始分析',
    processingPayment: '支付处理中...',
    price: '$6.99',
    discountPrice: '$3.49',
    discountBadge: '回头客50%折扣!',
    hairstyleTransform: '💇 AI发型变换',
    hairstyleTransformDesc: '在您的照片上尝试不同发型',
    fashionTransform: '👔 AI时尚变换',
    fashionTransformDesc: '在您的照片上尝试不同时尚风格',
    generateHairstyles: '生成发型',
    generateFashion: '生成时尚风格',
    generatingHairstyles: '正在生成发型...',
    generatingFashion: '正在生成时尚风格...',
    photoRequired: '请上传照片'
  },
  es: {
    title: 'AI STYLIST',
    subtitle: 'Tu estilista personal',
    heroTitle1: 'Your Personal',
    heroTitle2: 'AI Stylist',
    heroDesc: 'Experimenta una lujosa transformación de moda impulsada por estética de aprendizaje profundo. Desde ingeniería capilar a medida hasta guardarropas de pasarela curados.',
    startBtn: 'Iniciar Transformación',
    learnMore: 'Saber Más',
    featuredIn: 'Destacado en',
    pathTitle: 'Elige Tu Camino de Transformación',
    module1Title: 'Estilismo Capilar',
    module1Desc: 'Descubrimiento de corte y color impulsado por IA. Encuentra la silueta perfecta para tu arquitectura facial.',
    module2Title: 'Curación de Moda',
    module2Desc: 'Ingeniería de guardarropa a medida. Colecciones cápsula curadas actualizadas en tiempo real.',
    explore: 'Explorar',
    algorithmTag: 'El Algoritmo',
    algorithmTitle: 'El Futuro de la Elegancia Personal',
    algorithmDesc: 'Nuestra IA combina redes neuronales profundas con experiencia en alta moda para curar tu look único.',
    feature1Title: 'Análisis Preciso',
    feature1Desc: 'Mapeo facial avanzado y seguimiento esquelético para el ajuste perfecto.',
    feature2Title: 'Paleta Curada',
    feature2Desc: 'Ciencia cromática optimizada para tu tono de piel único.',
    feature3Title: 'Tendencias Globales',
    feature3Desc: 'Ingesta en tiempo real de datos de pasarela de París, Milán y Tokio.',
    feature4Title: 'Acceso Exclusivo',
    feature4Desc: 'Acceso prioritario a colaboraciones de diseñadores de edición limitada.',
    uploadPhoto: 'Subir foto',
    photoHint: 'Sube tu foto',
    height: 'Altura (cm)',
    weight: 'Peso (kg)',
    gender: 'Género',
    male: 'Masculino',
    female: 'Femenino',
    other: 'Otro',
    startAnalysis: 'Iniciar análisis de estilo',
    analyzing: 'Analizando...',
    analyzingDesc: 'La IA está analizando tu estilo',
    report: 'Informe de Análisis de Estilo AI',
    restart: 'Analizar de nuevo',
    error: 'Ocurrió un error durante el análisis',
    retry: 'Reintentar',
    styleGallery: 'Recomendaciones de Estilo AI',
    styleGalleryDesc: 'La IA sugiere estilos personalizados para diferentes ocasiones',
    generatingStyles: 'Generando imágenes de estilo...',
    demoMode: 'Modo demo - Imágenes reales disponibles después de configurar API',
    backToHome: 'Volver al inicio',
    hairStyling: 'Estilismo Capilar',
    hairSelectTitle: 'Encuentra Tu Peinado Perfecto',
    hairSelectDesc: 'Selecciona la ocasión y el estilo deseado, y la IA recomendará peinados personalizados',
    selectOccasion: '¿Cuál es la ocasión?',
    selectVibe: '¿Qué estilo deseas?',
    getRecommendation: 'Obtener Recomendaciones',
    hairResultTitle: 'Recomendaciones Personalizadas',
    hairResultDesc: 'Peinados que coinciden con tu ocasión y estilo seleccionados',
    selectedOptions: 'Opciones Seleccionadas',
    recommendedStyles: 'Estilos Recomendados',
    tryAnother: 'Probar Otro Estilo',
    fashionSelectTitle: 'Moda por Ocasión',
    fashionSelectDesc: 'Selecciona la ocasión y la IA recomendará moda personalizada',
    selectFashionOccasion: '¿Cuál es la ocasión?',
    getFashionRecommendation: 'Obtener Recomendaciones',
    fashionResultTitle: 'Recomendaciones de Moda',
    fashionResultDesc: 'Estilismo que coincide con tu ocasión',
    recommendedOutfits: 'Outfits Recomendados',
    howToUseTitle: 'Guía de Uso',
    howToUseDesc: 'Encuentra tu estilo único con AI Stylist',
    step1Title: 'Seleccionar Módulo',
    step1Desc: 'Elige entre Estilismo Capilar o Curación de Moda',
    step2Title: 'Seleccionar Ocasión y Estilo',
    step2Desc: 'Elige tu ocasión como cita, entrevista, fiesta y el ambiente deseado',
    step3Title: 'Análisis AI',
    step3Desc: 'La IA analiza los mejores estilos según tus selecciones',
    step4Title: 'Recomendaciones Personalizadas',
    step4Desc: 'Obtén tus peinados y outfits personalizados',
    getStarted: 'Comenzar',
    purchaseRequired: 'Servicio de Análisis AI Premium',
    purchaseBtn: 'Comprar e Iniciar Análisis',
    processingPayment: 'Procesando pago...',
    price: '$6.99',
    discountPrice: '$3.49',
    discountBadge: '¡50% Bienvenido de vuelta!',
    hairstyleTransform: '💇 Transformación de Peinado AI',
    hairstyleTransformDesc: 'Prueba diferentes peinados en tu foto',
    fashionTransform: '👔 Transformación de Moda AI',
    fashionTransformDesc: 'Prueba diferentes estilos de moda en tu foto',
    generateHairstyles: 'Generar Peinados',
    generateFashion: 'Generar Estilos de Moda',
    generatingHairstyles: 'Generando peinados...',
    generatingFashion: 'Generando estilos de moda...',
    photoRequired: 'Por favor sube una foto'
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

function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return ''

  let html = markdown
    .split('\n')
    .map(line => {
      // Section header (## Title → card)
      if (line.startsWith('## ')) {
        const content = line.slice(3)
        const emojiMatch = content.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|💎|🎨|👔|🛍️|✨|💡|🎯|💪|👗|💇|🌟)\s*/u)
        if (emojiMatch) {
          const emoji = emojiMatch[1]
          const title = content.slice(emojiMatch[0].length)
          return `</div></div><div class="report-section-card"><div class="section-header"><span class="section-icon">${emoji}</span><h3>${title}</h3></div><div class="section-body">`
        }
        return `</div></div><div class="report-section-card"><div class="section-header"><span class="section-icon">✦</span><h3>${content}</h3></div><div class="section-body">`
      }
      // Subheader
      if (line.startsWith('### ')) {
        return `<h4 class="subsection-title">${line.slice(4)}</h4>`
      }
      // Look card header (**1) Boardroom Modern**)
      const lookMatch = line.match(/^\*\*(\d+)\)\s*(.+)\*\*$/)
      if (lookMatch) {
        return `<div class="look-card"><h4 class="look-title"><span class="look-number">${lookMatch[1]}</span>${lookMatch[2]}</h4><div class="look-items">`
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

  // Wrap with opening tags
  html = '<div class="report-section-card"><div class="section-body">' + html + '</div></div>'

  // Clean empty sections
  html = html
    .replace(/<div class="section-body"><\/div><\/div><div class="report-section-card">/g, '<div class="report-section-card">')
    .replace(/<div class="report-section-card"><div class="section-body"><\/div><\/div>/g, '')
    .replace(/<div class="look-items"><\/div>/g, '</div></div>')

  return html
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
  const [selectedFashionOccasion, setSelectedFashionOccasion] = useState<string | null>(null)
  const [fashionRecommendations, setFashionRecommendations] = useState<{title: string, items: string[]}[]>([])
  const [hairPhoto, setHairPhoto] = useState<string | null>(null)
  const [fashionPhoto, setFashionPhoto] = useState<string | null>(null)
  const [generatedHairImages, setGeneratedHairImages] = useState<{style: string, imageUrl: string | null}[]>([])
  const [generatedFashionImages, setGeneratedFashionImages] = useState<{style: string, imageUrl: string | null}[]>([])
  const [isGeneratingHair, setIsGeneratingHair] = useState(false)
  const [isGeneratingFashion, setIsGeneratingFashion] = useState(false)
  const [transformedHairstyles, setTransformedHairstyles] = useState<{id: string, label: string, imageUrl: string | null}[]>([])
  const [transformedFashion, setTransformedFashion] = useState<{id: string, label: string, imageUrl: string | null}[]>([])
  const [isTransformingHair, setIsTransformingHair] = useState(false)
  const [isTransformingFashion, setIsTransformingFashion] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isRepeatCustomer, setIsRepeatCustomer] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hairPhotoRef = useRef<HTMLInputElement>(null)
  const fashionPhotoRef = useRef<HTMLInputElement>(null)
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
    // 재분석 고객 여부 확인 (50% 할인 적용)
    const paidBefore = localStorage.getItem('paidCustomer') === 'true'
    setIsRepeatCustomer(paidBefore)

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
      // 결제 성공 - 재분석 할인 자격 저장 (이후 50% 할인)
      localStorage.setItem('paidCustomer', 'true')

      // 결제 성공 - 저장된 폼 데이터 복원
      const savedData = localStorage.getItem('pendingAnalysis')
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData)
          setProfile(parsedData)
          setIsPaid(true)
          localStorage.removeItem('pendingAnalysis')
          // URL 정리 후 바로 분석 시작
          window.history.replaceState({ page: 'loading' }, '', '#loading')
          setPageState('loading')
          // 약간의 딜레이 후 분석 시작 (상태 업데이트 대기)
          setTimeout(() => {
            startAnalysisAfterPayment(parsedData)
          }, 100)
          return
        } catch (e) {
          console.error('Failed to parse saved data:', e)
        }
      }
      // 저장된 데이터 없으면 입력 페이지로
      setIsPaid(true)
      setPageState('input')
      window.history.replaceState({ page: 'input' }, '', '#input')
      return
    }

    // 초기 상태 설정
    const hash = window.location.hash.slice(1) as Page
    if (hash && ['landing', 'input', 'hair-selection', 'hair-result', 'fashion-selection', 'fashion-result', 'how-to-use', 'result'].includes(hash)) {
      setPageState(hash)
    } else {
      window.history.replaceState({ page: 'landing' }, '', '#landing')
    }

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
  const handlePayment = async () => {
    setIsProcessingPayment(true)
    try {
      // 결제 전 폼 데이터 저장 (사진 제외 - 용량 문제)
      const dataToSave = {
        height: profile.height,
        weight: profile.weight,
        gender: profile.gender,
        // 사진은 용량이 커서 저장하지 않음
        photo: null
      }
      localStorage.setItem('pendingAnalysis', JSON.stringify(dataToSave))

      // 재분석 고객인지 확인 (50% 할인 적용)
      const isRepeatCustomer = localStorage.getItem('paidCustomer') === 'true'

      // 백엔드 API로 체크아웃 URL 가져오기
      const checkoutResponse = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/?payment=success`,
          isRepeatCustomer  // 재분석 시 할인 자동 적용
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

    try {
      const [analyzeResponse, stylesResponse] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo: profileData.photo,
            height: profileData.height,
            weight: profileData.weight,
            gender: profileData.gender,
            language: lang
          })
        }),
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
        })
      ])

      const [analyzeData, stylesData] = await Promise.all([
        analyzeResponse.json(),
        stylesResponse.json()
      ])

      if (analyzeData.report) {
        setReport(analyzeData.report)
      }

      if (stylesData.styles) {
        setStyleImages(stylesData.styles)
      }

      setPage('result')
    } catch (err) {
      console.error('Analysis error:', err)
      setError(lang === 'ko' ? '분석 중 오류가 발생했습니다' : 'An error occurred during analysis')
      setPage('input')
    }
  }

  // 실제 분석 수행 함수
  const performAnalysis = async () => {
    setPage('loading')
    setError('')
    setStyleImages([])

    try {
      const [analyzeResponse, stylesResponse] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo: profile.photo,
            height: profile.height,
            weight: profile.weight,
            gender: profile.gender,
            language: lang
          })
        }),
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
        }).catch(() => null)
      ])

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed')
      }

      const analyzeData = await analyzeResponse.json()
      setReport(analyzeData.report)

      if (stylesResponse && stylesResponse.ok) {
        const stylesData = await stylesResponse.json()
        setStyleImages(stylesData.styles || [])
      }

      setPage('result')
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
  const transformFashion = async () => {
    if (!profile.photo) {
      setError(lang === 'ko' ? '사진이 필요합니다' : 'Photo is required')
      return
    }
    setIsTransformingFashion(true)
    try {
      const response = await fetch('/api/transform-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: profile.photo,
          type: 'fashion',
          gender: profile.gender,
          language: lang
        })
      })
      if (response.ok) {
        const data = await response.json()
        setTransformedFashion(data.results || [])
      }
    } catch (err) {
      console.error('Error transforming fashion:', err)
    } finally {
      setIsTransformingFashion(false)
    }
  }

  const handleRestart = () => {
    setProfile({ photo: null, height: '', weight: '', gender: null })
    setReport('')
    setError('')
    setStyleImages([])
    setIsGeneratingStyles(false)
    setSelectedOccasion(null)
    setSelectedVibe(null)
    setHairRecommendations([])
    setSelectedFashionOccasion(null)
    setFashionRecommendations([])
    setHairPhoto(null)
    setFashionPhoto(null)
    setGeneratedHairImages([])
    setGeneratedFashionImages([])
    setTransformedHairstyles([])
    setTransformedFashion([])
    setPage('landing')
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

  // 패션 사진 업로드 처리
  const handleFashionPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFashionPhoto(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleHairRecommendation = async () => {
    if (!selectedOccasion || !selectedVibe) return

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
        'daily-elegant': ['클래식 웨이브 롱헤어', '단정한 로우번', '볼륨 레이어드컷'],
        'daily-cute': ['볼륨 단발머리', '리본 포니테일', '부드러운 C컬 단발'],
        'daily-chic': ['슬릭백 포니테일', '웨트룩 숏컷', '미니멀 스트레이트'],
        'daily-natural': ['내추럴 웨이브', '에어리 레이어드', '소프트 히피펌'],
        'daily-trendy': ['울프컷', '허쉬컷', '페이스 프레이밍 레이어'],
        'daily-classic': ['클래식 밥컷', '우아한 시니용', '타임리스 롱 레이어'],
        'date-elegant': ['로맨틱 웨이브', '반묶음 하프업', '공주머리 스타일'],
        'date-cute': ['트윈 번 스타일', '리본 하프업', '볼륨 뱅헤어'],
        'date-chic': ['슬릭 포니테일', '센터파팅 스트레이트', '젖은 머리 스타일링'],
        'date-natural': ['비치 웨이브', '루즈한 브레이드', '자연스러운 컬'],
        'date-trendy': ['텍스쳐드 밥', 'Y2K 스타일', '페이스 레이어드'],
        'date-classic': ['헐리웃 웨이브', '프렌치 트위스트', '엘레강스 업스타일'],
        'interview-elegant': ['단정한 로우번', '깔끔한 포니테일', '프로페셔널 밥컷'],
        'interview-cute': ['소프트 웨이브 단발', '단정한 하프업', '깔끔한 내추럴 컬'],
        'interview-chic': ['슬릭 로우번', '미니멀 스트레이트', '파워 밥컷'],
        'interview-natural': ['내추럴 스트레이트', '소프트 레이어드', '깔끔한 웨이브'],
        'interview-trendy': ['모던 밥컷', '클린 레이어드', '프레시 미디움'],
        'interview-classic': ['클래식 시니용', '프렌치 롤', '엘레강트 업두'],
        'party-elegant': ['글램 웨이브', '크리스탈 업스타일', '할리우드 컬'],
        'party-cute': ['스파클 트윈테일', '글리터 번', '페스티벌 브레이드'],
        'party-chic': ['슬릭백 하이포니', '젖은 머리 룩', '에지 언더컷 스타일'],
        'party-natural': ['비치 웨이브', '보헤미안 브레이드', '루즈한 컬'],
        'party-trendy': ['네온 하이라이트', 'Y2K 업두', '글로시 스트레이트'],
        'party-classic': ['올드 할리우드 웨이브', '빈티지 업두', '레트로 컬'],
        'wedding-elegant': ['브라이덜 업두', '로맨틱 사이드번', '진주 헤어피스 스타일'],
        'wedding-cute': ['플라워 크라운 스타일', '소프트 컬 다운두', '리본 하프업'],
        'wedding-chic': ['슬릭 시니용', '모던 로우번', '미니멀 업스타일'],
        'wedding-natural': ['가든 웨이브', '루즈한 브레이드 업두', '보헤미안 다운스타일'],
        'wedding-trendy': ['글래스 헤어', '페이스 프레이밍 업두', '모던 하프업'],
        'wedding-classic': ['클래식 시니용', '빈티지 롤 업두', '엘레강트 프렌치 트위스트'],
        'vacation-elegant': ['비치 웨이브', '실크 스카프 랩', '리조트 업스타일'],
        'vacation-cute': ['피그테일 브레이드', '버킷햇 스타일 웨이브', '선샤인 포니테일'],
        'vacation-chic': ['웨트룩 스타일', '슬릭 로우번', '미니멀 비치 스타일'],
        'vacation-natural': ['솔트 스프레이 웨이브', '자연스러운 컬', '에어드라이 스타일'],
        'vacation-trendy': ['Y2K 클립 스타일', '버터플라이 클립 룩', '레이어드 반다나'],
        'vacation-classic': ['그레이스 켈리 스카프룩', '클래식 비치 웨이브', '타임리스 포니테일'],
      },
      en: {
        'daily-elegant': ['Classic Wave Long Hair', 'Neat Low Bun', 'Volume Layered Cut'],
        'daily-cute': ['Volume Bob', 'Ribbon Ponytail', 'Soft C-Curl Bob'],
        'daily-chic': ['Slicked Back Ponytail', 'Wet Look Short Cut', 'Minimal Straight'],
        'daily-natural': ['Natural Wave', 'Airy Layered', 'Soft Hippie Perm'],
        'daily-trendy': ['Wolf Cut', 'Hush Cut', 'Face Framing Layers'],
        'daily-classic': ['Classic Bob Cut', 'Elegant Chignon', 'Timeless Long Layers'],
        'date-elegant': ['Romantic Waves', 'Half-Up Half-Down', 'Princess Style'],
        'date-cute': ['Twin Bun Style', 'Ribbon Half-Up', 'Volume Bangs'],
        'date-chic': ['Sleek Ponytail', 'Center Part Straight', 'Wet Hair Styling'],
        'date-natural': ['Beach Waves', 'Loose Braid', 'Natural Curls'],
        'date-trendy': ['Textured Bob', 'Y2K Style', 'Face Layered'],
        'date-classic': ['Hollywood Waves', 'French Twist', 'Elegance Upstyle'],
        'interview-elegant': ['Neat Low Bun', 'Clean Ponytail', 'Professional Bob'],
        'interview-cute': ['Soft Wave Bob', 'Neat Half-Up', 'Clean Natural Curl'],
        'interview-chic': ['Sleek Low Bun', 'Minimal Straight', 'Power Bob'],
        'interview-natural': ['Natural Straight', 'Soft Layered', 'Clean Waves'],
        'interview-trendy': ['Modern Bob', 'Clean Layered', 'Fresh Medium'],
        'interview-classic': ['Classic Chignon', 'French Roll', 'Elegant Updo'],
        'party-elegant': ['Glam Waves', 'Crystal Upstyle', 'Hollywood Curls'],
        'party-cute': ['Sparkle Twin Tails', 'Glitter Bun', 'Festival Braids'],
        'party-chic': ['Slicked High Pony', 'Wet Look', 'Edgy Undercut Style'],
        'party-natural': ['Beach Waves', 'Bohemian Braids', 'Loose Curls'],
        'party-trendy': ['Neon Highlights', 'Y2K Updo', 'Glossy Straight'],
        'party-classic': ['Old Hollywood Waves', 'Vintage Updo', 'Retro Curls'],
        'wedding-elegant': ['Bridal Updo', 'Romantic Side Bun', 'Pearl Hairpiece Style'],
        'wedding-cute': ['Flower Crown Style', 'Soft Curl Down-do', 'Ribbon Half-Up'],
        'wedding-chic': ['Sleek Chignon', 'Modern Low Bun', 'Minimal Upstyle'],
        'wedding-natural': ['Garden Waves', 'Loose Braid Updo', 'Bohemian Down Style'],
        'wedding-trendy': ['Glass Hair', 'Face Framing Updo', 'Modern Half-Up'],
        'wedding-classic': ['Classic Chignon', 'Vintage Roll Updo', 'Elegant French Twist'],
        'vacation-elegant': ['Beach Waves', 'Silk Scarf Wrap', 'Resort Upstyle'],
        'vacation-cute': ['Pigtail Braids', 'Bucket Hat Wave', 'Sunshine Ponytail'],
        'vacation-chic': ['Wet Look Style', 'Sleek Low Bun', 'Minimal Beach Style'],
        'vacation-natural': ['Salt Spray Waves', 'Natural Curls', 'Air Dry Style'],
        'vacation-trendy': ['Y2K Clip Style', 'Butterfly Clip Look', 'Layered Bandana'],
        'vacation-classic': ['Grace Kelly Scarf Look', 'Classic Beach Waves', 'Timeless Ponytail'],
      }
    }

    const key = `${occasion}-${vibe}`
    const langKey = language === 'ko' ? 'ko' : 'en'
    return recommendations[langKey]?.[key] || recommendations[langKey]?.['daily-natural'] || []
  }

  // 패션 추천 핸들러
  const handleFashionRecommendation = async () => {
    if (!selectedFashionOccasion) return

    setPage('loading')
    setIsGeneratingFashion(true)

    // 데모 추천 가져오기
    const demoRecommendations = getFashionDemoRecommendations(selectedFashionOccasion, profile.gender, lang)
    setFashionRecommendations(demoRecommendations)

    // 사진이 있으면 AI 이미지 생성 시도
    if (fashionPhoto) {
      try {
        const response = await fetch('/api/generate-fashion-styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo: fashionPhoto,
            occasion: selectedFashionOccasion,
            gender: profile.gender,
            styles: demoRecommendations.map(r => r.title),
            language: lang
          })
        })

        if (response.ok) {
          const data = await response.json()
          setGeneratedFashionImages(data.images || [])
        }
      } catch {
        setGeneratedFashionImages([])
      }
    }

    setIsGeneratingFashion(false)
    setPage('fashion-result')
  }

  // 데모용 패션 추천
  const getFashionDemoRecommendations = (occasion: string, gender: Gender, language: string): {title: string, items: string[]}[] => {
    const isMale = gender === 'male'
    const isKo = language === 'ko'

    const recommendations: Record<string, {ko: {title: string, items: string[]}[], en: {title: string, items: string[]}[]}> = {
      luxury: {
        ko: isMale ? [
          { title: '럭셔리 수트 룩', items: ['맞춤 더블브레스트 수트', '실크 타이', '이탈리안 레더 옥스포드', '골드 커프링크스'] },
          { title: '프리미엄 캐주얼', items: ['캐시미어 코트', '하이엔드 니트', '프리미엄 울 슬랙스', '명품 로퍼'] },
          { title: '하이엔드 이브닝', items: ['턱시도 재킷', '실크 셔츠', '벨벳 슬리퍼', '다이아몬드 시계'] },
        ] : [
          { title: '럭셔리 이브닝 드레스', items: ['실크 이브닝 가운', '스테이트먼트 주얼리', '새틴 클러치', '스트랩 힐'] },
          { title: '프리미엄 비즈니스', items: ['캐시미어 코트', '디자이너 블라우스', '하이웨이스트 슬랙스', '명품 펌프스'] },
          { title: '시크 럭셔리', items: ['트위드 재킷', '실크 스커트', '진주 액세서리', '퀼팅 백'] },
        ],
        en: isMale ? [
          { title: 'Luxury Suit Look', items: ['Custom Double-Breasted Suit', 'Silk Tie', 'Italian Leather Oxfords', 'Gold Cufflinks'] },
          { title: 'Premium Casual', items: ['Cashmere Coat', 'High-End Knitwear', 'Premium Wool Slacks', 'Designer Loafers'] },
          { title: 'High-End Evening', items: ['Tuxedo Jacket', 'Silk Shirt', 'Velvet Slippers', 'Diamond Watch'] },
        ] : [
          { title: 'Luxury Evening Dress', items: ['Silk Evening Gown', 'Statement Jewelry', 'Satin Clutch', 'Strappy Heels'] },
          { title: 'Premium Business', items: ['Cashmere Coat', 'Designer Blouse', 'High-Waist Slacks', 'Designer Pumps'] },
          { title: 'Chic Luxury', items: ['Tweed Jacket', 'Silk Skirt', 'Pearl Accessories', 'Quilted Bag'] },
        ]
      },
      interview: {
        ko: isMale ? [
          { title: '클래식 면접룩', items: ['네이비 싱글 수트', '화이트 드레스 셔츠', '버건디 넥타이', '블랙 옥스포드'] },
          { title: '모던 비즈니스', items: ['차콜 그레이 수트', '라이트 블루 셔츠', '심플 타이바', '브라운 더비'] },
          { title: '스마트 캐주얼', items: ['네이비 블레이저', '화이트 셔츠', '베이지 치노', '로퍼'] },
        ] : [
          { title: '프로페셔널 정장', items: ['테일러드 재킷', '화이트 블라우스', '펜슬 스커트', '누드 펌프스'] },
          { title: '모던 비즈니스', items: ['네이비 팬츠 수트', '실크 블라우스', '미니멀 액세서리', '포인티드 힐'] },
          { title: '스마트 캐주얼', items: ['스트럭처드 블레이저', '심플 니트', '슬림 팬츠', '로우힐 펌프스'] },
        ],
        en: isMale ? [
          { title: 'Classic Interview Look', items: ['Navy Single Suit', 'White Dress Shirt', 'Burgundy Necktie', 'Black Oxfords'] },
          { title: 'Modern Business', items: ['Charcoal Gray Suit', 'Light Blue Shirt', 'Simple Tie Bar', 'Brown Derby'] },
          { title: 'Smart Casual', items: ['Navy Blazer', 'White Shirt', 'Beige Chinos', 'Loafers'] },
        ] : [
          { title: 'Professional Suit', items: ['Tailored Jacket', 'White Blouse', 'Pencil Skirt', 'Nude Pumps'] },
          { title: 'Modern Business', items: ['Navy Pants Suit', 'Silk Blouse', 'Minimal Accessories', 'Pointed Heels'] },
          { title: 'Smart Casual', items: ['Structured Blazer', 'Simple Knit', 'Slim Pants', 'Low-Heel Pumps'] },
        ]
      },
      date: {
        ko: isMale ? [
          { title: '로맨틱 캐주얼', items: ['니트 스웨터', '슬림 청바지', '화이트 스니커즈', '심플 시계'] },
          { title: '세미 포멀', items: ['네이비 블레이저', '화이트 티', '치노 팬츠', '로퍼'] },
          { title: '시크 데이트룩', items: ['터틀넥 니트', '블랙 슬랙스', '첼시 부츠', '레더 팔찌'] },
        ] : [
          { title: '로맨틱 페미닌', items: ['플로럴 원피스', '카디건', '스트랩 샌들', '미니 백'] },
          { title: '시크 캐주얼', items: ['새틴 블라우스', 'A라인 스커트', '앵클부츠', '골드 액세서리'] },
          { title: '러블리 데이트룩', items: ['니트 탑', '플리츠 스커트', '메리제인', '진주 이어링'] },
        ],
        en: isMale ? [
          { title: 'Romantic Casual', items: ['Knit Sweater', 'Slim Jeans', 'White Sneakers', 'Simple Watch'] },
          { title: 'Semi Formal', items: ['Navy Blazer', 'White Tee', 'Chino Pants', 'Loafers'] },
          { title: 'Chic Date Look', items: ['Turtleneck Knit', 'Black Slacks', 'Chelsea Boots', 'Leather Bracelet'] },
        ] : [
          { title: 'Romantic Feminine', items: ['Floral Dress', 'Cardigan', 'Strappy Sandals', 'Mini Bag'] },
          { title: 'Chic Casual', items: ['Satin Blouse', 'A-Line Skirt', 'Ankle Boots', 'Gold Accessories'] },
          { title: 'Lovely Date Look', items: ['Knit Top', 'Pleated Skirt', 'Mary Janes', 'Pearl Earrings'] },
        ]
      },
      business: {
        ko: isMale ? [
          { title: '클래식 비즈니스', items: ['차콜 수트', '화이트 셔츠', '실크 타이', '레더 벨트'] },
          { title: '모던 오피스', items: ['그레이 블레이저', '드레스 셔츠', '슬림 슬랙스', '더비 슈즈'] },
          { title: '비즈니스 캐주얼', items: ['네이비 블레이저', '버튼다운 셔츠', '치노 팬츠', '로퍼'] },
        ] : [
          { title: '파워 수트', items: ['테일러드 팬츠 수트', '실크 셔츠', '구조적인 토트백', '스틸레토 힐'] },
          { title: '엘레강스 오피스', items: ['시스 드레스', '벨티드 블레이저', '펌프스', '심플 주얼리'] },
          { title: '모던 워킹', items: ['와이드 팬츠', '터틀넥', '로퍼', '미니멀 워치'] },
        ],
        en: isMale ? [
          { title: 'Classic Business', items: ['Charcoal Suit', 'White Shirt', 'Silk Tie', 'Leather Belt'] },
          { title: 'Modern Office', items: ['Gray Blazer', 'Dress Shirt', 'Slim Slacks', 'Derby Shoes'] },
          { title: 'Business Casual', items: ['Navy Blazer', 'Button-Down Shirt', 'Chino Pants', 'Loafers'] },
        ] : [
          { title: 'Power Suit', items: ['Tailored Pants Suit', 'Silk Shirt', 'Structured Tote', 'Stiletto Heels'] },
          { title: 'Elegant Office', items: ['Sheath Dress', 'Belted Blazer', 'Pumps', 'Simple Jewelry'] },
          { title: 'Modern Working', items: ['Wide Pants', 'Turtleneck', 'Loafers', 'Minimal Watch'] },
        ]
      },
      casual: {
        ko: isMale ? [
          { title: '데일리 캐주얼', items: ['크루넥 티셔츠', '슬림 청바지', '화이트 스니커즈', '캡모자'] },
          { title: '릴렉스드 스타일', items: ['오버핏 맨투맨', '조거팬츠', '러닝화', '크로스백'] },
          { title: '스트릿 캐주얼', items: ['그래픽 티', '카고 팬츠', '하이탑 스니커즈', '볼캡'] },
        ] : [
          { title: '이지 캐주얼', items: ['오버핏 티셔츠', '데님 팬츠', '캔버스 스니커즈', '토트백'] },
          { title: '컴피 시크', items: ['니트 가디건', '레깅스', '슬립온', '미니 백팩'] },
          { title: '걸리시 캐주얼', items: ['크롭 탑', 'A라인 스커트', '플랫폼 스니커즈', '버킷햇'] },
        ],
        en: isMale ? [
          { title: 'Daily Casual', items: ['Crew Neck T-Shirt', 'Slim Jeans', 'White Sneakers', 'Cap'] },
          { title: 'Relaxed Style', items: ['Oversized Sweatshirt', 'Jogger Pants', 'Running Shoes', 'Crossbody Bag'] },
          { title: 'Street Casual', items: ['Graphic Tee', 'Cargo Pants', 'High-Top Sneakers', 'Ball Cap'] },
        ] : [
          { title: 'Easy Casual', items: ['Oversized T-Shirt', 'Denim Pants', 'Canvas Sneakers', 'Tote Bag'] },
          { title: 'Comfy Chic', items: ['Knit Cardigan', 'Leggings', 'Slip-Ons', 'Mini Backpack'] },
          { title: 'Girly Casual', items: ['Crop Top', 'A-Line Skirt', 'Platform Sneakers', 'Bucket Hat'] },
        ]
      },
      party: {
        ko: isMale ? [
          { title: '클럽 파티', items: ['블랙 블레이저', '실크 셔츠', '스키니 팬츠', '체인 액세서리'] },
          { title: '칵테일 파티', items: ['벨벳 재킷', '블랙 터틀넥', '드레스 팬츠', '레더 로퍼'] },
          { title: '캐주얼 파티', items: ['패턴 셔츠', '블랙 진', '첼시부츠', '실버 링'] },
        ] : [
          { title: '글램 파티', items: ['시퀸 드레스', '스트랩 힐', '클러치백', '스테이트먼트 이어링'] },
          { title: '칵테일 룩', items: ['미니 드레스', '포인티드 힐', '박스 클러치', '골드 뱅글'] },
          { title: '시크 파티', items: ['점프수트', '스틸레토', '체인백', '볼드 립'] },
        ],
        en: isMale ? [
          { title: 'Club Party', items: ['Black Blazer', 'Silk Shirt', 'Skinny Pants', 'Chain Accessories'] },
          { title: 'Cocktail Party', items: ['Velvet Jacket', 'Black Turtleneck', 'Dress Pants', 'Leather Loafers'] },
          { title: 'Casual Party', items: ['Pattern Shirt', 'Black Jeans', 'Chelsea Boots', 'Silver Rings'] },
        ] : [
          { title: 'Glam Party', items: ['Sequin Dress', 'Strappy Heels', 'Clutch Bag', 'Statement Earrings'] },
          { title: 'Cocktail Look', items: ['Mini Dress', 'Pointed Heels', 'Box Clutch', 'Gold Bangles'] },
          { title: 'Chic Party', items: ['Jumpsuit', 'Stilettos', 'Chain Bag', 'Bold Lip'] },
        ]
      },
      travel: {
        ko: isMale ? [
          { title: '에어포트 룩', items: ['캐시미어 카디건', '조거팬츠', '컴포트 스니커즈', '캐리어'] },
          { title: '시티 트래블', items: ['라이트 재킷', '치노 팬츠', '워킹화', '크로스백'] },
          { title: '리조트 스타일', items: ['린넨 셔츠', '쇼츠', '에스파드리유', '선글라스'] },
        ] : [
          { title: '에어포트 시크', items: ['오버사이즈 코트', '레깅스', '플랫 슈즈', '캐리온'] },
          { title: '시티 투어', items: ['트렌치코트', '와이드팬츠', '스니커즈', '숄더백'] },
          { title: '리조트 룩', items: ['린넨 원피스', '스트로 햇', '샌들', '라탄백'] },
        ],
        en: isMale ? [
          { title: 'Airport Look', items: ['Cashmere Cardigan', 'Jogger Pants', 'Comfort Sneakers', 'Carry-On'] },
          { title: 'City Travel', items: ['Light Jacket', 'Chino Pants', 'Walking Shoes', 'Crossbody Bag'] },
          { title: 'Resort Style', items: ['Linen Shirt', 'Shorts', 'Espadrilles', 'Sunglasses'] },
        ] : [
          { title: 'Airport Chic', items: ['Oversized Coat', 'Leggings', 'Flat Shoes', 'Carry-On'] },
          { title: 'City Tour', items: ['Trench Coat', 'Wide Pants', 'Sneakers', 'Shoulder Bag'] },
          { title: 'Resort Look', items: ['Linen Dress', 'Straw Hat', 'Sandals', 'Rattan Bag'] },
        ]
      },
      sports: {
        ko: isMale ? [
          { title: '짐 웨어', items: ['드라이핏 티', '트레이닝 팬츠', '러닝화', '스포츠 워치'] },
          { title: '러닝 스타일', items: ['테크 탱크탑', '쇼츠', '쿠셔닝 러닝화', '스포츠 밴드'] },
          { title: '애슬레저', items: ['후디', '조거', '라이프스타일 스니커즈', '볼캡'] },
        ] : [
          { title: '요가 웨어', items: ['스포츠 브라탑', '레깅스', '필라테스 삭스', '요가 매트백'] },
          { title: '러닝 스타일', items: ['테크 탱크탑', '러닝 쇼츠', '쿠셔닝화', '헤어밴드'] },
          { title: '애슬레저 룩', items: ['크롭 후디', '바이커 쇼츠', '청키 스니커즈', '벨트백'] },
        ],
        en: isMale ? [
          { title: 'Gym Wear', items: ['Dry-Fit Tee', 'Training Pants', 'Running Shoes', 'Sports Watch'] },
          { title: 'Running Style', items: ['Tech Tank Top', 'Shorts', 'Cushioned Runners', 'Sports Band'] },
          { title: 'Athleisure', items: ['Hoodie', 'Joggers', 'Lifestyle Sneakers', 'Ball Cap'] },
        ] : [
          { title: 'Yoga Wear', items: ['Sports Bra Top', 'Leggings', 'Pilates Socks', 'Yoga Mat Bag'] },
          { title: 'Running Style', items: ['Tech Tank', 'Running Shorts', 'Cushioned Shoes', 'Headband'] },
          { title: 'Athleisure Look', items: ['Crop Hoodie', 'Biker Shorts', 'Chunky Sneakers', 'Belt Bag'] },
        ]
      }
    }

    const langKey = isKo ? 'ko' : 'en'
    return recommendations[occasion]?.[langKey] || recommendations.casual[langKey]
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
            <button className="btn-primary" onClick={() => setPage('input')}>
              {t.startBtn}
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-image">
            <div className="hero-image-bg"></div>
            <div className="glass-card">
              <span className="glass-tag">AI-POWERED STYLING</span>
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
              <button className="btn-dark" onClick={() => setPage('input')}>
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
                  <span className="path-module">MODULE 01</span>
                  <h3 className="path-title">{t.module1Title}</h3>
                  <p className="path-desc">{t.module1Desc}</p>
                  <div className="path-explore">
                    {t.explore} <span>→</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="path-card" onClick={() => setPage('fashion-selection')}>
              <div className="path-image path-image-2"></div>
              <div className="path-overlay"></div>
              <div className="path-content">
                <div className="path-glass">
                  <span className="path-module">MODULE 02</span>
                  <h3 className="path-title">{t.module2Title}</h3>
                  <p className="path-desc">{t.module2Desc}</p>
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
            <span>© 2024 AI STYLIST. ALL RIGHTS RESERVED.</span>
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
          <p>{t.analyzingDesc}</p>
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
            </div>
          ) : styleImages.length > 0 ? (
            <>
              {styleImages.some(s => s.isDemo) && (
                <p className="demo-notice">{t.demoMode}</p>
              )}
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
            <button className="btn-gold" onClick={generateStyleImages}>
              {t.styleGallery}
            </button>
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

        {/* Fashion Transform Section */}
        {profile.photo && (
          <div className="transform-section">
            <div className="transform-header">
              <h2>{t.fashionTransform}</h2>
              <p>{t.fashionTransformDesc}</p>
            </div>

            {isTransformingFashion ? (
              <div className="style-loading">
                <div className="spinner small"></div>
                <span>{t.generatingFashion}</span>
              </div>
            ) : transformedFashion.length > 0 ? (
              <div className="transform-grid">
                {transformedFashion.map((style) => (
                  <div key={style.id} className="transform-card">
                    <div className="transform-image-container">
                      {style.imageUrl ? (
                        <img src={style.imageUrl} alt={style.label} className="transform-image" />
                      ) : (
                        <div className="transform-placeholder">
                          <span className="transform-icon">👔</span>
                        </div>
                      )}
                    </div>
                    <span className="transform-label">{style.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <button className="btn-gold" onClick={transformFashion}>
                {t.generateFashion}
              </button>
            )}
          </div>
        )}

        <div className="result-actions">
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
                  ? '얼굴 사진을 올리면 AI가 헤어스타일을 적용한 이미지를 생성합니다'
                  : 'Upload your face photo and AI will generate images with hairstyles applied'}
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

  // Fashion Selection Page
  if (page === 'fashion-selection') {
    const getFashionOccasionLabel = (o: FashionOccasion) => lang === 'ko' ? o.labelKo : o.labelEn

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
            <span className="input-tag">FASHION CURATION</span>
            <h1 className="input-title">{t.fashionSelectTitle}</h1>
            <p className="input-desc">{t.fashionSelectDesc}</p>
          </div>

          <div className="hair-selection-form">
            <div className="selection-section">
              <h3 className="selection-title">{t.selectFashionOccasion}</h3>
              <div className="fashion-option-grid">
                {fashionOccasions.map((occasion) => (
                  <button
                    key={occasion.id}
                    className={`option-card ${selectedFashionOccasion === occasion.id ? 'active' : ''}`}
                    onClick={() => setSelectedFashionOccasion(occasion.id)}
                  >
                    <span className="option-icon">{occasion.icon}</span>
                    <span className="option-label">{getFashionOccasionLabel(occasion)}</span>
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
                {lang === 'ko' ? '전신 사진 업로드 (선택)' : 'Upload Full Body Photo (Optional)'}
              </h3>
              <p className="photo-upload-desc">
                {lang === 'ko'
                  ? '전신 사진을 올리면 AI가 패션 스타일을 적용한 이미지를 생성합니다'
                  : 'Upload your full body photo and AI will generate images with fashion styles applied'}
              </p>
              <div
                className={`mini-photo-upload ${fashionPhoto ? 'has-photo' : ''}`}
                onClick={() => fashionPhotoRef.current?.click()}
              >
                {fashionPhoto ? (
                  <img src={fashionPhoto} alt="My photo" className="mini-photo-preview" />
                ) : (
                  <div className="mini-photo-placeholder">
                    <span>📷</span>
                    <span>{lang === 'ko' ? '클릭하여 업로드' : 'Click to upload'}</span>
                  </div>
                )}
              </div>
              <input
                ref={fashionPhotoRef}
                type="file"
                accept="image/*"
                onChange={handleFashionPhotoUpload}
                className="hidden-input"
              />
            </div>

            <button
              className="btn-gold submit-btn"
              onClick={handleFashionRecommendation}
              disabled={!selectedFashionOccasion}
            >
              {t.getFashionRecommendation}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Fashion Result Page
  if (page === 'fashion-result') {
    const selectedFashionData = fashionOccasions.find(o => o.id === selectedFashionOccasion)
    const getFashionOccasionLabel = (o: FashionOccasion) => lang === 'ko' ? o.labelKo : o.labelEn

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
          <h1 className="page-title">{t.fashionResultTitle}</h1>
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
              {selectedFashionData && (
                <span className="selected-tag">
                  {selectedFashionData.icon} {getFashionOccasionLabel(selectedFashionData)}
                </span>
              )}
            </div>
          </div>

          <div className="fashion-recommendations">
            <h3>{t.recommendedOutfits}</h3>
            <div className="fashion-grid">
              {fashionRecommendations.map((outfit, index) => (
                <div key={index} className="fashion-card">
                  <div className="fashion-card-header">
                    <span className="fashion-number">{index + 1}</span>
                    <h4>{outfit.title}</h4>
                  </div>
                  <ul className="fashion-items">
                    {outfit.items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {fashionPhoto && (
            <div className="ai-generated-section">
              <h3>{lang === 'ko' ? 'AI 패션 합성' : 'AI Fashion Synthesis'}</h3>
              {isGeneratingFashion ? (
                <div className="generating-indicator">
                  <div className="loading-spinner"></div>
                  <p>{lang === 'ko' ? 'AI가 패션 스타일을 합성 중입니다...' : 'AI is synthesizing fashion styles...'}</p>
                </div>
              ) : generatedFashionImages.length > 0 ? (
                <div className="generated-images-grid">
                  {generatedFashionImages.map((item, index) => (
                    <div key={index} className="generated-image-card">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.style} className="generated-image" />
                      ) : (
                        <div className="generated-placeholder">
                          <span>👗</span>
                          <span>{item.style}</span>
                        </div>
                      )}
                      <p className="generated-style-name">{item.style}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ai-coming-soon">
                  <p>{lang === 'ko' ? '업로드한 사진에 AI 패션 합성 기능이 곧 제공됩니다' : 'AI fashion synthesis for your uploaded photo coming soon'}</p>
                  <div className="uploaded-photo-preview">
                    <img src={fashionPhoto} alt="Uploaded" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="result-actions">
            <button className="btn-outline" onClick={() => {
              setSelectedFashionOccasion(null)
              setFashionRecommendations([])
              setPage('fashion-selection')
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
                  {isRepeatCustomer ? (
                    <div style={{ margin: 0 }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #d4af37, #f4e4bc)',
                        color: '#1a1a2e',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        marginBottom: '0.3rem',
                        display: 'inline-block'
                      }}>
                        {t.discountBadge}
                      </span>
                      <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.9rem' }}>
                        <span style={{ textDecoration: 'line-through', opacity: 0.5, marginRight: '0.5rem' }}>{t.price}</span>
                        <span style={{ color: '#d4af37', fontWeight: '700' }}>{t.discountPrice}</span>
                      </p>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                      {t.price}
                    </p>
                  )}
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
