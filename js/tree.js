// 나만의 트리: 학습으로 모은 반짝이(✨)로 크리스마스 상점에서 장식을 사서 트리를 꾸민다.
// 반짝이는 저장하지 않고 기존 기록(별 · 구간 도전 · 마지막 도전)에서 계산한다 → 예전 기록도 그대로 반짝이가 된다.
// 저장하는 것은 산 장식(자리·값)과 쓴 반짝이뿐 (gugudan.journey의 tree: { spent, items:[{k,x,y,p}] }).
// 그림은 임시 SVG. GPT 그림이 오면 ITEMS의 svg만 바꾸면 된다.
import { DANS, SENT_DANS } from "./data.js";
import { store } from "./store.js";
import { $app, esc, header, toast } from "./ui.js";
import { pose } from "./village.js";
import { jrec, saveJ, setRegion } from "./journey.js";

// ── 반짝이 얻는 법 ─────────────────────────
export const EARN = { star: 2, challenge: 10, core: 30, welcome: 6 };
const CH_IDS = ["r1", "r2", "r3", "r4"];
// 선생님 화면에서도 같은 계산을 쓰도록 기록만 받아서 센다
export function sparklesOf(stars, j) {
  const ch = CH_IDS.filter((id) => j?.challenges?.[id]).length;
  return EARN.welcome + stars * EARN.star + ch * EARN.challenge + (j?.core?.cleared ? EARN.core : 0);
}
export const starsAll = () => [...DANS, ...SENT_DANS].reduce((a, d) => a + store.stars(d.id), 0);
const T = () => {
  const j = jrec();
  if (!j.tree || !Array.isArray(j.tree.items)) j.tree = { spent: 0, items: [] };
  return j.tree;
};
export const earned = () => sparklesOf(starsAll(), jrec());
export const wallet = () => Math.max(0, earned() - T().spent);
export const treeCount = (j) => j?.tree?.items?.length || 0;

// ── 크리스마스 상점 ─────────────────────────
// 색은 테마마다 CSS 변수(--o-*)로. size = 장면 너비의 %
const f = (v) => `style="fill:var(--o-${v})"`;
const s = (v, w = 2.5) => `style="stroke:var(--o-${v});stroke-width:${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
const fs = (v, line = "line", w = 2.5) => `style="fill:var(--o-${v});stroke:var(--o-${line});stroke-width:${w}" stroke-linejoin="round"`;
const svg = (body) => `<svg viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
const ball = (c) => svg(`<rect x="27" y="5" width="10" height="8" rx="2" ${f("gold")}/><circle cx="32" cy="37" r="21" ${fs(c)}/>
  <path d="M15 37h34" ${s("white", 3)} opacity=".55"/><path d="M21 28a13 13 0 0 1 8-8" ${s("white", 3.5)} opacity=".8"/>`);
