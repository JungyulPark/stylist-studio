import { useState, useRef } from 'react'
import './App.css'

type Language = 'ko' | 'en' | 'ja' | 'zh' | 'es'
type Gender = 'male' | 'female' | 'other' | null
type Page = 'input' | 'loading' | 'result'

const translations: Record<Language, {
  title: string
  subtitle: string
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
}> = {
  ko: {
    title: 'Personal Stylist Studio',
    subtitle: '나만의 퍼스널 스타일리스트',
    uploadPhoto: '사진 업로드',
    photoHint: '전신 사진을 올려주세요',
    height: '키 (cm)',
    weight: '몸무게 (kg)',
    gender: '성별',
    male: '남성',
    female: '여성',
    other: '정의할 수 없음',
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
    demoMode: '데모 모드 - 실제 이미지는 API 설정 후 제공됩니다'
  },
  en: {
    title: 'Personal Stylist Studio',
    subtitle: 'Your Personal Style Assistant',
    uploadPhoto: 'Upload Photo',
    photoHint: 'Please upload a full-body photo',
    height: 'Height (cm)',
    weight: 'Weight (kg)',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Prefer not to say',
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
    demoMode: 'Demo mode - Real images available after API setup'
  },
  ja: {
    title: 'Personal Stylist Studio',
    subtitle: 'あなただけのスタイリスト',
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
    demoMode: 'デモモード - 実際の画像はAPI設定後に表示されます'
  },
  zh: {
    title: 'Personal Stylist Studio',
    subtitle: '您的私人造型师',
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
    demoMode: '演示模式 - 设置API后显示真实图片'
  },
  es: {
    title: 'Personal Stylist Studio',
    subtitle: 'Tu estilista personal',
    uploadPhoto: 'Subir foto',
    photoHint: 'Por favor sube una foto de cuerpo completo',
    height: 'Altura (cm)',
    weight: 'Peso (kg)',
    gender: 'Género',
    male: 'Masculino',
    female: 'Femenino',
    other: 'Prefiero no decir',
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
    demoMode: 'Modo demo - Imágenes reales disponibles después de configurar API'
  }
}

const languageNames: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
  es: 'Español'
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
  const [page, setPage] = useState<Page>('input')
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
      // Run both API calls in parallel
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
        }).catch(() => null) // Style generation is optional
      ])

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed')
      }

      const analyzeData = await analyzeResponse.json()
      setReport(analyzeData.report)

      // Handle style images if available
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
    setPage('input')
  }

  const isFormValid = profile.photo && profile.height && profile.weight && profile.gender

  // Loading Page
  if (page === 'loading') {
    return (
      <div className="container">
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
      <div className="container result-container">
        <div className="language-selector">
          {(Object.keys(languageNames) as Language[]).map((code) => (
            <button
              key={code}
              className={`lang-btn ${lang === code ? 'active' : ''}`}
              onClick={() => setLang(code)}
            >
              {languageNames[code]}
            </button>
          ))}
        </div>

        <header className="header">
          <h1>{t.title}</h1>
          <p className="subtitle">{t.report}</p>
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

        {/* Style Gallery Section */}
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
            <button className="generate-styles-btn" onClick={generateStyleImages}>
              {t.styleGallery}
            </button>
          )}
        </div>

        <button className="submit-button" onClick={handleRestart}>
          {t.restart}
        </button>
      </div>
    )
  }

  // Input Page
  return (
    <div className="container">
      <div className="language-selector">
        {(Object.keys(languageNames) as Language[]).map((code) => (
          <button
            key={code}
            className={`lang-btn ${lang === code ? 'active' : ''}`}
            onClick={() => setLang(code)}
          >
            {languageNames[code]}
          </button>
        ))}
      </div>

      <header className="header">
        <h1>{t.title}</h1>
        <p className="subtitle">{t.subtitle}</p>
      </header>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>{t.retry}</button>
        </div>
      )}

      <form className="profile-form" onSubmit={handleSubmit}>
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
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={!isFormValid}
        >
          {t.startAnalysis}
        </button>
      </form>
    </div>
  )
}

export default App
