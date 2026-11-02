// 게임 3종: 단어 두더지 · 주어 룰렛 · 짝꿍 카드
// 범위는 주소의 ids → 없으면 통과한 단 → 그것도 없으면 1–10단
import { MAIN_DANS, getDan } from "./data.js";
import { store } from "./store.js";
import { speak, stop } from "./speech.js";
import { pool, blankQ, shuffle } from "./quiz.js";
import { $app, esc, hl, danLabel, isLocked, header, rangeLabel, onLeave } from "./ui.js";
import { pose } from "./village.js";

// 게임마다 함께하는 친구 (준비·결과 화면에만. 게임 중에는 문제와 버튼을 가리지 않게 넣지 않는다)
const HOST = { "단어 두더지": "nuri", "주어 룰렛": "minty", "짝꿍 카드": "bobo",
  "문장 블록 쌓기": "nuri", "듣고 빙고": "minty", "1:1 스피드 대결": "bobo" };

export function gameRange(params) {
  const asked = (params.get("ids") || "").split(",").filter((id) => getDan(id) && !isLocked(getDan(id)));
  if (asked.length) return { ids: asked, note: "" };
  const passed = MAIN_DANS.filter((d) => store.passed(d.id)).map((d) => d.id);
  if (passed.length) return { ids: passed, note: "통과한 단으로 해요" };
  return { ids: MAIN_DANS.slice(0, 10).map((d) => d.id), note: "아직 통과한 단이 없어서 1–10단으로 해요" };
}

export const hub = (ids) => `#/games?ids=${ids.join(",")}`;
// 문장형(S1–S3) 범위인지. 문장형 최고 기록은 따로 저장한다.
export const isSent = (ids) => ids.length > 0 && ids.every((id) => getDan(id)?.sent);
export const bestKey = (k, ids) => (isSent(ids) ? `${k}.s` : k);
const SENT_IDS = ["S1", "S2", "S3"];
export const pick = (a) => a[Math.floor(Math.random() * a.length)];

// 화면을 떠나면 이 게임의 타이머를 모두 멈춘다
export function timers() {
  let alive = true;
  const list = [];
  const t = {
    later(fn, ms) { list.push(setTimeout(() => alive && fn(), ms)); },
    every(fn, ms) { const id = setInterval(() => alive && fn(), ms); list.push(id); return id; },
    clear() { list.forEach((id) => { clearTimeout(id); clearInterval(id); }); list.length = 0; },
    end() { alive = false; t.clear(); },
  };
  onLeave(t.end);
  return t;
}

const GAMES = [
  { k: "mole", key: "mole20", icon: "🐹", name: "단어 두더지",
    desc: "빈칸에 맞는 단어(am · does · has …)가 적힌 두더지를 잡아요. 20문제, 100점 만점!",
    sdesc: "빈칸에 맞는 단어(am · are · is)가 적힌 두더지를 잡아요. She ____ sad. 20문제, 100점 만점!",
    best: (v) => `최고 ${v}점 / 100` },
  { k: "roulette", icon: "🎰", name: "주어 룰렛",
    desc: "룰렛이 고른 단과 주어로 3초 안에 문장을 말해요. 18단 + She → Did she take?",
    sdesc: "룰렛이 고른 우리말 문장을 3초 안에 영어로 말해요. 그녀는 슬퍼요? → Is she sad?",
    best: (v) => `최고 ${v} / 10` },
  { k: "pairs", icon: "🃏", name: "짝꿍 카드",
    desc: "뒤집힌 카드에서 같은 주어끼리 짝을 찾아요. He has. ↔ He doesn't have.",
    sdesc: "뒤집힌 카드에서 짝이 되는 문장을 찾아요. She is sad. ↔ She is not sad.",
    best: (v) => `최소 ${v}번 만에 성공` },
  { k: "blocks", icon: "🧱", name: "문장 블록 쌓기",
    desc: "떨어지는 단어 블록을 문장 순서대로 눌러 탑을 쌓아요. 바닥에 닿기 전에!",
    best: (v) => `최고 ${v}층` },
  { k: "bingo", icon: "🔢", name: "듣고 빙고",
    desc: "문장을 듣고 빙고판에서 찾아 눌러요. 교실에서는 선생님이 불러 주는 모드로.",
    best: (v) => `최소 실수 ${v}번` },
  { k: "duel", icon: "⚔️", name: "1:1 스피드 대결",
    desc: "한 기기를 가운데 두고 마주 앉아, 같은 문제를 누가 먼저 맞히나 겨뤄요.",
    best: null },
];

