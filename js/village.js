// 영어 마을 그림: 캐릭터 동작 · 장소 배경 · 보상 장식 · 보상 정원
// 좌표는 assets/english-village-v1/manifest.json의 원본 픽셀 기준.
// 앱의 img/village/ 그림은 같은 비율로 줄인 배포용이라 % 위치는 그대로 맞는다.
import { MAIN_DANS, getDan } from "./data.js";
import { store } from "./store.js";
import { $app, esc, danLabel, header } from "./ui.js";

const IMG = "img/village/";

// ── 캐릭터 (manifest.characters) ─────────────────────────
export const CHARS = {
  nuri: { name: "누리", desc: "노란 강아지" },
  minty: { name: "민티", desc: "민트 토끼" },
  bobo: { name: "보보", desc: "보라 곰" },
};
const POSE_SHEET = { w: 1536, h: 1024 };
const POSES = {
  welcome: { x: 0, y: 0, w: 512, h: 512 },
  self: { x: 512, y: 0, w: 512, h: 512 },
  listen: { x: 1024, y: 0, w: 512, h: 512 },
  rhythm: { x: 0, y: 512, w: 512, h: 512 },
  encourage: { x: 512, y: 512, w: 512, h: 512 },
  celebrate: { x: 1024, y: 512, w: 512, h: 512 },
};

// 시트에서 rect 부분만 보이게 하는 background 값 (rect는 원본 픽셀)
function crop(file, sheet, r) {
  const px = sheet.w === r.w ? 0 : (r.x / (sheet.w - r.w)) * 100;
  const py = sheet.h === r.h ? 0 : (r.y / (sheet.h - r.h)) * 100;
  return `background-image:url(${IMG}${file});background-size:${(sheet.w / r.w) * 100}% ${(sheet.h / r.h) * 100}%;` +
    `background-position:${px.toFixed(3)}% ${py.toFixed(3)}%`;
}

const poseStyle = (who, act) => crop(`${who}-poses.png`, POSE_SHEET, POSES[act]);

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

// ── 장소 배경 (manifest.backgrounds) ─────────────────────────
const BACKGROUNDS = {
  village: "background-village.jpg",
  icecream: "background-icecream.jpg",
  school: "background-school.jpg",
  playground: "background-playground.jpg",
  stage: "background-rhythm-stage.jpg",
  garden: "background-reward-garden.jpg",
};
export const bg = (k) => `background-image:url(${IMG}${BACKGROUNDS[k]})`;
export const groupImg = (k, alt) =>
  `<img class="group-img" src="${IMG}group-${k}.png" width="960" height="640" alt="${esc(alt)}" loading="lazy">`;

