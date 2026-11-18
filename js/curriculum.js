// 학습 기록 옮기기 (2026-11-18): 단 번호를 2024 교재 순서에서 2023 구구단표(영어구구단_I-you순서.pdf) 순서로 바꿨다.
// 별(progress)·내 묶음(wrong)은 단 번호로 저장되므로, 문장틀이 같은 단끼리 새 번호로 옮긴다. 아무것도 지우지 않는다.
// 옮긴 기록에는 cur 표시를 남겨 두 번 옮기지 않는다. 새로 생긴 18단(Do I go?)·36단(Are there ~s?)은 이어받을 기록이 없다.
export const CUR = "2023iy";

// 예전 단 → 새 단
const MAP = {
  1: "1", 2: "3", 3: "2", 4: "5", 5: "4", 6: "6", 7: "7", 8: "9", 9: "8", 10: "11",
  11: "13", 12: "15", 13: "16", 14: "14", 15: "17", 16: "19", 17: "20", 18: "21", 19: "22", 20: "B1",
  21: "24", 22: "23", 23: "B2", 24: "B3", 25: "25", 26: "27", 27: "26", 28: "B4", 29: "33", 30: "34",
  31: "B5", 32: "35", 33: "31", 34: "B6", 35: "32", 36: "B7",
  B1: "28", B2: "30", B3: "29", B4: "31", B5: "32", B6: "10", B7: "12",
  S2: "S3", S3: "S2", // 문장형: 예전 S2 = 부정, S3 = 질문 → 지금 2단 = 질문, 3단 = 부정
};
const move = (key) => MAP[key] ?? key; // S1 등은 그대로

export function migrateV1(v1) {
  if (!v1 || typeof v1 !== "object" || v1.cur === CUR) return v1;
  const progress = {}, wrong = {};
  for (const [k, p] of Object.entries(v1.progress || {})) progress[move(k)] = { ...progress[move(k)], ...p }; // 같은 칸으로 모이면 단계별 별을 합친다
  for (const [k, n] of Object.entries(v1.wrong || {})) wrong[move(k)] = (wrong[move(k)] || 0) + n;
  return { ...v1, progress, wrong, cur: CUR };
}
