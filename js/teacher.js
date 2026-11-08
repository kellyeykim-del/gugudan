// 선생님 화면(#/teacher) · 학생 로그인(#/login) · 홈의 계정 줄
// 학생 정보는 별명·아이디만 받는다(실명 X). 기록은 학생 기기의 gugudan.v1 · gugudan.journey를 그대로 받아 와서 보여 준다.
import { MAIN_DANS, BONUS_DANS, SENT_DANS } from "./data.js";
import { $app, esc, header, toast, danLabel } from "./ui.js";
import { pose, VIVID } from "./village.js";
import { REGIONS } from "./journey.js";
import { sparklesOf, treeCount, treeView } from "./tree.js";
import { session, isStudent, isTeacher, teacher, teacherLogin, teacherSignup, teacherRecover, studentLogin, logout, errText } from "./cloud.js";

const STEPS = ["see", "hide", "order"];
const starsOf = (v1, id) => STEPS.filter((s) => v1?.progress?.[id]?.[s]).length;
const passedOf = (v1) => MAIN_DANS.filter((d) => starsOf(v1, d.id) === 3).length;
// 반짝이(나만의 트리 화폐)는 학생 화면과 같은 계산: 본편·보너스·문장 단의 별 전부 + 도전
const sparkles = (v1, j) => sparklesOf([...MAIN_DANS, ...BONUS_DANS, ...SENT_DANS].reduce((a, d) => a + starsOf(v1, d.id), 0), j,
  BONUS_DANS.filter((d) => starsOf(v1, d.id) === 3).length); // 앙코르 단 보너스(비비드만, 기본 화면은 0)
const spent = (j) => j?.tree?.spent || 0;
const starTotal = (v1) => MAIN_DANS.reduce((a, d) => a + starsOf(v1, d.id), 0);
const CH_REGIONS = REGIONS.filter((r) => r.challenge);
const challengesOf = (j) => CH_REGIONS.filter((r) => j?.challenges?.[r.id]).length;
const when = (ts) => {
  if (!ts) return "아직 없음";
  const d = new Date(ts), days = Math.floor((Date.now() - d) / 864e5);
  const hm = d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  return days < 1 && new Date().getDate() === d.getDate() ? `오늘 ${hm}` : days < 2 ? `어제 ${hm}` : d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
};
const randPin = () => String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
const busy = (btn, on) => { if (btn) { btn.disabled = on; btn.classList.toggle("disabled", on); } };

// ── 홈 위쪽 계정 줄 ──
export function accountBar() {
  const s = session();
  if (s?.role === "student") {
    return `<div class="acct card"><span>🧒 <b>${esc(s.nickname)}</b>${s.expired ? " · 로그인이 끝났어요" : ` · ${esc(s.teacher_name)} 선생님 반 · 기록이 선생님께 저장돼요`}</span>
      ${s.expired ? '<a class="qbtn" href="#/login">다시 로그인</a>' : '<button class="qbtn" id="acct-out">로그아웃</button>'}</div>`;
  }
  if (s?.role === "teacher") {
    return `<div class="acct card"><span>👩‍🏫 <b>${esc(s.name)}</b> 선생님 · 반 코드 <b class="code">${esc(s.class_code)}</b></span>
      <a class="qbtn" href="#/teacher">우리 반 학습 현황 →</a></div>`;
  }
  return `<div class="acct acct-guest"><a class="qbtn" href="#/login">🧒 학생 로그인</a><a class="qbtn" href="#/teacher">👩‍🏫 선생님</a></div>`;
}
export function bindAccountBar() {
  const b = $app.querySelector("#acct-out");
  if (b) b.onclick = () => { if (confirm("로그아웃할까요? 지금까지 한 공부는 선생님께 저장돼 있어요.")) logout(); };
}

