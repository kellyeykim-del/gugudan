// 우리 목소리 탐험: 5구간 색 · 구간 도전 · 마지막 도전 '거대 무음 코어'
// 기준: characters-design-2026-11-03/world-story-v2 (DESIGN_STORY_V2.md, tokens.json)
// 문제는 모두 기존 단 문장·선생님 음원에서만 만든다 (새 문장·새 음원을 만들지 않는다).
// 기록은 학습 기록(gugudan.v1)과 따로 저장해 기존 별·오답·게임 기록을 건드리지 않는다.
import { MAIN_DANS, BONUS_DANS, getDan } from "./data.js";
import { store } from "./store.js";
import { speak, stop, canSpeak } from "./speech.js";
import { pool, blankQ, shuffle, tokens, findBlank, splitPunct } from "./quiz.js";
import { $app, esc, hl, danLabel, header } from "./ui.js";
import { pose } from "./village.js";

// ── 5구간 ─────────────────────────
export const REGIONS = [
  { id: "r1", from: 1, to: 10, place: "첫 목소리 연구실", module: "마이크 모듈", host: "nuri",
    goal: "친구들이 처음으로 자기 차례에 말하도록 도와 작은 방송기를 켜요.",
    challenge: { name: "첫 인사 릴레이", intro: "선생님 문장을 듣고 맞는 카드를 골라 친구 앞에 놓아요. 마지막엔 한 문장을 직접 말해 봐요.",
      done: "‘첫 목소리를 연 친구’ 배지를 받았어요!" } },
  { id: "r2", from: 11, to: 20, place: "소리 탐험 항구", module: "소리 지도 모듈", host: "minty",
    goal: "방송 장비에 필요한 소리 상자와 잃어버린 카드를 찾아 연구실로 보내요.",
    challenge: { name: "소리 상자 배달", intro: "듣기 · 뜻 고르기 · 문장 조립 상자 4개를 차례로 배달해요.",
      done: "항구의 조용한 이동 플랫폼이 열렸어요!" } },
  { id: "r3", from: 21, to: 30, place: "신호 수리 공방", module: "신호 연결 모듈", host: "bobo",
    goal: "뒤바뀐 문장 카드가 섞여 끊어진 신호를 찾아 고쳐요.",
    challenge: { name: "세 개의 끊어진 신호", intro: "신호마다 빠진 말 찾기와 문장 조립, 두 문제씩 모두 6개를 고쳐요.",
      done: "세 연결선이 순서대로 이어졌어요!" } },
  { id: "r4", from: 31, to: 36, place: "별빛 방송탑", module: "방송 시작 모듈", host: "minty",
    goal: "방송에 무엇이 있고 없는지 확인하고, 마지막 방송을 준비해요." },
  { id: "bonus", place: "앙코르 제작실", module: "앙코르 앨범", host: "bobo",
    goal: "정해진 방송을 마친 뒤, 우리가 만들고 싶은 방송을 함께 만들어요." },
];
export const regionOf = (d) =>
  !d ? REGIONS[0] : d.bonus ? REGIONS[4] : d.sent ? REGIONS[0] : REGIONS.find((r) => d.no >= r.from && d.no <= r.to) || REGIONS[0];