export const ITEMS = [
  { k: "red", name: "빨간 방울", p: 3, size: 10, svg: ball("red") },
  { k: "blue", name: "파란 방울", p: 3, size: 10, svg: ball("blue") },
  { k: "gold", name: "금빛 방울", p: 4, size: 10, svg: ball("gold") },
  { k: "bell", name: "작은 종", p: 5, size: 11, svg: svg(`<path d="M32 12c-10 0-15 8-15 19v9l-6 8h42l-6-8v-9c0-11-5-19-15-19z" ${fs("gold")}/>
    <circle cx="32" cy="52" r="5" ${fs("brown")}/><path d="M24 8l8 5 8-5" ${s("red", 4)}/>`) },
  { k: "candy", name: "지팡이 사탕", p: 5, size: 10, svg: svg(`<path d="M38 58V22a9 9 0 0 0-18 0v3" ${s("line", 12)}/>
    <path d="M38 58V22a9 9 0 0 0-18 0v3" ${s("white", 8)}/><path d="M38 58V22a9 9 0 0 0-18 0v3" ${s("red", 8)} stroke-linecap="butt" stroke-dasharray="5 5"/>`) },
  { k: "flake", name: "눈송이", p: 5, size: 10, svg: svg(`<g ${s("blue", 4)}><path d="M32 6v52M9.5 19l45 26M9.5 45l45-26"/>
    <path d="M26 10l6 6 6-6M26 54l6-6 6 6M10 27l8 2-2 8M54 37l-8-2 2-8M16 47l2-8 8 2M48 17l-2 8-8-2"/></g>`) },
  { k: "bow", name: "빨간 리본", p: 6, size: 11, svg: svg(`<path d="M32 30L12 18c-6 0-6 24 0 24zM32 30l20-12c6 0 6 24 0 24z" ${fs("red")}/>
    <path d="M29 33l-9 22 7-3 3 6 2-25M35 33l9 22-7-3-3 6-2-25" ${fs("red")}/><rect x="27" y="25" width="10" height="11" rx="4" ${fs("gold")}/>`) },
  { k: "cookie", name: "생강 쿠키", p: 8, size: 12, svg: svg(`<circle cx="32" cy="15" r="10" ${fs("brown")}/>
    <path d="M14 27h36a5 5 0 0 1 0 10h-6l4 16a5 5 0 0 1-9 3l-7-12-7 12a5 5 0 0 1-9-3l4-16h-6a5 5 0 0 1 0-10z" ${fs("brown")}/>
    <circle cx="28" cy="14" r="1.8" ${f("line")}/><circle cx="36" cy="14" r="1.8" ${f("line")}/><path d="M28 19q4 3 8 0" ${s("white", 2)}/>
    <circle cx="32" cy="32" r="2.2" ${f("white")}/><circle cx="32" cy="40" r="2.2" ${f("red")}/>`) },
  { k: "sock", name: "양말", p: 8, size: 12, svg: svg(`<path d="M22 16h22v20L31 52a9 9 0 0 1-15-9l6-8z" ${fs("red")}/>
    <rect x="19" y="6" width="28" height="12" rx="4" ${fs("white")}/><path d="M26 30h12M26 38h8" ${s("white", 3)}/>`) },
  { k: "mic", name: "마이크 장식", p: 10, size: 11, svg: svg(`<rect x="23" y="7" width="18" height="28" rx="9" ${fs("red")}/>
    <path d="M27 14h10M27 20h10" ${s("white", 2.5)}/><path d="M17 30a15 15 0 0 0 30 0" ${s("line", 3.5)}/>
    <path d="M32 45v8M22 55h20" ${s("line", 4)}/>`) },
  { k: "radio", name: "라디오 장식", p: 10, size: 13, svg: svg(`<path d="M20 17l24-9" ${s("line", 3)}/><rect x="6" y="18" width="52" height="36" rx="8" ${fs("blue")}/>
    <circle cx="22" cy="36" r="10" ${fs("cream")}/><circle cx="22" cy="36" r="4" ${f("blue")}/>
    <rect x="36" y="27" width="16" height="7" rx="2" ${f("cream")}/><circle cx="40" cy="44" r="3" ${f("gold")}/><circle cx="48" cy="44" r="3" ${f("red")}/>`) },
  { k: "gift", name: "선물 상자", p: 10, size: 16, svg: svg(`<rect x="10" y="26" width="44" height="32" rx="3" ${fs("red")}/>
    <rect x="7" y="18" width="50" height="11" rx="3" ${fs("red")}/><path d="M32 18v40" ${s("gold", 7)} stroke-linecap="butt"/>
    <path d="M32 18c-4-10-16-12-14-3 1 4 8 4 14 3zM32 18c4-10 16-12 14-3-1 4-8 4-14 3z" ${fs("gold")}/>`) },
  { k: "snowman", name: "눈사람", p: 15, size: 20, svg: svg(`<circle cx="32" cy="45" r="15" ${fs("white")}/><circle cx="32" cy="23" r="10" ${fs("white")}/>
    <path d="M22 13h20M26 13V4h12v9" ${fs("line", "line", 2)}/><path d="M24 31q8 5 16 0l2 6" ${s("red", 5)}/>
    <circle cx="28" cy="21" r="1.6" ${f("line")}/><circle cx="36" cy="21" r="1.6" ${f("line")}/><path d="M32 24l7 2-7 1z" ${f("gold")}/>
    <circle cx="32" cy="41" r="1.8" ${f("line")}/><circle cx="32" cy="49" r="1.8" ${f("line")}/>`) },
  { k: "lights", name: "반짝 전구줄", p: 20, one: true, fixed: true, svg: svg(`<path d="M4 20q28 22 56 0" ${s("line", 2)}/>
    <circle cx="14" cy="31" r="6" ${f("gold")}/><circle cx="32" cy="36" r="6" ${f("red")}/><circle cx="50" cy="31" r="6" ${f("blue")}/>`) },
  { k: "star", name: "꼭대기 별", p: 25, one: true, fixed: true, svg: svg(`<path d="M32 5l8 17 18 2-13 13 4 19-17-9-17 9 4-19L6 24l18-2z" ${fs("gold")}/>`) },
];
const item = (k) => ITEMS.find((x) => x.k === k);
// 받침이 있으면 을/이, 없으면 를/가
const batchim = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
const eul = (w) => w + (batchim(w) ? "을" : "를");
const iga = (w) => w + (batchim(w) ? "이" : "가");
const MAX = 40; // 트리에 너무 빽빽하지 않게