// ── 보상 장식 (manifest.rewards, 4열×3행) ─────────────────────────
const DECO_SHEET = { w: 1448, h: 1086 };
const CELL = 362;
export const REWARDS = [
  { k: "daisy", ko: "데이지", msg: "새 꽃이 피었어요!" },
  { k: "tulip", ko: "튤립", msg: "튤립이 활짝 피었어요!" },
  { k: "lavender", ko: "라벤더", msg: "보랏빛 라벤더가 피었어요!" },
  { k: "sapling", ko: "새싹", msg: "작은 새싹이 돋았어요!" },
  { k: "tree", ko: "나무", msg: "커다란 나무가 자랐어요!" },
  { k: "planter", ko: "꽃 화분", msg: "꽃 화분이 놓였어요!" },
  { k: "bench", ko: "벤치", msg: "우리 마을에 벤치가 생겼어요!" },
  { k: "mailbox", ko: "우체통", msg: "빨간 우체통이 생겼어요!" },
  { k: "bunting", ko: "깃발", msg: "알록달록 깃발이 걸렸어요!" },
  { k: "birdhouse", ko: "새집", msg: "새들이 살 새집이 생겼어요!" },
  { k: "fountain", ko: "분수", msg: "시원한 분수가 생겼어요!" },
  { k: "star", ko: "별 장식", msg: "반짝반짝 별 장식이 생겼어요!" },
];
// 기본은 362px 칸. 실제 화면에서 확인해 몇 개는 표시 영역을 따로 맞췄다.
// 깃발: 오른쪽 기둥이 칸 경계를 넘어서 넓힌다 → 옆 칸 새집은 그만큼 왼쪽을 덜어 낸다.
// 벤치·우체통: 칸 위쪽 경계 근처의 작은 얼룩을 빼려고 위를 조금 자른다.
const DECO_RECT = {
  bunting: { x: 0, y: 724, w: 410, h: 362 },
  birdhouse: { x: 412, y: 724, w: 312, h: 362 },
  bench: { x: 724, y: 445, w: 362, h: 279 },
  mailbox: { x: 1086, y: 400, w: 362, h: 324 },
};
const decoRect = (i) => DECO_RECT[REWARDS[i].k] || { x: (i % 4) * CELL, y: Math.floor(i / 4) * CELL, w: CELL, h: CELL };
const decoStyle = (i) => crop("reward-decorations.png", DECO_SHEET, decoRect(i));
// 넓은 장식은 가로세로 비율도 맞춘다
const decoRatio = (i) => { const r = decoRect(i); return `${r.w} / ${r.h}`; };

export function deco(i, { label = "", cls = "", extra = "" } = {}) {
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  return `<span class="deco ${cls}" style="${decoStyle(i)};aspect-ratio:${decoRatio(i)};${extra}" ${a11y}></span>`;
}

// 1–12단 첫 번째 정원, 13–24단 두 번째, 25–36단 세 번째. 정원마다 12종을 순서대로.
export const GARDENS = ["첫 번째 정원", "두 번째 정원", "세 번째 정원"];
export function rewardFor(d) {
  if (!d || d.bonus || d.sent || d.no < 1 || d.no > 36) return null;
  const i = (d.no - 1) % 12;
  return { garden: Math.floor((d.no - 1) / 12), i, ...REWARDS[i] };
}
// 보상은 따로 저장하지 않고 기존 '단 통과' 기록에서 계산한다
export const earnedCount = () => MAIN_DANS.filter((d) => store.passed(d.id)).length;

// 정원 안 자리: [왼쪽 %, 위 %, 너비 %] — 장식 순서와 같은 순서
const SPOTS = [
  [7, 56, 13], [21, 66, 12], [35, 74, 12], [52, 77, 10],
  [6, 18, 19], [67, 70, 14], [38, 36, 15], [84, 46, 12],
  [21, 34, 15], [61, 34, 12], [44, 51, 15], [80, 20, 11],
];

function gardenScene(g, { fresh = -1 } = {}) {
  const items = REWARDS.map((r, i) => {
    const d = getDan(String(g * 12 + i + 1));
    const [l, t, w] = SPOTS[i];
    const pos = `left:${l}%;top:${t}%;width:${w}%`;
    if (!store.passed(d.id)) {
      return `<span class="spot" style="${pos}" aria-hidden="true"><span>${danLabel(d)}</span></span>`;
    }
    return deco(i, { cls: `in-garden ${i === fresh ? "fresh" : ""}`, label: `${danLabel(d)} 보상 · ${r.ko}`, extra: pos });
  }).join("");
  return `<div class="garden-scene" style="${bg("garden")}">${items}
    ${pose("nuri", "welcome", { cls: "garden-host" })}</div>`;
}

