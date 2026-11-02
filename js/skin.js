// 디자인 시안 A·B·C: 오른쪽 위 버튼으로 바꿔 본다. 고른 시안은 이 기기에만 기억하고(학습 기록과 따로),
// 주소에 ?skin=b 를 붙이면 그 시안으로 열린다. 첫 색칠 전 적용은 index.html 머리의 짧은 스크립트가 맡는다.
import { toast } from "./ui.js";

export const SKINS = [
  { id: "a", name: "알록달록 교실", color: "#00a9e0", theme: "#00a9e0" },
  { id: "b", name: "레드 플레이", color: "#e60012", theme: "#e60012" },
  { id: "c", name: "딥블루 아카데미", color: "#015db2", theme: "#015db2" },
];
const KEY = "gugudan.skin";

function apply(id) {
  const s = SKINS.find((x) => x.id === id) || SKINS[0];
  document.documentElement.dataset.skin = s.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", s.theme);
  try { localStorage.setItem(KEY, s.id); } catch {}
  document.querySelectorAll(".skin-switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.skin === s.id)));
  return s;
}

export function mountSkinSwitch() {
  const box = document.createElement("div");
  box.className = "skin-switch";
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "디자인 시안 바꾸기");
  box.innerHTML = `<span aria-hidden="true">시안</span>${SKINS.map((s) =>
    `<button type="button" data-skin="${s.id}" style="--sw:${s.color}" title="시안 ${s.id.toUpperCase()} · ${s.name}"
      aria-label="시안 ${s.id.toUpperCase()} ${s.name}">${s.id.toUpperCase()}</button>`).join("")}`;
  box.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const s = apply(b.dataset.skin);
    // 주소의 ?skin= 도 맞춰 둬야 새로고침·링크 공유 때 같은 시안이 열린다
    const url = new URL(location.href);
    url.searchParams.set("skin", s.id);
    history.replaceState(history.state, "", url);
    toast(`시안 ${s.id.toUpperCase()} · ${s.name}`);
  };
  document.body.appendChild(box);
  apply(document.documentElement.dataset.skin);
}