// ── 학생 로그인 ──
export function StudentLogin() {
  const s = session();
  if (isStudent() && !s.expired) {
    $app.innerHTML = `${header("🧒 학생 로그인")}<section class="page acct-page"><div class="card center">
      <div class="friends small">${pose("nuri", "welcome")}${pose("minty", "welcome")}${pose("bobo", "welcome", { cls: "flip" })}</div>
      <p><b>${esc(s.nickname)}</b>(으)로 로그인해 있어요.</p>
      <p class="hint">다른 친구로 들어가려면 먼저 로그아웃해요.</p>
      <div class="toolbar"><a class="btn primary" href="#/">공부하러 가기</a><button class="btn ghost" id="out">로그아웃</button></div></div></section>`;
    $app.querySelector("#out").onclick = () => logout();
    return;
  }
  $app.innerHTML = `${header("🧒 학생 로그인")}<section class="page acct-page"><form class="card acct-form" id="f" autocomplete="off">
      <div class="friends small">${pose("nuri", "welcome")}${pose("minty", "welcome")}${pose("bobo", "welcome", { cls: "flip" })}</div>
      <p class="center">선생님이 알려 준 <b>반 코드</b>, <b>아이디</b>, <b>비밀번호</b>를 적어요.</p>
      <label>반 코드<input id="cls" maxlength="6" autocapitalize="characters" spellcheck="false" value="${esc(s?.class_code || "")}" placeholder="예: K7Q2MX" required></label>
      <label>아이디<input id="lid" maxlength="20" autocapitalize="none" spellcheck="false" value="${esc(s?.login_id || "")}" placeholder="예: mint3" required></label>
      <label>비밀번호 (숫자 6자리)<input id="pin" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="••••••" required></label>
      <p class="err" id="err" role="alert"></p>
      <button class="btn primary block" id="go">들어가기</button>
      <p class="hint center">로그인하면 별·시험·도전 기록이 선생님께 저장돼요. 이 기기의 원래 기록은 로그아웃하면 그대로 돌아와요.</p>
    </form></section>`;
  const $f = $app.querySelector("#f");
  $f.querySelector("#cls").oninput = (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); };
  $f.onsubmit = async (e) => {
    e.preventDefault();
    const go = $f.querySelector("#go");
    busy(go, true);
    try {
      await studentLogin($f.querySelector("#cls").value, $f.querySelector("#lid").value, $f.querySelector("#pin").value);
    } catch (er) {
      $f.querySelector("#err").textContent = errText(er);
      busy(go, false);
    }
  };
}

// ── 선생님 ──
export function Teacher(parts) {
  if (!isTeacher()) return parts[1] === "recover" && VIVID ? TeacherRecover() : TeacherLogin(parts[1] === "signup");
  if (parts[1] === "s" && parts[2]) return StudentDetail(parts[2]);
  if (parts[1] === "trees" && VIVID) return ClassTrees();
  return Dashboard();
}

function TeacherLogin(signup) {
  $app.innerHTML = `${header("👩‍🏫 선생님")}<section class="page acct-page"><form class="card acct-form" id="f">
      <div class="seg"><a href="#/teacher" class="${signup ? "" : "on"}">로그인</a><a href="#/teacher/signup" class="${signup ? "on" : ""}">처음이에요 (가입)</a></div>
      <p class="hint">${signup ? "가입하면 우리 반 코드가 생겨요. 학생 아이디를 만들어 주고, 학생들의 별·시험·도전 기록을 볼 수 있어요." : "가입한 이메일과 비밀번호로 들어와요."}</p>
      ${signup ? '<label>선생님 이름 (학생 화면에 보여요)<input id="name" maxlength="20" placeholder="예: 김민지" required></label>' : ""}
      <label>이메일<input id="email" type="email" autocomplete="username" maxlength="120" required></label>
      <label>비밀번호${signup ? " (8자 이상)" : ""}<input id="pw" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="${signup ? 8 : 1}" maxlength="72" required></label>
      <p class="err" id="err" role="alert"></p>
      <button class="btn primary block" id="go">${signup ? "가입하고 시작하기" : "로그인"}</button>
      ${VIVID ? `${signup ? "" : '<p class="rc-forgot"><a href="#/teacher/recover">🔑 이메일·비밀번호를 잊었어요</a></p>'}
      <p class="hint">시범 운영 중이에요. 확인 메일은 보내지 않아요. ${signup ? "가입하면 <b>복구 코드</b>를 한 번 보여 드려요. 이메일·비밀번호를 잊었을 때 필요하니 꼭 적어 두세요." : "잊었을 때는 가입할 때 받은 복구 코드로 새 비밀번호를 정해요."}</p>`
        : '<p class="hint">시범 운영 중이에요. 확인 메일은 보내지 않아요. 비밀번호를 잊으면 앱 관리자에게 알려 주세요.</p>'}
    </form></section>`;
  const $f = $app.querySelector("#f");
  $f.onsubmit = async (e) => {
    e.preventDefault();
    const go = $f.querySelector("#go");
    busy(go, true);
    try {
      const email = $f.querySelector("#email").value, pw = $f.querySelector("#pw").value;
      if (signup) await teacherSignup(email, pw, $f.querySelector("#name").value);
      else await teacherLogin(email, pw);
      // 비비드: 가입하자마자 복구 코드를 만들어 한 번 보여 준다 (실패하면 대시보드의 복구 코드 칸에서 다시 만들 수 있다)
      // 주소를 먼저 바꾸면 라우터가 대시보드를 다시 그려 코드 화면을 덮으므로, 주소는 '적어 두었어요'에서 바꾼다
      if (signup && VIVID) {
        const code = await teacher.newRecovery().catch(() => null);
        if (code) return showRecovery(code, { title: "🎉 가입했어요! 복구 코드를 적어 두세요" });
      }
      location.hash = "#/teacher";
      Dashboard();
    } catch (er) {
      $f.querySelector("#err").textContent = errText(er);
      busy(go, false);
    }
  };
}

