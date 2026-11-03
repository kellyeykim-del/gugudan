// 내 목소리 녹음 · 다시 듣기 (발음 채점 없음)
// 녹음은 이 기기의 IndexedDB(gugudan.rec)에만, 단마다 마지막 한 개. 어디로도 보내지 않는다.
// 학습 기록(gugudan.v1)·방송국 기록(gugudan.journey)과 따로 둔다.
import { stop as stopSpeech } from "./speech.js";
import { esc } from "./ui.js";

const DB = "gugudan.rec";
const STORE = "takes";
const MAX_MS = 60000; // 한 번에 최대 1분

export const canRecord = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

function open() {
  return new Promise((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
async function run(mode, fn) {
  const db = await open();
  return new Promise((ok, no) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); ok(req.result); };
    t.onerror = () => { db.close(); no(t.error); };
  });
}
const loadTake = (key) => run("readonly", (s) => s.get(key)).catch(() => null);
const saveTake = (key, blob) => run("readwrite", (s) => s.put({ blob, at: Date.now() }, key)).then(() => true, () => false);
const deleteTake = (key) => run("readwrite", (s) => s.delete(key)).catch(() => {});

// 지금 마이크·재생 중인 것 (화면을 떠나면 끈다)
let live = null;
let player = null;
export function stopRecorder() {
  live?.cancel();
  live = null;
  if (player) { player.pause(); URL.revokeObjectURL(player.src); player = null; }
}

async function record(onTick) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const rec = new MediaRecorder(stream);
  const parts = [];
  const t0 = Date.now();
  let cancelled = false;
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const done = new Promise((ok) => (rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    ok(cancelled ? null : new Blob(parts, { type: rec.mimeType || "audio/webm" }));
  }));
  const tick = setInterval(() => {
    const ms = Date.now() - t0;
    onTick(ms);
    if (ms >= MAX_MS) finish();
  }, 250);
  const finish = () => { clearInterval(tick); if (rec.state !== "inactive") rec.stop(); return done; };
  rec.start();
  return { finish, cancel: () => { cancelled = true; finish(); } };
}

// $box 안에 녹음기를 그린다. key가 있으면 이 기기에 저장해 다음에 와도 다시 들을 수 있다.
// onSaved: 첫 녹음을 마쳤을 때 (축하 그림 등)
export function mountRecorder($box, key = null, { onSaved } = {}) {
  let take = null; // { blob, at }
  const when = (at) => new Date(at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  const draw = (state = "idle", msg = "") => {
    if (!canRecord) {
      $box.innerHTML = `<p class="quiet small">이 브라우저에서는 녹음을 할 수 없어요. 소리 내어 말해 보는 것으로 충분해요!</p>`;
      return;
    }
    const has = !!take;
    $box.innerHTML = state === "rec"
      ? `<div class="rec-live" aria-live="polite"><span class="rec-dot"></span><b class="rec-time">0초</b> 녹음하고 있어요</div>
         <button class="btn rec-btn stop" id="rec-stop">■ 다 했어요</button>`
      : `${has ? `<button class="btn primary rec-play" id="rec-play">▶ 내 목소리 듣기</button>` : ""}
         <button class="btn rec-btn" id="rec-start">🎙 ${has ? "다시 녹음하기" : "녹음 시작"}</button>
         ${has && key ? `<p class="quiet small">${when(take.at)} 녹음 · 이 기기에만 저장돼요 <button class="linkbtn" id="rec-del">지우기</button></p>` : ""}
         ${msg ? `<p class="small rec-msg">${msg}</p>` : ""}`;
    const $ = (s) => $box.querySelector(s);
    if ($("#rec-start")) $("#rec-start").onclick = start;
    if ($("#rec-stop")) $("#rec-stop").onclick = async () => {
      const blob = await live?.finish();
      live = null;
      if (!blob) return draw();
      const first = !take;
      take = { blob, at: Date.now() };
      const saved = key ? await saveTake(key, blob) : true;
      draw("idle", saved ? "잘했어요! ▶ 눌러서 내 목소리를 들어 봐요." : "녹음은 됐지만 이 기기에 저장하지 못했어요. 지금 바로 들어 볼 수 있어요.");
      if (first) onSaved?.();
    };
    if ($("#rec-play")) $("#rec-play").onclick = () => {
      stopRecorder();
      stopSpeech();
      player = new Audio(URL.createObjectURL(take.blob));
      player.play();
    };
    if ($("#rec-del")) $("#rec-del").onclick = async () => {
      stopRecorder();
      await deleteTake(key);
      take = null;
      draw("idle", "지웠어요.");
    };
  };
  const start = async () => {
    stopRecorder();
    stopSpeech();
    try {
      draw("rec");
      live = await record((ms) => {
        const t = $box.querySelector(".rec-time");
        if (t) t.textContent = `${Math.floor(ms / 1000)}초`;
      });
    } catch (e) {
      live = null;
      draw("idle", e?.name === "NotAllowedError"
        ? "마이크를 쓸 수 없어요. 주소창 옆 🔒(또는 🎙)을 눌러 마이크를 허용해 주세요."
        : `마이크를 찾지 못했어요. ${esc(e?.message || "")}`);
    }
  };
  draw();
  if (key && canRecord) loadTake(key).then((t) => { if (t?.blob && !live) { take = t; draw(); } });
}