// ── 트리 그림 (장면 너비 70%, 바닥에서 4%: 트리 좌표 → 장면 % 변환과 짝) ─────────────────────────
const LIGHTS = [[66, 74, 134, 74, 52], [48, 128, 152, 128, 108], [32, 180, 168, 180, 162]]; // 줄마다 [x1,y1,x2,y2,처짐 y]
function treeSvg(lights) {
  const tier = (top, base, half) => `<path d="M100 ${top}L${100 - half} ${base}q${half / 2} 12 ${half} 6q${half / 2} 6 ${half} -6z" ${fs("green", "line", 3)}/>`;
  const strand = ([x1, y1, x2, y2, sag], n) => {
    const bulbs = [0.15, 0.38, 0.62, 0.85].map((t, i) => {
      const x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * 100 + t * t * x2;
      const y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * (sag * 2 - (y1 + y2) / 2) + t * t * y2;
      return `<circle class="bulb" cx="${x.toFixed(1)}" cy="${(y + 4).toFixed(1)}" r="5" ${f(["gold", "red", "blue", "white"][(i + n) % 4])} style="animation-delay:${((i + n) % 3) * 0.5}s"/>`;
    }).join("");
    return `<path d="M${x1} ${y1}Q100 ${sag * 2 - (y1 + y2) / 2} ${x2} ${y2}" ${s("line", 1.6)}/>${bulbs}`;
  };
  return `<svg class="tree-svg" viewBox="0 0 200 240" aria-hidden="true">
    <rect x="88" y="198" width="24" height="18" ${fs("brown", "line", 3)}/>
    <path d="M70 214h60l-6 24H76z" ${fs("red", "line", 3)}/>
    ${tier(100, 200, 82)}${tier(55, 146, 62)}${tier(16, 90, 42)}
    ${lights ? LIGHTS.map(strand).join("") : ""}
  </svg>`;
}
// 트리 좌표(200x240) → 장면 % (장면 5:6, 트리 너비 70% · 왼쪽 15% · 위 26%)
const toScene = (tx, ty) => [15 + (tx / 200) * 70, 26 + ty * (70 / 240)];
// 새 장식이 놓일 자리: 방울은 트리 잎 안 아무 곳, 선물·눈사람은 바닥
function spot(it) {
  if (it.k === "gift" || it.k === "snowman") {
    const left = Math.random() < 0.5;
    return [left ? 12 + Math.random() * 14 : 74 + Math.random() * 14, 88 + Math.random() * 4];
  }
  const ty = 40 + Math.random() * 150;
  const half = ((ty - 16) / 184) * 76 * 0.75;
  return toScene(100 + (Math.random() * 2 - 1) * half, ty);
}

