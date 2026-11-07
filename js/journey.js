// 우리 목소리 방송국: 5구간 색 · 목소리 카드 · 구간 도전 · 마지막 도전 '잠꾸러기 라디오 깨우기'
// 기준: characters-design-2026-11-03/world-story-v2 (DESIGN_STORY_V2.md, tokens.json)
// 문제는 모두 기존 단 문장·선생님 음원에서만 만든다 (새 문장·새 음원을 만들지 않는다).
// 기록은 학습 기록(gugudan.v1)과 따로 저장해 기존 별·오답·게임 기록을 건드리지 않는다.
import { MAIN_DANS, BONUS_DANS, getDan } from "./data.js";
import { store } from "./store.js";
import { speak, speakAll, stop, canSpeak } from "./speech.js";
import { pool, blankQ, shuffle, tokens, findBlank, splitPunct } from "./quiz.js";
import { $app, esc, hl, danLabel, header, toast } from "./ui.js";
import { drillLines } from "./data.js";
import { pose, VIVID } from "./village.js";
import { mountRecorder, stopRecorder } from "./recorder.js";
import { learnerGa } from "./welcome.js";
import { wallet, EARN, treeCount, danGain } from "./tree.js";

// ── 5구간 ─────────────────────────
// 저학년이 바로 알아듣게: 장소·모으는 물건·도전 이름은 쉬운 말, 도전은 문제 4개 안팎 + 눈에 보이는 진행(상자·전구)
export const REGIONS = [
  { id: "r1", from: 1, to: 10, place: "아아 마이크방", module: "꼬마 마이크", host: "nuri",
    goal: "한 단을 마칠 때마다 마이크 조각을 하나씩 모아요. 다 모으면 꼬마 마이크 완성!",
    challenge: { name: "귀 쫑긋 퀴즈", intro: "친구가 말하는 문장을 듣고 맞는 카드를 골라요. 마지막엔 내 목소리로 녹음해 봐요!",
      token: ["🎤", "🌟"], done: "‘첫 목소리’ 별 스티커를 받았어요!" } },
  { id: "r2", from: 11, to: 20, place: "소리 보물섬", module: "소리 보물지도", host: "minty",
    goal: "보물지도 조각을 모아 섬에 숨은 소리 보물을 찾아요.",
    challenge: { name: "보물 상자 열기", intro: "보물 상자가 4개 있어요. 듣고 고르거나 구구단 뜻을 고르면 상자가 하나씩 열려요.",
      token: ["🎁", "💎"], done: "상자 4개를 다 열었어요! 반짝이는 소리 보석을 찾았어요." } },
  { id: "r3", from: 21, to: 30, place: "뚝딱뚝딱 고침방", module: "알록달록 전선", host: "bobo",
    goal: "끊어진 전선을 한 줄씩 이어서 고침방에 불을 켜요.",
    challenge: { name: "전구 켜기", intro: "빠진 말을 찾거나 단어를 순서대로 놓으면 전구가 하나씩 켜져요. 전구 4개를 켜 봐요!",
      token: ["⚫", "💡"], done: "전구 4개가 반짝! 고침방에 불이 들어왔어요." } },
  { id: "r4", from: 31, to: 36, place: "반짝 안테나 언덕", module: "온에어 버튼", host: "minty",
    goal: "안테나를 세우고 온에어 버튼을 눌러 우리 방송을 시작해요.",
    challenge: { name: "온에어! 내 방송 만들기", intro: "문제 3개를 풀면 안테나가 반짝여요. 마지막엔 마음에 드는 문장 카드 3장을 골라 내 방송을 틀어요.",
      token: ["📡", "✨"], done: "온에어! 내가 고른 방송은 방송국에 저장돼요." } },
  { id: "bonus", place: "두근두근 앙코르 무대", module: "앙코르 앨범", host: "bobo",
    goal: "본편을 다 마치면, 우리가 만들고 싶은 방송을 함께 만들어요." },
];
export const regionOf = (d) =>
  !d ? REGIONS[0] : d.bonus ? REGIONS[4] : d.sent ? REGIONS[0] : REGIONS.find((r) => d.no >= r.from && d.no <= r.to) || REGIONS[0];
export const regionDans = (r) => (r.id === "bonus" ? BONUS_DANS : MAIN_DANS.filter((d) => d.no >= r.from && d.no <= r.to));
const regionDone = (r) => regionDans(r).every((d) => store.passed(d.id));
const regionCount = (r) => regionDans(r).filter((d) => store.passed(d.id)).length;
// 선생님 모드(설정)에서는 구간 도전을 단을 다 마치기 전에도 미리 해 볼 수 있다. 미리 보기는 완료 기록을 남기지 않는다.
export const teacherMode = () => !!store.settings.unlockAll;

// 화면 바탕색: 지금 보는 단의 구간 색. 여러 구간이 섞이면 기본 라일락.
export const setRegion = (id) => (document.documentElement.dataset.region = id || "r1");
export function regionForIds(ids) {
  const set = new Set(ids.map(getDan).filter(Boolean).map((d) => regionOf(d).id));
  return set.size === 1 ? [...set][0] : "r1";
}

// 단을 처음 통과해서 그 구간을 다 마쳤다면 그 구간 (축하 안내용)
export function regionJustDone(d) {
  const r = regionOf(d);
  return !d.sent && regionDone(r) ? r : null;
}

