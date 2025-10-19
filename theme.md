# Sure Hackerton 2025 - CSS 테마 및 디자인 토큰

이 문서는 프로젝트 전체에서 사용되는 CSS 변수, 컬러 팔레트, 타이포그래피, 애니메이션 등 디자인 토큰을 정의합니다.

## 관련 문서

- **design.md**: 전체 시스템 설계 및 기능 명세
- **CLAUDE.md**: 구현 과정 및 버그 수정 히스토리

**사용 방법:**
- 새로운 컴포넌트 스타일링 시 이 문서의 CSS 변수 사용
- 일관된 디자인을 위해 임의의 색상/크기 대신 정의된 토큰 사용
- 애니메이션 효과 추가 시 기존 keyframes 재사용

---

## 디자인 컨셉
- 밝고 생동감 있는 블루→시안→그린 그라데이션 배경
- 귀여운 일러스트 스타일의 UI 요소들 (로봇, 별, WiFi 아이콘 등)
- 통통 튀는 느낌의 3D 텍스트 효과 (노란색 외곽선)
- 카드들은 반투명 흰색 배경에 강한 테두리
- 호버 시 카드가 살짝 떠오르는 애니메이션
- 밝은 노란색과 오렌지 포인트 컬러

**포함할 섹션:**
1. 히어로 섹션 - "SUKATHON" 큰 타이틀, "AI HACKATHON" 부제, "INNOVATE · CODE · CREATE" 태그라인
2. 행사 소개 - 일시, 장소, 대상 정보
3. 주요 일정 - 타임라인 형식
4. 참가 신청 버튼 - 노란색 그라데이션 버튼

**스타일 요구사항:**
- 폰트: Montserrat (영문), Pretendard (한글)
- 둥근 모서리 (16-24px border-radius)
- 떠다니는 장식 요소들 (별, 아이콘)
- 부드러운 애니메이션 효과
- 모바일 반응형 디자인

위에서 제공한 CSS 테마를 활용해서 HTML 페이지를 작성해줘.

```
:root {
  /* Primary Colors - 그라데이션 배경 */
  --primary-blue: #4A90E2;
  --primary-cyan: #50C9CE;
  --primary-green: #7ED957;
  
  /* Accent Colors */
  --accent-yellow: #FFD93D;
  --accent-orange: #FFB347;
  --accent-pink: #FF6B9D;
  --accent-purple: #A78BFA;
  
  /* Neutral Colors */
  --white: #FFFFFF;
  --light-bg: #F0F9FF;
  --dark-text: #1E293B;
  --gray-text: #64748B;
  
  /* Gradient Backgrounds */
  --gradient-main: linear-gradient(135deg, #4A90E2 0%, #50C9CE 50%, #7ED957 100%);
  --gradient-card: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 249, 255, 0.8) 100%);
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(74, 144, 226, 0.1);
  --shadow-md: 0 4px 16px rgba(74, 144, 226, 0.15);
  --shadow-lg: 0 8px 32px rgba(74, 144, 226, 0.2);
  --shadow-glow: 0 0 20px rgba(255, 217, 61, 0.4);
  
  /* Typography */
  --font-primary: 'Pretendard', 'Noto Sans KR', sans-serif;
  --font-display: 'Montserrat', 'Pretendard', sans-serif;
  
  /* Spacing */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-full: 9999px;
  
  /* Transitions */
  --transition-fast: 0.2s ease;
  --transition-normal: 0.3s ease;
  --transition-slow: 0.5s ease;
}

/* Global Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-primary);
  color: var(--dark-text);
  background: var(--gradient-main);
  background-attachment: fixed;
  line-height: 1.6;
  overflow-x: hidden;
}

/* Floating Decorative Elements */
.floating-decoration {
  position: absolute;
  animation: float 6s ease-in-out infinite;
  opacity: 0.6;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

/* Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md);
}

/* Header/Hero Section */
.hero {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-md);
  position: relative;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 8vw, 5rem);
  font-weight: 900;
  color: var(--white);
  text-shadow: 
    4px 4px 0 #1E293B,
    -2px -2px 0 var(--accent-yellow),
    0 0 40px rgba(255, 217, 61, 0.5);
  margin-bottom: var(--spacing-md);
  letter-spacing: -0.02em;
  animation: titlePulse 2s ease-in-out infinite;
}

@keyframes titlePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.hero-subtitle {
  font-size: clamp(1.2rem, 3vw, 2rem);
  font-weight: 700;
  color: var(--white);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  margin-bottom: var(--spacing-sm);
}

.hero-tagline {
  font-size: clamp(1rem, 2vw, 1.5rem);
  color: var(--accent-yellow);
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

/* Card Components */
.card {
  background: var(--gradient-card);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-lg);
  border: 3px solid var(--white);
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: var(--shadow-glow), var(--shadow-lg);
  border-color: var(--accent-yellow);
}

.card:hover::before {
  opacity: 1;
}

/* Buttons */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 1.1rem;
  text-decoration: none;
  transition: all var(--transition-normal);
  border: 3px solid transparent;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent-yellow), var(--accent-orange));
  color: var(--dark-text);
  border-color: var(--white);
  box-shadow: var(--shadow-md);
}

.btn-primary:hover {
  transform: scale(1.05) rotate(-2deg);
  box-shadow: var(--shadow-glow), var(--shadow-lg);
}

.btn-secondary {
  background: var(--white);
  color: var(--primary-blue);
  border-color: var(--primary-cyan);
}

.btn-secondary:hover {
  background: var(--primary-cyan);
  color: var(--white);
  transform: scale(1.05);
}

/* Icon/Robot Elements */
.icon-decoration {
  width: 60px;
  height: 60px;
  background: var(--white);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  border: 3px solid var(--primary-cyan);
  transition: all var(--transition-normal);
}

.icon-decoration:hover {
  transform: rotate(15deg) scale(1.1);
  box-shadow: var(--shadow-glow);
}

/* WiFi/Signal Icon Animation */
@keyframes signalPulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.wifi-icon {
  animation: signalPulse 2s ease-in-out infinite;
}

/* Star Decorations */
.star {
  position: absolute;
  animation: twinkle 1.5s ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
}

/* Grid Layout */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
  margin: var(--spacing-xl) 0;
}

/* Section Headings */
.section-title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  color: var(--white);
  text-align: center;
  margin-bottom: var(--spacing-lg);
  text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.3);
  position: relative;
  display: inline-block;
  width: 100%;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 5px;
  background: var(--accent-yellow);
  border-radius: var(--radius-full);
  box-shadow: 0 0 10px var(--accent-yellow);
}

/* Utility Classes */
.text-center { text-align: center; }
.text-white { color: var(--white); }
.text-gradient {
  background: linear-gradient(135deg, var(--primary-blue), var(--primary-cyan));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mt-sm { margin-top: var(--spacing-sm); }
.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-sm { margin-bottom: var(--spacing-sm); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

/* Responsive Design */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  .hero {
    padding: var(--spacing-lg) var(--spacing-sm);
  }
  
  .card {
    padding: var(--spacing-md);
  }
}

/* Loading Animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading {
  animation: spin 1s linear infinite;
}
```