// ───────────────────────── 게임 고르기 ─────────────────────────
export function Games(params) {
  const { ids, note } = gameRange(params);
  const q = `ids=${ids.join(",")}`;
  const sent = isSent(ids);
  // 문장형은 1·2·3단을 바로 켜고 끈다 (하나는 꼭 남긴다)
  const toggle = (id) => {
    const next = SENT_IDS.filter((x) => (x === id ? !ids.includes(x) : ids.includes(x)));
    return hub(next.length ? next : ids);
  };
  $app.innerHTML = `${header(sent ? "게임 (문장형)" : "게임 (구구단형)")}
    <section class="page">
      <div class="play-hero">
        <div class="play-hero-card"><b>놀이터에서 영어 게임!</b><span>틀려도 괜찮아요. 친구들과 다시 도전해요</span></div>
        ${pose("minty", "welcome", { cls: "ph-char" })}${pose("bobo", "welcome", { cls: "ph-char" })}
      </div>
      <div class="card range-card">
        <div><span class="kicker">게임 범위</span><b>${esc(rangeLabel(ids))}</b>${note ? `<span class="quiet">${note}</span>` : ""}</div>
        ${sent ? `<div class="chips sent-pick">${SENT_IDS.map((id) =>
          `<a class="chip ${ids.includes(id) ? "on" : ""}" href="${toggle(id)}">${id.slice(1)}단</a>`).join("")}</div>`
        : `<a class="btn" href="#/pick?mode=game&${q}">범위 바꾸기</a>`}
      </div>
      <div class="games">${GAMES.map((g) => {
        const b = store.best(bestKey(g.key || g.k, ids));
        return `<a class="gcard" href="#/game/${g.k}?${q}">
          <span class="gicon">${g.icon}</span>
          <div><b>${g.name}</b><p>${sent && g.sdesc ? g.sdesc : g.desc}</p><span class="gbest">${!g.best ? "👥 2인용" : b === undefined ? "아직 기록 없음" : `🏆 ${g.best(b)}`}</span></div>
        </a>`;
      }).join("")}</div>
    </section>`;
}

export function ready(title, ids, icon, rules, start, extra = "") {
  $app.innerHTML = `${header(title, hub(ids))}
    <section class="page">
      <div class="card center ready">
        <div class="ready-scene"><span class="gicon big-icon">${icon}</span>${pose(HOST[title] || "nuri", "welcome", { cls: "ready-char" })}</div>
        <h2>${title}</h2>
        <p class="quiet">범위: ${esc(rangeLabel(ids))}</p>
        <ul class="rules">${rules.map((r) => `<li>${r}</li>`).join("")}</ul>
        ${extra}
        <button class="btn primary" id="start">시작!</button>
      </div>
    </section>`;
  $app.querySelector("#start").onclick = start;
}

