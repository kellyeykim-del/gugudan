// 나만의 트리: 학습으로 모은 반짝이(✨)로 크리스마스 상점에서 장식을 사서 트리를 꾸민다.
// 반짝이는 저장하지 않고 기존 기록(별 · 구간 도전 · 마지막 도전)에서 계산한다 → 예전 기록도 그대로 반짝이가 된다.
// 저장하는 것은 산 장식(자리·값)과 쓴 반짝이뿐 (gugudan.journey의 tree: { spent, items:[{k,x,y,p}] }).
// 그림: img/tree/ (Codex 비비드 시안을 tools/cut_tree_art.py로 자름). 전구줄만 SVG로 트리 위에 그린다.
import { DANS, SENT_DANS, BONUS_DANS } from "./data.js";
import { store } from "./store.js";
import { $app, esc, header, toast } from "./ui.js";
import { pose, VIVID } from "./village.js";
import { jrec, saveJ, setRegion } from "./journey.js";
import { learner } from "./welcome.js";

// ── 반짝이 얻는 법 ─────────────────────────
// 비비드(2026-11-07): 앙코르(보너스) 단은 다 마치면 ✨4 더 → 한 단에 ✨10 (상점 가격을 올린 만큼 끝까지 모을 거리)
export const EARN = { star: 2, challenge: 10, core: 30, welcome: 6, encore: VIVID ? 4 : 0 };
const CH_IDS = ["r1", "r2", "r3", "r4"];
// 한 단을 다 마치면 받는 반짝이 (앙코르 단은 비비드에서 더 많이)
export const danGain = (d) => EARN.star * 3 + (d?.bonus ? EARN.encore : 0);
// 선생님 화면에서도 같은 계산을 쓰도록 기록만 받아서 센다 (encore = 다 마친 앙코르 단 수)
export function sparklesOf(stars, j, encore = 0) {
  const ch = CH_IDS.filter((id) => j?.challenges?.[id]).length;
  return EARN.welcome + stars * EARN.star + ch * EARN.challenge + (j?.core?.cleared ? EARN.core : 0) + encore * EARN.encore;
}
export const starsAll = () => [...DANS, ...SENT_DANS].reduce((a, d) => a + store.stars(d.id), 0);
const T = () => {
  const j = jrec();
  if (!j.tree || !Array.isArray(j.tree.items)) j.tree = { spent: 0, items: [] };
  return j.tree;
};
export const earned = () => sparklesOf(starsAll(), jrec(), BONUS_DANS.filter((d) => store.passed(d.id)).length);
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
// 비비드(2026-11-07 시안 승인): 가장 싼 장식 = 한 단(✨6). 단계마다 값을 올리고 전구줄·보석 별은 오래 모아 사는 큰 목표.
// 이미 산 장식은 산 값(p)을 저장해 두어 치우면 그 값 그대로 돌려받는다 → 값을 바꿔도 아이 기록 손실 없음.
const VIVID_PRICE = { red: 6, blue: 6, gold: 6, bell: 8, candy: 8, flake: 8, bow: 12, cookie: 12, sock: 12,
  mic: 15, radio: 15, gift: 15, snowman: 20, lights: 40, star: 60 };
// 친구 모자: 구간 도전(1·2·3)을 성공하면 열린다. 트리 방 친구 머리 위에 쓰고, 트리 위 자리는 없다.
// 머리 자리 = 친구 그림 상자 대비 % (proposals/hats-2026-11-06/fit_hats.py가 잰 값)
const HATS = [
  { k: "hat-nuri", who: "nuri", name: "말문이 산타 모자", p: 30, need: "r1", at: [21.9, -22.8, 69.2] },
  { k: "hat-minty", who: "minty", name: "귀담이 털 귀마개", p: 30, need: "r2", at: [19.2, 29, 56.5] },
  { k: "hat-bobo", who: "bobo", name: "차분이 방울 털모자", p: 30, need: "r3", at: [24.6, -10.5, 50.4] },
].map((it) => ({ ...it, one: true, hat: true, svg: art(it.k) }));
if (VIVID) {
  ITEMS.forEach((it) => (it.p = VIVID_PRICE[it.k] ?? it.p));
  ITEMS.push(...HATS);
}
const item = (k) => ITEMS.find((x) => x.k === k);
const locks = (it) => !!it.need && !jrec().challenges?.[it.need];
const hatOn = (who, t = T()) => VIVID && t.items.some((x) => x.k === `hat-${who}`);
// 받침이 있으면 을/이, 없으면 를/가
const batchim = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
const eul = (w) => w + (batchim(w) ? "을" : "를");
const iga = (w) => w + (batchim(w) ? "이" : "가");
const MAX = 40; // 트리에 너무 빽빽하지 않게

