// 나만의 트리: 학습으로 모은 반짝이(✨)로 크리스마스 상점에서 장식을 사서 트리를 꾸민다.
// 반짝이는 저장하지 않고 기존 기록(별 · 구간 도전 · 마지막 도전)에서 계산한다 → 예전 기록도 그대로 반짝이가 된다.
// 저장하는 것은 산 장식(자리·값)과 쓴 반짝이뿐 (gugudan.journey의 tree: { spent, items:[{k,x,y,p}] }).
// 그림: img/tree/ (Codex 비비드 시안을 tools/cut_tree_art.py로 자름). 전구줄만 SVG로 트리 위에 그린다.
import { DANS, SENT_DANS } from "./data.js";
import { store } from "./store.js";
import { $app, esc, header, toast } from "./ui.js";
import { pose } from "./village.js";
import { jrec, saveJ, setRegion } from "./journey.js";
import { learner } from "./welcome.js";

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
// 그림: Codex 비비드 시안(proposals/station-mock/art)을 tools/cut_tree_art.py로 자른 img/tree/<k>.webp. size = 트리 장면 너비의 %
// 전구줄 · 꼭대기 별은 하나만, 자리가 정해져 있다 (전구줄은 트리 위에 줄로 그린다)
const f = (v) => `style="fill:var(--o-${v})"`;
const s = (v, w = 2.5) => `style="stroke:var(--o-${v});stroke-width:${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
const fs = (v, line = "line", w = 2.5) => `style="fill:var(--o-${v});stroke:var(--o-${line});stroke-width:${w}" stroke-linejoin="round"`;
const art = (k) => `<img src="img/tree/${k}.webp" alt="" draggable="false">`;
export const ITEMS = [
  { k: "red", name: "말문이 방울", p: 3, size: 11 },
  { k: "blue", name: "귀담이 방울", p: 3, size: 11 },
  { k: "gold", name: "차분이 방울", p: 4, size: 11 },
  { k: "bell", name: "작은 종", p: 5, size: 11 },
  { k: "candy", name: "지팡이 사탕", p: 5, size: 10 },
  { k: "flake", name: "눈송이", p: 5, size: 10 },
  { k: "bow", name: "빨간 리본", p: 6, size: 12 },
  { k: "cookie", name: "말문이 쿠키", p: 8, size: 12 },
  { k: "sock", name: "양말", p: 8, size: 11 },
  { k: "mic", name: "마이크 장식", p: 10, size: 11 },
  { k: "radio", name: "라디오 장식", p: 10, size: 12 },
  { k: "gift", name: "선물 상자", p: 10, size: 11.5 },
  { k: "snowman", name: "눈사람", p: 15, size: 14 },
  { k: "lights", name: "반짝 전구줄", p: 20, one: true, fixed: true },
  { k: "star", name: "반짝 보석 별", p: 25, one: true, fixed: true },
].map((it) => ({ ...it, svg: art(it.k) }));
const item = (k) => ITEMS.find((x) => x.k === k);
// 받침이 있으면 을/이, 없으면 를/가
const batchim = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
const eul = (w) => w + (batchim(w) ? "을" : "를");
const iga = (w) => w + (batchim(w) ? "이" : "가");
const MAX = 40; // 트리에 너무 빽빽하지 않게

// ── 트리 그림 (img/tree/tree.webp, 5:6) ─────────────────────────
// 장면(5:6) 안에서 트리는 너비 70% · 왼쪽 15% · 위 26% (예전 SVG 트리와 같은 자리라 저장된 장식 자리가 그대로 맞는다)
const toScene = (tx, ty) => [15 + tx * 0.7, 26 + ty * 0.7]; // 트리 그림 % → 장면 %
// 잎 영역: [그림 y%, 왼쪽 x%, 오른쪽 x%] (tools/cut_tree_art.py가 그림에서 잰 값, 가지 끝 물결 줄은 뺐다)
const LEAF = [[13, 40, 59], [16, 37.2, 61.8], [19, 33.4, 65.2], [22, 28, 68.9], [25, 23.6, 72.3], [28, 21.6, 73.8],
  [37, 27.1, 69.4], [40, 23.9, 72.3], [43, 19.8, 76.5], [46, 15.5, 82.1], [49, 13.6, 83.8],
  [58, 18.5, 79.2], [61, 15.5, 82.3], [64, 11.9, 86.2], [67, 8.2, 90.4], [70, 6.1, 92.9]];
// 전구줄: 층마다 [x1, y1, x2, y2, 처짐] (그림 %)
const LIGHTS = [[30, 22, 70, 22, 6], [21, 44, 80, 44, 7], [12, 65, 89, 65, 8]];
function treeArt(lights) {
  const strand = ([x1, y1, x2, y2, sag], n) => {
    const cy = (y1 + y2) / 2 + sag * 2; // 2차 곡선 조절점 (가운데가 sag만큼 처짐)
    const at = (t) => [(1 - t) ** 2 * x1 + 2 * (1 - t) * t * 50 + t * t * x2, (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t * t * y2];
    const bulbs = [0.1, 0.3, 0.5, 0.7, 0.9].map((t, i) => {
      const [x, y] = at(t);
      return `<circle class="bulb" cx="${x.toFixed(1)}" cy="${((y + 2.2) * 1.2).toFixed(1)}" r="2.3" ${fs(["gold", "red", "blue", "white", "red"][(i + n) % 5], "line", 0.7)} style="animation-delay:${((i + n) % 3) * 0.5}s"/>`;
    }).join("");
    return `<path d="M${x1} ${y1 * 1.2}Q50 ${cy * 1.2} ${x2} ${y2 * 1.2}" ${s("line", 0.7)}/>${bulbs}`;
  };
  return `<span class="tree-art" aria-hidden="true"><img src="img/tree/tree.webp" alt="" draggable="false">
    ${lights ? `<svg class="tree-lights" viewBox="0 0 100 120">${LIGHTS.map(strand).join("")}</svg>` : ""}</span>`;
}
// 새 장식이 놓일 자리: 장식은 잎 안 아무 곳, 선물·눈사람은 바닥
function spot(it) {
  if (it.k === "gift" || it.k === "snowman") {
    const left = Math.random() < 0.5;
    return [left ? 12 + Math.random() * 12 : 76 + Math.random() * 12, 89 + Math.random() * 3];
  }
  const [ty, x1, x2] = LEAF[Math.floor(Math.random() * LEAF.length)];
  const pad = Math.min(7, (x2 - x1) / 4);
  return toScene(x1 + pad + Math.random() * (x2 - x1 - pad * 2), ty);
}

// ── 장면 그리기 (트리 + 장식, 5:6. 장식 자리는 이 상자 기준 %) ─────────────────────────
export function treeScene({ edit = false, sel = -1, fresh = -1 } = {}) {
  const t = T();
  const has = (k) => t.items.some((x) => x.k === k);
  const tag = edit ? "button" : "span";
  const orns = t.items.map((x, i) => {
    const it = item(x.k);
    if (!it || x.k === "lights") return "";
    const [l, tp] = x.k === "star" ? [50, 25.5] : [x.x, x.y];
    const size = x.k === "star" ? 21 : it.size;
    const attrs = edit ? `type="button" data-i="${i}" aria-label="${esc(it.name)}${x.k === "star" ? "" : " · 끌어서 옮기기"}"` : "";
    return `<${tag} class="orn ${x.k === "star" ? "fixed" : ""} ${i === sel ? "sel" : ""} ${i === fresh ? "new" : ""}" ${attrs}
      style="left:${l}%;top:${tp}%;width:${size}%">${it.svg}</${tag}>`;
  }).join("");
  return `<div class="tree-scene ${edit ? "edit" : ""}">${treeArt(has("lights"))}${orns}</div>`;
}

// ── 트리가 놓인 방: 눈 내리는 창문 · 깃발 줄 · 벽난로 대신 포근한 러그 · 세 친구 (꾸밈 그림, 저장 없음) ─────────────────────────
function treeRoom(sceneHtml) {
  const flags = ["red", "blue", "gold", "green", "red", "blue", "gold", "green", "red", "blue", "gold"]
    .map((c, i) => `<path d="M${i * 9 + 1} ${4 + Math.sin((i / 10) * Math.PI) * 5}l7 0-3.5 8z" ${fs(c, "line", 0.5)}/>`).join("");
  const who = learner();
  return `<div class="tree-room">
    <svg class="room-flags" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 3Q50 17 100 3" ${s("line", 0.5)}/>${flags}</svg>
    <span class="room-window" aria-hidden="true"><i class="snow"></i><i class="snow s2"></i></span>
    <span class="room-sign">🎄 ${who ? `${esc(who)}의 트리` : "나만의 트리"}</span>
    <span class="room-floor" aria-hidden="true"></span><span class="room-rug" aria-hidden="true"></span>
    ${pose("nuri", "celebrate", { cls: "room-friend rf-l" })}${pose("minty", "listen", { cls: "room-friend rf-m" })}${pose("bobo", "encourage", { cls: "room-friend rf-r flip" })}
    ${sceneHtml}
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
            ${treeRoom(treeScene({ edit: true, sel, fresh }))}
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
    const [x, y] = it.fixed ? [50, 25.5] : spot(it);
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
