# Stylist Studio - Task & Roadmap

## 현재 상태 (2026-02-05)

### 완료된 기능
- [x] 풀 스타일 분석 (Full Style Analysis)
- [x] 헤어 스타일 분석 (Hair Style Analysis)
- [x] Polar 결제 연동
- [x] 다국어 지원 (한/영/일/중/스페인어)
- [x] Google OAuth 로그인
- [x] 마이페이지
  - [x] 내 정보 표시
  - [x] 분석 히스토리 조회/보기
  - [x] 비밀번호 변경
  - [x] 비밀번호 재설정 (이메일)
  - [x] 계정 탈퇴

---

## 향후 계획: Sub-Services

### 아키텍처 결정
- **방식**: 같은 저장소, 같은 사이트에서 라우팅으로 분리
- **GitHub**: stylist-studio (현재 저장소 그대로)
- **Cloudflare**: 현재 프로젝트 그대로
- **Supabase**: 현재 프로젝트 그대로 (통합 계정)

### 추가 예정 서비스

#### 1. K-Color (퍼스널 컬러 분석)
- **URL**: stylist-studio.com/#k-color
- **기능**: 얼굴색 분석 → 어울리는 색상 추천
- **대상**: 전체
- **상태**: [ ] 미착수

#### 2. AI Barbershop (남성 헤어)
- **URL**: stylist-studio.com/#barbershop
- **기능**: 남성 최신 유행 스타일, sleek 스타일 등
- **대상**: 남성
- **상태**: [ ] 미착수

#### 3. AI Salon (여성 헤어/뷰티)
- **URL**: stylist-studio.com/#salon
- **기능**: 여성 헤어/뷰티 종합
- **대상**: 여성
- **상태**: [ ] 미착수

---

## 구현 시 참고사항

### 코드 구조 (예상)
```
src/
├── App.tsx              # 메인 라우터
├── pages/
│   ├── landing/         # 메인 랜딩
│   ├── full-style/      # 현재 풀스타일 분석
│   ├── hair-style/      # 현재 헤어 분석
│   ├── k-color/         # NEW: K-Color
│   ├── barbershop/      # NEW: Barbershop
│   └── salon/           # NEW: Salon
├── components/
│   └── shared/          # 공유 컴포넌트
└── contexts/
    └── AuthContext.tsx  # 통합 인증 (그대로 사용)
```

### Page 타입 추가
```tsx
type Page = 'landing' | 'input' | ... | 'k-color' | 'barbershop' | 'salon'
```

### 랜딩 페이지 수정
- 메인 랜딩에서 각 서비스로 이동하는 네비게이션 추가
- 또는 서비스별 독립 랜딩 페이지

---

## 나중에 규모 커지면

서비스별 트래픽이 커지면 분리 고려:
1. 모노레포로 전환 (Turborepo)
2. 각 서비스별 독립 도메인
3. 같은 Supabase 사용 (통합 계정 유지)

---

*마지막 업데이트: 2026-02-05*