export function noGame(title, ids, msg) {
  $app.innerHTML = `${header(title, hub(ids))}
    <section class="page"><div class="card center">
      <p>${msg}</p>
      <a class="btn primary" href="${isSent(ids) ? hub(ids) : `#/pick?mode=game&ids=${ids.join(",")}`}">범위 바꾸기</a>
    </div></section>`;
}

export function endScreen({ game, title, ids, big, sub, record, misses = [] }) {
  const seen = new Set();
  const uniq = misses.filter((m) => !seen.has(m.sentence) && seen.add(m.sentence));
  const missDans = [...new Set(uniq.map((m) => m.dan))];
  $app.innerHTML = `${header(title, hub(ids))}
    <section class="page">
      <div class="card center score">${pose(HOST[title] || "nuri", uniq.length ? "encourage" : "celebrate", { cls: "score-char" })}
        <div class="big">${big}</div><p>${sub}</p>${record ? '<p class="record">🏆 새 최고 기록!</p>' : ""}
        ${uniq.length ? '<p class="cheer">헷갈린 문장은 아래에 모아 뒀어요. 한 번 더 같이 해볼까?</p>' : ""}</div>
      ${uniq.length ? `<h3 class="sec">다시 볼 문장</h3>
        <ul class="wronglist">${uniq.map((m) => `<li><div>${hl(m.sentence)}</div><div class="quiet">${danLabel(getDan(m.dan))}</div></li>`).join("")}</ul>` : ""}
      <div class="actions">
        <a class="btn primary" href="#/game/${game}?ids=${ids.join(",")}&r=${Date.now()}">다시 하기</a>
        <a class="btn" href="${hub(ids)}">다른 게임</a>
        ${missDans.length && !isSent(ids) ? `<a class="btn ghost" href="#/pick?ids=${missDans.join(",")}">헷갈린 단 연습</a>` : ""}
      </div>
    </section>`;
}

// ───────────────────────── 단어 두더지 ─────────────────────────
// 20문제를 풀고 100점 만점(한 문제 5점)으로 매긴다
const MOLE_N = 20;

export function Mole(params) {
  const { ids } = gameRange(params);
  const items = ids.map(getDan).flatMap((d) => pool(d).map((s) => blankQ(d, s)).filter(Boolean));
  if (!items.length) return noGame("단어 두더지", ids, "이 범위에는 빈칸 문제가 없어요. 다른 단을 골라 주세요.");
  ready("단어 두더지", ids, "🐹", [
    "문장의 빈칸에 맞는 단어가 적힌 두더지를 잡으세요.",
    `모두 ${MOLE_N}문제, 100점 만점이에요. 한 문제에 5점!`,
    "틀린 두더지를 잡으면 그 문제는 틀린 걸로 하고 다음 문제로 넘어가요.",
  ], () => playMole(ids, items));
}

function playMole(ids, items) {
  window.scrollTo(0, 0);
  const HOLES = 6;
  const t = timers();
  let bag = shuffle(items), q = null, n = 0, right = 0, combo = 0, wave = 0, busy = false;
  const misses = [];
  const t0 = Date.now();

  $app.innerHTML = `${header("단어 두더지", hub(ids))}
    <section class="page mole-game">
      <div class="hud"><span>문제 <b id="qn">1</b> / ${MOLE_N}</span><span id="combo" class="combo"></span><span>⭕ <b id="right">0</b> · ❌ <b id="wrong">0</b></span></div>
      <div class="meter time"><i id="prog" style="width:0"></i></div>
      <div class="qsentence" id="sentence"></div>
      <div class="holes">${Array.from({ length: HOLES }, (_, i) =>
        `<div class="hole"><button class="mole" data-h="${i}" tabindex="-1"></button></div>`).join("")}</div>
    </section>`;
  const $ = (s) => $app.querySelector(s);
  const moles = [...$app.querySelectorAll(".mole")];

  const hud = () => {
    $("#qn").textContent = Math.min(n + 1, MOLE_N);
    $("#right").textContent = right;
    $("#wrong").textContent = misses.length;
    $("#combo").textContent = combo >= 3 ? `🔥 ${combo}연속` : "";
    $("#prog").style.width = `${(n / MOLE_N) * 100}%`;
  };
  // 뒤로 갈수록 두더지가 빨리 들어간다
  const upTime = () => Math.max(1400, 2600 - n * 60);

  function popUp() {
    const w = ++wave;
    moles.forEach((m) => (m.className = "mole"));
    t.later(() => {
      if (w !== wave) return;
      shuffle([...moles.keys()]).slice(0, q.words.length).forEach((h, k) => {
        moles[h].textContent = q.words[k];
        moles[h].dataset.w = q.words[k];
        moles[h].className = "mole up";
      });
      t.later(() => w === wave && popUp(), upTime());
    }, 320);
  }

  function nextQ() {
    if (n >= MOLE_N) return end();
    hud();
    if (!bag.length) bag = shuffle(items);
    q = bag.pop();
    const wrong = q.options.filter((o) => o !== q.answer);
    const words = [q.answer, ...shuffle(wrong).slice(0, 2)];
    while (words.length < 3) words.push(pick(wrong));
    q.words = shuffle(words);
    $("#sentence").innerHTML = `${esc(q.before)} <span class="gap">____</span>${/^[.?!,]/.test(q.after) ? "" : " "}${esc(q.after)}`;
    busy = false;
    popUp();
  }

  // 맞히든 틀리든 정답 문장을 보여 주고 읽어 준 뒤 다음 문제로
  function settle(ok) {
    busy = true;
    wave++;
    n++;
    $("#sentence").innerHTML = hl(q.sentence);
    stop();
    speak(q.sentence, store.settings.speed);
    hud();
    t.later(nextQ, ok ? 650 : 1400);
  }

  function end() {
    t.end();
    stop();
    const score = right * (100 / MOLE_N);
    const sec = Math.round((Date.now() - t0) / 1000);
    const record = score > 0 && store.setBest(bestKey("mole20", ids), score);
    endScreen({ game: "mole", title: "단어 두더지", ids, big: `${score}점`,
      sub: `${MOLE_N}문제 중 ${misses.length ? `${misses.length}개 틀렸어요` : "하나도 안 틀렸어요! 🎉"} · ${sec}초`, record, misses });
  }

  moles.forEach((m) => (m.onpointerdown = (e) => {
    e.preventDefault();
    if (busy || !m.classList.contains("up")) return;
    if (m.dataset.w === q.answer) {
      combo++;
      right++;
      m.classList.add("hit");
      settle(true);
    } else {
      combo = 0;
      misses.push(q);
      m.className = "mole miss";
      moles.find((x) => x.dataset.w === q.answer && x.classList.contains("up"))?.classList.add("hit");
      settle(false);
    }
  }));

  nextQ();
}

// ───────────────────────── 주어 룰렛 ─────────────────────────
export const SUBJECTS = ["I", "You", "We", "They", "He", "She", "It"];

export function Roulette(params) {
  const { ids } = gameRange(params);
  // 주어 7개로 된 단만 (There is/are처럼 틀이 다른 단은 빼고)
  const dans = ids.map(getDan).filter((d) => d.lines.length === 7 && !d.drillFromExamples);
  if (!dans.length) return noGame("주어 룰렛", ids, "이 범위에는 주어 7개로 된 단이 없어요. 다른 단을 골라 주세요.");
  ready("주어 룰렛", ids, "🎰", isSent(ids) ? [
    "룰렛이 단 하나와 주어 하나를 고르고, 우리말 문장을 보여 줘요.",
    "3초 안에 영어 문장으로 소리 내어 말해 보세요.",
    "정답을 듣고, 맞혔는지 스스로 체크해요. 모두 10판!",
  ] : [
    "룰렛이 단 하나와 주어 하나를 골라요.",
    "3초 안에 그 단의 문장을 소리 내어 말해 보세요.",
    "정답을 듣고, 맞혔는지 스스로 체크해요. 모두 10판!",
  ], () => playRoulette(ids, dans));
}

function playRoulette(ids, dans) {
  window.scrollTo(0, 0);
  const ROUNDS = 10;
  const t = timers();
  // 한 판 = 단 + 주어 번호 + 정답 문장 (문장형은 우리말 뜻도)
  const deal = () => shuffle(dans.flatMap((d) => d.sent
    ? d.items.map((it) => ({ d, i: it.sub, s: it.en, ko: it.ko }))
    : SUBJECTS.map((_, i) => ({ d, i, s: d.lines[i] }))));
  let deck = deal();
  let round = 0, right = 0;
  const misses = [];

  $app.innerHTML = `${header("주어 룰렛", hub(ids))}
    <section class="page roulette">
      <div class="hud"><span>라운드 <b id="round">1</b> / ${ROUNDS}</span><span>맞힘 <b id="right">0</b></span></div>
      <div class="reels">
        <div class="reel" id="rdan"><small>단</small><b>?</b><span class="quiet"></span></div>
        <div class="plus">+</div>
        <div class="reel" id="rsub"><small>주어</small><b>?</b><span class="quiet">&nbsp;</span></div>
      </div>
      <div id="stage"></div>
    </section>`;
  const $ = (s) => $app.querySelector(s);
  const setReel = (id, big, small) => {
    $(`#${id} b`).textContent = big;
    $(`#${id} span`).textContent = small ?? " ";
  };

  function idle() {
    $("#round").textContent = round + 1;
    $("#stage").innerHTML = `<button class="btn primary big-play" id="spin">🎰 돌리기</button>`;
    $("#spin").onclick = spin;
  }

  function spin() {
    if (!deck.length) deck = deal();
    const card = deck.pop();
    const { d, i } = card;
    $("#stage").innerHTML = "";
    document.querySelectorAll(".reel").forEach((r) => r.classList.add("spinning"));
    const id = t.every(() => {
      setReel("rdan", danLabel(pick(dans)), "");
      setReel("rsub", pick(SUBJECTS));
    }, 70);
    t.later(() => {
      clearInterval(id);
      document.querySelectorAll(".reel").forEach((r) => r.classList.remove("spinning"));
      setReel("rdan", danLabel(d), d.meaning);
      setReel("rsub", SUBJECTS[i]);
      countdown(card);
    }, 1300);
  }

  function countdown(card) {
    let n = 3;
    $("#stage").innerHTML = `<div class="card center count-card">${card.ko ? `<div class="ko-hint">${esc(card.ko)}</div>` : ""}<div class="countdown" id="cd">3</div>
      <p>${card.ko ? "영어로 " : ""}소리 내어 말해 보세요!</p><button class="btn ghost" id="show">정답 보기</button></div>`;
    const id = t.every(() => {
      n--;
      if (n > 0) $("#cd").textContent = n;
      else { clearInterval(id); reveal(card); }
    }, 1000);
    $("#show").onclick = () => { clearInterval(id); reveal(card); };
  }

  function reveal({ d, s: sentence, ko }) {
    $("#stage").innerHTML = `<div class="card center answer-card"><div class="kicker">정답</div><div class="reveal">${hl(sentence)}</div>${ko ? `<p class="quiet">${esc(ko)}</p>` : ""}
      <div class="row2"><button class="btn" id="no">❌ 틀렸어요</button><button class="btn primary" id="yes">⭕ 맞혔어요</button></div></div>`;
    stop();
    speak(sentence, store.settings.speed);
    const next = (ok) => {
      if (ok) right++;
      else misses.push({ sentence, dan: d.id });
      round++;
      $("#right").textContent = right;
      if (round >= ROUNDS) return end();
      idle();
    };
    $("#yes").onclick = () => next(true);
    $("#no").onclick = () => next(false);
  }

  function end() {
    t.end();
    stop();
    const record = right > 0 && store.setBest(bestKey("roulette", ids), right);
    endScreen({ game: "roulette", title: "주어 룰렛", ids, big: `${right} / ${ROUNDS}`,
      sub: right === ROUNDS ? "완벽해요! 🎉" : right >= 7 ? "잘했어요!" : "단을 한 번 더 외우고 다시 도전!", record, misses });
  }

  idle();
}

