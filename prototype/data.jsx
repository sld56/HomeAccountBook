// 가계부 모의 데이터
// 2026년 5월 가족 가계부 데이터

const CATEGORIES = {
  food:      { id: 'food',      label: '식비',     color: 'var(--cat-food)',      emoji: '🍚' },
  transport: { id: 'transport', label: '교통',     color: 'var(--cat-transport)', emoji: '🚌' },
  medical:   { id: 'medical',   label: '의료/약',  color: 'var(--cat-medical)',   emoji: '💊' },
  utility:   { id: 'utility',   label: '공과금',   color: 'var(--cat-utility)',   emoji: '💡' },
  leisure:   { id: 'leisure',   label: '여가',     color: 'var(--cat-leisure)',   emoji: '🎬' },
  shopping:  { id: 'shopping',  label: '쇼핑',     color: 'var(--cat-shopping)',  emoji: '🛍️' },
  edu:       { id: 'edu',       label: '교육',     color: 'var(--cat-edu)',       emoji: '📚' },
  other:     { id: 'other',     label: '기타',     color: 'var(--cat-other)',     emoji: '✨' },
  salary:    { id: 'salary',    label: '월급',     color: 'var(--sage-2)',        emoji: '💰' },
  pension:   { id: 'pension',   label: '연금',     color: 'var(--sky)',           emoji: '🏛️' },
  side:      { id: 'side',      label: '부수입',   color: 'var(--lavender)',      emoji: '🪙' },
};

const MEMBERS = {
  appa:   { id: 'appa',   name: '아버지', short: '父', color: 'fam-appa',    role: '가장' },
  eomma:  { id: 'eomma',  name: '어머니', short: '母', color: 'fam-eomma',   role: '가장' },
  daehyun:{ id: 'daehyun',name: '대현',   short: '대', color: 'fam-deahyun', role: '자녀' },
  jiwon:  { id: 'jiwon',  name: '지원',   short: '지', color: 'fam-jiwon',   role: '자녀' },
};

const ACCOUNTS = [
  { id: 'a1', label: '국민은행 주거래',   type: '입출금', bank: '국민', balance: 4_280_500, color: '#F0B721' },
  { id: 'a2', label: '신한은행 비상금',   type: '입출금', bank: '신한', balance: 1_120_000, color: '#005EAA' },
  { id: 'a3', label: '농협 적금 (5년)',   type: '적금',   bank: '농협', balance: 8_400_000, color: '#1A8B3F' },
  { id: 'a4', label: 'KB국민 신용카드',   type: '카드',   bank: '국민', balance: -748_300, color: '#5E5E5E', limit: 3_000_000 },
  { id: 'a5', label: '지갑 현금',         type: '현금',   bank: '현금', balance: 132_000,  color: '#94785A' },
];