// ── 복구 코드 (비비드, 2026-11-08): 메일 없이 이메일·비밀번호를 되찾는 코드. 서버엔 해시만 있어 이 화면에서만 볼 수 있다 ──
function showRecovery(code, { title, email = "" } = {}) {
  $app.innerHTML = `${header("🔑 복구 코드")}<section class="page acct-page"><div class="card acct-form rc-show">
      <h2 class="h3">${esc(title)}</h2>
      ${email ? `<p>가입 메일: <b>${esc(email)}</b></p>` : ""}
      <p class="rc-code" aria-label="복구 코드">${esc(code)}</p>
      <div class="toolbar"><button class="btn" id="rc-copy">📋 복사하기</button></div>
      <ul class="rc-tips">
        <li>이메일이나 비밀번호를 잊었을 때 <b>반 코드 + 이 복구 코드</b>로 새 비밀번호를 정할 수 있어요.</li>
        <li>지금 이 화면에서만 볼 수 있어요. 수첩·사진·메모 앱 등 <b>학생이 볼 수 없는 곳</b>에 적어 두세요.</li>
        <li>한 번 쓰면 새 복구 코드로 바뀌어요.</li>
      </ul>
      <button class="btn primary block" id="rc-done">적어 두었어요 →</button>
    </div></section>`;
  $app.querySelector("#rc-copy").onclick = async () => {
    try { await navigator.clipboard.writeText(code); toast("복구 코드를 복사했어요"); } catch { prompt("아래 복구 코드를 복사하세요", code); }
  };
  $app.querySelector("#rc-done").onclick = () => { if (location.hash === "#/teacher") Dashboard(); else location.hash = "#/teacher"; };
}

function TeacherRecover() {
  $app.innerHTML = `${header("🔑 이메일·비밀번호 찾기", "#/teacher")}<section class="page acct-page"><form class="card acct-form" id="f" autocomplete="off">
      <p class="hint">가입할 때 받은 <b>복구 코드</b>와 우리 반 <b>반 코드</b>를 적으면, 가입 메일을 알려 드리고 새 비밀번호를 정할 수 있어요.</p>
      <label>반 코드 <small class="quiet">(학생 로그인에 쓰는 코드)</small><input id="cls" maxlength="12" autocapitalize="characters" spellcheck="false" required></label>
      <label>복구 코드 <small class="quiet">(예: K7MX-3PQA-9RTD)</small><input id="code" maxlength="20" autocapitalize="characters" spellcheck="false" required></label>
      <label>새 비밀번호 (8자 이상)<input id="pw" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>
      <label>새 비밀번호 한 번 더<input id="pw2" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>
      <p class="err" id="err" role="alert"></p>
      <button class="btn primary block" id="go">새 비밀번호로 바꾸기</button>
      <p class="hint">반 코드를 잊었다면 학생 안내문을 보거나 학생에게 물어보세요. 복구 코드도 없다면 앱 관리자에게 알려 주세요.</p>
    </form></section>`;
  const $f = $app.querySelector("#f");
  $f.onsubmit = async (e) => {
    e.preventDefault();
    const go = $f.querySelector("#go"), pw = $f.querySelector("#pw").value;
    if (pw !== $f.querySelector("#pw2").value) { $f.querySelector("#err").textContent = "새 비밀번호 두 칸이 서로 달라요."; return; }
    busy(go, true);
    try {
      const r = await teacherRecover($f.querySelector("#cls").value, $f.querySelector("#code").value, pw);
      showRecovery(r.recovery, { title: "✅ 새 비밀번호로 바꿨어요. 새 복구 코드를 적어 두세요", email: r.email });
    } catch (er) {
      $f.querySelector("#err").textContent = errText(er);
      busy(go, false);
    }
  };
}