// ── 트리 그림 (img/tree/tree.webp, 5:6) ─────────────────────────
// 장면(5:6) 안에서 트리는 너비 70% · 왼쪽 15% · 위 26% (예전 SVG 트리와 같은 자리라 저장된 장식 자리가 그대로 맞는다)
const toScene = (tx, ty) => [15 + tx * 0.7, 26 + ty * 0.7]; // 트리 그림 % → 장면 %
// 잎 영역: [그림 y%, 왼쪽 x%, 오른쪽 x%] (tools/cut_tree_art.py가 그림에서 잰 값, 가지 끝 물결 줄은 뺐다)
const LEAF_OLD = [[13, 40, 59], [16, 37.2, 61.8], [19, 33.4, 65.2], [22, 28, 68.9], [25, 23.6, 72.3], [28, 21.6, 73.8],
  [37, 27.1, 69.4], [40, 23.9, 72.3], [43, 19.8, 76.5], [46, 15.5, 82.1], [49, 13.6, 83.8],
  [58, 18.5, 79.2], [61, 15.5, 82.3], [64, 11.9, 86.2], [67, 8.2, 90.4], [70, 6.1, 92.9]];
// 전구줄: 층마다 [x1, y1, x2, y2, 처짐] (그림 %)
const LIGHTS_OLD = [[30, 22, 70, 22, 6], [21, 44, 80, 44, 7], [12, 65, 89, 65, 8]];
// 비비드 눈 트리(img/tree/tree-v2.webp, 2026-11-07): 층 높이는 같고 양옆이 3~5% 날씬. 옛 자리에 걸린 장식도 모두 잎 안이다.
const LEAF = VIVID ? [[13, 40.7, 58.6], [16, 38.3, 61], [19, 35.2, 64], [22, 31.4, 67.5], [25, 27.4, 70.7], [28, 25.8, 72.1],
  [37, 29.6, 68], [40, 26.9, 70.7], [43, 23.4, 74.1], [46, 19.6, 78.2], [49, 17.5, 80.2],
  [58, 22.8, 76], [61, 20.3, 78.6], [64, 17, 81.9], [67, 13.4, 85.8], [70, 11.6, 88.3]] : LEAF_OLD;
