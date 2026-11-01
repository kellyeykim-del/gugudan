// 게임 3종 더: 문장 블록 쌓기 · 듣고 빙고 · 1:1 스피드 대결
import { getDan, koOf } from "./data.js";
import { store } from "./store.js";
import { speak, stop } from "./speech.js";
import { pool, blankQ, shuffle, tokens } from "./quiz.js";
import { $app, esc, hl, danLabel, header } from "./ui.js";
import { gameRange, hub, timers, ready, noGame, endScreen, bestKey } from "./games.js";

// 범위 안 단들을 번갈아 섞어 문장을 뽑는다 (한 단만 몰려 나오지 않게)
function mixed(dans, keep = () => true) {
  const bags = dans.map((d) => shuffle(pool(d).filter(keep)).map((s) => ({ s, dan: d.id })));
  const out = [];
  while (bags.some((b) => b.length)) bags.forEach((b) => b.length && out.push(b.pop()));
  return out;
}

const gapHtml = (q) => `${esc(q.before)} <span class="gap">____</span>${/^[.?!,]/.test(q.after) ? "" : " "}${esc(q.after)}`;

// ───────────────────────── 문장 블록 쌓기 ─────────────────────────
export function Blocks(params) {
  const { ids } = gameRange(params);
  const items = mixed(ids.map(getDan), (s) => tokens(s).length >= 3 && tokens(s).length <= 8);
  if (!items.length) return noGame("문장 블록 쌓기", ids, "이 범위에는 블록으로 만들 문장이 없어요. 다른 단을 골라 주세요.");
  ready("문장 블록 쌓기", ids, "🧱", [
    "위에서 단어 블록이 천천히 떨어져요. 문장 순서대로 블록을 누르세요.",
    "블록이 바닥에 닿으면 ❤️ 하나가 줄고, 그 문장을 처음부터 다시 해요.",
    "문장을 완성할 때마다 탑이 한 층씩 올라가요. 10층이면 성공!",
  ], () => playBlocks(ids, items));
}

