# Stylist Studio - Task & Roadmap

## 🔧 수정 완료 (2026-02-06)

### 해결된 문제
- [x] **로그아웃 버튼 클릭 안됨** → signOut에서 await 제거, 로컬 정리 우선 처리
- [x] **회원탈퇴 버튼 클릭 안됨** → deleteAccount에서 서버 호출 비동기화, 즉시 리다이렉트

### 원인
- `await supabase.auth.signOut()`이 네트워크 문제로 무한 대기 → `window.location.href`까지 도달 못함
- 수정: 로컬 상태/스토리지 정리 먼저 → 리다이렉트 즉시 → 서버 호출은 백그라운드

### 남은 작업
1. Supabase service_role key 설정 (계정 완전 삭제용)

### Supabase 설정 정보
- **Project URL**: https://gplgnygyikmxnwbwztnk.supabase.co
- **service_role key**: (받아야 함 - Dashboard > Settings > API > service_role)

---

## 현재 상태 (2026-02-05)

### 완료된 기능
- [x] 풀 스타일 분석 (Full Style Analysis)
- [x] 헤어 스타일 분석 (Hair Style Analysis)
- [x] Polar 결제 연동
- [x] 다국어 지원 (한/영/일/중/스페인어)
- [x] Google OAuth 로그인 ✅ 작동 확인됨

### 마이페이지 (부분 완료)
- [x] 내 정보 표시
- [x] 분석 히스토리 UI 구현 (DB 연결 선택적)
- [x] 비밀번호 변경 UI
- [x] 비밀번호 재설정 (이메일)
- [x] **로그아웃** ✅ 수정됨
- [x] **계정 탈퇴** ✅ 수정됨

### Supabase DB 테이블 (선택적)
- profiles 테이블 - 생성됨 (SQL 실행함)
- analysis_history 테이블 - 생성됨 (SQL 실행함)
- RLS 정책 - 설정 필요할 수 있음

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
