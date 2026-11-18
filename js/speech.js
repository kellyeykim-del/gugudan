// 소리 내기: 선생님 낭독 원음(sogenius_pn 줄 클립) → ElevenLabs 목소리 → Azure로 미리 만든 mp3 → 브라우저 내장 TTS 순서.
// 단마다 전체 읽기(audio/read)는 playRead(), 비트낭독(audio/dan, 마이크로닷)은 playDan()이 통째로 튼다.
import { LINE_CLIPS, DAN_CLIPS, READ_CLIPS, FULL_READ } from "./audio-manifest.js";
import { TTS_CLIPS } from "./tts-manifest.js";
import { VOICE_CLIPS } from "./voice-manifest.js";

const RATES = { slow: 0.7, normal: 0.95, fast: 1.15 };
const CLIP_RATES = { slow: 0.8, normal: 1, fast: 1.15 }; // 원음은 원래 빠르기가 기준
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

export const canSpeak = !!synth || typeof Audio !== "undefined";

let voice = null;
function pickVoice() {
  if (!synth) return null;
  const vs = synth.getVoices().filter((v) => v.lang?.startsWith("en"));
  voice = vs.find((v) => v.lang === "en-US" && /natural|online|google/i.test(v.name))
    || vs.find((v) => v.lang === "en-US") || vs[0] || null;
  return voice;
}
if (synth) {
  pickVoice();
  synth.onvoiceschanged = pickVoice;
}

const clean = (t) => t.replace(/[{}]/g, "").replace(/\s*\(.*?\)/g, "");
// 원음 클립을 찾는 키: 소문자, 문장부호 제거
const clipKey = (t) => clean(t).toLowerCase().replace(/[^a-z' ]/g, "").replace(/\s+/g, " ").trim();

export const hasClip = (text) => !!LINE_CLIPS[clipKey(text)];
export const hasDanClip = (id) => !!DAN_CLIPS[id];
export const hasRead = (id) => !!READ_CLIPS[id];
export const hasFullRead = !!FULL_READ;

let current = null; // 지금 재생 중인 { a: Audio, done }

// onState("play" | "pause" | "ended")는 audio의 play·pause·ended 이벤트를 그대로 알린다
function playFile(src, speed, onState) {
  return new Promise((resolve) => {
    const a = new Audio(src);
    a.playbackRate = CLIP_RATES[speed] || 1;
    a.preservesPitch = true;
    const done = (ok = true) => { if (current?.a === a) current = null; resolve(ok); }; // 파일을 못 읽으면 false
    current = { a, done };
    if (onState) {
      a.onplay = () => onState("play");
      a.onpause = () => onState("pause");
    }
    a.onended = () => { onState?.("ended"); done(); };
    a.onerror = () => { onState?.("ended"); done(false); };
    a.play().catch(() => { onState?.("ended"); done(false); });
  });
}

// 비트낭독 원음 일시 정지 · 이어 듣기
export const pauseAudio = () => current?.a.pause();
export const resumeAudio = () => current?.a.play().catch(() => {});

function tts(text, speed) {
  if (!synth) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(clean(text));
    u.lang = "en-US";
    if (voice || pickVoice()) u.voice = voice;
    u.rate = RATES[speed] || 1;
    u.onend = resolve;
    u.onerror = resolve;
    synth.speak(u);
  });
}

// useClip=false면 원음이 있어도 미리 만든 음성으로 (한 단 안에서 목소리를 섞지 않으려고)
export function speak(text, speed = "normal", useClip = true) {
  const k = clipKey(text);
  const f = useClip && LINE_CLIPS[k];
  if (f) return playFile(`audio/lines/${f}`, speed);
  if (VOICE_CLIPS[k]) return playFile(`audio/voice/${VOICE_CLIPS[k]}`, speed);
  return TTS_CLIPS[k] ? playFile(`audio/tts/${TTS_CLIPS[k]}`, speed) : tts(text, speed);
}

let runId = 0;
// 여러 줄을 차례로 읽는다. 모든 줄에 원음이 있을 때만 원음, 아니면 전부 TTS.
export async function speakAll(lines, speed, onLine) {
  stop();
  const my = ++runId;
  const allClips = lines.every(hasClip);
  const allFiles = allClips || lines.every((l) => VOICE_CLIPS[clipKey(l)] || TTS_CLIPS[clipKey(l)]);
  for (let i = 0; i < lines.length; i++) {
    if (my !== runId) return false;
    onLine?.(i);
    await speak(lines[i], speed, allClips);
    await new Promise((r) => setTimeout(r, allFiles ? 150 : speed === "slow" ? 500 : 250));
  }
  onLine?.(-1);
  return my === runId;
}

// 한 단의 비트낭독 원음을 통째로 재생
export async function playDan(id, speed, onState) {
  stop();
  const my = ++runId;
  if (!DAN_CLIPS[id]) return false;
  const ok = await playFile(`audio/dan/${DAN_CLIPS[id]}`, speed, onState);
  if (ok === false) return "missing"; // 칸은 있는데 원음 파일이 아직 없음
  return my === runId;
}

// 한 단의 선생님 전체 읽기 원음을 통째로 재생하고, 지금 읽는 줄 번호를 onLine(i)로 알린다(끝나면 -1).
// 31·32단은 like 7줄 뒤에 want·need 7줄씩이 이어지므로 줄 번호는 i % 7 (같은 주어 줄이 다시 밝아짐)
export async function playRead(id, speed, onLine) {
  stop();
  const my = ++runId;
  const r = READ_CLIPS[id];
  if (!r) return false;
  let last = -2;
  const tick = () => {
    const a = current?.a;
    if (!a || my !== runId) return;
    let i = -1;
    for (let k = 0; k < r.marks.length; k++) if (a.currentTime >= r.marks[k]) i = k;
    const row = i < 0 ? -1 : i % (r.rows || r.marks.length);
    if (row !== last) { last = row; onLine?.(row); }
  };
  const timer = setInterval(tick, 60); // 줄 사이가 0.4초쯤인 단도 있어 자주 본다
  const ok = await playFile(`audio/read/${r.file}`, speed);
  clearInterval(timer);
  onLine?.(-1);
  if (ok === false) return "missing";
  return my === runId;
}

// 36단 전체 읽기(선생님 원음 한 곡)
export async function playFullRead(speed, onState) {
  stop();
  const my = ++runId;
  if (!FULL_READ) return false;
  const ok = await playFile(`audio/read/${FULL_READ}`, speed, onState);
  if (ok === false) return "missing";
  return my === runId;
}

export function stop() {
  runId++;
  synth?.cancel();
  // 멈춘 소리를 기다리던 쪽도 끝난 것으로 풀어 준다
  if (current) { const c = current; current = null; c.a.pause(); c.done(); }
}
