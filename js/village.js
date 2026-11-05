// 캐릭터 동작 그림 (말문이 · 귀담이 · 차분이). 시트는 4열 2행, 동작 8개.
// 손그림 v2 보드(characters-design-2026-11-03/muted-handdrawn-v2)를 tools/cutout_muted.py로 잘라 6칸 시트로 만든 것.
// 보드의 동작은 친구마다 3개라 몇 칸은 같은 그림이다.
import { esc } from "./ui.js";

// 비비드 버전(/vivid/, index.html이 data-theme을 붙임)은 같은 칸 배치의 비비드 시트를 쓴다 (tools/cutout_vivid.py)
export const VIVID = document.documentElement.dataset.theme === "vivid";
const IMG = VIVID ? "img/village-vivid/" : "img/village/";

// ── 캐릭터 (manifest.characters) ─────────────────────────
export const CHARS = VIVID ? {
  nuri: { name: "말문이", desc: "빨간 강아지" },
  minty: { name: "귀담이", desc: "하늘색 토끼" },
  bobo: { name: "차분이", desc: "남색 곰" },
} : {
  nuri: { name: "말문이", desc: "테라코타색 강아지" },
  minty: { name: "귀담이", desc: "세이지색 토끼" },
  bobo: { name: "차분이", desc: "블루그레이 곰" },
};
// 시트는 4열 2행, 칸 448px. 앉기(sit)·말하기(talk)는 라디오 장면과 작은 동작 그림에서 가져왔다.
const POSE_SHEET = { w: 1792, h: 896 };
const POSES = Object.fromEntries(
  ["welcome", "self", "listen", "rhythm", "encourage", "celebrate", "sit", "talk"]
    .map((k, i) => [k, { x: (i % 4) * 448, y: Math.floor(i / 4) * 448, w: 448, h: 448 }]),
);

// 시트에서 rect 부분만 보이게 하는 background 값 (rect는 원본 픽셀)
function crop(file, sheet, r) {
  const px = sheet.w === r.w ? 0 : (r.x / (sheet.w - r.w)) * 100;
  const py = sheet.h === r.h ? 0 : (r.y / (sheet.h - r.h)) * 100;
  return `background-image:url(${IMG}${file});background-size:${(sheet.w / r.w) * 100}% ${(sheet.h / r.h) * 100}%;` +
    `background-position:${px.toFixed(3)}% ${py.toFixed(3)}%`;
}

const poseStyle = (who, act) => crop(`${who}-poses.webp`, POSE_SHEET, POSES[act]);

// 한 동작만 보여 주는 캐릭터. label이 없으면 꾸밈 그림이라 스크린리더가 건너뛴다.
// 동작끼리 순서대로 돌리지 않는다 (각 셀은 따로 그린 포즈).
export function pose(who, act, { label = "", cls = "" } = {}) {
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  return `<span class="pose ${cls}" data-who="${who}" style="${poseStyle(who, act)}" ${a11y}></span>`;
}
// 이미 그린 캐릭터의 동작만 바꾼다
export function setPose(el, act) {
  if (el) el.setAttribute("style", poseStyle(el.dataset.who, act));
}
