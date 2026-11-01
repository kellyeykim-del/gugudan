// 시험 문제 만들기: 빈칸 고르기 · 순서 맞추기 · 듣고 고르기
import { CONFUSION_GROUPS, getDan } from "./data.js";

export const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

const plain = (t) => t.replace(/[{}]/g, "");
export const tokens = (t) => plain(t).split(/\s+/).filter(Boolean);
// 단어 끝 문장부호를 떼어 낸다: "has." → ["has", "."]
export const splitPunct = (w) => {
  const m = w.match(/^(.*?)([.?!,]*)$/);
  return [m[1], m[2]];
};
const matchCase = (word, like) => (/^[A-Z]/.test(like) ? word[0].toUpperCase() + word.slice(1) : word);

// 글로 푸는 빈칸에서는 보기도 문법상 맞는 말이 되면 안 된다.
// did/didn't는 주어와 상관없이 늘 맞고, will/won't는 뜻만 다르므로 빼거나 보기에서 덜어 낸다.
const PAST = new Set(["did", "didn't"]);

// 문장에서 빈칸으로 만들 단어와 보기를 찾는다. grammar=true면 읽고 푸는 빈칸용.
export function findBlank(sentence, dan, { grammar = false } = {}) {
  let groups = dan?.blankGroups || Object.keys(CONFUSION_GROUPS).filter((g) => g !== "wh");
  if (grammar) groups = groups.filter((g) => g !== "will");
  const ws = tokens(sentence);
  for (let i = 0; i < ws.length; i++) {
    const [core] = splitPunct(ws[i]);
    const g = groups.find((k) => CONFUSION_GROUPS[k].includes(core.toLowerCase()));
    if (!g || (grammar && PAST.has(core.toLowerCase()))) continue;
    const opts = CONFUSION_GROUPS[g].filter((o) => !grammar || !PAST.has(o));
    return { index: i, answer: core, options: opts.map((o) => matchCase(o, core)) };
  }
  return null;
}

// 시험에 쓸 수 있는 문장: "~"·괄호가 들어간 틀은 빼고, 단 문장 + 응용 문장
export function pool(dan) {
  const all = [...dan.lines, ...dan.examples].map(plain);
  return [...new Set(all)].filter((t) => !/[~(]/.test(t));
}

export function blankQ(dan, s) {
  const b = findBlank(s, dan, { grammar: true });
  if (!b) return null;
  const ws = tokens(s);
  const [, punct] = splitPunct(ws[b.index]);
  return {
    type: "blank", dan: dan.id, sentence: s,
    before: ws.slice(0, b.index).join(" "),
    after: punct + (b.index + 1 < ws.length ? " " + ws.slice(b.index + 1).join(" ") : ""),
    answer: b.answer, options: shuffle(b.options),
  };
}

function orderQ(dan, s) {
  const ws = tokens(s);
  if (ws.length < 3 || ws.length > 9) return null;
  let order = shuffle(ws);
  if (order.join(" ") === ws.join(" ")) order = [...ws].reverse();
  return { type: "order", dan: dan.id, sentence: s, words: order };
}

function listenQ(dan, s) {
  const b = findBlank(s, dan);
  if (!b) return null;
  const ws = tokens(s);
  const [, punct] = splitPunct(ws[b.index]);
  const variants = b.options.map((o) => ws.map((w, i) => (i === b.index ? o + punct : w)).join(" "));
  return { type: "listen", dan: dan.id, sentence: s, answer: s, options: shuffle(variants) };
}

// 범위(단 id 목록)에서 n문제를 고르게 섞어 만든다.
export function buildQuiz(ids, n, { audio = true } = {}) {
  const dans = ids.map(getDan).filter(Boolean);
  const makers = audio ? [blankQ, orderQ, listenQ] : [blankQ, orderQ];
  const bags = dans.map((d) => ({ d, items: shuffle(pool(d)) }));
  const out = [];
  let k = 0, guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const bag = bags[k % bags.length];
    k++;
    if (!bag.items.length) bag.items = shuffle(pool(bag.d));
    const s = bag.items.pop();
    const maker = makers[out.length % makers.length];
    const q = maker(bag.d, s) || blankQ(bag.d, s) || orderQ(bag.d, s);
    if (q) out.push(q);
  }
  return out;
}