function playBlocks(ids, items) {
  window.scrollTo(0, 0);
  const GOAL = 10, TICK = 33;
  const t = timers();
  let bag = [...items].reverse(), cur = null, words = [], built = 0, blocks = [];
  let hearts = 3, floors = 0, speed = 22, falling = false;
  const misses = [];

  $app.innerHTML = `${header("문장 블록 쌓기", hub(ids))}
    <section class="page blocks-game">
      <div class="hud"><span id="hearts"></span><span>🧱 <b id="floors">0</b> / ${GOAL}층</span></div>
      <div class="qmeta"><span class="pill" id="dl"></span><span class="quiet" id="dm"></span><button class="hint-btn" id="hint">🔊 힌트</button></div>
      <div class="slots" id="slots"></div>
      <div class="field-wrap"><div class="tower" id="tower"></div><div class="field" id="field"></div></div>
    </section>`;
  const $ = (s) => $app.querySelector(s);
  const field = $("#field");

  const hud = () => {
    $("#hearts").textContent = "❤️".repeat(hearts) + "🤍".repeat(3 - hearts);
    $("#floors").textContent = floors;
    $("#tower").innerHTML = Array.from({ length: floors }, (_, i) => `<i style="--h:${(i * 37) % 360}"></i>`).join("");
  };
  const drawSlots = () => {
    $("#slots").innerHTML = words.map((w, i) => `<span class="slot ${i < built ? "on" : ""}">${i < built ? hl(w) : ""}</span>`).join("");
  };

  function spawn() {
    built = 0;
    drawSlots();
    field.innerHTML = "";
    const lanes = field.clientWidth < 420 ? 3 : 4;
    const laneW = 100 / lanes;
    blocks = shuffle(words).map((w, k) => {
      const el = document.createElement("button");
      el.className = "block";
      el.textContent = w;
      el.style.left = `${(k % lanes) * laneW + 2 + Math.random() * (laneW - 4) * 0.25}%`;
      el.style.maxWidth = `${laneW - 3}%`;
      field.appendChild(el);
      const b = { w, el, y: 6 + Math.floor(k / lanes) * 52 + Math.random() * 10 };
      el.onpointerdown = (e) => { e.preventDefault(); tap(b); };
      return b;
    });
    place();
    falling = true;
  }
  const place = () => blocks.forEach((b) => (b.el.style.transform = `translateY(${b.y}px)`));

  function next() {
    if (!bag.length) bag = shuffle(items);
    cur = bag.pop();
    words = tokens(cur.s);
    const d = getDan(cur.dan);
    $("#dl").textContent = danLabel(d);
    // 문장형은 단 뜻 대신 이 문장의 우리말 뜻을 힌트로
    $("#dm").textContent = d.sent ? koOf(cur.s) : d.meaning;
    spawn();
  }

  function tap(b) {
    if (!falling) return;
    if (b.w === words[built]) {
      built++;
      b.el.remove();
      blocks = blocks.filter((x) => x !== b);
      drawSlots();
      if (built === words.length) done();
    } else {
      // 틀리면 블록이 모두 조금씩 내려온다
      b.el.classList.remove("bad");
      void b.el.offsetWidth;
      b.el.classList.add("bad");
      blocks.forEach((x) => (x.y += 18));
      place();
    }
  }

  function done() {
    falling = false;
    floors++;
    speed += 3;
    hud();
    $("#slots").classList.add("ok");
    stop();
    speak(cur.s, store.settings.speed);
    t.later(() => {
      $("#slots").classList.remove("ok");
      floors >= GOAL ? end(true) : next();
    }, 1100);
  }

  function fail() {
    falling = false;
    hearts--;
    misses.push({ sentence: cur.s, dan: cur.dan });
    hud();
    field.classList.add("shake");
    t.later(() => {
      field.classList.remove("shake");
      if (!hearts) return end(false);
      spawn();
    }, 700);
  }

  function end(win) {
    t.end();
    stop();
    const record = floors > 0 && store.setBest(bestKey("blocks", ids), floors);
    endScreen({ game: "blocks", title: "문장 블록 쌓기", ids, big: `${floors}층`,
      sub: win ? `${GOAL}층 탑 완성! 🎉` : "❤️를 다 썼어요. 다시 쌓아 봐요!", record, misses });
  }

  t.every(() => {
    if (!falling) return;
    const floor = field.clientHeight - 44;
    blocks.forEach((b) => (b.y += (speed * TICK) / 1000));
    place();
    if (blocks.some((b) => b.y >= floor)) fail();
  }, TICK);
  $("#hint").onclick = () => cur && speak(cur.s, store.settings.speed);
  hud();
  next();
}

// ───────────────────────── 듣고 빙고 ─────────────────────────
export function Bingo(params) {
  const { ids } = gameRange(params);
  const seen = new Set();
  const items = mixed(ids.map(getDan)).filter((x) => !seen.has(x.s) && seen.add(x.s));
  if (items.length < 9) return noGame("듣고 빙고", ids, "빙고판을 채울 문장이 모자라요. 단을 더 골라 주세요.");
  const size = items.length >= 16 ? 4 : 3;
  const goal = size === 4 ? 3 : 2;
  ready("듣고 빙고", ids, "🔢", [
    `${size}×${size} 빙고판에 문장이 깔려요. 앱이 읽어 주는 문장을 찾아 누르세요.`,
    `가로·세로·대각선 한 줄을 채우면 빙고! ${goal}줄을 먼저 채우면 끝이에요.`,
    "He has.와 She has.처럼 비슷한 문장이 섞여 있으니 잘 들어요.",
  ], () => playBingo(ids, items.slice(0, size * size), size, goal, $app.querySelector("#teacher").checked),
  `<label class="teacher-opt"><input type="checkbox" id="teacher"> 선생님이 불러 주기 (앱 소리 없이, 들은 문장을 직접 체크)</label>`);
}