// ── 장면 그리기 (꾸미기 화면과 방송국 카드 미리 보기가 같이 쓴다) ─────────────────────────
export function treeScene({ edit = false, sel = -1, fresh = -1 } = {}) {
  const t = T();
  const has = (k) => t.items.some((x) => x.k === k);
  const tag = edit ? "button" : "span";
  const orns = t.items.map((x, i) => {
    const it = item(x.k);
    if (!it || x.k === "lights") return "";
    const [l, tp] = x.k === "star" ? [50, 29.5] : [x.x, x.y];
    const size = x.k === "star" ? 15 : it.size;
    const attrs = edit ? `type="button" data-i="${i}" aria-label="${esc(it.name)}${x.k === "star" ? "" : " · 끌어서 옮기기"}"` : "";
    return `<${tag} class="orn ${x.k === "star" ? "fixed" : ""} ${i === sel ? "sel" : ""} ${i === fresh ? "new" : ""}" ${attrs}
      style="left:${l}%;top:${tp}%;width:${size}%">${it.svg}</${tag}>`;
  }).join("");
  return `<div class="tree-scene ${edit ? "edit" : ""}">
    <span class="tree-floor" aria-hidden="true"></span>
    ${pose("nuri", "sit", { cls: "tree-friend tf-l" })}${pose("bobo", "listen", { cls: "tree-friend tf-r flip" })}
    ${treeSvg(has("lights"))}
    ${orns}
  </div>`;
}