// 대시보드의 복구 코드 칸: 아직 없으면 눈에 띄게, 있으면 작게 (새로 만들면 예전 코드는 못 씀)
async function recoveryCard() {
  const $c = $app.querySelector("#rc");
  if (!$c) return;
  let has;
  try { has = await teacher.hasRecovery(); } catch { return; }
  if (!$app.contains($c)) return;
  $c.hidden = false;
  $c.classList.toggle("rc-need", !has);
  $c.innerHTML = has
    ? `<span>🔑 복구 코드를 만들어 두었어요. 잃어버렸다면 새로 만들 수 있어요.</span><button class="btn ghost" id="rc-new">새로 만들기</button>`
    : `<span>🔑 <b>복구 코드를 아직 안 만들었어요.</b> 이메일·비밀번호를 잊었을 때 필요해요.</span><button class="btn primary" id="rc-new">복구 코드 만들기</button>`;
  $c.querySelector("#rc-new").onclick = async () => {
    if (has && !confirm("새 복구 코드를 만들까요? 예전 복구 코드는 더 이상 쓸 수 없어요.")) return;
    try { showRecovery(await teacher.newRecovery(), { title: "새 복구 코드를 적어 두세요" }); } catch (er) { gone(er); toast(errText(er)); }
  };
}

function guideText(s) {
  return `신나는 영어구구단 로그인 안내\n1) 선생님이 보내 준 앱 링크를 열어요.\n2) 첫 화면의 '🧒 학생 로그인'을 눌러요.\n3) 반 코드: ${s.class_code}\n4) 아이디와 비밀번호(숫자 6자리)는 선생님이 따로 알려 줘요.`;
}

async function Dashboard() {
  const s = session();
  $app.innerHTML = `${header("👩‍🏫 우리 반 학습 현황")}<section class="page teach">
    <div class="card teach-top">
      <div><b>${esc(s.name)}</b> 선생님 <span class="quiet small">${esc(s.email)}</span></div>
      <div class="classcode">반 코드 <b>${esc(s.class_code)}</b></div>
      <div class="toolbar">${VIVID ? '<a class="btn" href="#/teacher/trees">🎄 우리 반 트리 모아보기</a>' : ""}<button class="btn" id="copy">📋 학생 안내문 복사</button><button class="btn ghost" id="out">로그아웃</button></div>
      <p class="hint">앱 링크는 받으신 공유 링크를 그대로 학생에게 보내 주세요. 학생은 첫 화면의 ‘학생 로그인’에서 반 코드·아이디·비밀번호를 적어요.</p>
    </div>
    ${VIVID ? '<div class="card rc-card" id="rc" hidden></div>' : ""}
    <details class="card add-st" id="addbox"><summary><b>＋ 학생 아이디 만들기</b></summary>
      <form id="add" autocomplete="off">
        <label>별명 또는 번호 <small class="quiet">(실명 대신)</small><input id="nick" maxlength="12" placeholder="예: 3번, 민트" required></label>
        <label>아이디 <small class="quiet">(영어 소문자·숫자)</small><input id="lid" maxlength="20" autocapitalize="none" spellcheck="false" placeholder="예: s03" required></label>
        <label>비밀번호 <small class="quiet">(숫자 6자리)</small><span class="pinrow"><input id="pin" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" value="${randPin()}" required><button type="button" class="btn ghost" id="rnd">🎲 새로</button></span></label>
        <p class="err" id="err" role="alert"></p>
        <button class="btn primary" id="go">만들기</button>
      </form>
      <div id="made"></div>
      <p class="hint">비밀번호는 만든 뒤 다시 볼 수 없어요. 학생에게 알려 줄 때 적어 두세요. 잊으면 학생 화면에서 새로 정해 줄 수 있어요.</p>
    </details>
    <div id="list"><p class="quiet center">학생 목록을 불러오고 있어요…</p></div>
  </section>`;
  $app.querySelector("#out").onclick = () => logout();
  $app.querySelector("#copy").onclick = async () => {
    try { await navigator.clipboard.writeText(guideText(s)); toast("안내문을 복사했어요"); } catch { prompt("아래 안내문을 복사하세요", guideText(s)); }
  };
  const $add = $app.querySelector("#add");
  $add.querySelector("#rnd").onclick = () => { $add.querySelector("#pin").value = randPin(); };
  $add.onsubmit = async (e) => {
    e.preventDefault();
    const go = $add.querySelector("#go"), pin = $add.querySelector("#pin").value, nick = $add.querySelector("#nick").value;
    busy(go, true);
    try {
      const r = await teacher.add($add.querySelector("#lid").value, nick, pin);
      $app.querySelector("#made").insertAdjacentHTML("afterbegin",
        `<div class="made">✅ <b>${esc(r.nickname)}</b> · 아이디 <code>${esc(r.login_id)}</code> · 비밀번호 <code>${esc(pin)}</code></div>`);
      $add.reset();
      $add.querySelector("#pin").value = randPin();
      $add.querySelector("#err").textContent = "";
      loadList();
    } catch (er) {
      $add.querySelector("#err").textContent = errText(er);
    }
    busy(go, false);
  };
  loadList();
  if (VIVID) recoveryCard();
}