function playBingo(ids, cells, size, goal, teacher) {
  window.scrollTo(0, 0);
  const t = timers();
  const marked = new Set();
  let calls = shuffle([...cells.keys()]), cur = null, heard = 0, mistakes = 0, lines = 0, busy = false;
  const misses = [];

  $app.innerHTML = `${header("듣고 빙고", hub(ids))}
    <section class="page bingo">
      <div class="hud"><span>빙고 <b id="lines">0</b> / ${goal}줄</span>${teacher ? '<span class="quiet">선생님 모드</span>' : '<span>실수 <b id="miss">0</b></span>'}</div>
      ${teacher ? '<p class="hint">선생님이 불러 주는 문장을 찾아 누르세요. 잘못 눌렀으면 한 번 더 누르면 지워져요.</p>' : `
      <div class="row2 caller"><button class="btn primary" id="again">🔊 다시 듣기</button><button class="btn ghost" id="pass">모르겠어요</button></div>`}
      <div class="bgrid s${size}">${cells.map((c, k) => `<button class="bcell" data-k="${k}">${hl(c.s)}</button>`).join("")}</div>
    </section>`;
  const $ = (s) => $app.querySelector(s);
  const els = [...$app.querySelectorAll(".bcell")];

  const allLines = [];
  for (let i = 0; i < size; i++) {
    allLines.push([...Array(size).keys()].map((j) => i * size + j));
    allLines.push([...Array(size).keys()].map((j) => j * size + i));
  }
  allLines.push([...Array(size).keys()].map((j) => j * size + j));
  allLines.push([...Array(size).keys()].map((j) => j * size + (size - 1 - j)));

  function check() {
    const full = allLines.filter((l) => l.every((k) => marked.has(k)));
    els.forEach((el, k) => el.classList.toggle("line", full.some((l) => l.includes(k))));
    if (full.length > lines) toastBingo();
    lines = full.length;
    $("#lines").textContent = lines;
    if (lines >= goal) { busy = true; t.later(end, 1200); return true; }
    return false;
  }
  const toastBingo = () => {
    const b = document.createElement("div");
    b.className = "bingo-pop";
    b.textContent = "BINGO!";
    $app.querySelector(".bingo").appendChild(b);
    t.later(() => b.remove(), 1100);
  };

  function call() {
    calls = calls.filter((k) => !marked.has(k));
    if (!calls.length) return end();
    cur = calls.shift();
    heard++;
    stop();
    speak(cells[cur].s, store.settings.speed);
    busy = false;
  }

  els.forEach((el, k) => (el.onclick = () => {
    if (busy) return;
    if (teacher) {
      marked.has(k) ? marked.delete(k) : marked.add(k);
      el.classList.toggle("on", marked.has(k));
      check();
      return;
    }
    if (marked.has(k)) return;
    if (k === cur) {
      marked.add(k);
      el.classList.add("on");
      busy = true;
      if (!check()) t.later(call, 700);
    } else {
      mistakes++;
      misses.push({ sentence: cells[cur].s, dan: cells[cur].dan });
      $("#miss").textContent = mistakes;
      el.classList.remove("bad");
      void el.offsetWidth;
      el.classList.add("bad");
    }
  }));

  if (!teacher) {
    $("#again").onclick = () => cur !== null && speak(cells[cur].s, store.settings.speed);
    $("#pass").onclick = () => {
      if (busy || cur === null) return;
      misses.push({ sentence: cells[cur].s, dan: cells[cur].dan });
      els[cur].classList.add("peek");
      t.later(() => els[cur]?.classList.remove("peek"), 1000);
      calls.push(cur);
      busy = true;
      t.later(call, 1100);
    };
    t.later(call, 400);
  }

  function end() {
    t.end();
    stop();
    if (teacher) {
      return endScreen({ game: "bingo", title: "듣고 빙고", ids, big: "BINGO! 🎉", sub: `${lines}줄 완성`, record: false });
    }
    const record = lines >= goal && store.setBest(bestKey("bingo", ids), mistakes, true);
    endScreen({ game: "bingo", title: "듣고 빙고", ids, big: lines >= goal ? "BINGO! 🎉" : `${lines}줄`,
      sub: `문장 ${heard}개를 듣고, 실수 ${mistakes}번`, record, misses });
  }
}