// ── 나만의 트리 화면 (#/tree) ─────────────────────────
export function TreePage() {
  setRegion("r1");
  let sel = -1;
  const draw = (fresh = -1) => {
    const t = T();
    const w = wallet();
    const ware = (it) => {
      const owned = it.one && t.items.some((x) => x.k === it.k);
      const short = !owned && w < it.p;
      return `<button type="button" class="ware ${owned ? "owned" : ""} ${short ? "short" : ""}" data-k="${it.k}" aria-label="${esc(it.name)} 반짝이 ${it.p}개${owned ? " · 가지고 있어요, 누르면 치워요" : ""}">
        <span class="ware-art">${it.svg}</span><b>${esc(it.name)}</b><span class="price">${owned ? "✓ 걸었어요" : `✨ ${it.p}`}</span></button>`;
    };
    const cur = t.items[sel];
    const tool = cur && item(cur.k)
      ? `<div class="tree-tool"><span><b>${esc(item(cur.k).name)}</b> ${item(cur.k).fixed ? "" : "· 끌어서 옮겨요"}</span>
          <button type="button" class="btn" id="undo">치우기 (✨ ${cur.p} 돌려받기)</button></div>`
      : `<div class="tree-tool quiet small"><span>장식을 누르면 고를 수 있어요. 끌어서 원하는 곳에 옮겨요.</span></div>`;
    $app.innerHTML = `${header("🎄 나만의 트리", "#/station")}
      <section class="page tree-page">
        <div class="tree-main">
          <div class="card tree-card" data-region="lilac">
            ${treeScene({ edit: true, sel, fresh })}
            ${tool}
          </div>
        </div>
        <div class="tree-side">
          <div class="card wallet-card">
            <div class="wallet"><span class="kick">내 반짝이</span><b>✨ ${w}</b></div>
            <details class="earn"><summary>반짝이 얻는 법</summary>
              <ul><li>별 1개 = ✨ ${EARN.star} <small>(한 단을 다 마치면 ✨ ${EARN.star * 3})</small></li>
              <li>구간 도전 성공 = ✨ ${EARN.challenge}</li><li>잠꾸러기 라디오 깨우기 = ✨ ${EARN.core}</li>
              <li>처음 선물 = ✨ ${EARN.welcome}</li></ul>
              <p class="quiet small">지금까지 모은 반짝이 ${earned()} · 쓴 반짝이 ${t.spent}</p></details>
          </div>
          <div class="card shop-card">
            <h2>🎁 크리스마스 상점</h2>
            <div class="shop">${ITEMS.map(ware).join("")}</div>
            <p class="quiet small">치우면 쓴 반짝이를 그대로 돌려받아요. 장식은 ${MAX}개까지 걸 수 있어요.</p>
          </div>
          <a class="btn block" href="#/station">📻 방송국 미션 보러 가기</a>
        </div>
      </section>`;
    bind();
  };

  const buy = (it) => {
    const t = T();
    const at = it.one ? t.items.findIndex((x) => x.k === it.k) : -1;
    if (at >= 0) return refund(at);
    const w = wallet();
    if (w < it.p) return toast(`반짝이가 ${it.p - w}개 더 필요해요. 단을 마치면 생겨요!`);
    if (t.items.length >= MAX) return toast(`장식은 ${MAX}개까지예요. 하나를 치우고 다시 사 보세요`);
    const [x, y] = it.fixed ? [50, 30] : spot(it);
    t.items.push({ k: it.k, x: +x.toFixed(1), y: +y.toFixed(1), p: it.p });
    t.spent += it.p;
    saveJ();
    sel = it.fixed ? -1 : t.items.length - 1;
    draw(t.items.length - 1);
    toast(`✨ ${it.p} 썼어요 · ${it.fixed ? `${iga(it.name)} 반짝!` : `${eul(it.name)} 걸었어요. 끌어서 옮겨 보세요`}`);
  };
  const refund = (i) => {
    const t = T();
    const [x] = t.items.splice(i, 1);
    t.spent = Math.max(0, t.spent - (x.p || 0));
    saveJ();
    sel = -1;
    draw();
    toast(`${eul(item(x.k)?.name || "장식")} 치웠어요 · ✨ ${x.p} 돌려받았어요`);
  };

  function bind() {
    $app.querySelectorAll(".ware").forEach((b) => (b.onclick = () => buy(item(b.dataset.k))));
    const undo = $app.querySelector("#undo");
    if (undo) undo.onclick = () => refund(sel);
    const scene = $app.querySelector(".tree-scene");
    const select = (i) => {
      sel = i;
      draw();
      $app.querySelector(`.orn[data-i="${i}"]`)?.focus();
    };
    scene.querySelectorAll(".orn").forEach((b) => {
      const i = +b.dataset.i;
      const it = T().items[i];
      b.addEventListener("keydown", (e) => {
        const d = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[e.key];
        if (!d || b.classList.contains("fixed")) return;
        e.preventDefault();
        it.x = clamp(it.x + d[0]); it.y = clamp(it.y + d[1]);
        b.style.left = `${it.x}%`; b.style.top = `${it.y}%`;
        saveJ();
      });
      b.addEventListener("pointerdown", (e) => {
        if (b.classList.contains("fixed")) return;
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        const r = scene.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY;
        let moved = false;
        b.classList.add("drag");
        const move = (ev) => {
          if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
          moved = true;
          it.x = +clamp(((ev.clientX - r.left) / r.width) * 100).toFixed(1);
          it.y = +clamp(((ev.clientY - r.top) / r.height) * 100).toFixed(1);
          b.style.left = `${it.x}%`; b.style.top = `${it.y}%`;
        };
        const end = () => {
          b.removeEventListener("pointermove", move);
          b.removeEventListener("pointerup", end);
          b.removeEventListener("pointercancel", end);
          b.classList.remove("drag");
          if (moved) saveJ();
          select(i);
        };
        b.addEventListener("pointermove", move);
        b.addEventListener("pointerup", end);
        b.addEventListener("pointercancel", end);
      });
      b.addEventListener("click", (e) => { if (e.detail === 0) select(i); }); // 키보드(Enter·Space)로 고르기
    });
  }
  draw();
}
const clamp = (v) => Math.min(96, Math.max(4, v));
