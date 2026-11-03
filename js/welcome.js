// 처음 앱을 켜면: 세 친구 소개 → 학습자 이름 → 반가워 인사 → 박자 맞춰 'I am ○○!' 세 번 → 공부 방법 한 장. 언제든 건너뛸 수 있다.
// 이름은 이 기기의 설정(gugudan.v1 settings.learner)에만, 소개를 봤는지는 settings.welcomed.
import { store } from "./store.js";
import { $app, esc, onLeave } from "./ui.js";
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

// 박자 소리: 짧은 '똑' (첫 박은 조금 높게). 소리를 못 내는 환경이면 그림만 움직인다
let ac = null;
function tick(strong) {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.frequency.value = strong ? 1320 : 880;
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + 0.09);
  } catch { /* 소리 없이 진행 */ }
}

const STUDY = [
  ["①", "보고 듣기", "선생님 목소리로 문장을 듣고 따라 해요."],
  ["②", "가리고 말하기", "문장을 가린 채 소리 내어 말해 봐요."],
  ["③", "순서 맞추기", "단어를 순서대로 눌러 문장을 만들어요."],
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
    $app.querySelector("#later").onclick = howto;
  };

  const hello = () => {
    const n = esc(learner());
    $app.innerHTML = `<section class="page welcome">
      <div class="card center">
        <div class="friends">${pose("nuri", "celebrate")}${pose("minty", "celebrate")}${pose("bobo", "encourage")}</div>
        <h2>반가워, ${n}!</h2>
        <p class="en big-en">You are ${n}!</p>
        <p class="wline">${esc(learnerGa())} 한 단을 마칠 때마다<br>우리가 영어를 하나씩 배워.<br>같이 해 보자!</p>
        <button class="btn primary big" id="start">다음</button>
      </div></section>`;
    $app.querySelector("#start").onclick = beat;
  };

  // 한 마디 4박: I · am · 이름 · (쉼). 세 번 되풀이하는 동안 아이가 따라 말한다 (채점 없음)
  const beat = () => {
    const n = esc(learner());
    let timer = null;
    const stopBeat = () => { clearInterval(timer); timer = null; };
    onLeave(stopBeat);
    $app.innerHTML = `<section class="page welcome">
      <div class="card center">
        <p class="kicker">박자에 맞춰 다 같이!</p>
        <div class="friends wbeat">${pose("nuri", "rhythm")}${pose("minty", "rhythm")}${pose("bobo", "rhythm")}</div>
        <p class="beatline" aria-live="off"><span data-b="0">I</span> <span data-b="1">am</span> <span data-b="2">${n}!</span></p>
        <p class="beatdots" aria-hidden="true">${[0, 1, 2].map(() => "<i></i>").join("")}</p>
        <p class="wline" id="beatmsg">▶ 를 누르면 '똑똑' 박자가 나와요.<br>글자가 커질 때 큰 소리로 따라 말해요. 세 번!</p>
        <button class="btn primary big" id="play">▶ 같이 말하기</button>
        <p><button class="linkbtn" id="skipbeat">건너뛰기</button></p>
      </div></section>`;
    const $line = $app.querySelector(".beatline");
    const $dots = $app.querySelectorAll(".beatdots i");
    const $band = $app.querySelector(".wbeat");
    const finish = () => {
      stopBeat();
      $line.querySelectorAll("span").forEach((x) => x.classList.remove("on"));
      $band.classList.remove("go");
      $app.querySelector("#beatmsg").innerHTML = `잘했어! 🎉<br>방금 ${n}의 첫 영어 문장 <b>I am ${n}.</b> 을 말했어요.`;
      const b = $app.querySelector("#play");
      b.textContent = "다음";
      b.onclick = howto;
      b.focus();
    };
    $app.querySelector("#play").onclick = () => {
      if (timer) return;
      let k = 0; // 박 번호. 첫 마디 앞에 준비 4박
      const COUNT_IN = 4, TOTAL = COUNT_IN + 4 * 3;
      $app.querySelector("#beatmsg").textContent = "하나, 둘, 셋, 넷…";
      $band.classList.add("go");
      const step = () => {
        if (k >= TOTAL) return finish();
        tick(k % 4 === 0);
        const b = k - COUNT_IN;
        $line.querySelectorAll("span").forEach((x) => x.classList.toggle("on", b >= 0 && +x.dataset.b === b % 4));
        if (b >= 0 && b % 4 === 0) {
          $dots.forEach((d, i) => d.classList.toggle("on", i <= b / 4));
          $app.querySelector("#beatmsg").textContent = `${b / 4 + 1}번째!`;
        }
        k++;
      };
      step();
      timer = setInterval(step, 650);
    };
    $app.querySelector("#skipbeat").onclick = () => { stopBeat(); howto(); };
  };

  // 공부 방법 한 장: 세 단계 = 별 3개 = 한 단 통과 → 목소리 카드, 그리고 녹음하기
  const howto = () => {
    $app.innerHTML = `<section class="page welcome">
      <div class="card center">
        <h2>이렇게 공부해요</h2>
        <ol class="wsteps">${STUDY.map(([no, t, d]) => `<li><span class="wno">${no}</span><div><b>${t}</b><p>${d}</p></div><span class="wstar">⭐</span></li>`).join("")}</ol>
        <p class="wline">별 3개를 모으면 <b>한 단 통과!</b><br>친구들이 목소리 카드를 한 장 받아요.</p>
        <p class="quiet">④ 녹음하기에서는 내 목소리를 녹음해서<br>다시 들어 볼 수 있어요.</p>
        <div class="row2 wgo">
          <button class="btn primary big" id="dan1">1단 시작하기</button>
          <button class="btn" id="home">둘러볼래요</button>
        </div>
      </div></section>`;
    $app.querySelector("#dan1").onclick = () => { next = "#/dan/1"; done(); };
    $app.querySelector("#home").onclick = done;
    $app.querySelector("#dan1").focus();
  };

  meet();
}