// ── 탐험 기록 (따로 저장) ─────────────────────────
const KEY = "gugudan.journey";
const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
function loadJ() {
  try {
    return { challenges: {}, core: { phases: [false, false, false], cleared: "" }, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { challenges: {}, core: { phases: [false, false, false], cleared: "" } };
  }
}
let J = loadJ();
export const jrec = () => J; // 나만의 트리(tree.js)가 같은 기록에 장식을 저장한다
export function saveJ() {
  try {
    localStorage.setItem(KEY, JSON.stringify(J));
    window.dispatchEvent(new Event("gugudan:saved"));
    return true;
  } catch {
    return false;
  }
}
const coreOpen = () => store.passedCount() === MAIN_DANS.length; // 선생님 모드(전체 열기)는 조건이 아니다

// ── 문제 만들기 ─────────────────────────
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sentenceOf = (d) => pick(pool(d));

// 듣고 고르기. n은 보기 수 (처음 2개, 익숙해지면 3개). 음원을 못 쓰면 빈칸 문제로 대신한다.
function listenQ(d, n = 3) {
  if (!canSpeak) return blankQ(d, sentenceOf(d)) || orderQ(d);
  for (let t = 0; t < 12; t++) {
    const s = sentenceOf(d);
    const b = findBlank(s, d);
    if (!b) continue;
    const ws = tokens(s);
    const [, punct] = splitPunct(ws[b.index]);
    const wrong = shuffle(b.options.filter((o) => o !== b.answer)).slice(0, n - 1);
    const opts = [b.answer, ...wrong].map((o) => ws.map((w, i) => (i === b.index ? o + punct : w)).join(" "));
    return { type: "listen", dan: d.id, sentence: s, answer: s, options: shuffle(opts) };
  }
  return orderQ(d);
}
function orderQ(d, max = 8) {
  for (let t = 0; t < 12; t++) {
    const s = sentenceOf(d);
    const ws = tokens(s);
    if (ws.length < 3 || ws.length > max) continue;
    let words = shuffle(ws);
    if (words.join(" ") === ws.join(" ")) words = [...ws].reverse();
    return { type: "order", dan: d.id, sentence: s, words };
  }
  return null;
}
function blank(d) {
  for (let t = 0; t < 12; t++) {
    const q = blankQ(d, sentenceOf(d));
    if (q) return q;
  }
  return orderQ(d);
}
// 구구단 뜻 고르기: 문장에서 구구단 부분(He likes)을 색칠하고 그 부분의 뜻(교재 그대로, 예: ~는 좋아해)을 고른다. 문장 전체의 번역이 아니다. 다른 보기는 같은 구간의 다른 뜻.
// 문장에서 그 단의 구구단 부분(예: He likes / Is there)을 찾는다. 보기의 뜻은 이 부분의 뜻이다.
function corePart(d, s) {
  const heads = d.lines.map((l) => l.split("~")[0].replace(/\s+(a\/an|a|an)\s*$/i, "").replace(/[.?!]\s*$/, "").trim())
    .filter(Boolean).sort((a, b) => b.length - a.length);
  const low = s.toLowerCase();
  const h = heads.find((x) => low.startsWith(x.toLowerCase()) && !/[a-z']/i.test(s[x.length] || ""));
  if (h) return s.slice(0, h.length);
  // 주어가 긴 문장(My dad and I don't have …): 주어 뒤 부분(don't have)까지
  for (const x of heads) {
    const tail = x.split(" ").slice(1).join(" ").toLowerCase();
    const i = tail ? low.indexOf(` ${tail}`) : -1;
    if (i > 0 && !/[a-z']/i.test(s[i + 1 + tail.length] || "")) return s.slice(0, i + 1 + tail.length);
  }
  return s;
}
function meaningQ(d, dans) {
  const s = sentenceOf(d);
  const others = shuffle([...new Set(dans.filter((x) => x.id !== d.id).map((x) => x.meaning))].filter((m) => m !== d.meaning)).slice(0, 2);
  if (others.length < 2) return listenQ(d);
  return { type: "meaning", dan: d.id, sentence: s, core: corePart(d, s), answer: d.meaning, options: shuffle([d.meaning, ...others]) };
}
// 직접 말해 보기 (발음 채점 없음, 스스로 확인)
const speakQ = (d) => ({ type: "speak", dan: d.id, sentence: sentenceOf(d) });

const CHALLENGES = {
  r1: (dans) => { const ds = shuffle(dans); return [listenQ(ds[0], 2), listenQ(ds[1], 2), listenQ(ds[2], 3), speakQ(ds[3])]; },
  r2: (dans) => { const ds = shuffle(dans); return [listenQ(ds[0]), meaningQ(ds[1], dans), listenQ(ds[2]), meaningQ(ds[3], dans)]; },
  r3: (dans) => { const ds = shuffle(dans); return [blank(ds[0]), orderQ(ds[1], 5) || listenQ(ds[1]), blank(ds[2]), listenQ(ds[3])]; },
  r4: (dans) => { const ds = shuffle(dans); return [listenQ(ds[0]), meaningQ(ds[1], dans), blank(ds[2]), pickQ(dans)]; },
};
// 취향 선택 (채점 없음): 이 구간 문장 5개 중 3개를 골라 방송 순서를 정한다
function pickQ(dans) {
  const all = shuffle([...new Set(dans.flatMap((d) => pool(d)))]).slice(0, 5);
  return { type: "pick", dan: dans[0].id, options: all };
}

// ── 문제 한 개 보여 주기 ─────────────────────────
// 틀려도 진행은 남고 그 문제만 다시. 두 번 어려우면 '같이 풀기'(보기를 줄이거나 첫 단어를 놓아 준다).
function askOne(q, $box, onDone, { help = false } = {}) {
  const d = getDan(q.dan);
  const tag = `<span class="pill">${danLabel(d)}</span>`;
  const retry = (msg) => {
    const fb = $box.querySelector(".jfb");
    fb.className = "jfb feedback bad";
    fb.innerHTML = `${pose("minty", "encourage", { cls: "fb-char" })}<b>${msg}</b><div>${q.type === "meaning" ? "" : "정답 문장을 다시 들어 보고 한 번 더!"}</div>
      <button class="btn primary" id="again">다시 해 보기</button>`;
    fb.querySelector("#again").onclick = () => { stop(); askOne(q, $box, onDone, { help: true }); };
    fb.querySelector("#again").focus();
    if (q.type !== "meaning") speak(q.sentence, store.settings.speed);
  };
  const ok = () => {
    const fb = $box.querySelector(".jfb");
    fb.className = "jfb feedback ok";
    fb.innerHTML = `${pose("nuri", "celebrate", { cls: "fb-char" })}<b>좋아요!</b><div>${hl(q.sentence)}</div>
      <button class="btn primary" id="next">다음 →</button>`;
    speak(q.sentence, store.settings.speed);
    fb.querySelector("#next").onclick = () => { stop(); onDone(); };
    fb.querySelector("#next").focus();
  };

  if (q.type === "listen" || q.type === "meaning" || q.type === "blank") {
    let opts = q.options;
    if (help && opts.length > 2) opts = shuffle([q.answer, pick(opts.filter((o) => o !== q.answer))]);
    const title = { listen: "듣고 알맞은 문장 카드를 고르세요", meaning: "색칠한 구구단 부분은 무슨 뜻일까요?", blank: "빠진 말을 고르세요" }[q.type];
    const body = q.type === "listen" ? `<button class="btn big-play" id="play">🔊 다시 듣기</button>`
      : q.type === "meaning" ? `<div class="qsentence"><mark class="qcore">${esc(q.core)}</mark>${esc(q.sentence.slice(q.core.length))}</div>`
      : `<div class="qsentence">${esc(q.before)} <span class="gap">____</span>${/^[.?!,]/.test(q.after) ? "" : " "}${esc(q.after)}</div>`;
    $box.innerHTML = `<div class="qmeta">${tag}</div><p class="qtitle">${title}</p>${body}
      <div class="opts ${q.type === "blank" ? "" : "col"}">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div><div class="jfb"></div>`;
    if (q.type === "listen") {
      const play = () => speak(q.sentence, store.settings.speed);
      $box.querySelector("#play").onclick = play;
      setTimeout(play, 300);
    }
    $box.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
      $box.querySelectorAll(".opt").forEach((x) => (x.disabled = true));
      const right = b.dataset.o === q.answer;
      b.classList.add(right ? "ok" : "bad");
      right ? ok() : retry("아직 아니에요. 괜찮아요!");
    }));
    return;
  }

  if (q.type === "order") {
    const target = tokens(q.sentence).join(" ");
    let bank = q.words.map((w) => ({ w }));
    const built = [];
    if (help) { const first = tokens(q.sentence)[0]; built.push(bank.splice(bank.findIndex((x) => x.w === first), 1)[0]); }
    const draw = () => {
      $box.innerHTML = `<div class="qmeta">${tag}</div><p class="qtitle">단어를 순서대로 눌러 문장을 만드세요${help ? " <span class='quiet'>(첫 단어를 놓아 줬어요)</span>" : ""}</p>
        <div class="answer">${built.map((x, k) => `<button class="word" data-back="${k}">${esc(x.w)}</button>`).join("") || '<span class="quiet">여기에 문장이 만들어져요</span>'}</div>
        <div class="bank">${bank.map((x, k) => `<button class="word" data-take="${k}">${esc(x.w)}</button>`).join("")}</div><div class="jfb"></div>`;
      $box.querySelectorAll("[data-take]").forEach((b) => (b.onclick = () => {
        built.push(bank.splice(+b.dataset.take, 1)[0]);
        draw();
        if (bank.length) return;
        $box.querySelectorAll(".word").forEach((x) => (x.disabled = true));
        const right = built.map((x) => x.w).join(" ") === target;
        $box.querySelector(".answer").classList.add(right ? "ok" : "bad");
        right ? ok() : retry("순서가 조금 달라요.");
      }));
      $box.querySelectorAll("[data-back]").forEach((b) => (b.onclick = () => { bank.push(built.splice(+b.dataset.back, 1)[0]); draw(); }));
    };
    draw();
    return;
  }

  if (q.type === "pick") {
    const chosen = [];
    const draw = () => {
      $box.innerHTML = `<p class="qtitle">방송에 넣을 카드 3장을 순서대로 골라요 <span class="pill">정답이 없는 선택</span></p>
        <ol class="cue">${[0, 1, 2].map((i) => `<li>${chosen[i] ? esc(chosen[i]) : '<span class="quiet">비어 있어요</span>'}</li>`).join("")}</ol>
        <div class="opts col">${q.options.map((o) => `<button class="opt ${chosen.includes(o) ? "on" : ""}" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>
        <div class="row2"><button class="btn primary" id="air" ${chosen.length === 3 ? "" : "disabled"}>이 순서로 방송하기</button></div>`;
      $box.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
        const o = b.dataset.o;
        const at = chosen.indexOf(o);
        if (at >= 0) chosen.splice(at, 1); else if (chosen.length < 3) chosen.push(o);
        draw();
      }));
      $box.querySelector("#air").onclick = async () => {
        J.broadcast = [...chosen];
        saveJ();
        $box.querySelectorAll("button").forEach((x) => (x.disabled = true));
        await speakAll(chosen, store.settings.speed);
        onDone();
      };
    };
    draw();
    return;
  }

  if (q.type === "speak") {
    $box.innerHTML = `<div class="qmeta">${tag}<span class="quiet">${esc(d.meaning)}</span></div>
      <p class="qtitle">문장을 가린 채 먼저 소리 내어 말해 보세요</p>
      <div class="qsentence masked" id="sent"><span class="quiet">문장이 가려져 있어요</span></div>
      <div class="row2"><button class="btn" id="show">정답 보고 듣기</button></div><div class="jfb"></div>`;
    $box.querySelector("#show").onclick = () => {
      $box.querySelector("#sent").innerHTML = hl(q.sentence);
      $box.querySelector("#sent").classList.remove("masked");
      speak(q.sentence, store.settings.speed);
      $box.querySelector(".row2").innerHTML = `<button class="btn primary" id="said">말해 봤어요</button><button class="btn" id="read">읽고 확인했어요</button>`;
      $box.querySelector(".row2").insertAdjacentHTML("afterend", `<div class="rec-mini"><p class="small">🎙 녹음해서 내 목소리도 들어 볼까요? (안 해도 돼요)</p><div class="recorder"></div></div>`);
      mountRecorder($box.querySelector(".recorder"));
      const done = () => { stop(); stopRecorder(); onDone(); };
      $box.querySelector("#said").onclick = done;
      $box.querySelector("#read").onclick = done;
    };
  }
}

// 여러 문제를 차례로. 진행은 막대(.jmeter) 또는 그림 칸(.jtokens: 푼 문제만큼 상자가 열리고 전구가 켜짐)
function runQuestions(qs, $page, onAll) {
  let i = 0;
  const $meter = $page.querySelector(".jmeter i");
  const $box = $page.querySelector(".jbox");
  const next = () => {
    if ($meter) $meter.style.width = `${(i / qs.length) * 100}%`;
    const $tok = $page.querySelector(".jtokens");
    $tok?.querySelectorAll("span").forEach((t, k) => {
      if (k >= i || t.classList.contains("on")) return;
      t.classList.add("on");
      t.textContent = $tok.dataset.on;
    });
    if (i >= qs.length) return onAll();
    const q = qs[i++];
    askOne(q, $box, next);
  };
  next();
}

// ── 우리 목소리 방송국 (예전 '우리 마을 정원' 자리) ─────────────────────────
// 구간마다 단 하나 = 조각 하나. 다 모으면 그 구간 물건(꼬마 마이크 등) 완성. 기능은 처음부터 다 쓸 수 있다.
const moduleState = (r, n, total) => VIVID ? sparkState(r, n, total)
  : (n === total ? `✓ 반짝! ${r.module} 완성` : `${r.module} 조각 ${n} / ${total} 모으는 중`);
// 비비드(2026-11-06): 보상은 반짝이 → 나만의 트리 하나뿐이라, 옛 A안의 '물건 조각' 문구 대신 이 구간에서 모은 반짝이를 보여 준다
const sparkState = (r, n, total) => {
  const ch = r.challenge && J.challenges[r.id] ? EARN.challenge : 0;
  const got = n * (EARN.star * 3 + (r.id === "bonus" ? EARN.encore : 0)) + ch;
  return got ? `${n === total ? "✓ " : ""}이 구간에서 반짝이 ✨ ${got} 모았어요` : "아직 시작 전이에요";
};
const VIVID_GOAL = {
  r1: "마이크 앞에서 첫 영어 문장을 말해 봐요.",
  r2: "섬 곳곳에 숨은 영어 소리를 찾아요.",
  r3: "끊어진 문장을 한 줄씩 이어 고쳐요.",
  r4: "안테나를 세우고 우리 방송을 준비해요.",
  bonus: "본편을 다 마치면 열리는 앙코르 무대예요.",
};
// 구간 설명. 비비드는 '조각 모으기' 대신 '한 단마다 목소리 카드 + 반짝이'로
export const goalOf = (r) => VIVID ? `${VIVID_GOAL[r.id]} 한 단마다 목소리 카드 1장과 반짝이 ✨${EARN.star * 3 + (r.id === "bonus" ? EARN.encore : 0)}!` : r.goal;
export const doneToast = (r) => VIVID
  ? `🎙 ${r.place} 완주!${r.challenge ? ` 구간 도전이 열렸어요 (✨${EARN.challenge})` : ""}`
  : `🎙 ${r.place} 완주! ${r.module} 완성${r.challenge ? " · 구간 도전이 열렸어요" : ""}`;

// 미션 순서: 구간 1~4(단 마치기 + 구간 도전) → 잠꾸러기 라디오 깨우기 → 보너스 7단. 보상은 반짝이(✨)로 통일하고, 반짝이로 '나만의 트리'를 꾸민다.
const DAN_GAIN = EARN.star * 3;
const ENCORE_GAIN = DAN_GAIN + EARN.encore; // 앙코르(보너스) 단 한 단 (비비드 ✨10, 기본 화면 ✨6)
const firstOpen = (dans) => dans.find((d) => !store.passed(d.id));
function missionRows() {
  const rows = REGIONS.slice(0, 4).map((r) => {
    const dans = regionDans(r), n = regionCount(r), done = n === dans.length, ch = !!J.challenges[r.id];
    return { r, got: done && ch, title: `${r.from}–${r.to}단 + ${r.challenge.name}`,
      sub: `${r.place} · 단마다 ✨${DAN_GAIN} · 도전 ✨${EARN.challenge}`, prog: done ? (ch ? "" : "도전만 남았어요") : `${n} / ${dans.length}단` };
  });
  rows.push({ r: { id: "r4", core: true }, got: !!J.core.cleared, lock: !coreOpen(), title: "잠꾸러기 라디오 깨우기",
    sub: `36단을 다 마치면 열려요 · ✨${EARN.core}`, prog: coreOpen() ? "" : `${store.passedCount()} / 36단` });
  const b = REGIONS[4], bd = regionDans(b), bn = regionCount(b);
  rows.push({ r: b, got: bn === bd.length, lock: !store.bonusOpen(), title: "보너스 7단 마치기",
    sub: `본편을 다 마치면 열려요 · 단마다 ✨${ENCORE_GAIN}`, prog: `${bn} / ${bd.length}단` });
  const now = rows.findIndex((x) => !x.got && !x.lock);
  rows.forEach((x, i) => (x.state = x.got ? "got" : i === now ? "now" : x.lock ? "lock" : "later"));
  return rows;
}
// 지금 할 미션 한 장: 무엇을 하면 · 얼마나 남았고 · 무엇을 받는지
function nextMission() {
  for (const r of REGIONS.slice(0, 4)) {
    const dans = regionDans(r), n = regionCount(r);
    if (n < dans.length) {
      const d = firstOpen(dans), left = dans.length - n;
      return { r, title: `${r.from}–${r.to}단 마치기`, place: r.place, meter: [n, dans.length],
        row: `<span>${n} / ${dans.length}단 · 한 단마다 목소리 카드 1장</span><b>${left}단 남았어요</b>`,
        gift: `<b>받는 것: 반짝이 ✨ ${left * DAN_GAIN}</b><span>한 단마다 ✨${DAN_GAIN} · 다 마치면 ‘${esc(r.challenge.name)}’ 도전이 열려요 (✨${EARN.challenge})</span>`,
        go: `<a class="btn primary block" href="#/dan/${d.id}">▷ 이어서 ${danLabel(d)}</a>` };
    }
    if (!J.challenges[r.id]) return { r, title: `구간 도전: ${r.challenge.name}`, place: r.place,
      row: `<span>${r.from}–${r.to}단을 다 마쳤어요!</span><b>도전만 남았어요</b>`,
      gift: `<b>받는 것: 반짝이 ✨ ${EARN.challenge}</b><span>${esc(r.challenge.intro)}</span>`,
      go: `<a class="btn primary block" href="#/challenge/${r.id}">🏁 ${esc(r.challenge.name)} 시작</a>` };
  }
  if (!J.core.cleared) return { r: REGIONS[3], title: "잠꾸러기 라디오 깨우기", place: "본편 마지막 도전",
    row: `<span>본편 36단을 다 마쳤어요!</span><b>마지막 도전</b>`,
    gift: `<b>받는 것: 반짝이 ✨ ${EARN.core} + 목소리 마스터 메달</b><span>듣기 · 순서 · 내 목소리, 세 가지 놀이로 라디오를 깨워요</span>`,
    go: `<a class="btn primary block" href="#/core">📻 라디오 깨우기</a>` };
  const b = REGIONS[4], bd = regionDans(b), bn = regionCount(b), d = firstOpen(bd);
  if (d) return { r: b, title: "보너스 7단 마치기", place: b.place, meter: [bn, bd.length],
    row: `<span>${bn} / ${bd.length}단</span><b>${bd.length - bn}단 남았어요</b>`,
    gift: `<b>받는 것: 반짝이 ✨ ${(bd.length - bn) * ENCORE_GAIN}</b><span>한 단마다 ✨${ENCORE_GAIN}</span>`,
    go: `<a class="btn primary block" href="#/dan/${d.id}">▷ 이어서 ${danLabel(d)}</a>` };
  return { r: b, title: "모든 미션 완료!", place: "정말 멋져요", row: "",
    gift: `<b>트리를 마음껏 꾸며요</b><span>단을 다시 연습하거나 게임으로 복습해도 좋아요</span>`,
    go: `<a class="btn primary block" href="#/tree">🎄 트리 꾸미기</a>` };
}

// 비비드 미션 순서 한 줄의 갈 곳 (잠겼으면 안내 문구)
function rowGo(x) {
  const a = (go) => ` role="link" tabindex="0" data-go="${go}"`;
  const lock = (msg) => ` role="button" tabindex="0" data-lockmsg="${esc(msg)}"`;
  if (x.r.core) return coreOpen() ? a("#/core") : lock(`🔒 본편 36단을 다 마치면 열려요 · 지금 ${store.passedCount()} / 36`);
  if (x.r.id === "bonus") return a("#/region/bonus");
  const r = x.r, done = regionDone(r);
  if (done || teacherMode()) return a(done && !J.challenges[r.id] ? `#/challenge/${r.id}` : `#/region/${r.id}`);
  return a(`#/region/${r.id}`);
}
// 비비드 라디오 깨우기 카드: 안에서 할 세 놀이와 받는 것을 미리 보여 준다
function corePreview(passed) {
  const lit = J.core.phases || [];
  return `<ol class="core-steps">${PHASES.map((P, i) => `<li class="${lit[i] ? "on" : ""}">
      ${pose(P.who, ["listen", "rhythm", "welcome"][i], { cls: "core-step-char" })}
      <b>${["듣기", "순서", "목소리"][i]}</b><span>${esc(P.name)}</span></li>`).join("")}</ol>
    <div class="core-meta">${J.core.cleared ? "" : `<div class="meter"><i style="width:${(passed / MAIN_DANS.length) * 100}%"></i></div>`}
      <span class="core-gift">받는 것: 반짝이 ✨${EARN.core} + 목소리 마스터 메달</span></div>`;
}

export function Station() {
  setRegion("r1");
  const passed = store.passedCount();
  const card = (r, { final = false } = {}) => {
    const dans = regionDans(r);
    const n = regionCount(r);
    const done = n === dans.length;
    const range = r.id === "bonus" ? "추가 7단" : `${r.from}–${r.to}단`;
    let action;
    if (r.challenge) {
      const cleared = J.challenges[r.id];
      action = cleared ? `<span class="badge-done">✓ ${esc(r.challenge.name)} 완료</span> <a class="btn" href="#/challenge/${r.id}">다시 도전</a>`
        : done ? `<a class="btn primary" href="#/challenge/${r.id}">구간 도전: ${esc(r.challenge.name)}</a>`
        : teacherMode() ? `<a class="btn" href="#/challenge/${r.id}">👩‍🏫 선생님 미리 보기: ${esc(r.challenge.name)}</a>`
        : `<span class="quiet small">${dans.length}단을 모두 마치면 구간 도전 ‘${esc(r.challenge.name)}’이 열려요</span>`;
    } else {
      const nb = firstOpen(dans);
      action = !VIVID ? `<span class="quiet small">앙코르 무대는 본편을 다 마친 뒤 열려요 (준비 중)</span>`
        : store.bonusOpen() ? (nb ? `<a class="btn primary" href="#/dan/${nb.id}">▷ 이어서 ${danLabel(nb)}</a>` : `<span class="badge-done">✓ 보너스 7단 완료</span>`)
        : `<span class="quiet small">본편 36단을 마치면 열려요 · 지금 ${passed} / 36</span> <a class="btn" href="#/region/bonus">무엇을 배우나 둘러보기 →</a>`;
    }
    // 목소리 카드: 단마다 한 장. 통과한 단은 채워지고 누르면 그 단으로 간다
    const chips = dans.map((d) => store.passed(d.id)
      ? `<a class="vcard on" href="#/dan/${d.id}" title="${esc(drillLines(d)[0])}">${d.no}</a>`
      : `<span class="vcard"${VIVID ? ` title="${esc(d.meaning)}"` : ""}>${d.no}</span>`).join("");
    return `<article class="region-card" data-region="${r.id}">
      <div class="region-top">
        <div><span class="region-range">${final ? "최종 도전 · " : ""}${range}</span><h3>${esc(r.place)}</h3><p>${esc(goalOf(r))}</p></div>
        ${pose(r.host, done ? "celebrate" : "welcome", { cls: "region-char" })}
      </div>
      <div class="row"><b>목소리 카드 ${n} / ${dans.length}</b><span class="${done ? "module-on" : "quiet"}">${esc(moduleState(r, n, dans.length))}</span></div>
      <div class="vcards" aria-label="${esc(r.place)} 목소리 카드">${chips}</div>
      <div class="region-act">${action}</div>
    </article>`;
  };
  const core = J.core.cleared
    ? `<a class="btn primary" href="#/core">기념 카드 보기</a> <a class="btn" href="#/core?again=1">다시 도전</a>`
    : coreOpen() ? `<a class="btn primary" href="#/core">잠꾸러기 라디오 깨우기</a>`
    : `<span class="small">본편 36단을 모두 마치면 열려요 · 지금 ${passed} / 36</span>`;
  const onAir = J.broadcast?.length
    ? `<div class="card onair"><b>📻 내가 고른 방송 순서</b><ol class="cue">${J.broadcast.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
        <button class="btn" id="replay">다시 방송하기</button></div>` : "";
  const m = nextMission();
  const chip = { got: "받음 ✓", now: "하는 중", later: "다음", lock: "🔒 잠김" };
  const rows = missionRows().map((x, i) => `<li class="mrow ${x.state}" data-region="${x.r.core ? "r4" : x.r.id}"${VIVID ? rowGo(x) : ""}>
      <span class="mno">${x.r.core ? "📻" : x.r.id === "bonus" ? "B" : `0${i + 1}`}</span>
      <span class="mt"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span>
      <span class="mr">${x.prog && x.state !== "got" ? `<small>${esc(x.prog)}</small>` : ""}<em class="chip-s ${x.state}">${chip[x.state]}</em></span></li>`).join("");
  const w = wallet();
  $app.innerHTML = `${header("우리 목소리 방송국")}
    <section class="page journey">
      <a class="card mytree" data-region="lilac" href="#/tree" aria-label="나만의 트리 꾸미러 가기, 반짝이 ${w}개">
        <span class="mytree-text"><span class="kick">🎄 나만의 트리</span><b class="wallet-big">✨ ${w}</b>
          <span>단을 마치면 반짝이가 생겨요. 크리스마스 상점에서 장식을 사서 트리를 꾸며요!</span>
          ${treeCount(J) ? `<span class="small">지금 트리에 장식 ${treeCount(J)}개</span>` : ""}
          <span class="btn primary">트리 꾸미러 가기</span></span>
        <img class="mytree-art" src="img/tree/station-hero.webp" alt="트리를 꾸미는 말문이, 귀담이, 차분이" width="640" height="800">
      </a>
      <div class="card next" data-region="${m.r.id}">
        <span class="kick">지금 할 미션</span>
        <h3>${esc(m.title)} <small>· ${esc(m.place)}</small></h3>
        ${m.meter ? `<div class="meter"><i style="width:${(m.meter[0] / m.meter[1]) * 100}%"></i></div>` : ""}
        ${m.row ? `<div class="next-row">${m.row}</div>` : ""}
        <div class="gift"><span class="gift-ic" aria-hidden="true">🎁</span><div>${m.gift}</div></div>
        ${m.go}
      </div>
      <h2 class="mhead">미션 순서</h2>
      <ol class="mlist card">${rows}</ol>
      <p class="quiet small center">반짝이로 산 장식은 ‘나만의 트리’에 걸려요 · 치우면 반짝이를 돌려받아요</p>
      <div class="card story">
        <div class="story-art" aria-hidden="true">${pose("minty", "listen")}${pose("nuri", "self")}${pose("bobo", "listen", { cls: "flip" })}</div>
        <div class="story-text"><p>말문이, 귀담이, 차분이의<br>작은 라디오 방송국이에요.</p>
        <p>이 세 친구들은 아직 영어를 몰라요.<br>
        <b>${esc(learnerGa())} 한 단을 마칠 때마다</b><br>목소리 카드 한 장과<br>반짝이 ✨${DAN_GAIN}개가 생겨요!</p>
        <a class="small redo" href="#/welcome">👋 친구 소개 · 이름 다시 하기</a></div>
      </div>
      ${onAir}
      <h2 class="mhead">구간별 목소리 카드</h2>
      ${REGIONS.slice(0, 4).map((r) => card(r)).join("")}
      <article class="region-card core-card">
        <span class="region-range">본편 마지막 도전</span><h3>잠꾸러기 라디오 깨우기</h3>
        <p>방송국의 큰 라디오가 쿨쿨 자고 있어요. 듣기 · 순서 · 내 목소리, 세 가지 놀이를 하면 라디오가 깨어나요.</p>
        ${VIVID ? corePreview(passed) : ""}
        <div class="region-act">${core}</div>
      </article>
      ${card(REGIONS[4], { final: true })}
      <p class="quiet small">별은 듣기 · 말하기 자기 확인 · 문장 순서 활동의 완료 기록이에요. 자동 발음 평가나 영어 능력 인증이 아니에요.</p>
    </section>`;
  // 비비드: 미션 순서 줄을 누르면 그 자리로 간다. 잠긴 줄은 왜 잠겼는지 알려 준다
  $app.querySelectorAll(".mrow[data-go], .mrow[data-lockmsg]").forEach((li) => {
    const go = () => (li.dataset.go ? (location.hash = li.dataset.go) : toast(li.dataset.lockmsg));
    li.onclick = go;
    li.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  });
  const replay = $app.querySelector("#replay");
  if (replay) replay.onclick = () => speakAll(J.broadcast, store.settings.speed);
}

// ── 단 통과 보상: 목소리 카드 한 장 ─────────────────────────
// 새로 통과했을 때 한 번만 부른다 (지난 기록으로는 띄우지 않음)
export function showVoiceCard(d) {
  if (d.sent) return;
  const r = regionOf(d);
  const n = regionCount(r);
  const total = regionDans(r).length;
  const box = document.createElement("div");
  box.className = "reward-modal";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-labelledby", "reward-title");
  box.innerHTML = `<div class="reward-card">
      <div class="reward-scene" data-region="${r.id}">
        ${pose(r.host, "celebrate", { cls: "rw-char", label: "축하하는 친구" })}
        <div class="vc-big"><span>${danLabel(d)}</span><b>${esc(drillLines(d)[0])}</b><small>${esc(d.meaning)}</small></div>
      </div>
      <div class="reward-body">
        <span class="kicker">🎉 ${danLabel(d)} 통과! 별 3개</span>
        <h2 id="reward-title">목소리 카드가 생겼어요!</h2>
        <p class="quiet">${esc(learnerGa())} 알려 준 말을 친구들이 기억했어요. ${esc(r.place)} 목소리 카드 ${n} / ${total}</p>
        <p class="gain">✨ 반짝이 +${danGain(d)} <small>· 지금 ${wallet()}개</small></p>
        <div class="row2">
          <a class="btn primary" href="#/dan/${d.id}?step=rec">🎙 내 목소리 녹음하기</a>
          <button class="btn" id="rw-ok">계속하기</button>
        </div>
        <a class="small tree-go" href="#/tree">🎄 반짝이로 트리 꾸미기 →</a>
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
  box.querySelectorAll("a").forEach((a) => (a.onclick = close));
  box.onclick = (e) => { if (e.target === box) close(); };
  // '다 봤어요'처럼 보상과 동시에 다음 단계로 넘어가도 창은 남겨 둔다 (onLeave로 닫지 않음)
  document.body.appendChild(box);
  box.querySelector("#rw-ok").focus();
}

// ── 구간 도전 ─────────────────────────
// 비비드(2026-11-07): 도전 그림 칸. 시작 화면에 '맞히면 무엇으로 바뀌는지'를 같이 보여 준다.
// 3구간은 까만 동그라미(⚫) 대신 꺼진 전구 → 켜진 전구 (dim = 꺼진 모습은 흑백)
const VIVID_TOKEN = {
  r1: { off: "🎤", on: "🌟", say: "문제를 맞힐 때마다 마이크가 별로 바뀌어요" },
  r2: { off: "🎁", on: "💎", say: "문제를 맞힐 때마다 상자가 열리고 보석이 나와요" },
  r3: { off: "💡", on: "💡", dim: true, say: "문제를 맞힐 때마다 전구에 하나씩 불이 켜져요" },
  r4: { off: "📡", on: "✨", say: "문제를 맞힐 때마다 안테나가 반짝 신호를 보내요" },
};
const tokOf = (r) => (VIVID && VIVID_TOKEN[r.id]) || { off: r.challenge.token[0], on: r.challenge.token[1] };
const tokIntro = (r) => {
  const t = tokOf(r);
  if (!VIVID) return `<p class="jtokens" aria-hidden="true">${t.off.repeat(4)}</p>`;
  return `<div class="jtok-intro" aria-hidden="true"><span class="jtokens ${t.dim ? "dim" : ""}">${`<span><i>${t.off}</i></span>`.repeat(4)}</span>
      <span class="jtok-arrow">→</span><span class="jtokens"><span class="on">${t.on}</span></span></div>
    <p class="jtok-say">${esc(t.say)}</p>`;
};

export function Challenge(id) {
  const r = REGIONS.find((x) => x.id === id && x.challenge);
  if (!r) return (location.hash = "#/station");
  setRegion(r.id);
  const dans = regionDans(r);
  const preview = !regionDone(r);
  if (preview && !teacherMode()) return (location.hash = "#/station");
  const intro = () => {
    $app.innerHTML = `${header(r.challenge.name, "#/station")}
      <section class="page"><div class="card center ready">
        <div class="ready-scene">${pose(r.host, "welcome", { cls: "ready-char" })}</div>
        <h2>${esc(r.challenge.name)}</h2><p class="quiet">${esc(r.place)} · ${r.from}–${r.to}단</p>
        ${tokIntro(r)}
        <p>${esc(r.challenge.intro)}</p>
        <p class="quiet small">틀려도 지금까지 푼 문제는 그대로예요. 시간 제한도 없어요.</p>
        ${preview ? '<p class="small"><b>선생님 미리 보기</b> · 아직 구간을 다 마치지 않아 완료 기록은 남지 않아요.</p>' : ""}
        <button class="btn primary" id="start">시작!</button>
      </div></section>`;
    $app.querySelector("#start").onclick = play;
  };
  const play = () => {
    const qs = CHALLENGES[r.id](dans).filter(Boolean);
    const { off, on, dim } = tokOf(r);
    $app.innerHTML = `${header(r.challenge.name, "#/station")}
      <section class="page"><div class="jtokens ${dim ? "dim" : ""}" data-on="${on}" aria-hidden="true">${qs.map(() => `<span>${VIVID ? `<i>${off}</i>` : off}</span>`).join("")}</div><div class="jbox"></div></section>`;
    runQuestions(qs, $app.querySelector(".page"), () => {
      stopRecorder();
      const first = !preview && !J.challenges[r.id]; // 반짝이는 처음 성공했을 때만 (기록 날짜가 생길 때)
      if (!preview) J.challenges[r.id] ||= today();
      const saved = saveJ();
      $app.innerHTML = `${header(r.challenge.name, "#/station")}
        <section class="page"><div class="card center">
          ${pose(r.host, "celebrate", { cls: "done-char" })}
          <p class="jtokens done" aria-hidden="true">${qs.map(() => `<span class="on">${tokOf(r).on}</span>`).join("")}</p>
          <p class="big">${esc(r.challenge.name)} 성공!</p><p>${esc(r.challenge.done)}</p>
          ${first ? `<p class="gain">✨ 반짝이 +${EARN.challenge} <small>· 지금 ${wallet()}개</small></p>` : ""}
          ${saved ? "" : '<p class="quiet small">이 기기에 기록을 저장하지 못했어요.</p>'}
          <div class="row2"><a class="btn primary" href="#/station">방송국으로</a><a class="btn" href="#/tree">🎄 트리 꾸미기</a></div>
        </div></section>`;
    });
  };
  intro();
}

// ── 마지막 도전: 잠꾸러기 라디오 깨우기 (주소 #/core와 저장 키 J.core는 그대로) ─────────────────────────
const PHASES = [
  { who: "minty", name: "귀담이의 귀 쫑긋 놀이", how: "문장을 듣고 맞는 카드를 골라요. 3개를 맞히면 라디오 불이 하나 켜져요.",
    make: () => [[1, 10], [11, 20], [21, 36]].map(([a, b]) => listenQ(pick(MAIN_DANS.filter((d) => d.no >= a && d.no <= b)), 3)) },
  { who: "bobo", name: "차분이의 순서 퍼즐", how: "단어를 순서대로 눌러 문장 3개를 만들어요. 천천히 해도 괜찮아요.",
    make: () => [[1, 12], [13, 24], [25, 36]].map(([a, b]) => orderQ(pick(MAIN_DANS.filter((d) => d.no >= a && d.no <= b)), 6)) },
  { who: "nuri", name: "말문이의 목소리 놀이", how: "카드 3장을 가린 채 소리 내어 말해 보고, 정답을 확인해요. 녹음해서 들어 봐도 좋아요.",
    make: () => shuffle(MAIN_DANS).slice(0, 3).map(speakQ) },
];

export function Core(params) {
  if (!coreOpen()) return (location.hash = "#/station");
  setRegion("core");
  if (params.get("again")) { J.core.phases = [false, false, false]; saveJ(); }
  else if (J.core.cleared) return reward();
  const phase = J.core.phases.findIndex((p) => !p);
  if (phase === -1) return send();
  const P = PHASES[phase];
  const rings = J.core.phases.map((p, i) => `<span class="ring ${p ? "on" : ""}">${["듣기", "순서", "목소리"][i]}</span>`).join("");
  $app.innerHTML = `${header("잠꾸러기 라디오 깨우기", "#/station")}
    <section class="page core-page">
      <div class="core-machine"><div class="rings">${rings}</div></div>
      <div class="card center"><p class="kicker">${phase + 1} / 3 단계</p><h2>${P.name}</h2><p>${P.how}</p>
        ${phase === 0 ? "<p class=\"quiet small\">쿨쿨… 라디오가 자고 있어요. 불 3개를 다 켜면 깨어나요!</p>" : ""}
        <button class="btn primary" id="go">시작!</button></div>
    </section>`;
  $app.querySelector("#go").onclick = () => {
    const qs = P.make().filter(Boolean);
    $app.innerHTML = `${header(P.name, "#/station")}
      <section class="page core-page"><div class="core-machine small"><div class="rings">${rings}</div></div>
      <div class="meter jmeter"><i style="width:0"></i></div><div class="jbox card"></div></section>`;
    runQuestions(qs, $app.querySelector(".page"), () => {
      J.core.phases[phase] = true;
      saveJ();
      Core(new URLSearchParams());
    });
  };
}

// 불 3개가 다 켜지면 아이가 직접 눌러야 라디오가 깨어난다
function send() {
  $app.innerHTML = `${header("잠꾸러기 라디오 깨우기", "#/station")}
    <section class="page core-page">
      <div class="core-machine"><div class="rings"><span class="ring on">듣기</span><span class="ring on">순서</span><span class="ring on">목소리</span></div></div>
      <div class="card center"><h2>불 3개가 다 켜졌어요!</h2><p>다 같이 "Good morning!" 하고 라디오를 깨워요.</p>
        <div class="friends small">${pose("nuri", "encourage")}${pose("minty", "encourage")}${pose("bobo", "encourage")}</div>
        <button class="btn primary" id="send">라디오 깨우기</button></div>
    </section>`;
  $app.querySelector("#send").onclick = () => {
    const first = !J.core.cleared;
    J.core.cleared ||= today();
    const saved = saveJ();
    reward(saved, first);
  };
}

function reward(saved = true, first = false) {
  setRegion("r4");
  $app.innerHTML = `${header("우리가 함께 만든 방송", "#/station")}
    <section class="page core-reward">
      <div class="card center">
        <div class="medal" role="img" aria-label="목소리 마스터 기념 메달"><span>듣기</span><span>순서</span><span>목소리</span></div>
        <h2>목소리 마스터</h2>
        <p class="quiet">${esc(J.core.cleared)} · 본편 36단 · 별 108개</p>
        <div class="friends">${pose("nuri", "celebrate")}${pose("minty", "celebrate")}${pose("bobo", "encourage")}</div>
        <ul class="thanks">
          <li><b>말문이</b> 처음엔 한마디도 몰랐는데, ${esc(learnerGa())} 알려 줬어.</li>
          <li><b>귀담이</b> 이제 우리가 배운 말을 들려줄게!</li>
          <li><b>차분이</b> 함께 해 줘서 고마워.</li>
        </ul>
        ${first ? `<p class="gain">✨ 반짝이 +${EARN.core} <small>· 지금 ${wallet()}개</small></p>` : ""}
        <p class="quiet small">기념 메달은 학습 활동 완료 기록이에요. 공인 인증이나 영어 숙달 보증이 아니에요.</p>
        ${saved ? "" : '<p class="quiet small">이 기기에 기록을 저장하지 못했어요.</p>'}
        <div class="row2"><a class="btn primary" href="#/table">앙코르 만들기</a><a class="btn" href="#/">오늘은 여기까지</a></div>
      </div>
    </section>`;
}
