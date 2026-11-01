// 소리 내기: 낭독 원음(mp3 클립) → Azure로 미리 만든 mp3 → 브라우저 내장 TTS 순서.
import { LINE_CLIPS, DAN_CLIPS } from "./audio-manifest.js";
import { TTS_CLIPS } from "./tts-manifest.js";

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

let current = null; // 지금 재생 중인 { a: Audio, done }

// onState("play" | "pause" | "ended")는 audio의 play·pause·ended 이벤트를 그대로 알린다
function playFile(src, speed, onState) {
  return new Promise((resolve) => {
    const a = new Audio(src);
    a.playbackRate = CLIP_RATES[speed] || 1;
    a.preservesPitch = true;
    const done = () => { if (current?.a === a) current = null; resolve(); };
    current = { a, done };
    if (onState) {
      a.onplay = () => onState("play");
      a.onpause = () => onState("pause");
    }
    a.onended = () => { onState?.("ended"); done(); };
    a.onerror = () => { onState?.("ended"); done(); };
    a.play().catch(() => { onState?.("ended"); done(); });
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
  return TTS_CLIPS[k] ? playFile(`audio/tts/${TTS_CLIPS[k]}`, speed) : tts(text, speed);
}

let runId = 0;
// 여러 줄을 차례로 읽는다. 모든 줄에 원음이 있을 때만 원음, 아니면 전부 TTS.
export async function speakAll(lines, speed, onLine) {
  stop();
  const my = ++runId;
  const allClips = lines.every(hasClip);
  const allFiles = allClips || lines.every((l) => TTS_CLIPS[clipKey(l)]);
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
  await playFile(`audio/dan/${DAN_CLIPS[id]}`, speed, onState);
  return my === runId;
}

export function stop() {
  runId++;
  synth?.cancel();
  // 멈춘 소리를 기다리던 쪽도 끝난 것으로 풀어 준다
  if (current) { const c = current; current = null; c.a.pause(); c.done(); }
}
