// 화면 라우터와 각 화면. 해시 주소(#/table, #/dan/7 …)로 화면을 바꾼다.
import { DANS, MAIN_DANS, BONUS_DANS, FAMILIES, getDan, drillLines } from "./data.js";
import { store } from "./store.js";
import { speak, speakAll, stop, canSpeak, playDan, hasDanClip, pauseAudio, resumeAudio } from "./speech.js";
import { buildQuiz, findBlank, tokens, splitPunct, shuffle } from "./quiz.js";
import { $app, esc, hl, danLabel, starsHtml, isLocked, toast, header, runLeave } from "./ui.js";
import { Games, Mole, Roulette, Pairs } from "./games.js";
import { Blocks, Bingo, Duel } from "./games-more.js";
import { pose, setPose, bg, groupImg, deco, rewardFor, earnedCount, showReward, Garden } from "./village.js";
import { mountSkinSwitch } from "./skin.js";

// ───────────────────────── 홈 ─────────────────────────
function Home() {
  const today = MAIN_DANS.find((d) => !store.passed(d.id)) || MAIN_DANS[0];
  const passed = store.passedCount();
  const wrong = store.wrongIds().length;
  const earned = earnedCount();
  const gardenNo = Math.min(Math.floor((today.no - 1) / 12), 2) + 1 || 1;
  $app.innerHTML = `
    <section class="home">
      <a class="brand" href="#/about"><img class="logo" src="img/sogenius-logo.png" alt="소지니어스 시즌드잉글리시"><h1>신나는 영어구구단</h1></a>
      <a class="today card" href="#/dan/${today.id}">
        <span class="today-bg" style="${bg("village")}" aria-hidden="true"></span>
        <div class="today-text">
          <div class="today-head"><span class="kicker">오늘의 단</span>${starsHtml(today.id)}</div>
          <div class="today-no">${danLabel(today)}</div>
          <div class="today-line">${hl(drillLines(today)[0])}</div>
          <div class="quiet">${esc(today.meaning)}</div>
          <span class="btn primary">외우러 가기 →</span>
        </div>
        <div class="today-hero" aria-hidden="true">
          <span class="bubble">같이 해볼까?</span>
          <img src="img/village/nuri-hero.png" width="532" height="599" alt="">
        </div>
      </a>
      <div class="progress card">
        <div class="row"><b>통과한 단</b><span>${passed} / ${MAIN_DANS.length}</span></div>
        <div class="meter"><i style="width:${(passed / MAIN_DANS.length) * 100}%"></i></div>
      </div>
      <a class="garden-link card" href="#/garden?g=${gardenNo}">
        <span class="garden-thumb" style="${bg("garden")}" aria-hidden="true">${deco(Math.max(0, (Math.min(earned, 36) - 1) % 12))}</span>
        <div><b>🌷 우리 마을 정원</b><span>${earned ? `장식 ${earned} / 36개 · 단을 통과할 때마다 하나씩 생겨요` : "단을 처음 통과하면 정원에 장식이 생겨요"}</span></div>
        <span class="go" aria-hidden="true">→</span>
      </a>
      <nav class="menu">
        <a class="tile game" href="#/games"><b>🎮 게임 (구구단형)</b><span>두더지 · 룰렛 · 짝꿍 카드 · 블록 쌓기 · 빙고 · 1:1 대결</span></a>
        <a class="tile game" href="#/games?ids=S1,S2,S3"><b>🎮 게임 (문장형)</b><span>1–3단을 완성된 문장으로 · I am David. · She is sad.</span></a>
        <a class="tile" href="#/table"><b>구구단표</b><span>36단 한눈에 보기</span></a>
        <a class="tile" href="#/pick"><b>범위 고르고 연습</b><span>1단 · 묶음 · 10단 · 전체</span></a>
        <a class="tile" href="#/pick?mode=quiz"><b>시험 보기</b><span>빈칸 · 순서 · 듣기</span></a>
        <a class="tile ${wrong ? "" : "dim"}" href="#/pick?preset=wrong"><b>내 묶음</b><span>${wrong ? `틀린 단 ${wrong}개` : "아직 없어요"}</span></a>
      </nav>
      <a class="about-link card" href="#/about">
        <img src="img/ceo-kang-sojin.jpg" alt="">
        <div><b>영어구구단 소개</b><span>강소진 대표가 만든 영어 문장 구구단</span></div>
        <span class="go">→</span>
      </a>
      <details class="settings">
        <summary>설정</summary>
        <label><input type="checkbox" id="unlock" ${store.settings.unlockAll ? "checked" : ""}> 선생님 모드: 보너스 단 미리 열기</label>
        <button class="btn ghost" id="reset">학습 기록 지우기</button>
      </details>
    </section>`;
  $app.querySelector("#unlock").onchange = (e) => store.setSetting("unlockAll", e.target.checked);
  $app.querySelector("#reset").onclick = () => {
    if (confirm("이 기기의 별과 시험 기록을 모두 지울까요?")) { store.reset(); Home(); }
  };
}