// ───────────────────────── 짝꿍 카드 ─────────────────────────
// 같은 주어끼리 짝이 되는 두 단
const PAIR_SETS = [
  [1, 2, "긍정 ↔ 부정"], [1, 3, "긍정 ↔ 질문"], [6, 21, "긍정 ↔ 부정"], [6, 22, "긍정 ↔ 질문"],
  [7, 8, "긍정 ↔ 부정"], [7, 9, "긍정 ↔ 질문"], [11, 14, "긍정 ↔ 부정"], [11, 12, "긍정 ↔ 질문"],
  [15, 16, "긍정 ↔ 부정"], [18, 19, "질문 ↔ 부정"], [23, 24, "긍정 ↔ 부정"], [25, 26, "긍정 ↔ 부정"],
  [25, 27, "긍정 ↔ 질문"], [33, 34, "긍정 ↔ 부정"], [33, 35, "긍정 ↔ 질문"],
  ["B1", "B2", "긍정 ↔ 부정"], ["B1", "B3", "긍정 ↔ 질문"],
  ["S1", "S2", "긍정 ↔ 부정"], ["S1", "S3", "긍정 ↔ 질문"], ["S2", "S3", "부정 ↔ 질문"],
].map(([a, b, kind]) => ({ a: getDan(a), b: getDan(b), kind }));

