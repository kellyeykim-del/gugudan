// 신나는 영어구구단 (2024) 36단 + 보너스 단 B1~B7
// 원본: 0.영어구구단_민트체크완성.pdf / 보너스 단: 2023 구구단표에서 가져온 초안
// 원본 대비 수정: breakgast→breakfast, Dose→Does, doesn't comes→doesn't come,
//   in the space→in space, 3단 his/her 순서, 20·24·36단 제목, 14·21·32단 뜻
// 표기: {단어} = 빨간색 강조. 3인칭 변화(does, has, goes…)는 자동 강조.

const S7 = ["I", "You", "We", "They", "He", "She", "It"];

// 주어 7개에 맞춰 줄을 만든다. fn(subject, isThird) → 문장
const seven = (fn) => S7.map((s, i) => fn(s, i >= 4));

export const FAMILIES = [
  { id: "be", name: "be동사", dans: [1, 2, 3, 4, 5] },
  { id: "will", name: "will", dans: [6, 21, 22] },
  { id: "do", name: "do", dans: [7, 8, 9] },
  { id: "who", name: "who", dans: [10] },
  { id: "have", name: "have", dans: [11, 12, 13, 14] },
  { id: "go", name: "go", dans: [15, 16] },
  { id: "did", name: "did · take", dans: [17, 18, 19, 20] },
  { id: "come", name: "come", dans: [23, 24] },
  { id: "get", name: "get", dans: [25, 26, 27, 28] },
  { id: "there", name: "There is / are", dans: [29, 30, 31, 32] },
  { id: "like", name: "like", dans: [33, 34, 35, 36] },
  { id: "bonus", name: "보너스", dans: ["B1", "B2", "B3", "B4", "B5", "B6", "B7"] },
];

const be = (s) => ({ I: "am", He: "is", She: "is", It: "is" }[s] || "are");
const beQ = (s) => ({ I: "Am", He: "Is", She: "Is", It: "Is" }[s] || "Are");
const low = (s) => (s === "I" ? "I" : s.toLowerCase());
const poss = { I: "my", You: "your", We: "our", They: "their", He: "his", She: "her", It: "its" };