// ───────────────────────── 소개 ─────────────────────────
// 대표 소개 문구는 sogenius.co.kr/about 내용을 줄인 것
function About() {
  $app.innerHTML = `${header("영어구구단 소개")}
    <section class="page about">
      <div class="hero card">
        <img class="logo" src="img/sogenius-logo.png" alt="소지니어스 시즌드잉글리시">
        <h2>신나는 영어구구단</h2>
        <p class="lead">수학 구구단처럼, 영어 기본 문장을 <b>‘단’</b>으로 외웁니다.</p>
        <div class="mini-dan" aria-label="11단 예시">
          <span>I have.</span><span>You have.</span><span>We have.</span><span>They have.</span>
          <span>He <i class="red">has</i>.</span><span>She <i class="red">has</i>.</span><span>It <i class="red">has</i>.</span>
        </div>
      </div>

      <div class="maker card">
        <img src="img/ceo-kang-sojin.jpg" alt="강소진 대표">
        <div>
          <span class="kicker">만든 사람</span>
          <h3>강소진 대표 <span class="quiet">소지니어스 (So-geni-us)</span></h3>
          <p>아이들이 헷갈려하는 기본 문법을 ‘단’으로 묶어 영어구구단을 만들었습니다.</p>
          <ul>
            <li>2013년 헌터주니어잉글리시 영어공부방 운영</li>
            <li>저서 『나는 전문공부방으로 혼자 억대번다 – 영어편』, 『미라클잉글리시』</li>
            <li>영어 티칭 스킬을 나누는 유튜브 ‘헌터주니어TV’ 운영</li>
            <li>2026 포브스코리아 소비자 선정 최고의 브랜드 대상</li>
          </ul>
        </div>
      </div>

      <h3 class="sec">영어구구단이란?</h3>
      <div class="points">
        <div class="card"><b>7 × 36</b><p>주어 7개(I · You · We · They · He · She · It)와 문장틀 36단. 한 단은 7문장, 약 20초.</p></div>
        <div class="card"><b>헷갈리는 곳만 빨갛게</b><p>does · has · goes처럼 주어에 따라 바뀌는 부분을 빨간색으로 보여 줍니다.</p></div>
        <div class="card"><b>소리 내어 외우기</b><p>비트에 맞춰 읽고, 가리고 말하고, 단어를 순서대로 맞춰 봅니다.</p></div>
      </div>

      <h3 class="sec">이렇게 공부해요</h3>
      <ol class="how">
        <li><b>외우기</b><span>보고 듣기 → 가리고 말하기 → 순서 맞추기, 별 3개면 통과</span></li>
        <li><b>시험</b><span>빈칸 · 순서 · 듣기 문제로 확인</span></li>
        <li><b>내 묶음</b><span>틀린 단만 모아 다시 연습</span></li>
      </ol>

      <div class="actions">
        <a class="btn primary" href="#/dan/1">1단부터 시작하기</a>
        <a class="btn" href="#/table">구구단표 보기</a>
        <a class="btn ghost" href="https://sogenius.co.kr/" target="_blank" rel="noopener">소지니어스 홈페이지 ↗</a>
      </div>
    </section>`;
}

