// 처음 앱을 켜면: 세 친구 소개 → 학습자 이름 → 반가워 인사. 언제든 건너뛸 수 있다.
// 이름은 이 기기의 설정(gugudan.v1 settings.learner)에만, 소개를 봤는지는 settings.welcomed.
import { store } from "./store.js";
import { $app, esc } from "./ui.js";
import { pose } from "./village.js";

export const needsWelcome = () => !store.settings.welcomed;

// 받침이 있는 한글 이름은 '서준이가', 없으면 '지아가', 영어 이름은 'Lucia가'. 이름이 없으면 '네가'
const hasBatchim = (name) => {
  const c = name.charCodeAt(name.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0;
};
export const learner = () => (store.settings.learner || "").trim();
export const learnerGa = () => {
  const n = learner();
  if (!n) return "네가";
  return hasBatchim(n) ? `${n}이가` : `${n}가`;
};

const FRIENDS = [
  ["nuri", "welcome", "말문이", "나는 말문이! 무엇이든 먼저 말해 보는 씩씩한 강아지야."],
  ["minty", "listen", "귀담이", "나는 귀담이. 귀를 쫑긋 세우고 잘 들어 주는 토끼야."],
  ["bobo", "encourage", "차분이", "나는 차분이. 천천히, 차근차근 도와주는 곰이야."],
];

export function Welcome(next = "#/") {
  const done = () => {
    store.setSetting("welcomed", true);
    location.hash === next ? window.dispatchEvent(new HashChangeEvent("hashchange")) : (location.hash = next);
  };
  const skip = `<button class="linkbtn" id="skip">건너뛰기</button>`;

  const meet = () => {
    $app.innerHTML = `<section class="page welcome">
      <div class="card center">
        <p class="kicker">우리 목소리 방송국에 온 걸 환영해!</p>
        <h2>안녕!<br>우리는 방송국 친구들이야</h2>
        <ul class="wfriends">${FRIENDS.map(([who, act, name, ko]) => `<li>
          ${pose(who, act, { cls: "wf-char", label: name })}
          <div><b>${name}</b><p>${ko}</p></div></li>`).join("")}</ul>
        <p class="wline">우리는 아직 영어를 몰라.<br>영어를 하나씩 알려 줄래?</p>
        <button class="btn primary big" id="go">좋아!</button>
        <p>${skip}</p>
      </div></section>`;
    $app.querySelector("#go").onclick = askName;
    $app.querySelector("#skip").onclick = done;
  };

  const askName = () => {
    $app.innerHTML = `<section class="page welcome">
      <div class="card center">
        <div class="friends small">${pose("nuri", "self")}${pose("minty", "welcome")}${pose("bobo", "welcome")}</div>
        <p class="en big-en">We are friends. You are…?</p>
        <h2>너의 이름은 뭐야?</h2>
        <form id="nameform" class="nameform">
          <input id="name" maxlength="12" autocomplete="off" placeholder="이름을 적어 줘" value="${esc(learner())}" aria-label="내 이름">
          <button class="btn primary" type="submit">이게 내 이름이야!</button>
        </form>
        <p class="quiet small">이름은 이 기기에만 저장되고, 방송국에서 친구들이 불러 줄 때만 써요.</p>
        <p><button class="linkbtn" id="later">나중에 할게요</button></p>
      </div></section>`;
    const $in = $app.querySelector("#name");
    $in.focus();
    $app.querySelector("#nameform").onsubmit = (e) => {
      e.preventDefault();
      const n = $in.value.trim();
      if (!n) return $in.focus();
      store.setSetting("learner", n);
      hello();
    };
    $app.querySelector("#later").onclick = done;
  };

  const hello = () => {
    const n = esc(learner());
    $app.innerHTML = `<section class="page welcome">
      <div class="card center">
        <div class="friends">${pose("nuri", "celebrate")}${pose("minty", "celebrate")}${pose("bobo", "encourage")}</div>
        <h2>반가워, ${n}!</h2>
        <p class="en big-en">You are ${n}!</p>
        <p class="wline">${esc(learnerGa())} 한 단을 마칠 때마다<br>우리가 영어를 하나씩 배워.<br>같이 해 보자!</p>
        <button class="btn primary big" id="start">시작하기</button>
      </div></section>`;
    $app.querySelector("#start").onclick = done;
  };

  meet();
}