async function loadList() {
  const $l = $app.querySelector("#list");
  if (!$l) return;
  let rows;
  try { rows = await teacher.students(); } catch (er) { return gone(er, $l); }
  if (!$app.contains($l)) return;
  if (!rows.length) {
    $app.querySelector("#addbox").open = true;
    $l.innerHTML = `<div class="card center quiet">아직 학생이 없어요. 위에서 학생 아이디를 만들어 주세요.</div>`;
    return;
  }
  const N = MAIN_DANS.length;
  $l.innerHTML = `<p class="quiet small">학생 ${rows.length}명 · 최근 공부한 순서</p><ul class="st-list">${rows
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .map((r) => {
      const p = passedOf(r.v1), wrong = Object.keys(r.v1?.wrong || {}).length;
      return `<li><a class="card st-row" href="#/teacher/s/${r.id}">
        <span class="st-name"><b>${esc(r.nickname)}</b><small>${esc(r.login_id)}${r.locked ? " · 🔒 잠김" : ""}</small></span>
        <span class="st-meter"><span class="meter"><i style="width:${(p / N) * 100}%"></i></span><small>통과 ${p} / ${N}단 · ★ ${starTotal(r.v1)}</small></span>
        <span class="st-chips"><small>📌 내 묶음 ${wrong}</small><small>🏁 구간 도전 ${challengesOf(r.journey)} / ${CH_REGIONS.length}</small>${r.journey?.core?.cleared ? "<small>📻 마지막 도전 ✓</small>" : ""}</span>
        <span class="st-when quiet small">${when(r.updated_at)}</span></a></li>`;
    }).join("")}</ul>`;
}

function gone(er, $el) {
  if (er.message === "NOT_LOGGED_IN") { toast(errText(er)); logout(); return; }
  if ($el) $el.innerHTML = `<div class="card center"><p class="err">${esc(errText(er))}</p><button class="btn" onclick="location.reload()">다시 불러오기</button></div>`;
}

const GAME_NAMES = { mole20: "단어 두더지", roulette: "주어 룰렛", pairs: "짝꿍 카드", blocks: "문장 블록 쌓기", bingo: "듣고 빙고" };
const gameLine = (k, v) => {
  const [g, s] = k.split(".");
  const unit = { mole20: `${v}점`, roulette: `${v} / 10`, pairs: `${v}번 만에`, blocks: `${v}층`, bingo: `실수 ${v}번` }[g] ?? v;
  return `<li>${esc(GAME_NAMES[g] || g)}${s ? " (문장형)" : ""} <b>${esc(unit)}</b></li>`;
};