// ───────────────────────── 구구단표 ─────────────────────────
function danCard(d) {
  const locked = isLocked(d);
  const first = drillLines(d)[0];
  return `<a class="dcard ${store.passed(d.id) ? "done" : ""} ${locked ? "locked" : ""}"
      href="${locked ? "#/table?locked=1" : `#/dan/${d.id}`}">
      <div class="dhead"><b>${danLabel(d)}</b>${locked ? "🔒" : starsHtml(d.id)}</div>
      <div class="dline">${hl(first)}</div>
      <div class="dmean">${esc(d.meaning)}</div>
    </a>`;
}

function Table(params) {
  if (params.get("locked")) toast("36단을 모두 통과하면 보너스 단이 열려요");
  $app.innerHTML = `${header("구구단표")}
    <section class="page">
      <div class="grid-d">${MAIN_DANS.map(danCard).join("")}</div>
      <h2 class="sec">보너스 단 <span class="quiet">make · want/need · 의문사</span></h2>
      <div class="grid-d">${BONUS_DANS.map(danCard).join("")}</div>
    </section>`;
}

// ───────────────────────── 범위 고르기 ─────────────────────────
function Pick(params) {
  const sel = new Set();
  const preset = params.get("preset");
  if (preset === "wrong") store.wrongIds().forEach((id) => sel.add(id));
  if (params.get("ids")) params.get("ids").split(",").forEach((id) => sel.add(id));
  const quizFirst = params.get("mode") === "quiz";
  const gameFirst = params.get("mode") === "game";

  const presets = [
    { k: "all", label: "36단 전체", ids: MAIN_DANS.map((d) => d.id) },
    { k: "1-10", label: "1–10단", ids: MAIN_DANS.slice(0, 10).map((d) => d.id) },
    { k: "11-20", label: "11–20단", ids: MAIN_DANS.slice(10, 20).map((d) => d.id) },
    { k: "21-36", label: "21–36단", ids: MAIN_DANS.slice(20).map((d) => d.id) },
    ...FAMILIES.filter((f) => f.id !== "bonus").map((f) => ({ k: f.id, label: f.name, ids: f.dans.map(String) })),
    { k: "wrong", label: "내 묶음", ids: store.wrongIds() },
  ];

  const render = () => {
    const ids = [...sel];
    const one = ids.length === 1 ? getDan(ids[0]) : null;
    $app.innerHTML = `${header(gameFirst ? "게임 범위 고르기" : quizFirst ? "시험 범위 고르기" : "범위 고르기", gameFirst ? "#/games" : "#/")}
      <section class="page">
        <p class="hint">단을 눌러 고르거나, 아래 묶음 버튼으로 한 번에 고르세요.</p>
        <div class="chips">${presets.map((p) =>
          `<button class="chip" data-preset="${p.k}" ${p.ids.length ? "" : "disabled"}>${esc(p.label)}</button>`).join("")}
          <button class="chip ghost" data-clear>모두 해제</button></div>
        <div class="grid-n">${DANS.map((d) => `<button class="num ${sel.has(d.id) ? "on" : ""} ${isLocked(d) ? "locked" : ""}"
            data-id="${d.id}" ${isLocked(d) ? "disabled" : ""}>${d.bonus ? d.no : d.no}<small>${"★".repeat(store.stars(d.id))}</small></button>`).join("")}</div>
        <div class="actions sticky">
          <span class="count">${ids.length ? `${ids.length}개 단 선택` : "단을 골라 주세요"}</span>
          ${gameFirst ? `<a class="btn ${ids.length ? "primary" : "disabled"}" href="${ids.length ? `#/games?ids=${ids.join(",")}` : "#"}">이 범위로 게임하기 →</a>` : `
          ${quizFirst ? "" : `<a class="btn ${one ? "primary" : "disabled"}" href="${one ? `#/dan/${one.id}` : "#"}">외우기${one ? "" : " (1단만)"}</a>`}
          <a class="btn ${ids.length ? (quizFirst ? "primary" : "") : "disabled"}" href="${ids.length ? `#/quiz?ids=${ids.join(",")}&n=10` : "#"}">시험 10문제</a>
          <a class="btn ${ids.length ? "" : "disabled"}" href="${ids.length ? `#/quiz?ids=${ids.join(",")}&n=20` : "#"}">20문제</a>
          <a class="btn ${ids.length ? "" : "disabled"}" href="${ids.length ? `#/games?ids=${ids.join(",")}` : "#"}">🎮 게임</a>`}
        </div>
      </section>`;
    $app.querySelectorAll("[data-id]").forEach((b) => (b.onclick = () => {
      sel.has(b.dataset.id) ? sel.delete(b.dataset.id) : sel.add(b.dataset.id);
      render();
    }));
    $app.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = () => {
      sel.clear();
      presets.find((p) => p.k === b.dataset.preset).ids.forEach((id) => sel.add(id));
      render();
    }));
    $app.querySelector("[data-clear]").onclick = () => { sel.clear(); render(); };
  };
  render();
}

// ───────────────────────── 외우기 ─────────────────────────
const STEP_TABS = [
  { k: "see", label: "① 보고 듣기" },
  { k: "hide", label: "② 가리고 말하기" },
  { k: "order", label: "③ 순서 맞추기" },
];

function Dan(id, params) {
  const d = getDan(id);
  if (!d) return (location.hash = "#/table");
  if (isLocked(d)) return (location.hash = "#/table?locked=1");
  const step = params.get("step") || "see";
  const lines = drillLines(d);

  // 별은 단계를 처음 마칠 때만. 단을 처음 통과하면 정원 보상 창을 한 번 띄운다.
  const award = (k) => {
    if (store.markStep(d.id, k)) {
      const n = store.stars(d.id);
      const st = $app.querySelector(".danhead-card .stars");
      if (st) st.outerHTML = starsHtml(d.id);
      if (n === 3 && rewardFor(d)) showReward(d);
      else toast(n === 3 ? `🎉 ${danLabel(d)} 통과! 별 3개` : `⭐ 별 ${n}개`);
    }
  };

  const tabs = STEP_TABS.map((t) =>
    `<a class="tab ${t.k === step ? "on" : ""}" href="#/dan/${d.id}?step=${t.k}">${t.label}${store.stepDone(d.id, t.k) ? " ✓" : ""}</a>`).join("");

  $app.innerHTML = `${header(`${danLabel(d)} 외우기`, "#/table")}
    <section class="page">
      <div class="danhead scene-head" style="${bg(/ice cream/i.test(d.theme?.en || "") ? "icecream" : "school")}">
        <div class="danhead-card"><div><div class="big">${danLabel(d)}</div><div class="quiet">${esc(d.meaning)}</div></div>${starsHtml(d.id)}</div>
        ${pose(STEP_CHAR[step][0], STEP_CHAR[step][1], { cls: "head-char" })}
      </div>
      <nav class="tabs">${tabs}</nav>
      <div id="step"></div>
    </section>`;
  const $s = $app.querySelector("#step");

  if (step === "see") stepSee($s, d, lines, () => award("see"));
  if (step === "hide") stepHide($s, d, lines, () => award("hide"));
  if (step === "order") stepOrder($s, d, lines, () => award("order"));
}

// 단계마다 함께하는 친구와 기본 동작: 듣기는 누리, 가리고 말하기는 민티 격려, 순서 맞추기는 보보
const STEP_CHAR = { see: ["nuri", "listen"], hide: ["minty", "encourage"], order: ["bobo", "welcome"] };
const headChar = () => $app.querySelector(".head-char");

// 비트낭독 무대: 선생님 원음이 실제로 재생되는 동안만 .playing (박자 정보는 없어 가벼운 반복 움직임만)
const STAGE = `<div class="stage" style="${bg("stage")}">
    <div class="band">${pose("nuri", "rhythm", { label: "마이크를 든 누리" })}${pose("minty", "rhythm", { label: "탬버린을 든 민티" })}${pose("bobo", "rhythm", { label: "북을 치는 보보" })}</div>
    <div class="stage-bar"><span class="stage-note" id="stage-note">선생님 원음을 준비하고 있어요</span><button class="btn ghost" id="beatstop">■ 그만</button></div>
  </div>`;

// 1단 주어 그림: I는 누리 자신, We는 누리를 포함한 셋, They는 누리가 가리키는 두 친구
function whoPanel(lines) {
  const fig = (i, img, title, desc) => `<button class="who card" data-i="${i}">${img}<span><b>${title}</b>${desc}</span></button>`;
  return `<h3 class="sec">누가 누구일까요? <span class="quiet">그림을 누르면 들려줘요</span></h3>
    <div class="who-grid">
      ${fig(0, pose("nuri", "self", { label: "자기 자신을 가리키는 누리" }), esc(lines[0]), "말하는 나, 누리")}
      ${fig(2, groupImg("we", "누리, 민티, 보보가 아이스크림을 들고 함께 있는 모습"), esc(lines[2]), "누리를 포함한 우리 셋")}
      ${fig(3, groupImg("they", "누리가 떨어져 있는 민티와 보보를 가리키는 모습"), esc(lines[3]), "누리가 가리키는 저 두 친구")}
    </div>`;
}

function speedPicker() {
  const sp = store.settings.speed;
  return `<div class="speed" role="group" aria-label="빠르기">${[["slow", "느리게"], ["normal", "보통"], ["fast", "빠르게"]]
    .map(([k, l]) => `<button class="seg ${sp === k ? "on" : ""}" data-speed="${k}">${l}</button>`).join("")}</div>`;
}
function bindSpeed(root, rerender) {
  root.querySelectorAll("[data-speed]").forEach((b) => (b.onclick = () => { store.setSetting("speed", b.dataset.speed); rerender(); }));
}

function stepSee($s, d, lines, done) {
  const render = () => {
    $s.innerHTML = `
      <div class="toolbar">${canSpeak ? `<button class="btn primary" id="playall">▶ 전체 듣기</button>${hasDanClip(d.id) ? '<button class="btn beat" id="beat">🎵 비트낭독</button>' : ""}${speedPicker()}` : `<span class="quiet">이 브라우저는 소리 읽기를 지원하지 않아요</span>`}</div>
      ${hasDanClip(d.id) ? '<p class="hint">🎵 비트낭독은 선생님 원음이에요. 원음은 She가 He보다 먼저 나와요.</p>' : ""}
      <ol class="lines">${lines.map((l, i) => `<li data-i="${i}"><span>${hl(l)}</span>${canSpeak ? '<span class="spk">🔊</span>' : ""}</li>`).join("")}</ol>
      ${d.no === 1 && !d.bonus && !d.sent ? whoPanel(lines) : ""}
      ${d.examples.length && !d.drillFromExamples ? `
        <h3 class="sec">응용 문장 <span class="quiet">${esc(d.theme?.en || "")} · ${esc(d.theme?.ko || "")}</span></h3>
        <ol class="lines small">${d.examples.map((l, i) => `<li data-ex="${i}"><span>${hl(l)}</span>${canSpeak ? '<span class="spk">🔊</span>' : ""}</li>`).join("")}</ol>` : ""}
      <button class="btn block" id="seen">다 봤어요 ✓</button>`;
    $s.querySelectorAll("li[data-i]").forEach((li) => (li.onclick = () => { stop(); speak(lines[+li.dataset.i], store.settings.speed); }));
    $s.querySelectorAll("[data-ex]").forEach((li) => (li.onclick = () => { stop(); speak(d.examples[+li.dataset.ex], store.settings.speed); }));
    const all = $s.querySelector("#playall");
    if (all) all.onclick = async () => {
      const items = [...$s.querySelectorAll("li[data-i]")];
      const finished = await speakAll(lines, store.settings.speed, (i) => items.forEach((li, j) => li.classList.toggle("now", j === i)));
      if (finished) done();
    };
    const beat = $s.querySelector("#beat");
    if (beat) {
      let st = "idle";
      const show = (next) => {
        st = next;
        $s.querySelector(".stage")?.classList.toggle("playing", st === "playing");
        const note = $s.querySelector("#stage-note");
        if (note) note.textContent = { playing: "선생님 원음을 듣고 있어요", paused: "잠깐 멈췄어요",
          idle: "다 들었어요! 다시 들으려면 비트낭독을 눌러요" }[st] || "선생님 원음을 준비하고 있어요";
        beat.textContent = st === "playing" ? "⏸ 일시 정지" : st === "paused" ? "▶ 이어 듣기" : "🎵 비트낭독";
        beat.classList.toggle("on", st !== "idle");
        beat.setAttribute("aria-pressed", String(st === "playing"));
      };
      beat.onclick = async () => {
        if (st === "playing") return pauseAudio();
        if (st === "paused") return resumeAudio();
        if (!$s.querySelector(".stage")) {
          $s.querySelector(".toolbar").insertAdjacentHTML("afterend", STAGE);
          $s.querySelector("#beatstop").onclick = () => stop();
        }
        show("loading");
        let live = true; // 그만·화면 이동 뒤에 늦게 오는 pause 이벤트는 무시
        const finished = await playDan(d.id, store.settings.speed,
          (e) => live && show(e === "play" ? "playing" : e === "pause" ? "paused" : "idle"));
        live = false;
        show("idle");
        if (!finished) $s.querySelector("#stage-note").textContent = "멈췄어요. 다시 들으려면 비트낭독을 눌러요";
        if (finished) done();
      };
    }
    $s.querySelectorAll(".who").forEach((b) => (b.onclick = () => {
      stop();
      speak(lines[+b.dataset.i], store.settings.speed);
    }));
    bindSpeed($s, () => { stop(); render(); });
    $s.querySelector("#seen").onclick = () => { done(); location.hash = `#/dan/${d.id}?step=hide`; };
  };
  render();
}

// 가리는 정도: 1 = 헷갈리는 단어만, 2 = 주어만 남기기, 3 = 전부
function masked(line, d, level, shown) {
  const ws = tokens(line);
  const b = findBlank(line, d);
  return ws.map((w, i) => {
    const hide = !shown && (level === 3 || (level === 2 && i > 0) || (level === 1 && (b ? i === b.index : i === ws.length - 1)));
    if (!hide) return hl(w);
    const [core, p] = splitPunct(w);
    return `<span class="mask">${" ".repeat(Math.max(3, core.length))}</span>${esc(p)}`;
  }).join(" ");
}

function stepHide($s, d, lines, done) {
  let level = 1;
  const shown = new Set();
  const render = () => {
    $s.innerHTML = `
      <div class="toolbar"><div class="speed" role="group" aria-label="가리기">${[[1, "헷갈리는 단어"], [2, "주어만 보기"], [3, "전부 가리기"]]
        .map(([k, l]) => `<button class="seg ${level === k ? "on" : ""}" data-level="${k}">${l}</button>`).join("")}</div></div>
      <p class="hint">가려진 부분을 소리 내어 말한 뒤, 줄을 눌러 확인하세요.</p>
      <ol class="lines">${lines.map((l, i) => `<li data-i="${i}" class="${shown.has(i) ? "open" : ""}"><span>${masked(l, d, level, shown.has(i))}</span></li>`).join("")}</ol>
      <p class="cheer">헷갈려도 괜찮아요. 한 번 더 같이 해볼까?</p>
      <div class="row2"><button class="btn ghost" id="again">다시 가리기</button><button class="btn primary" id="said">다 말했어요 ✓</button></div>`;
    $s.querySelectorAll("[data-level]").forEach((b) => (b.onclick = () => { level = +b.dataset.level; shown.clear(); render(); }));
    $s.querySelectorAll("[data-i]").forEach((li) => (li.onclick = () => {
      const i = +li.dataset.i;
      shown.add(i);
      speak(lines[i], store.settings.speed);
      render();
    }));
    $s.querySelector("#again").onclick = () => { shown.clear(); render(); };
    $s.querySelector("#said").onclick = () => { done(); location.hash = `#/dan/${d.id}?step=order`; };
  };
  render();
}

function stepOrder($s, d, lines, done) {
  const picks = shuffle(lines.filter((l) => tokens(l).length >= 2)).slice(0, 4);
  let qi = 0;
  const run = () => {
    if (qi >= picks.length) {
      setPose(headChar(), "celebrate");
      $s.innerHTML = `<div class="card center done-card">${pose("bobo", "celebrate", { cls: "done-char" })}<p class="big">순서 맞추기 ${picks.length}문장 완료!</p>
        <div class="row2"><a class="btn" href="#/dan/${d.id}?step=see">처음부터</a><a class="btn primary" href="#/quiz?ids=${d.id}&n=10">이 단 시험 보기</a></div></div>`;
      done();
      return;
    }
    const target = tokens(picks[qi]);
    let pool = shuffle(target.map((w, i) => ({ w, i })));
    if (pool.map((x) => x.w).join(" ") === target.join(" ")) pool = [...pool].reverse();
    const built = [];
    const draw = (state = "") => {
      $s.innerHTML = `
        <p class="hint" aria-live="polite">${state === "bad" ? '<b class="cheer">한 번 더 같이 해볼까?</b> 순서를 다시 맞춰 봐요.'
          : state === "ok" ? "<b>좋아요!</b>" : `단어를 눌러 문장을 완성하세요. (${qi + 1} / ${picks.length})`}</p>
        <div class="answer ${state}">${built.map((x, k) => `<button class="word" data-back="${k}">${esc(x.w)}</button>`).join("") || '<span class="quiet">여기에 문장이 만들어져요</span>'}</div>
        <div class="bank">${pool.map((x, k) => `<button class="word" data-take="${k}">${esc(x.w)}</button>`).join("")}</div>`;
      $s.querySelectorAll("[data-take]").forEach((b) => (b.onclick = () => {
        built.push(pool.splice(+b.dataset.take, 1)[0]);
        if (!pool.length) {
          const ok = built.map((x) => x.w).join(" ") === target.join(" ");
          draw(ok ? "ok" : "bad");
          setPose(headChar(), ok ? "celebrate" : "encourage");
          speak(picks[qi], store.settings.speed);
          setTimeout(() => {
            if (!$s.isConnected) return;
            setPose(headChar(), "welcome");
            if (ok) { qi++; run(); } else { pool = shuffle(built.splice(0)); draw(); }
          }, ok ? 900 : 1600);
          return;
        }
        draw();
      }));
      $s.querySelectorAll("[data-back]").forEach((b) => (b.onclick = () => { pool.push(built.splice(+b.dataset.back, 1)[0]); draw(); }));
    };
    draw();
  };
  run();
}

// ───────────────────────── 시험 ─────────────────────────
function Quiz(params) {
  const ids = (params.get("ids") || "").split(",").filter((id) => getDan(id) && !isLocked(getDan(id)));
  if (!ids.length) return (location.hash = "#/pick?mode=quiz");
  const n = Math.min(+params.get("n") || 10, 30);
  const qs = buildQuiz(ids, n, { audio: canSpeak });
  const results = [];
  let qi = 0;

  const next = () => {
    if (qi >= qs.length) return showResult(ids, qs, results);
    const q = qs[qi];
    const d = getDan(q.dan);
    const head = `${header(`시험 ${qi + 1} / ${qs.length}`, "#/pick?mode=quiz")}
      <section class="page"><div class="meter"><i style="width:${(qi / qs.length) * 100}%"></i></div>
      <div class="qmeta"><span class="pill">${danLabel(d)}</span><span class="quiet">${esc(d.meaning)}</span></div>`;
    const finish = (ok, given) => {
      results.push({ q, ok, given });
      const fb = document.createElement("div");
      fb.className = `feedback ${ok ? "ok" : "bad"}`;
      fb.innerHTML = `${pose(ok ? "nuri" : "minty", ok ? "celebrate" : "encourage", { cls: "fb-char" })}
        <b>${ok ? "정답!" : "한 번 더 같이 해볼까?"}</b><div>${hl(q.sentence)}</div><button class="btn primary" id="go">${qi + 1 < qs.length ? "다음 →" : "결과 보기"}</button>`;
      $app.querySelector(".page").appendChild(fb);
      $app.querySelectorAll(".opt, .word").forEach((b) => (b.disabled = true));
      speak(q.sentence, store.settings.speed);
      fb.querySelector("#go").onclick = () => { stop(); qi++; next(); };
      fb.querySelector("#go").focus();
    };

    if (q.type === "blank") {
      $app.innerHTML = `${head}<p class="qtitle">빈칸에 알맞은 말을 고르세요</p>
        <div class="qsentence">${esc(q.before)} <span class="gap">____</span>${/^[.?!,]/.test(q.after) ? "" : " "}${esc(q.after)}</div>
        <div class="opts">${q.options.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div></section>`;
      $app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
        const ok = b.dataset.o === q.answer;
        b.classList.add(ok ? "ok" : "bad");
        if (!ok) $app.querySelector(`.opt[data-o="${CSS.escape(q.answer)}"]`)?.classList.add("ok");
        finish(ok, b.dataset.o);
      }));
    }

    if (q.type === "listen") {
      $app.innerHTML = `${head}<p class="qtitle">듣고 알맞은 문장을 고르세요</p>
        <button class="btn primary big-play" id="play">🔊 듣기</button>
        <div class="opts col">${q.options.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div></section>`;
      const play = () => speak(q.sentence, store.settings.speed);
      $app.querySelector("#play").onclick = play;
      setTimeout(play, 300);
      $app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
        const ok = b.dataset.o === q.answer;
        b.classList.add(ok ? "ok" : "bad");
        if (!ok) $app.querySelector(`.opt[data-o="${CSS.escape(q.answer)}"]`)?.classList.add("ok");
        finish(ok, b.dataset.o);
      }));
    }

    if (q.type === "order") {
      const target = tokens(q.sentence).join(" ");
      let pool = q.words.map((w, i) => ({ w, i }));
      const built = [];
      const draw = () => {
        $app.innerHTML = `${head}<p class="qtitle">단어를 순서대로 눌러 문장을 만드세요</p>
          <div class="answer">${built.map((x, k) => `<button class="word" data-back="${k}">${esc(x.w)}</button>`).join("") || '<span class="quiet">여기에 문장이 만들어져요</span>'}</div>
          <div class="bank">${pool.map((x, k) => `<button class="word" data-take="${k}">${esc(x.w)}</button>`).join("")}</div></section>`;
        $app.querySelectorAll("[data-take]").forEach((b) => (b.onclick = () => {
          built.push(pool.splice(+b.dataset.take, 1)[0]);
          if (!pool.length) {
            draw();
            const given = built.map((x) => x.w).join(" ");
            $app.querySelector(".answer").classList.add(given === target ? "ok" : "bad");
            finish(given === target, given);
            return;
          }
          draw();
        }));
        $app.querySelectorAll("[data-back]").forEach((b) => (b.onclick = () => { pool.push(built.splice(+b.dataset.back, 1)[0]); draw(); }));
      };
      draw();
    }
  };
  next();
}