export function Pairs(params) {
  const { ids } = gameRange(params);
  const sent = isSent(ids);
  const open = PAIR_SETS.filter((p) => !!p.a.sent === sent && !isLocked(p.a) && !isLocked(p.b));
  const both = open.filter((p) => ids.includes(p.a.id) && ids.includes(p.b.id));
  const either = open.filter((p) => ids.includes(p.a.id) || ids.includes(p.b.id));
  const set = pick(both.length ? both : either.length ? either : open);
  const outside = !both.length;
  ready("짝꿍 카드", ids, "🃏", [
    `이번 짝꿍: <b>${danLabel(set.a)}</b> ↔ <b>${danLabel(set.b)}</b> (${set.kind})`,
    sent ? "카드를 두 장씩 뒤집어 짝이 되는 문장을 찾으세요." : "카드를 두 장씩 뒤집어 같은 주어끼리 짝을 찾으세요.",
    "뒤집을 때마다 문장을 읽어 줘요. 적은 횟수로 다 찾을수록 좋아요!",
    ...(outside ? ['<span class="quiet">고른 범위만으로는 짝이 안 나와서, 가까운 단을 함께 써요.</span>'] : []),
  ], () => playPairs(ids, set));
}

function playPairs(ids, set) {
  window.scrollTo(0, 0);
  const t = timers();
  // 짝 열쇠: 구구단형은 주어 번호, 문장형은 예문 번호
  const subs = shuffle([...(set.a.sent ? set.a.items : SUBJECTS).keys()]).slice(0, 6);
  const line = (d, i) => (d.sent ? d.items[i].en : d.lines[i]);
  const cards = shuffle(subs.flatMap((i) => [
    { i, d: set.a, text: line(set.a, i) },
    { i, d: set.b, text: line(set.b, i) },
  ]));
  let first = null, lock = false, tries = 0, found = 0;
  const t0 = Date.now();

  $app.innerHTML = `${header("짝꿍 카드", hub(ids))}
    <section class="page pairs">
      <div class="hud"><span>${danLabel(set.a)} ↔ ${danLabel(set.b)} <span class="quiet">${set.kind}</span></span><span>시도 <b id="tries">0</b></span></div>
      <div class="board">${cards.map((c, k) => `<button class="pcard" data-k="${k}">
        <span class="pback">?</span><span class="pface"><small>${danLabel(c.d)}</small>${hl(c.text)}</span></button>`).join("")}</div>
    </section>`;
  const els = [...$app.querySelectorAll(".pcard")];

  els.forEach((el, k) => (el.onclick = () => {
    if (lock || el.classList.contains("up")) return;
    el.classList.add("up");
    stop();
    speak(cards[k].text, store.settings.speed);
    if (first === null) { first = k; return; }
    tries++;
    $app.querySelector("#tries").textContent = tries;
    const a = first;
    first = null;
    if (cards[a].i === cards[k].i) {
      found++;
      t.later(() => { els[a].classList.add("done"); el.classList.add("done"); }, 300);
      if (found === subs.length) t.later(end, 1200);
    } else {
      lock = true;
      t.later(() => { els[a].classList.remove("up"); el.classList.remove("up"); lock = false; }, 1100);
    }
  }));

  function end() {
    t.end();
    const sec = Math.round((Date.now() - t0) / 1000);
    const record = store.setBest(bestKey("pairs", ids), tries, true);
    endScreen({ game: "pairs", title: "짝꿍 카드", ids, big: `${tries}번 만에 성공`,
      sub: `${subs.length}쌍을 ${sec}초 동안 모두 찾았어요${tries <= subs.length + 2 ? " — 기억력 최고! 🎉" : ""}`, record });
  }
}