export const DANS = [
  {
    no: 1, meaning: "~는 ~이다",
    lines: seven((s) => `${s} ${be(s)}`),
    theme: { en: "An ice cream lover", ko: "아이스크림 킬러" },
    examples: [
      "I am an ice cream lover.", "You are an ice cream lover.", "We are ice cream lover{s}.",
      "They are ice cream lover{s}.", "He is an ice cream lover.", "She is an ice cream lover.",
      "It is the best ice cream in the world!",
    ],
  },
  {
    no: 2, meaning: "~는 ~아니다",
    lines: seven((s) => `${s} ${be(s)} not`),
    theme: { en: "An ice cream lover", ko: "아이스크림 킬러" },
    examples: [
      "I am not an ice cream lover.", "You are not an ice cream lover.", "We are not ice cream lovers.",
      "They are not ice cream lovers.", "He is not an ice cream lover.", "She is not an ice cream lover.",
      "It is not the best ice cream in the world!",
    ],
  },
  {
    no: 3, meaning: "~는 ~이니?",
    lines: seven((s) => `${beQ(s)} ${low(s)}?`),
    theme: { en: "Happy about my grades", ko: "성적이 만족스러워" },
    examples: [
      ...S7.slice(0, 6).map((s) => `${beQ(s)} ${low(s)} happy about {${poss[s]}} grades?`),
      "Is it a difficult test?",
    ],
  },
  {
    no: 4, meaning: "~는 V 할 거니?",
    lines: seven((s) => `${beQ(s)} ${low(s)} going to eat?`),
    theme: { en: "Going to buy a lip tint", ko: "틴트를 살 거야" },
    examples: [
      ...S7.slice(0, 6).map((s) => `${beQ(s)} ${low(s)} going to buy a lip tint?`),
      "Is it a brand-new lip tint?",
    ],
  },
  {
    no: 5, meaning: "~는 ~상태니?",
    lines: seven((s) => `${beQ(s)} ${low(s)} picky?`),
    theme: { en: "Are you picky?", ko: "너는 까다롭니?" },
    examples: seven((s) => `${beQ(s)} ${low(s)} picky?`),
  },
  {
    no: 6, meaning: "~는 V 할 거야",
    lines: seven((s) => `${s} will do that.`),
    theme: { en: "Will go to the BTS concert", ko: "방탄소년단 콘서트에 갈 거야" },
    examples: [
      ...S7.slice(0, 6).map((s) => `${s} will go to the BTS concert.`),
      "Will it be watched by the BTS Army?",
    ],
  },
  {
    no: 7, meaning: "~는 ~하다",
    lines: seven((s, t) => `${s} ${t ? "does" : "do"}.`),
    theme: { en: "Do Taekwondo every other day", ko: "이틀에 한 번 태권도를 해" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "does" : "do"} Taekwondo every other day.`),
      "It must be done every other day.",
    ],
  },
  {
    no: 8, meaning: "~는 안 한다",
    lines: seven((s, t) => `${s} ${t ? "doesn't" : "don't"}.`),
    theme: { en: "Do homework after school", ko: "방과 후에 숙제를 해" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "doesn't" : "don't"} do homework after school.`),
      "It doesn't do my homework for me.",
    ],
  },
  {
    no: 9, meaning: "~는 ~하니?",
    lines: seven((s, t) => `${t ? "Does" : "Do"} ${low(s)}?`),
    theme: { en: "Do homework after school", ko: "방과 후에 숙제를 해" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${i >= 4 ? "Does" : "Do"} ${low(s)} do homework after school?`),
      "Does it do homework for us?",
    ],
  },
  {
    no: 10, meaning: "~는 누구야?",
    lines: seven((s) => `Who ${be(s)} ${low(s)}?`),
    theme: { en: "Who am I kidding?", ko: "내가 누구를 속이겠어?" },
    examples: seven((s) => `Who ${be(s)} ${low(s)} kidding?`),
  },
  {
    no: 11, meaning: "~는 가지고 있다",
    lines: seven((s, t) => `${s} ${t ? "has" : "have"}.`),
    theme: { en: "Have cereal for breakfast", ko: "아침식사로 시리얼을 먹는다" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "has" : "have"} cereal for breakfast.`),
      "It has cereal flavor.",
    ],
  },
  {
    no: 12, meaning: "~는 갖고 있니?",
    lines: seven((s, t) => `${t ? "Does" : "Do"} ${low(s)} have?`),
    theme: { en: "Do you have cereal for breakfast?", ko: "아침식사로 시리얼을 먹나요?" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${i >= 4 ? "Does" : "Do"} ${low(s)} have cereal for breakfast?`),
      "Does it have cereal flavor?",
    ],
  },
  {
    no: 13, meaning: "~는 몇 개 갖고 있니?",
    lines: seven((s, t) => `How many ${t ? "does" : "do"} ${low(s)} have?`),
    theme: { en: "Pokemon cards", ko: "포켓몬 카드" },
    examples: seven((s, t) => `How many Pokemon cards ${t ? "does" : "do"} ${low(s)} have?`),
  },
  {
    no: 14, meaning: "~는 갖고 있지 않아",
    lines: seven((s, t) => `${s} ${t ? "doesn't" : "don't"} have.`),
    theme: { en: "Don't have anything in common", ko: "공통점이 없다" },
    examples: [
      "My dad and I don't have anything in common.", "You and I don't have anything in common.",
      "We don't have anything in common.", "They don't have anything in common.",
      "He doesn't have anything in common.", "She doesn't have anything in common.",
      "It doesn't have anything in common.",
    ],
  },
  {
    no: 15, meaning: "~는 간다",
    lines: seven((s, t) => `${s} ${t ? "goes" : "go"}.`),
    theme: { en: "Go for a walk", ko: "산책하러 가다" },
    examples: seven((s, t) => `${s} ${t ? "goes" : "go"} for a walk.`),
  },
  {
    no: 16, meaning: "~는 가지 않아",
    lines: seven((s, t) => `${s} ${t ? "doesn't" : "don't"} go.`),
    theme: { en: "Don't go home at 5 pm", ko: "오후 5시에 집에 안 가" },
    examples: S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "doesn't" : "don't"} go home at 5 pm.`),
  },
  {
    no: 17, meaning: "~는 했어",
    lines: seven((s) => `${s} did.`),
    theme: { en: "Did one's best", ko: "최선을 다했다" },
    examples: seven((s) => `${s} did {${poss[s]}} best.`),
  },
  {
    no: 18, meaning: "~는 가져갔니?",
    lines: seven((s) => `Did ${low(s)} take?`),
    theme: { en: "Take your pen by mistake?", ko: "펜을 실수로 가져갔어?" },
    examples: [
      ...S7.slice(0, 6).map((s) => `Did ${low(s)} take your pen by mistake?`),
      "Did it take a long time for the pen to be made?",
    ],
  },
  {
    no: 19, meaning: "~는 안 가져갔어",
    lines: seven((s) => `${s} didn't take.`),
    theme: { en: "Didn't take a picture of Black Pink", ko: "블랙핑크 사진을 찍지 않았어" },
    examples: S7.slice(0, 6).map((s) => `${s} didn't take a picture of Black Pink.`),
  },
  {
    no: 20, meaning: "언제 ~가 가져갔니?",
    lines: seven((s) => `When did ${low(s)} take?`),
    theme: { en: "When did you take my pen?", ko: "언제 내 펜을 가져갔어?" },
    examples: [
      ...S7.slice(0, 6).map((s) => `When did ${low(s)} take your pen by mistake?`),
      "When did it take a long time for the pen to be made?",
    ],
  },
  {
    no: 21, meaning: "~는 안 할 거야",
    lines: seven((s) => `${s} won't.`),
    theme: { en: "I won't give up", ko: "나는 포기하지 않을 거야" },
    examples: seven((s) => `${s} won't give up.`),
  },
  {
    no: 22, meaning: "~는 할 거야?",
    lines: [...S7.slice(0, 6).map((s) => `Will ${low(s)} do that?`), "Will it be done?"],
    theme: { en: "Will you do my homework?", ko: "숙제 해 줄 거야?" },
    examples: [
      "Will I do your homework?", "Will you do my homework?", "Will we do your homework?",
      "Will they do my homework?", "Will he do my homework?", "Will she do my homework?",
      "Will it be over?",
    ],
  },
  {
    no: 23, meaning: "~가 오네",
    lines: seven((s, t) => `${s} ${t ? "comes" : "come"}.`),
    theme: { en: "Come home at 5", ko: "5시에 집에 와" },
    examples: seven((s, t) => `${s} ${t ? "comes" : "come"} home at 5.`),
  },
  {
    no: 24, meaning: "~가 안 오네",
    lines: seven((s, t) => `${s} ${t ? "doesn't" : "don't"} come.`),
    theme: { en: "Don't come to class early", ko: "수업에 일찍 오지 않아" },
    examples: seven((s, t) => `${s} ${t ? "doesn't" : "don't"} come to class early every day.`),
  },
  {
    no: 25, meaning: "~는 산다, 얻는다",
    lines: seven((s, t) => `${s} ${t ? "gets" : "get"}.`),
    theme: { en: "Get good grades in English", ko: "나는 영어 성적을 잘 받아" },
    examples: seven((s, t) => `${s} ${t ? "gets" : "get"} good grades in English.`),
  },
  {
    no: 26, meaning: "~는 안 사, 안 얻어",
    lines: seven((s, t) => `${s} ${t ? "doesn't" : "don't"} get.`),
    theme: { en: "I don't get it", ko: "이해가 안 가" },
    examples: S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "doesn't" : "don't"} get it.`),
  },
  {
    no: 27, meaning: "~가 사? 얻어?",
    lines: seven((s, t) => `${t ? "Does" : "Do"} ${low(s)} get?`),
    theme: { en: "Get good ideas from books?", ko: "책에서 아이디어를 얻어?" },
    examples: S7.slice(0, 6).map((s, i) => `${i >= 4 ? "Does" : "Do"} ${low(s)} get good ideas from books?`),
  },
  {
    no: 28, meaning: "왜 이걸 사는 거야? / 그 돈은 어디서 났어?",
    lines: [
      ...S7.slice(0, 6).map((s, i) => `Why ${i >= 4 ? "does" : "do"} ${low(s)} get this one?`),
      ...S7.slice(0, 6).map((s) => `Where did ${low(s)} get the money?`),
    ],
    theme: null,
    examples: [],
  },
  {
    no: 29, meaning: "~가 한 개 있잖아", drillFromExamples: true,
    lines: ["There is a ~.", "There is an ~."],
    theme: { en: "There is a/an", ko: "한 개가 있잖아" },
    examples: [
      "There is an honest boy.", "There is a saying.", "There's a serious problem.",
      "There's a baby inside.", "There's an hour left to leave here.", "There is a library near my school.",
    ],
  },
  {
    no: 30, meaning: "~들이 있다, 여러 개가 있잖아", drillFromExamples: true,
    lines: ["There are ~."],
    theme: { en: "There are", ko: "여러 개가 있잖아" },
    examples: [
      "There are lots of problems.", "There are millions of people in this country.",
      "There are many trees in the forest.", "There are more than one hundred books.",
      "There are still lots of things to do.", "There are few lakes in this area.",
    ],
  },
  {
    no: 31, meaning: "~가 없잖아", drillFromExamples: true,
    lines: ["There is no ~."],
    theme: { en: "There is no", ko: "없잖아" },
    examples: [
      "There is nothing to do here.", "There is no air in space.", "There is no sugar in this tea.",
      "There is no limit.", "There is no need to talk about it.", "There is no spring water here.",
    ],
  },
  {
    no: 32, meaning: "~가 있니?", drillFromExamples: true,
    lines: ["Is there a/an ~?", "Are there ~s?"],
    theme: { en: "Is there a/an ~? Are there ~s?", ko: "있니?" },
    examples: [
      "Is there anything wrong?", "Is there anything to eat?", "Is there a good reason?",
      "Are there chair{s} to sit on?", "Are there book{s} to read?", "Are there people to help us?",
    ],
  },
  {
    no: 33, meaning: "~는 좋아해",
    lines: seven((s, t) => `${s} ${t ? "likes" : "like"}.`),
    theme: { en: "I like to read books / I like eating spicy food", ko: "책 읽는 게 좋아 / 매운 음식 먹기 좋아" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "likes" : "like"} {to} read books.`),
      ...S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "likes" : "like"} eat{ing} spicy food.`),
    ],
  },
  {
    no: 34, meaning: "~는 안 좋아해",
    lines: seven((s, t) => `${s} ${t ? "doesn't" : "don't"} like.`),
    theme: { en: "I don't like to be alone / watching scary movies", ko: "혼자 있는 건 싫어 / 무서운 영화 보는 건 싫어" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "doesn't" : "don't"} like {to} be alone.`),
      ...S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "doesn't" : "don't"} like watch{ing} scary movies.`),
    ],
  },
  {
    no: 35, meaning: "~는 ~를 좋아하니?",
    lines: seven((s, t) => `${t ? "Does" : "Do"} ${low(s)} like?`),
    theme: { en: "Do I like Korean food?", ko: "한국 음식 좋아해?" },
    examples: S7.slice(0, 6).map((s, i) => `${i >= 4 ? "Does" : "Do"} ${low(s)} like Korean food?`),
  },
  {
    no: 36, meaning: "~는 무엇을 좋아해?",
    lines: seven((s, t) => `What ${t ? "does" : "do"} ${low(s)} like?`),
    theme: { en: "What do you like to do in your free time?", ko: "쉬는 시간에 뭘 하는 걸 좋아해?" },
    examples: S7.slice(0, 6).map((s, i) => `What ${i >= 4 ? "does" : "do"} ${low(s)} like in {${poss[s]}} free time?`),
  },

  // ── 보너스 단 (2023 구구단표에서 가져옴, 응용 문장은 감수 전 초안) ──
  {
    no: "B1", meaning: "~는 만든다", bonus: true,
    lines: seven((s, t) => `${s} ${t ? "makes" : "make"}.`),
    theme: { en: "Make dinner for my family", ko: "가족을 위해 저녁을 만들어" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "makes" : "make"} dinner for {${poss[s]}} family.`),
      "It makes a big difference.",
    ],
  },
  {
    no: "B2", meaning: "~는 안 만들어", bonus: true,
    lines: seven((s, t) => `${s} ${t ? "doesn't" : "don't"} make.`),
    theme: { en: "Don't make the same mistake", ko: "같은 실수를 안 해" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "doesn't" : "don't"} make the same mistake.`),
      "It doesn't make sense.",
    ],
  },
  {
    no: "B3", meaning: "~가 만드니?", bonus: true,
    lines: seven((s, t) => `${t ? "Does" : "Do"} ${low(s)} make?`),
    theme: { en: "Make friends easily?", ko: "친구를 쉽게 사귀니?" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${i >= 4 ? "Does" : "Do"} ${low(s)} make friends easily?`),
      "Does it make sense?",
    ],
  },
  {
    no: "B4", meaning: "~는 원해 / 필요해", bonus: true,
    lines: seven((s, t) => `${s} ${t ? "wants" : "want"}.`),
    theme: { en: "Want a new bike", ko: "새 자전거를 갖고 싶어" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${s} ${i >= 4 ? "wants" : "want"} a new bike.`),
      "It needs new batteries.",
    ],
  },
  {
    no: "B5", meaning: "~는 필요하니?", bonus: true,
    lines: seven((s, t) => `${t ? "Does" : "Do"} ${low(s)} need?`),
    theme: { en: "Need help?", ko: "도움이 필요해?" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `${i >= 4 ? "Does" : "Do"} ${low(s)} need help?`),
      "Does it need water?",
    ],
  },
  {
    no: "B6", meaning: "의문사 7개", bonus: true, drillFromExamples: true, blankGroups: ["wh"],
    lines: ["Who (누구)", "What (무엇)", "When (언제)", "Where (어디서)", "Why (왜)", "How (어떻게)", "Which (어떤)"],
    theme: { en: "Ask about me", ko: "나에 대해 물어보기" },
    examples: [
      "Who is your best friend?", "What is your name?", "When is your birthday?",
      "Where is the library?", "Why are you late?", "How are you?", "Which one do you want?",
    ],
  },
  {
    no: "B7", meaning: "~는 무엇을 원해?", bonus: true,
    lines: seven((s, t) => `What ${t ? "does" : "do"} ${low(s)} want?`),
    theme: { en: "What do you want to eat?", ko: "뭐 먹고 싶어?" },
    examples: [
      ...S7.slice(0, 6).map((s, i) => `What ${i >= 4 ? "does" : "do"} ${low(s)} want to eat?`),
      "What does it mean?",
    ],
  },
].map((d) => ({ ...d, id: String(d.no), family: FAMILIES.find((f) => f.dans.includes(d.no))?.id }));

export const MAIN_DANS = DANS.filter((d) => !d.bonus);
export const BONUS_DANS = DANS.filter((d) => d.bonus);

// ── 게임(문장형) 시험판: 1–3단을 완성된 문장으로. 강소진 대표 컨펌 전 테스트용 예문
// [주어 번호(S7 순서), 보어, 긍정 뜻, 부정 뜻, 질문 뜻(없으면 긍정 뜻에 ?)]
const SENT_BASES = [
  [0, "David", "나는 데이비드예요.", "나는 데이비드가 아니에요.", "내가 데이비드예요?"],
  [0, "late", "나는 늦었어요.", "나는 늦지 않았어요.", "내가 늦었어요?"],
  [0, "ready", "나는 준비됐어요.", "나는 준비되지 않았어요.", "내가 준비됐어요?"],
  [1, "tall", "너는 키가 커요.", "너는 키가 크지 않아요."],
  [1, "my friend", "너는 내 친구예요.", "너는 내 친구가 아니에요."],
  [1, "a good singer", "너는 노래를 잘해요.", "너는 노래를 잘하지 못해요."],
  [2, "happy", "우리는 행복해요.", "우리는 행복하지 않아요."],
  [2, "in the park", "우리는 공원에 있어요.", "우리는 공원에 있지 않아요."],
  [2, "classmates", "우리는 반 친구예요.", "우리는 반 친구가 아니에요."],
  [3, "busy", "그들은 바빠요.", "그들은 바쁘지 않아요."],
  [3, "at school", "그들은 학교에 있어요.", "그들은 학교에 있지 않아요."],
  [3, "doctors", "그들은 의사예요.", "그들은 의사가 아니에요."],
  [4, "a boy", "그는 남자아이예요.", "그는 남자아이가 아니에요."],
  [4, "angry", "그는 화가 났어요.", "그는 화가 나지 않았어요."],
  [4, "in his room", "그는 자기 방에 있어요.", "그는 자기 방에 있지 않아요."],
  [5, "sad", "그녀는 슬퍼요.", "그녀는 슬프지 않아요."],
  [5, "a teacher", "그녀는 선생님이에요.", "그녀는 선생님이 아니에요."],
  [5, "from Japan", "그녀는 일본에서 왔어요.", "그녀는 일본에서 오지 않았어요."],
  [6, "an apple", "그것은 사과예요.", "그것은 사과가 아니에요."],
  [6, "hot", "날씨가 더워요.", "날씨가 덥지 않아요."],
  [6, "my bag", "그것은 내 가방이에요.", "그것은 내 가방이 아니에요."],
];
const SENT_FORMS = {
  1: ([i, c, ko]) => [`${S7[i]} ${be(S7[i])} ${c}.`, ko],
  2: ([i, c, , ko]) => [`${S7[i]} ${be(S7[i])} not ${c}.`, ko],
  3: ([i, c, ko, , q]) => [`${beQ(S7[i])} ${low(S7[i])} ${c}?`, q || ko.replace(/\.$/, "?")],
};
export const SENT_DANS = [1, 2, 3].map((no) => {
  const items = SENT_BASES.map((b) => {
    const [en, ko] = SENT_FORMS[no](b);
    return { sub: b[0], en, ko };
  });
  // 주어마다 첫 문장을 단 문장(lines)으로, 나머지는 응용 문장으로
  const lines = S7.map((_, i) => items.find((it) => it.sub === i).en);
  return { no, id: `S${no}`, sent: true, meaning: DANS[no - 1].meaning, items, lines,
    examples: items.map((it) => it.en).filter((en) => !lines.includes(en)) };
});
const KO = new Map(SENT_DANS.flatMap((d) => d.items.map((it) => [it.en, it.ko])));
export const koOf = (en) => KO.get(en) || "";

export const getDan = (id) => DANS.find((d) => d.id === String(id)) || SENT_DANS.find((d) => d.id === String(id));

// 단을 연습할 때 쓰는 문장: 틀이 "~"로 된 단은 응용 문장으로 연습
export const drillLines = (d) => (d.drillFromExamples ? d.examples : d.lines);

// 3인칭 변화형은 자동으로 빨간색
export const THIRD_FORMS = new Set(["does", "doesn't", "has", "goes", "comes", "gets", "likes", "makes", "wants", "needs"]);

// 시험 빈칸에 쓰는 헷갈리는 단어 묶음
export const CONFUSION_GROUPS = {
  be: ["am", "are", "is"],
  do: ["do", "does", "did"],
  neg: ["don't", "doesn't", "didn't"],
  have: ["have", "has"],
  go: ["go", "goes"],
  come: ["come", "comes"],
  get: ["get", "gets"],
  like: ["like", "likes"],
  make: ["make", "makes"],
  want: ["want", "wants"],
  need: ["need", "needs"],
  will: ["will", "won't"],
  article: ["a", "an"],
  wh: ["who", "what", "when", "where", "why", "how", "which"],
};