function showResult(ids, qs, results) {
  const right = results.filter((r) => r.ok).length;
  const perDan = {};
  for (const r of results) {
    const p = (perDan[r.q.dan] ||= { right: 0, wrong: 0 });
    r.ok ? p.right++ : p.wrong++;
  }
  store.recordQuiz(perDan);
  const wrongDans = Object.entries(perDan).filter(([, p]) => p.wrong).map(([id]) => id);
  const pct = Math.round((right / results.length) * 100);
  $app.innerHTML = `${header("시험 결과")}
    <section class="page">
      <div class="card center score"><div class="big">${right} / ${results.length}</div>
        <p>${pct >= 90 ? "완벽해요! 🎉" : pct >= 70 ? "잘했어요! 틀린 단만 다시 해 봐요" : "틀린 단을 다시 외워 볼까요?"}</p></div>
      <h3 class="sec">단별 결과</h3>
      <table class="res"><tr><th>단</th><th>맞음</th><th>틀림</th></tr>
        ${Object.entries(perDan).map(([id, p]) => `<tr class="${p.wrong ? "bad" : ""}"><td><a href="#/dan/${id}">${danLabel(getDan(id))}</a></td><td>${p.right}</td><td>${p.wrong}</td></tr>`).join("")}
      </table>
      ${results.some((r) => !r.ok) ? `<h3 class="sec">틀린 문장</h3>
        <ul class="wronglist">${results.filter((r) => !r.ok).map((r) => `<li><div>${hl(r.q.sentence)}</div><div class="quiet">내 답: ${esc(r.given)}</div></li>`).join("")}</ul>` : ""}
      <div class="actions">
        ${wrongDans.length ? `<a class="btn primary" href="#/pick?ids=${wrongDans.join(",")}">틀린 단 다시 연습</a>` : ""}
        <a class="btn" href="#/quiz?ids=${ids.join(",")}&n=${qs.length}&r=${Date.now()}">다시 시험</a>
        <a class="btn ghost" href="#/">홈으로</a>
      </div>
    </section>`;
}

// ───────────────────────── 라우터 ─────────────────────────
function route() {
  stop();
  runLeave();
  const [path, query = ""] = location.hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);
  const parts = path.split("/").filter(Boolean);
  window.scrollTo(0, 0);
  if (parts[0] === "about") return About();
  if (parts[0] === "table") return Table(params);
  if (parts[0] === "pick") return Pick(params);
  if (parts[0] === "dan") return Dan(parts[1], params);
  if (parts[0] === "quiz") return Quiz(params);
  if (parts[0] === "games") return Games(params);
  if (parts[0] === "garden") return Garden(params);
  if (parts[0] === "game") return ({ mole: Mole, roulette: Roulette, pairs: Pairs, blocks: Blocks, bingo: Bingo, duel: Duel }[parts[1]] || Games)(params);
  return Home();
}

window.addEventListener("hashchange", route);
mountSkinSwitch();
route();