async function StudentDetail(id) {
  $app.innerHTML = `${header("학생 학습 기록", "#/teacher")}<section class="page teach"><p class="quiet center">불러오고 있어요…</p></section>`;
  let rows;
  try { rows = await teacher.students(); } catch (er) { return gone(er, $app.querySelector(".teach")); }
  const r = rows.find((x) => x.id === id);
  if (!r) return (location.hash = "#/teacher");
  const v1 = r.v1 || {}, j = r.journey || {};
  const cell = (d) => { const n = starsOf(v1, d.id); return `<span class="tcell s${n}" title="${esc(danLabel(d))} 별 ${n}개"><b>${esc(danLabel(d).replace("단", ""))}</b><i>${"★".repeat(n)}${"☆".repeat(3 - n)}</i></span>`; };
  const wrong = Object.entries(v1.wrong || {});
  const best = Object.entries(v1.best || {});
  const anyOf = (list) => list.some((d) => starsOf(v1, d.id));
  $app.querySelector(".teach").innerHTML = `
    <div class="card teach-top">
      <div><b class="big">${esc(r.nickname)}</b> <span class="quiet">${esc(r.login_id)}</span>${r.locked ? ' <span class="err">🔒 비밀번호를 여러 번 틀려 잠김</span>' : ""}</div>
      <div class="quiet small">마지막 공부: ${when(r.updated_at)} · 이름(앱 안): ${esc(v1.settings?.learner || "-")}</div>
      <div class="sumrow"><span><b>${passedOf(v1)}</b> / ${MAIN_DANS.length}단 통과</span><span>★ <b>${starTotal(v1)}</b> / ${MAIN_DANS.length * 3}</span>
        <span>구간 도전 <b>${challengesOf(j)}</b> / ${CH_REGIONS.length}</span><span>마지막 도전 <b>${j.core?.cleared ? "✓" : "-"}</b></span>
        <span>🎄 반짝이 <b>✨ ${Math.max(0, sparkles(v1, j) - spent(j))}</b> 남음 · 트리 장식 <b>${treeCount(j)}</b>개</span></div>
    </div>
    <div class="card"><h2 class="h3">단별 별 (보기 · 가리기 · 순서)</h2><div class="tgrid">${MAIN_DANS.map(cell).join("")}</div>
      ${anyOf(SENT_DANS) ? `<h3 class="h4">문장형</h3><div class="tgrid">${SENT_DANS.map(cell).join("")}</div>` : ""}
      ${anyOf(BONUS_DANS) ? `<h3 class="h4">보너스</h3><div class="tgrid">${BONUS_DANS.map(cell).join("")}</div>` : ""}</div>
    <div class="card"><h2 class="h3">📌 내 묶음 (시험에서 틀린 단)</h2>
      ${wrong.length ? `<p>${wrong.map(([k, n]) => `<span class="chip">${esc(/^\d+$/.test(k) ? `${k}단` : k)} · ${n}개</span>`).join(" ")}</p>` : '<p class="quiet">없어요 (시험을 안 봤거나 다 맞혔어요)</p>'}</div>
    <div class="card"><h2 class="h3">🏁 방송국 도전</h2><ul class="plain">
      ${CH_REGIONS.map((g) => `<li>${esc(g.place)} · ${esc(g.challenge.name)}: <b>${j.challenges?.[g.id] ? `✓ ${esc(j.challenges[g.id])}` : "-"}</b></li>`).join("")}
      <li>마지막 도전 (잠꾸러기 라디오 깨우기): <b>${j.core?.cleared ? `✓ ${esc(j.core.cleared)}` : "-"}</b></li>
      ${j.broadcast?.length ? `<li>내가 고른 방송: ${j.broadcast.map(esc).join(" / ")}</li>` : ""}</ul></div>
    <div class="card"><h2 class="h3">🎮 게임 최고 기록</h2>${best.length ? `<ul class="plain">${best.map(([k, v]) => gameLine(k, v)).join("")}</ul>` : '<p class="quiet">아직 없어요</p>'}</div>
    <details class="card"><summary><b>⚙️ 학생 관리</b></summary>
      <form id="edit" class="acct-form" autocomplete="off">
        <label>별명 바꾸기<input id="nick" maxlength="12" value="${esc(r.nickname)}" required></label>
        <label><input type="checkbox" id="newpin"> 비밀번호 새로 정하기 (잠김도 풀려요)</label>
        <p class="err" id="err" role="alert"></p>
        <button class="btn primary" id="save">저장</button> <span id="msg"></span>
      </form>
      <hr><button class="btn ghost danger" id="del">학생 삭제 (기록도 함께 지워져요)</button>
    </details>`;
  const $e = $app.querySelector("#edit");
  $e.onsubmit = async (e) => {
    e.preventDefault();
    const pin = $e.querySelector("#newpin").checked ? randPin() : null;
    try {
      await teacher.update(r.id, $e.querySelector("#nick").value, pin);
      $e.querySelector("#err").textContent = "";
      $e.querySelector("#msg").innerHTML = pin ? `✅ 새 비밀번호 <code>${pin}</code> (학생에게 알려 주세요)` : "✅ 저장했어요";
      $e.querySelector("#newpin").checked = false;
    } catch (er) { $e.querySelector("#err").textContent = errText(er); }
  };
  $app.querySelector("#del").onclick = async () => {
    if (!confirm(`${r.nickname} 학생과 학습 기록을 지울까요? 되돌릴 수 없어요.`)) return;
    try { await teacher.remove(r.id); toast("삭제했어요"); location.hash = "#/teacher"; } catch (er) { toast(errText(er)); }
  };
}