// 5월 거래 내역 (최근 → 과거)
const TX = [
  // 5/12 오늘
  { id: 't101', date: '2026-05-12', kind: 'out', amount:  18_400, cat: 'food',      title: '동네 김밥천국', memo: '점심 어머니랑', member: 'eomma',  account: 'a5' },
  { id: 't102', date: '2026-05-12', kind: 'out', amount:   4_800, cat: 'transport', title: '지하철 충전',   memo: '',              member: 'appa',   account: 'a1' },
  { id: 't103', date: '2026-05-12', kind: 'in',  amount: 320_000, cat: 'side',      title: '강의료 입금',   memo: '평생교육원',    member: 'appa',   account: 'a1' },
  // 5/11
  { id: 't104', date: '2026-05-11', kind: 'out', amount:  42_300, cat: 'food',      title: '하나로마트 장보기', memo: '주말 식재료', member: 'eomma',  account: 'a4' },
  { id: 't105', date: '2026-05-11', kind: 'out', amount:  12_000, cat: 'medical',   title: '약국 혈압약',    memo: '한 달치',     member: 'appa',   account: 'a5' },
  { id: 't106', date: '2026-05-11', kind: 'out', amount:  68_000, cat: 'leisure',   title: '영화 + 카페',    memo: '지원이랑',    member: 'jiwon',  account: 'a4' },
  // 5/10
  { id: 't107', date: '2026-05-10', kind: 'out', amount: 124_500, cat: 'utility',   title: '5월 관리비',     memo: '자동이체',    member: 'eomma',  account: 'a1' },
  { id: 't108', date: '2026-05-10', kind: 'out', amount:  28_000, cat: 'food',      title: '동네 분식',      memo: '저녁 외식',   member: 'daehyun',account: 'a5' },
  // 5/9
  { id: 't109', date: '2026-05-09', kind: 'out', amount:  86_700, cat: 'shopping',  title: '이마트 생필품',  memo: '세제, 휴지',  member: 'eomma',  account: 'a4' },
  { id: 't110', date: '2026-05-09', kind: 'out', amount:  15_000, cat: 'transport', title: '택시',           memo: '병원 다녀옴', member: 'appa',   account: 'a5' },
  // 5/8
  { id: 't111', date: '2026-05-08', kind: 'out', amount:  35_500, cat: 'food',      title: '한정식 점심',    memo: '동창 모임',   member: 'appa',   account: 'a4' },
  { id: 't112', date: '2026-05-08', kind: 'in',  amount: 180_000, cat: 'side',      title: '중고거래',       memo: '안 쓰던 가전', member: 'eomma', account: 'a1' },
  // 5/7
  { id: 't113', date: '2026-05-07', kind: 'out', amount:  56_800, cat: 'medical',   title: '내과 진료비',    memo: '정기 검진',   member: 'appa',   account: 'a4' },
  { id: 't114', date: '2026-05-07', kind: 'out', amount:  22_000, cat: 'edu',       title: '서점',           memo: '책 2권',      member: 'daehyun',account: 'a4' },
  // 5/6
  { id: 't115', date: '2026-05-06', kind: 'in',  amount: 1_200_000, cat: 'pension', title: '국민연금 입금',  memo: '5월분',       member: 'appa',   account: 'a1' },
  { id: 't116', date: '2026-05-06', kind: 'out', amount:  78_000, cat: 'utility',   title: '인터넷+TV',      memo: '자동이체',    member: 'eomma',  account: 'a1' },
  // 5/5
  { id: 't117', date: '2026-05-05', kind: 'out', amount: 134_000, cat: 'leisure',   title: '어버이날 외식',  memo: '온 가족',     member: 'daehyun',account: 'a4' },
  { id: 't118', date: '2026-05-05', kind: 'out', amount:  45_000, cat: 'shopping',  title: '꽃다발',         memo: '카네이션',    member: 'jiwon',  account: 'a5' },
  // 5/4
  { id: 't119', date: '2026-05-04', kind: 'out', amount:  32_400, cat: 'food',      title: '재래시장',       memo: '나물, 두부',  member: 'eomma',  account: 'a5' },
  // 5/3
  { id: 't120', date: '2026-05-03', kind: 'out', amount: 280_000, cat: 'utility',   title: '실손보험',       memo: '월납',        member: 'appa',   account: 'a1' },
  { id: 't121', date: '2026-05-03', kind: 'in',  amount: 2_800_000, cat: 'salary',  title: '월급 입금',      memo: '5월 급여',    member: 'daehyun',account: 'a1' },
  // 5/2
  { id: 't122', date: '2026-05-02', kind: 'out', amount:  19_500, cat: 'transport', title: '주유',           memo: '반탱크',      member: 'appa',   account: 'a4' },
  { id: 't123', date: '2026-05-02', kind: 'out', amount:  24_000, cat: 'food',      title: '동네 칼국수',    memo: '',            member: 'eomma',  account: 'a5' },
  // 5/1
  { id: 't124', date: '2026-05-01', kind: 'in',  amount:    50_000, cat: 'side',    title: '용돈',           memo: '대현이가',    member: 'eomma',  account: 'a5' },
  { id: 't125', date: '2026-05-01', kind: 'out', amount:  144_000, cat: 'utility',  title: '전기요금',       memo: '자동이체',    member: 'eomma',  account: 'a1' },
];

// 카테고리별 예산 (월별)
const BUDGETS = [
  { cat: 'food',      limit:  500_000 },
  { cat: 'transport', limit:  150_000 },
  { cat: 'medical',   limit:  200_000 },
  { cat: 'utility',   limit:  700_000 },
  { cat: 'leisure',   limit:  250_000 },
  { cat: 'shopping',  limit:  200_000 },
  { cat: 'edu',       limit:  100_000 },
];

// 고정 지출 / 다가오는 결제
const UPCOMING = [
  { id: 'u1', label: '도시가스',     date: '2026-05-15', amount:  52_000, cat: 'utility' },
  { id: 'u2', label: '실비보험 아버지', date: '2026-05-18', amount:  86_000, cat: 'utility' },
  { id: 'u3', label: '실비보험 어머니', date: '2026-05-18', amount:  74_000, cat: 'utility' },
  { id: 'u4', label: '아파트 관리비', date: '2026-05-25', amount: 124_500, cat: 'utility' },
  { id: 'u5', label: '실손보험',     date: '2026-06-03', amount: 280_000, cat: 'utility' },
];

// 저축 / 적금 목표
const GOALS = [
  { id: 'g1', title: '손주 학자금',   saved: 8_400_000,  target: 30_000_000, monthly: 300_000, color: 'var(--sage)' },
  { id: 'g2', title: '제주 여행',     saved: 1_250_000,  target:  3_000_000, monthly: 200_000, color: 'var(--coral)' },
  { id: 'g3', title: '비상금',        saved: 4_780_000,  target:  5_000_000, monthly: 100_000, color: 'var(--sky)' },
];

