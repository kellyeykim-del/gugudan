// 선생님 · 학생 계정 (Supabase 서버 함수 gg_*). 로그인하지 않으면 지금처럼 이 기기에만 저장된다.
// 학습 기록 구조(gugudan.v1 · gugudan.journey)는 그대로 두고, 학생으로 로그인했을 때만 통째로 서버에 올려 둔다.
// 아래 키는 브라우저에 공개되는 publishable 키다(비밀 키 아님). 표는 RLS로 막혀 있고 gg_ 함수로만 읽고 쓴다.
const URL = "https://urzitmmblbhvnwdooluf.supabase.co/rest/v1/rpc/";
const KEY = "sb_publishable_oDjzLEMyHHw3d7jMMbQFxQ_4pM0yN1L";
const SESSION = "gugudan.session"; // { token, role, ...보여 줄 정보, synced }
const GUEST = "gugudan.guest"; // 학생 로그인 전 이 기기의 기록 (로그아웃하면 되돌림)
const V1 = "gugudan.v1";
const JK = "gugudan.journey";

const MSG = {
  BAD_LOGIN: "아이디나 비밀번호가 맞지 않아요.",
  LOCKED: "여러 번 틀려서 잠시 잠겼어요. 조금 뒤에 다시 해 보세요.",
  EMAIL_FORMAT: "이메일 주소를 확인해 주세요.",
  PW_FORMAT: "비밀번호는 8자 이상으로 정해 주세요.",
  NAME_FORMAT: "이름은 1~20자로 적어 주세요.",
  EMAIL_TAKEN: "이미 가입된 이메일이에요. 로그인해 주세요.",
  ID_FORMAT: "아이디는 영어 소문자·숫자 2~20자로 정해 주세요.",
  ID_TAKEN: "이미 있는 아이디예요.",
  NICK_FORMAT: "별명은 1~12자로 적어 주세요.",
  PIN_FORMAT: "비밀번호는 숫자 6자리예요.",
  TOO_MANY: "학생은 100명까지 만들 수 있어요.",
  NOT_LOGGED_IN: "로그인이 끝났어요. 다시 로그인해 주세요.",
  NOT_FOUND: "학생을 찾지 못했어요.",
  BAD_RECOVERY: "반 코드나 복구 코드가 맞지 않아요.",
  NETWORK: "인터넷 연결을 확인해 주세요.",
};
export const errText = (e) => MSG[e?.message] || MSG.NETWORK;

export async function rpc(fn, body, { keepalive = false } = {}) {
  let res;
  try {
    res = await fetch(URL + fn, {
      method: "POST", keepalive,
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("NETWORK");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || "NETWORK");
  if (data && data.error) throw new Error(data.error);
  if (data?.token) data.token = String(data.token);
  return data;
}

// ── 로그인 상태 ──
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 막힘 */ } };
export const session = () => read(SESSION);
export const isStudent = () => session()?.role === "student";
export const isTeacher = () => session()?.role === "teacher";
const setSession = (s) => write(SESSION, s);
const reloadHome = () => { location.hash = "#/"; location.reload(); };

// ── 선생님 ──
export async function teacherSignup(email, password, name) {
  await leaveStudent();
  const r = await rpc("gg_teacher_signup", { p_email: email, p_password: password, p_name: name });
  setSession({ role: "teacher", token: r.token, name: r.name, class_code: r.class_code, email: r.email });
}
export async function teacherLogin(email, password) {
  await leaveStudent();
  const r = await rpc("gg_teacher_login", { p_email: email, p_password: password });
  setSession({ role: "teacher", token: r.token, name: r.name, class_code: r.class_code, email: r.email });
}
// 잊었을 때: 반 코드 + 복구 코드로 새 비밀번호를 정하고 바로 로그인. 돌려받은 r.email · r.recovery(새 복구 코드)를 화면에 보여 준다
export async function teacherRecover(classCode, code, password) {
  await leaveStudent();
  const r = await rpc("gg_teacher_recover", { p_class: classCode, p_code: code, p_password: password });
  setSession({ role: "teacher", token: r.token, name: r.name, class_code: r.class_code, email: r.email });
  return r;
}
const tk = () => session()?.token || "";
export const teacher = {
  students: () => rpc("gg_teacher_students", { p_token: tk() }),
  newRecovery: () => rpc("gg_teacher_new_recovery", { p_token: tk() }).then((r) => r.code),
  hasRecovery: () => rpc("gg_teacher_recovery_status", { p_token: tk() }),
  add: (id, nick, pin) => rpc("gg_teacher_add_student", { p_token: tk(), p_login_id: id, p_nickname: nick, p_pin: pin }),
  update: (sid, nick, pin = null) => rpc("gg_teacher_update_student", { p_token: tk(), p_student: sid, p_nickname: nick, p_pin: pin }),
  remove: (sid) => rpc("gg_teacher_delete_student", { p_token: tk(), p_student: sid }),
};