// ── 우리 반 트리 모아보기 (비비드, 2026-11-08) ──
// 학생들이 꾸민 나만의 트리를 한 화면에 모아 본다. 교실 큰 화면에 띄워 친구 트리를 함께 구경하는 용도.
// 보기 전용(기록은 바꾸지 않음). 순서는 별명 순(장식 수로 줄 세우지 않음). 아직 안 꾸민 학생은 이름 없이 인원만 알린다.
async function ClassTrees() {
  $app.innerHTML = `${header("🎄 우리 반 트리", "#/teacher")}<section class="page teach tg-page"><p class="quiet center">불러오고 있어요…</p></section>`;
  let rows;
  try { rows = await teacher.students(); } catch (er) { return gone(er, $app.querySelector(".tg-page")); }
  const $p = $app.querySelector(".tg-page");
  if (!$p) return;
  const all = rows.slice().sort((a, b) => a.nickname.localeCompare(b.nickname, "ko", { numeric: true }));
  const done = all.filter((r) => treeCount(r.journey) > 0), yet = all.length - done.length;
  if (!done.length) {
    $p.innerHTML = `<div class="card center"><p>아직 트리를 꾸민 학생이 없어요.</p>
      <p class="hint">학생들이 공부해서 모은 반짝이 ✨로 ‘나만의 트리’를 꾸미면 여기에 모여요.</p></div>`;
    return;
  }
  $p.innerHTML = `<div class="card tg-head"><p><b>${done.length}명</b>의 트리가 모였어요${yet ? ` <span class="quiet">· 아직 꾸미기 전 ${yet}명</span>` : ""}</p>
      <p class="hint">트리를 누르면 크게 보여요. 교실 화면에 띄워 친구들과 함께 구경해요. (← → 키로 넘기기)</p></div>
    <div class="tg-grid">${done.map((r, i) => `<button type="button" class="tg-card" data-i="${i}" aria-label="${esc(r.nickname)}의 트리 크게 보기">${treeView(r.journey, r.nickname)}</button>`).join("")}</div>`;
  let cur = -1;
  const close = () => { $app.querySelector(".tg-big")?.remove(); cur = -1; };
  const open = (i) => {
    close(); // 열린 큰 화면을 닫고(cur 초기화) 새 트리로
    cur = (i + done.length) % done.length;
    const r = done[cur];
    $p.insertAdjacentHTML("beforeend", `<div class="tg-big" role="dialog" aria-label="${esc(r.nickname)}의 트리">
      <button type="button" class="tg-nav" data-d="-1" aria-label="앞 친구 트리" ${done.length < 2 ? "hidden" : ""}>←</button>
      <div class="tg-stage">${treeView(r.journey, r.nickname)}<p class="tg-count">${cur + 1} / ${done.length}</p></div>
      <button type="button" class="tg-nav" data-d="1" aria-label="다음 친구 트리" ${done.length < 2 ? "hidden" : ""}>→</button>
      <button type="button" class="tg-close" aria-label="닫기">✕</button></div>`);
    const $b = $p.querySelector(".tg-big");
    $b.querySelector(".tg-close").onclick = close;
    $b.querySelectorAll(".tg-nav").forEach((n) => (n.onclick = () => open(cur + +n.dataset.d)));
    $b.onclick = (e) => { if (e.target === $b) close(); };
  };
  $p.querySelectorAll(".tg-card").forEach((c) => (c.onclick = () => open(+c.dataset.i)));
  const onKey = (e) => {
    if (!$app.contains($p)) return removeEventListener("keydown", onKey);
    if (cur < 0) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") open(cur - 1);
    else if (e.key === "ArrowRight") open(cur + 1);
  };
  addEventListener("keydown", onKey);
}