// 월별 비교 데이터 (지난 12개월)
const MONTHLY = [
  { month: '6월',  ym: '2025-06', income: 4_180_000, expense: 2_980_000 },
  { month: '7월',  ym: '2025-07', income: 4_320_000, expense: 3_540_000 }, // 여름휴가
  { month: '8월',  ym: '2025-08', income: 4_280_000, expense: 3_180_000 },
  { month: '9월',  ym: '2025-09', income: 4_450_000, expense: 3_620_000 }, // 추석
  { month: '10월', ym: '2025-10', income: 4_180_000, expense: 2_890_000 },
  { month: '11월', ym: '2025-11', income: 4_240_000, expense: 3_050_000 },
  { month: '12월', ym: '2025-12', income: 4_280_000, expense: 3_120_000 },
  { month: '1월',  ym: '2026-01', income: 4_180_000, expense: 2_850_000 },
  { month: '2월',  ym: '2026-02', income: 4_320_000, expense: 3_410_000 }, // 설
  { month: '3월',  ym: '2026-03', income: 4_650_000, expense: 3_080_000 },
  { month: '4월',  ym: '2026-04', income: 4_280_000, expense: 2_960_000 },
  { month: '5월',  ym: '2026-05', income: 4_550_000, expense: 2_200_000 }, // 진행 중
];

// 월별 카테고리 지출
const MONTHLY_CAT = {
  '2025-06': { food: 480_000, transport: 130_000, medical: 180_000, utility: 720_000, leisure: 220_000, shopping: 180_000, edu: 80_000,  other: 90_000 },
  '2025-07': { food: 560_000, transport: 180_000, medical: 220_000, utility: 720_000, leisure: 580_000, shopping: 240_000, edu: 100_000, other: 140_000 },
  '2025-08': { food: 520_000, transport: 150_000, medical: 240_000, utility: 850_000, leisure: 280_000, shopping: 160_000, edu: 90_000,  other: 90_000 },
  '2025-09': { food: 680_000, transport: 200_000, medical: 220_000, utility: 750_000, leisure: 420_000, shopping: 380_000, edu: 100_000, other: 270_000 },
  '2025-10': { food: 460_000, transport: 140_000, medical: 180_000, utility: 720_000, leisure: 240_000, shopping: 170_000, edu: 80_000,  other: 90_000 },
  '2025-11': { food: 510_000, transport: 160_000, medical: 200_000, utility: 740_000, leisure: 260_000, shopping: 220_000, edu: 90_000,  other: 80_000 },
  '2025-12': { food: 540_000, transport: 170_000, medical: 220_000, utility: 760_000, leisure: 280_000, shopping: 280_000, edu: 100_000, other: 80_000 },
  '2026-01': { food: 480_000, transport: 140_000, medical: 200_000, utility: 720_000, leisure: 240_000, shopping: 180_000, edu: 80_000,  other: 80_000 },
  '2026-02': { food: 620_000, transport: 180_000, medical: 240_000, utility: 760_000, leisure: 360_000, shopping: 280_000, edu: 110_000, other: 100_000 },
  '2026-03': { food: 520_000, transport: 160_000, medical: 220_000, utility: 740_000, leisure: 250_000, shopping: 200_000, edu: 90_000,  other: 70_000 },
  '2026-04': { food: 490_000, transport: 150_000, medical: 200_000, utility: 720_000, leisure: 240_000, shopping: 190_000, edu: 80_000,  other: 70_000 },
  // 2026-05는 실제 거래에서 집계
};

// 월별 멤버 지출
const MONTHLY_MEM = {
  '2025-06': { appa:  980_000, eomma: 1_240_000, daehyun: 480_000, jiwon: 280_000 },
  '2025-07': { appa: 1_180_000, eomma: 1_420_000, daehyun: 580_000, jiwon: 360_000 },
  '2025-08': { appa: 1_080_000, eomma: 1_320_000, daehyun: 480_000, jiwon: 300_000 },
  '2025-09': { appa: 1_280_000, eomma: 1_520_000, daehyun: 540_000, jiwon: 280_000 },
  '2025-10': { appa:  960_000, eomma: 1_180_000, daehyun: 450_000, jiwon: 300_000 },
  '2025-11': { appa: 1_020_000, eomma: 1_260_000, daehyun: 480_000, jiwon: 290_000 },
  '2025-12': { appa: 1_080_000, eomma: 1_280_000, daehyun: 500_000, jiwon: 260_000 },
  '2026-01': { appa:  980_000, eomma: 1_180_000, daehyun: 440_000, jiwon: 250_000 },
  '2026-02': { appa: 1_180_000, eomma: 1_420_000, daehyun: 520_000, jiwon: 290_000 },
  '2026-03': { appa: 1_020_000, eomma: 1_290_000, daehyun: 480_000, jiwon: 290_000 },
  '2026-04': { appa:  980_000, eomma: 1_220_000, daehyun: 480_000, jiwon: 280_000 },
};

Object.assign(window, { CATEGORIES, MEMBERS, ACCOUNTS, TX, BUDGETS, UPCOMING, GOALS, MONTHLY, MONTHLY_CAT, MONTHLY_MEM });