export const regionDans = (r) => (r.id === "bonus" ? BONUS_DANS : MAIN_DANS.filter((d) => d.no >= r.from && d.no <= r.to));
const regionDone = (r) => regionDans(r).every((d) => store.passed(d.id));
const regionCount = (r) => regionDans(r).filter((d) => store.passed(d.id)).length;

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
function saveJ() {
  try {
    localStorage.setItem(KEY, JSON.stringify(J));
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
function orderQ(d) {
  for (let t = 0; t < 12; t++) {
    const s = sentenceOf(d);
    const ws = tokens(s);
    if (ws.length < 3 || ws.length > 8) continue;
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
// 뜻 고르기: 문장을 보고 그 단의 뜻(교재 그대로)을 고른다. 다른 보기는 같은 구간의 다른 뜻.
function meaningQ(d, dans) {
  const s = sentenceOf(d);
  const others = shuffle([...new Set(dans.filter((x) => x.id !== d.id).map((x) => x.meaning))].filter((m) => m !== d.meaning)).slice(0, 2);
  if (others.length < 2) return listenQ(d);
  return { type: "meaning", dan: d.id, sentence: s, answer: d.meaning, options: shuffle([d.meaning, ...others]) };
}
// 직접 말해 보기 (발음 채점 없음, 스스로 확인)
const speakQ = (d) => ({ type: "speak", dan: d.id, sentence: sentenceOf(d) });

const CHALLENGES = {
  r1: (dans) => { const ds = shuffle(dans); return [listenQ(ds[0], 2), listenQ(ds[1], 3), listenQ(ds[2], 3), speakQ(ds[3])]; },
  r2: (dans) => { const ds = shuffle(dans); return [listenQ(ds[0]), meaningQ(ds[1], dans), orderQ(ds[2]), meaningQ(ds[3], dans)]; },
  r3: (dans) => { const ds = shuffle(dans); return [0, 1, 2].flatMap((i) => [blank(ds[i]), orderQ(ds[i])]); },
};

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
    const title = { listen: "듣고 알맞은 문장 카드를 고르세요", meaning: "이 문장의 뜻을 고르세요", blank: "빠진 말을 고르세요" }[q.type];
    const body = q.type === "listen" ? `<button class="btn big-play" id="play">🔊 다시 듣기</button>`
      : q.type === "meaning" ? `<div class="qsentence">${esc(q.sentence)}</div>`
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
      const done = () => { stop(); onDone(); };
      $box.querySelector("#said").onclick = done;
      $box.querySelector("#read").onclick = done;
    };
  }
}

// 여러 문제를 차례로. 진행 막대는 문제 수만큼.
function runQuestions(qs, $page, onAll) {
  let i = 0;
  const $meter = $page.querySelector(".jmeter i");
  const $box = $page.querySelector(".jbox");
  const next = () => {
    if ($meter) $meter.style.width = `${(i / qs.length) * 100}%`;
    if (i >= qs.length) return onAll();
    const q = qs[i++];
    askOne(q, $box, next);
  };
  next();
}

// ── 탐험 지도 ─────────────────────────
export function Journey() {
  setRegion("r1");
  const passed = store.passedCount();
  const card = (r) => {
    const dans = regionDans(r);
    const n = regionCount(r);
    const done = n === dans.length;
    const range = r.id === "bonus" ? "추가 7단" : `${r.from}–${r.to}단`;
    let action = "";
    if (r.challenge) {
      const cleared = J.challenges[r.id];
      action = cleared ? `<span class="badge-done">✓ ${esc(r.challenge.name)} 완료</span> <a class="btn" href="#/challenge/${r.id}">다시 도전</a>`
        : done ? `<a class="btn primary" href="#/challenge/${r.id}">구간 도전: ${esc(r.challenge.name)}</a>`
        : `<span class="quiet small">${dans.length}단을 모두 마치면 구간 도전 ‘${esc(r.challenge.name)}’이 열려요</span>`;
    } else if (r.id === "r4") {
      action = done ? `<span class="quiet small">36단을 모두 마치면 마지막 도전이 열려요</span>` : `<span class="quiet small">이 구간 6단을 마치면 방송 시작 모듈이 완성돼요</span>`;
    } else {
      action = `<span class="quiet small">보너스 단은 내용·음원 검수 후 도전이 열려요 (준비 중)</span>`;
    }
    return `<article class="region-card" data-region="${r.id}">
      <div class="region-top">
        <div><span class="region-range">${range}</span><h3>${esc(r.place)}</h3><p>${esc(r.goal)}</p></div>
        ${pose(r.host, done ? "celebrate" : "welcome", { cls: "region-char" })}
      </div>
      <div class="row"><b>목소리 카드 ${n} / ${dans.length}</b><span class="${done ? "module-on" : "quiet"}">${done ? "✓ " : ""}${esc(r.module)}</span></div>
      <div class="meter"><i style="width:${(n / dans.length) * 100}%"></i></div>
      <div class="region-act">${action}</div>
    </article>`;
  };
  const core = J.core.cleared
    ? `<a class="btn primary" href="#/core">기념 카드 보기</a> <a class="btn" href="#/core?again=1">다시 도전</a>`
    : coreOpen() ? `<a class="btn primary" href="#/core">거대 무음 코어 깨우기</a>`
    : `<span class="small">본편 36단을 모두 마치면 열려요 · 지금 ${passed} / 36</span>`;
  $app.innerHTML = `${header("우리 목소리 탐험")}
    <section class="page journey">
      <div class="card story">
        <div class="friends">${pose("minty", "listen")}${pose("nuri", "self")}${pose("bobo", "welcome")}</div>
        <p>세 친구가 만든 작은 방송국에는 목소리를 멀리 전하는 장치가 있어요. 그런데 친구들은 아직 영어를 몰라요.
        <b>네가 한 단씩 알려 주면</b> 친구들이 그 말을 기억하고, 다섯 공간의 장치가 하나씩 이어져요.</p>
      </div>
      ${REGIONS.map(card).join("")}
      <article class="region-card core-card">
        <span class="region-range">마지막 도전</span><h3>거대 무음 코어</h3>
        <p>말의 뜻, 문장의 순서, 우리의 목소리. 세 신호를 모으면 오래 잠든 코어가 깨어나요.</p>
        <div class="region-act">${core}</div>
      </article>
      <p class="quiet small">별은 듣기 · 말하기 자기 확인 · 문장 순서 활동의 완료 기록이에요. 자동 발음 평가나 영어 능력 인증이 아니에요.</p>
    </section>`;
}

// ── 구간 도전 ─────────────────────────
export function Challenge(id) {
  const r = REGIONS.find((x) => x.id === id && x.challenge);
  if (!r) return (location.hash = "#/journey");
  setRegion(r.id);
  const dans = regionDans(r);
  if (!regionDone(r)) return (location.hash = "#/journey");
  const intro = () => {
    $app.innerHTML = `${header(r.challenge.name, "#/journey")}
      <section class="page"><div class="card center ready">
        <div class="ready-scene">${pose(r.host, "welcome", { cls: "ready-char" })}</div>
        <h2>${esc(r.challenge.name)}</h2><p class="quiet">${esc(r.place)} · ${r.from}–${r.to}단</p>
        <p>${esc(r.challenge.intro)}</p>
        <p class="quiet small">틀려도 지금까지 푼 문제는 그대로예요. 시간 제한도 없어요.</p>
        <button class="btn primary" id="start">시작!</button>
      </div></section>`;
    $app.querySelector("#start").onclick = play;
  };
  const play = () => {
    const qs = CHALLENGES[r.id](dans).filter(Boolean);
    $app.innerHTML = `${header(r.challenge.name, "#/journey")}
      <section class="page"><div class="meter jmeter"><i style="width:0"></i></div><div class="jbox"></div></section>`;
    runQuestions(qs, $app.querySelector(".page"), () => {
      J.challenges[r.id] ||= today();
      const saved = saveJ();
      $app.innerHTML = `${header(r.challenge.name, "#/journey")}
        <section class="page"><div class="card center">
          ${pose(r.host, "celebrate", { cls: "done-char" })}
          <p class="big">${esc(r.challenge.name)} 성공!</p><p>${esc(r.challenge.done)}</p>
          ${saved ? "" : '<p class="quiet small">이 기기에 기록을 저장하지 못했어요.</p>'}
          <div class="row2"><a class="btn primary" href="#/journey">탐험 지도로</a><a class="btn" href="#/">홈으로</a></div>
        </div></section>`;
    });
  };
  intro();
}

// ── 마지막 도전: 거대 무음 코어 ─────────────────────────
const PHASES = [
  { who: "minty", name: "민티의 듣기 잠금", how: "선생님 문장을 듣고 맞는 문장을 골라요. 세 개를 풀면 첫 번째 링이 열려요.",
    make: () => [[1, 10], [11, 20], [21, 36]].map(([a, b]) => listenQ(pick(MAIN_DANS.filter((d) => d.no >= a && d.no <= b)), 3)) },
  { who: "bobo", name: "보보의 순서 잠금", how: "단어를 순서대로 눌러 문장 세 개를 조립해요. 빠르기는 상관없어요.",
    make: () => [[1, 12], [13, 24], [25, 36]].map(([a, b]) => orderQ(pick(MAIN_DANS.filter((d) => d.no >= a && d.no <= b)))) },
  { who: "nuri", name: "누리의 목소리 잠금", how: "세 친구가 카드를 한 장씩 내밀어요. 가린 채 말해 보고 정답을 확인해요.",
    make: () => shuffle(MAIN_DANS).slice(0, 3).map(speakQ) },
];

export function Core(params) {
  if (!coreOpen()) return (location.hash = "#/journey");
  setRegion("core");
  if (params.get("again")) { J.core.phases = [false, false, false]; saveJ(); }
  else if (J.core.cleared) return reward();
  const phase = J.core.phases.findIndex((p) => !p);
  if (phase === -1) return send();
  const P = PHASES[phase];
  const rings = J.core.phases.map((p, i) => `<span class="ring ${p ? "on" : ""}">${["뜻", "순서", "목소리"][i]}</span>`).join("");
  $app.innerHTML = `${header("거대 무음 코어", "#/journey")}
    <section class="page core-page">
      <div class="core-machine"><div class="rings">${rings}</div></div>
      <div class="card center"><p class="kicker">${phase + 1} / 3 단계</p><h2>${P.name}</h2><p>${P.how}</p>
        ${phase === 0 ? "<p class=\"quiet small\">‘말의 뜻, 문장의 순서, 우리의 목소리. 세 신호를 모으면 코어가 깨어나!’</p>" : ""}
        <button class="btn primary" id="go">시작!</button></div>
    </section>`;
  $app.querySelector("#go").onclick = () => {
    const qs = P.make().filter(Boolean);
    $app.innerHTML = `${header(P.name, "#/journey")}
      <section class="page core-page"><div class="core-machine small"><div class="rings">${rings}</div></div>
      <div class="meter jmeter"><i style="width:0"></i></div><div class="jbox card"></div></section>`;
    runQuestions(qs, $app.querySelector(".page"), () => {
      J.core.phases[phase] = true;
      saveJ();
      Core(new URLSearchParams());
    });
  };
}

// 세 링이 모두 열리면 아이가 직접 눌러야 코어가 깨어난다
function send() {
  $app.innerHTML = `${header("거대 무음 코어", "#/journey")}
    <section class="page core-page">
      <div class="core-machine"><div class="rings"><span class="ring on">뜻</span><span class="ring on">순서</span><span class="ring on">목소리</span></div></div>
      <div class="card center"><h2>세 링이 모두 열렸어요!</h2><p>이제 우리 목소리를 보내면 코어가 깨어나요.</p>
        <div class="friends small">${pose("nuri", "encourage")}${pose("minty", "encourage")}${pose("bobo", "encourage")}</div>
        <button class="btn primary" id="send">우리 목소리 보내기</button></div>
    </section>`;
  $app.querySelector("#send").onclick = () => {
    J.core.cleared ||= today();
    const saved = saveJ();
    reward(saved);
  };
}

function reward(saved = true) {
  setRegion("r4");
  $app.innerHTML = `${header("우리가 함께 만든 방송", "#/journey")}
    <section class="page core-reward">
      <div class="card center">
        <div class="medal" role="img" aria-label="목소리 마스터 기념 메달"><span>뜻</span><span>순서</span><span>목소리</span></div>
        <h2>목소리 마스터</h2>
        <p class="quiet">${esc(J.core.cleared)} · 본편 36단 · 별 108개</p>
        <div class="friends">${pose("nuri", "celebrate")}${pose("minty", "celebrate")}${pose("bobo", "encourage")}</div>
        <ul class="thanks">
          <li><b>누리</b> 처음엔 한마디도 몰랐는데, 네가 알려 줬어.</li>
          <li><b>민티</b> 이제 우리가 배운 말을 들려줄게!</li>
          <li><b>보보</b> 함께 해 줘서 고마워.</li>
        </ul>
        <p class="quiet small">기념 메달은 학습 활동 완료 기록이에요. 공인 인증이나 영어 숙달 보증이 아니에요.</p>
        ${saved ? "" : '<p class="quiet small">이 기기에 기록을 저장하지 못했어요.</p>'}
        <div class="row2"><a class="btn primary" href="#/table">앙코르 만들기</a><a class="btn" href="#/">오늘은 여기까지</a></div>
      </div>
    </section>`;
}