const LIGHTS = VIVID ? [[31, 22, 69, 22, 6], [24, 44, 76, 44, 7], [16, 65, 84, 65, 8]] : LIGHTS_OLD;
const TREE_IMG = VIVID ? "img/tree/tree-v2.webp" : "img/tree/tree.webp";
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
  return `<span class="tree-art" aria-hidden="true"><img src="${TREE_IMG}" alt="" draggable="false">
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
// tree를 주면 그 기록(선생님 화면의 학생 트리)을, 없으면 이 기기의 트리를 그린다
export function treeScene({ edit = false, sel = -1, fresh = -1, tree = null } = {}) {
  const t = tree || T();
  const has = (k) => t.items.some((x) => x.k === k);
  const tag = edit ? "button" : "span";
  const orns = t.items.map((x, i) => {
    const it = item(x.k);
    if (!it || x.k === "lights" || it.hat) return "";
    const [l, tp] = x.k === "star" ? [50, 25.5] : [x.x, x.y];
    const size = x.k === "star" ? 21 : it.size;
    const attrs = edit ? `type="button" data-i="${i}" aria-label="${esc(it.name)}${x.k === "star" ? "" : " · 끌어서 옮기기"}"` : "";
    return `<${tag} class="orn ${x.k === "star" ? "fixed" : ""} ${i === sel ? "sel" : ""} ${i === fresh ? "new" : ""}" ${attrs}
      style="left:${l}%;top:${tp}%;width:${size}%">${it.svg}</${tag}>`;
  }).join("");
  return `<div class="tree-scene ${edit ? "edit" : ""}">${treeArt(has("lights"))}${orns}</div>`;
}

// ── 트리가 놓인 방: 눈 내리는 창문 · 깃발 줄 · 벽난로 대신 포근한 러그 · 세 친구 (꾸밈 그림, 저장 없음) ─────────────────────────
function treeRoom(sceneHtml, { name, tree } = {}) {
  const flags = ["red", "blue", "gold", "green", "red", "blue", "gold", "green", "red", "blue", "gold"]
    .map((c, i) => `<path d="M${i * 9 + 1} ${4 + Math.sin((i / 10) * Math.PI) * 5}l7 0-3.5 8z" ${fs(c, "line", 0.5)}/>`).join("");
  const who = name ?? learner();
  return `<div class="tree-room">
    <svg class="room-flags" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 3Q50 17 100 3" ${s("line", 0.5)}/>${flags}</svg>
    <span class="room-window" aria-hidden="true"><i class="snow"></i><i class="snow s2"></i></span>
    <span class="room-sign">🎄 ${who ? `${esc(who)}의 트리` : "나만의 트리"}</span>
    <span class="room-floor" aria-hidden="true"></span><span class="room-rug" aria-hidden="true"></span>
    ${VIVID ? friendsV(tree || T()) : `${pose("nuri", "celebrate", { cls: "room-friend rf-l" })}${pose("minty", "listen", { cls: "room-friend rf-m" })}${pose("bobo", "encourage", { cls: "room-friend rf-r flip" })}`}
    ${sceneHtml}
  </div>`;
}

// 비비드: 친구 그림 위에 산 모자를 씌운다. 귀담이는 귀마개를 쓰면 정면(손 흔들기)으로 — 옆모습(listen)은 귀마개가 얼굴을 가린다
function friendsV(t) {
  const one = (who, act, cls) => {
    const h = hatOn(who, t) && HATS.find((x) => x.who === who);
    const hat = h ? `<img class="rf-hat" src="img/tree/${h.k}.webp" alt="" draggable="false" style="left:${h.at[0]}%;top:${h.at[1]}%;width:${h.at[2]}%">` : "";
    return `<span class="room-friend rf-wrap ${cls}" aria-hidden="true">${pose(who, act, { cls: "rf-pose" })}${hat}</span>`;
  };
  return one("nuri", "celebrate", "rf-l") + one("minty", hatOn("minty", t) ? "welcome" : "listen", "rf-m") + one("bobo", "encourage", "rf-r flip");
}

// 다른 사람(학생)의 트리를 보기 전용으로 그린다: 선생님 화면 '우리 반 트리 모아보기'. 기록은 바꾸지 않는다
export function treeView(journey, name) {
  const tree = Array.isArray(journey?.tree?.items) ? journey.tree : { spent: 0, items: [] };
  return treeRoom(treeScene({ tree }), { name, tree });
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
      const locked = !owned && locks(it);
      const short = !owned && !locked && w < it.p;
      const price = owned ? (it.hat ? "✓ 썼어요" : "✓ 걸었어요") : locked ? `🔒 ${it.need.slice(1)}구간 도전` : `✨ ${it.p}`;
      return `<button type="button" class="ware ${it.hat ? "hat" : ""} ${owned ? "owned" : ""} ${short ? "short" : ""} ${locked ? "locked" : ""}" data-k="${it.k}" aria-label="${esc(it.name)} 반짝이 ${it.p}개${owned ? " · 가지고 있어요, 누르면 치워요" : locked ? ` · ${it.need.slice(1)}구간 도전을 성공하면 열려요` : ""}">
        <span class="ware-art">${it.svg}</span><b>${esc(it.name)}</b><span class="price">${price}</span></button>`;
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
              <li>처음 선물 = ✨ ${EARN.welcome}</li>${EARN.encore ? `<li>앙코르(보너스) 단은 한 단에 ✨ ${EARN.star * 3 + EARN.encore}</li>` : ""}</ul>
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
    if (locks(it)) return toast(`🔒 ${it.need.slice(1)}구간 도전을 성공하면 ${iga(it.name)} 열려요`);
    const w = wallet();
    if (w < it.p) return toast(`반짝이가 ${it.p - w}개 더 필요해요. 단을 마치면 생겨요!`);
    if (t.items.length >= MAX) return toast(`장식은 ${MAX}개까지예요. 하나를 치우고 다시 사 보세요`);
    const [x, y] = it.hat ? [0, 0] : it.fixed ? [50, 25.5] : spot(it);
    t.items.push({ k: it.k, x: +x.toFixed(1), y: +y.toFixed(1), p: it.p });
    t.spent += it.p;
    saveJ();
    sel = it.fixed || it.hat ? -1 : t.items.length - 1;
    draw(t.items.length - 1);
    toast(`✨ ${it.p} 썼어요 · ${it.hat ? `${eul(it.name)} 썼어요!` : it.fixed ? `${iga(it.name)} 반짝!` : `${eul(it.name)} 걸었어요. 끌어서 옮겨 보세요`}`);
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