// ── 단 통과 보상 창 ─────────────────────────
// 새로 통과했을 때 한 번만 부른다 (지난 기록으로는 띄우지 않음)
export function showReward(d) {
  const r = rewardFor(d);
  if (!r) return;
  const box = document.createElement("div");
  box.className = "reward-modal";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-labelledby", "reward-title");
  box.innerHTML = `<div class="reward-card">
      <div class="reward-scene" style="${bg("garden")}">
        ${pose("nuri", "celebrate", { cls: "rw-char", label: "축하하는 누리" })}
        ${deco(r.i, { cls: "rw-new", label: `새 장식 ${r.ko}` })}
      </div>
      <div class="reward-body">
        <span class="kicker">🎉 ${danLabel(d)} 통과! 별 3개</span>
        <h2 id="reward-title">${esc(r.msg)}</h2>
        <p class="quiet">${GARDENS[r.garden]}에 <b>${esc(r.ko)}</b> 장식이 놓였어요.</p>
        <div class="row2">
          <a class="btn" href="#/garden?g=${r.garden + 1}&new=${d.no}">정원 보러 가기</a>
          <button class="btn primary" id="rw-ok">계속하기</button>
        </div>
      </div>
    </div>`;
  const last = document.activeElement;
  const close = () => {
    box.remove();
    document.removeEventListener("keydown", onKey);
    if (last?.isConnected) last.focus();
  };
  const onKey = (e) => {
    if (e.key === "Escape") return close();
    if (e.key !== "Tab") return;
    // 창 안의 버튼 두 개 사이에서만 포커스가 돈다
    const f = [...box.querySelectorAll("a, button")];
    const i = f.indexOf(document.activeElement);
    e.preventDefault();
    f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
  };
  document.addEventListener("keydown", onKey);
  box.querySelector("#rw-ok").onclick = close;
  box.querySelector("a").onclick = close; // 정원으로 가면서 닫기
  box.onclick = (e) => { if (e.target === box) close(); };
  // '다 봤어요'처럼 보상과 동시에 다음 단계로 넘어가도 창은 남겨 둔다 (onLeave로 닫지 않음)
  document.body.appendChild(box);
  box.querySelector("#rw-ok").focus();
}

// 받침이 있으면 "이", 없으면 "가"
const iga = (w) => ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? "이" : "가");

// ── 보상 정원 화면 (#/garden?g=1) ─────────────────────────
export function Garden(params) {
  const g = Math.min(Math.max((+params.get("g") || 1) - 1, 0), 2);
  const fresh = +params.get("new") || 0;
  const freshI = fresh && Math.floor((fresh - 1) / 12) === g ? (fresh - 1) % 12 : -1;
  const counts = GARDENS.map((_, k) => MAIN_DANS.slice(k * 12, k * 12 + 12).filter((d) => store.passed(d.id)).length);
  const next = MAIN_DANS.slice(g * 12, g * 12 + 12).find((d) => !store.passed(d.id));
  $app.innerHTML = `${header("우리 마을 정원")}
    <section class="page garden-page">
      <nav class="tabs" aria-label="정원 고르기">${GARDENS.map((name, k) =>
        `<a class="tab ${k === g ? "on" : ""}" href="#/garden?g=${k + 1}" ${k === g ? 'aria-current="page"' : ""}>${name}<small>${counts[k]} / 12</small></a>`).join("")}</nav>
      ${gardenScene(g, { fresh: freshI })}
      <div class="card garden-info">
        <div><b>${GARDENS[g]}</b> <span class="quiet">${g * 12 + 1}–${g * 12 + 12}단</span></div>
        <p>${counts[g] === 12 ? "이 정원을 모두 꾸몄어요! 🎉"
          : `${danLabel(next)}을 통과하면 <b>${REWARDS[(next.no - 1) % 12].ko}</b>${iga(REWARDS[(next.no - 1) % 12].ko)} 생겨요.`}</p>
        <p class="quiet small">단을 처음 통과할 때마다 장식이 하나씩 놓여요. 같은 단을 다시 통과해도 장식은 한 번만 받아요.</p>
        ${next ? `<a class="btn primary" href="#/dan/${next.id}">${danLabel(next)} 외우러 가기</a>` : ""}
      </div>
    </section>`;
}