// ── 학생: 로그인하면 서버 기록으로 바꾸고, 로그아웃하면 이 기기의 원래 기록으로 되돌린다 (같은 기기를 여럿이 써도 섞이지 않게) ──
function putLocal(v1, journey) {
  try {
    v1 ? localStorage.setItem(V1, JSON.stringify(v1)) : localStorage.removeItem(V1);
    journey ? localStorage.setItem(JK, JSON.stringify(journey)) : localStorage.removeItem(JK);
  } catch { /* 저장 막힘 */ }
}
export async function studentLogin(classCode, loginId, pin) {
  const r = await rpc("gg_student_login", { p_class: classCode, p_login_id: loginId, p_pin: pin });
  if (isTeacher()) rpc("gg_logout", { p_token: tk() }).catch(() => {});
  else if (isStudent()) { await flush().catch(() => {}); rpc("gg_logout", { p_token: tk() }).catch(() => {}); } // 끝난 학생 세션으로 다시 로그인
  if (!isStudent() && !read(GUEST)) write(GUEST, { v1: read(V1), journey: read(JK) });
  const p = r.progress;
  if (p && (p.v1 || p.journey)) putLocal(p.v1, p.journey);
  else putLocal({ settings: { speed: "normal", unlockAll: false, learner: r.nickname } }, null); // 처음: 친구 소개부터, 이름은 별명으로
  setSession({ role: "student", token: r.token, nickname: r.nickname, login_id: r.login_id, class_code: r.class_code,
    teacher_name: r.teacher_name, synced: p?.updated_at || "", dirty: false });
  reloadHome();
}
async function leaveStudent() {
  if (!isStudent()) return;
  await flush().catch(() => {});
  rpc("gg_logout", { p_token: tk() }).catch(() => {});
  const g = read(GUEST);
  putLocal(g?.v1, g?.journey);
  write(GUEST, null);
  setSession(null);
}
export async function logout() {
  if (isStudent()) await leaveStudent();
  else if (session()) { rpc("gg_logout", { p_token: tk() }).catch(() => {}); setSession(null); }
  reloadHome();
}

// ── 학생 기록 올리기: 저장할 때마다(1.5초 모아서), 화면을 떠날 때 ──
let timer = 0;
async function flush({ keepalive = false } = {}) {
  clearTimeout(timer);
  const s = session();
  if (s?.role !== "student" || !s.dirty) return;
  try {
    const ts = await rpc("gg_student_save", { p_token: s.token, p_v1: read(V1), p_journey: read(JK) }, { keepalive });
    const now = session();
    if (now?.token === s.token) setSession({ ...now, synced: ts, dirty: false });
  } catch (e) {
    if (e.message === "NOT_LOGGED_IN") expired();
  }
}
function expired() {
  const s = session();
  if (s) setSession({ ...s, expired: true });
  document.dispatchEvent(new CustomEvent("gugudan:session"));
}
window.addEventListener("gugudan:saved", () => {
  const s = session();
  if (s?.role !== "student") return;
  setSession({ ...s, dirty: true });
  clearTimeout(timer);
  timer = setTimeout(flush, 1500);
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush({ keepalive: true }); });

// 앱을 켤 때: 다른 기기에서 더 최근에 공부했으면 그 기록을 받아 온다. 이 기기에 안 올린 기록이 있으면 먼저 올린다.
export async function startSync() {
  const s = session();
  if (s?.role === "teacher") {
    rpc("gg_me", { p_token: s.token }).then((me) => { if (!me) { setSession(null); document.dispatchEvent(new CustomEvent("gugudan:session")); } }).catch(() => {});
    return;
  }
  if (s?.role !== "student" || s.expired) return;
  if (s.dirty) return flush();
  try {
    const p = await rpc("gg_student_load", { p_token: s.token });
    if (p?.updated_at && p.updated_at !== s.synced && session()?.dirty === false) {
      putLocal(p.v1, p.journey);
      setSession({ ...session(), synced: p.updated_at });
      location.reload();
    }
  } catch (e) {
    if (e.message === "NOT_LOGGED_IN") expired();
  }
}