// ───────────────────────── 1:1 스피드 대결 ─────────────────────────
const PLAYERS = [{ name: "파랑", icon: "🔵" }, { name: "빨강", icon: "🔴" }];

export function Duel(params) {
  const { ids } = gameRange(params);
  const items = ids.map(getDan).flatMap((d) => pool(d).map((s) => blankQ(d, s)).filter(Boolean));
  if (!items.length) return noGame("1:1 스피드 대결", ids, "이 범위에는 빈칸 문제가 없어요. 다른 단을 골라 주세요.");
  ready("1:1 스피드 대결", ids, "⚔️", [
    "기기를 가운데 두고 두 사람이 마주 앉아요. 휴대폰·태블릿이면 위쪽 화면이 뒤집혀 보여요.",
    "같은 빈칸 문제가 양쪽에 나와요. 먼저 맞히는 사람이 1점!",
    "틀리면 그 문제는 더 누를 수 없어요. 먼저 5점을 내면 승리!",
  ], () => playDuel(ids, items));
}

function playDuel(ids, items) {
  window.scrollTo(0, 0);
  const WIN = 5;
  const t = timers();
  let bag = shuffle(items), q = null, score = [0, 0], locked = [false, false], over = false;
  const misses = [];

  $app.innerHTML = `${header("1:1 스피드 대결", hub(ids))}
    <section class="duel">${PLAYERS.map((p, i) => `
      <div class="side p${i}" data-p="${i}">
        <div class="who">${p.icon} ${p.name} <b class="pts">0</b></div>
        <div class="qsentence"></div>
        <div class="opts"></div>
      </div>`).join("")}
    </section>`;
  const sides = [...$app.querySelectorAll(".side")];

  function round() {
    if (!bag.length) bag = shuffle(items);
    q = bag.pop();
    locked = [false, false];
    over = false;
    sides.forEach((side, p) => {
      side.classList.remove("win", "lose");
      side.querySelector(".qsentence").innerHTML = gapHtml(q);
      const opts = side.querySelector(".opts");
      opts.innerHTML = shuffle(q.options).map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join("");
      opts.querySelectorAll(".opt").forEach((b) => (b.onpointerdown = (e) => { e.preventDefault(); answer(p, b); }));
    });
  }

  function answer(p, b) {
    if (over || locked[p]) return;
    if (b.dataset.o === q.answer) {
      over = true;
      score[p]++;
      b.classList.add("ok");
      sides[p].classList.add("win");
      sides[1 - p].classList.add("lose");
      sides[p].querySelector(".pts").textContent = score[p];
      reveal();
      t.later(() => (score[p] >= WIN ? end(p) : round()), 1400);
    } else {
      locked[p] = true;
      b.classList.add("bad");
      sides[p].classList.add("lose");
      if (locked[0] && locked[1]) {
        over = true;
        misses.push(q);
        reveal();
        t.later(round, 1600);
      }
    }
  }

  function reveal() {
    sides.forEach((side) => (side.querySelector(".qsentence").innerHTML = hl(q.sentence)));
    stop();
    speak(q.sentence, store.settings.speed);
  }

  function end(p) {
    t.end();
    stop();
    endScreen({ game: "duel", title: "1:1 스피드 대결", ids, big: `${PLAYERS[p].icon} ${PLAYERS[p].name} 승리!`,
      sub: `${score[0]} : ${score[1]}`, record: false, misses });
  }

  round();
}
