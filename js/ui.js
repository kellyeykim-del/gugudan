// 여러 화면이 같이 쓰는 작은 도구들
import { MAIN_DANS, THIRD_FORMS } from "./data.js";
import { store } from "./store.js";
import { splitPunct } from "./quiz.js";

export const $app = document.getElementById("app");
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// {단어}와 3인칭 변화형을 빨간색으로
export function hl(text) {
  return String(text).split(/(\s+)/).map((w) => {
    if (/^\s+$/.test(w)) return w;
    if (w.includes("{")) return esc(w).replace(/\{(.*?)\}/g, '<span class="red">$1</span>');
    const [core, p] = splitPunct(w);
    return THIRD_FORMS.has(core.toLowerCase()) ? `<span class="red">${esc(core)}</span>${esc(p)}` : esc(w);
  }).join("");
}

export const danLabel = (d) => (d.bonus ? `보너스 ${d.no}` : d.sent ? `문장 ${d.no}단` : `${d.no}단`);
export const starsHtml = (id) => {
  const n = store.stars(id);
  return `<span class="stars" aria-label="별 ${n}개">${"★".repeat(n)}<span class="off">${"★".repeat(3 - n)}</span></span>`;
};
export const isLocked = (d) => d.bonus && !store.bonusOpen();

export function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

export function header(title, back = "#/") {
  return `<header class="bar"><a class="back" href="${back}" aria-label="뒤로">←</a><h1>${title}</h1></header>`;
}

// 고른 범위를 짧은 말로: "36단 전체", "1–10단", "3 · 7 · 11단"
export function rangeLabel(ids) {
  if (ids.length === MAIN_DANS.length && MAIN_DANS.every((d) => ids.includes(d.id))) return "36단 전체";
  // 문장형 단(S1, S2…)은 "문장 1–3단"처럼
  const sent = ids.every((id) => /^S\d+$/.test(id));
  const pre = sent ? "문장 " : "";
  if (sent) ids = ids.map((id) => id.slice(1));
  const nums = ids.map(Number);
  if (nums.every(Number.isInteger)) {
    const s = [...nums].sort((a, b) => a - b);
    if (s.length > 2 && s.every((n, i) => !i || n === s[i - 1] + 1)) return `${pre}${s[0]}–${s[s.length - 1]}단`;
    if (sent) ids = s.map(String);
  }
  const shown = ids.slice(0, 6).join(" · ");
  return `${pre}${shown}${ids.length > 6 ? ` 외 ${ids.length - 6}개` : ""}단`;
}

// 화면을 떠날 때 멈춰야 할 타이머 등을 등록해 두면 라우터가 정리한다.
const leaveFns = [];
export const onLeave = (fn) => leaveFns.push(fn);
export const runLeave = () => leaveFns.splice(0).forEach((fn) => fn());
