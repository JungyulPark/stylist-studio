import { useState, useRef } from 'react'
import './App.css'

type Language = 'ko' | 'en' | 'ja' | 'zh' | 'es'
type Gender = 'male' | 'female' | 'other' | null
type Page = 'landing' | 'input' | 'loading' | 'result' | 'hair-selection' | 'hair-result'

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
    photoHint: '전신 사진을 올려주세요',
    height: '키 (cm)',
    weight: '몸무게 (kg)',
    gender: '성별',
    male: '남성',
    female: '여성',
    other: '선택안함',
    startAnalysis: '스타일 분석 시작하기',
    analyzing: '분석 중...',
    analyzingDesc: 'AI가 당신의 스타일을 분석하고 있습니다',
    report: '스타일 컨설팅 리포트',
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
    tryAnother: '다른 스타일 찾기'
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
    photoHint: 'Please upload a full-body photo',
    height: 'Height (cm)',
    weight: 'Weight (kg)',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    startAnalysis: 'Start Style Analysis',
    analyzing: 'Analyzing...',
    analyzingDesc: 'AI is analyzing your style',
    report: 'Style Consultation Report',
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
    tryAnother: 'Try Another Style'
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
    photoHint: '全身写真をアップロードしてください',
    height: '身長 (cm)',
    weight: '体重 (kg)',
    gender: '性別',
    male: '男性',
    female: '女性',
    other: '回答しない',
    startAnalysis: 'スタイル分析を開始',
    analyzing: '分析中...',
    analyzingDesc: 'AIがあなたのスタイルを分析しています',
    report: 'スタイルコンサルティングレポート',
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
    tryAnother: '別のスタイルを探す'
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
    photoHint: '请上传全身照片',
    height: '身高 (cm)',
    weight: '体重 (kg)',
    gender: '性别',
    male: '男',
    female: '女',
    other: '不愿透露',
    startAnalysis: '开始风格分析',
    analyzing: '分析中...',
    analyzingDesc: 'AI正在分析您的风格',
    report: '风格咨询报告',
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
    tryAnother: '尝试其他风格'
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
    photoHint: 'Por favor sube una foto de cuerpo completo',
    height: 'Altura (cm)',
    weight: 'Peso (kg)',
    gender: 'Género',
    male: 'Masculino',
    female: 'Femenino',
    other: 'Otro',
    startAnalysis: 'Iniciar análisis de estilo',
    analyzing: 'Analizando...',
    analyzingDesc: 'La IA está analizando tu estilo',
    report: 'Informe de Consultoría de Estilo',
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
    tryAnother: 'Probar Otro Estilo'
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
  const [lang, setLang] = useState<Language>('ko')
  const [page, setPage] = useState<Page>('landing')
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = translations[lang]

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

  const handleRestart = () => {
    setProfile({ photo: null, height: '', weight: '', gender: null })
    setReport('')
    setError('')
    setStyleImages([])
    setIsGeneratingStyles(false)
    setSelectedOccasion(null)
    setSelectedVibe(null)
    setHairRecommendations([])
    setPage('landing')
  }

  const handleHairRecommendation = async () => {
    if (!selectedOccasion || !selectedVibe) return

    setPage('loading')

    try {
      const response = await fetch('/api/hair-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: selectedOccasion,
          vibe: selectedVibe,
          gender: profile.gender,
          language: lang
        })
      })

      if (response.ok) {
        const data = await response.json()
        setHairRecommendations(data.recommendations || [])
      } else {
        // 데모 모드: API 없이도 추천 제공
        const demoRecommendations = getHairDemoRecommendations(selectedOccasion, selectedVibe, lang)
        setHairRecommendations(demoRecommendations)
      }
      setPage('hair-result')
    } catch {
      // 데모 모드
      const demoRecommendations = getHairDemoRecommendations(selectedOccasion, selectedVibe, lang)
      setHairRecommendations(demoRecommendations)
      setPage('hair-result')
    }
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

  const isFormValid = profile.photo && profile.height && profile.weight && profile.gender

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
              <span className="glass-tag">THE EVOLUTION</span>
              <p className="glass-text">Transformation v2.4</p>
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
              <button className="btn-outline">
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
            <div className="path-card" onClick={() => setPage('input')}>
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

          <div className="report-content">
            {report.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
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

              <button
                type="submit"
                className="btn-gold submit-btn"
                disabled={!isFormValid}
              >
                {t.startAnalysis}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App
