// 학습 기록을 이 기기의 localStorage에 저장한다.
import { MAIN_DANS } from "./data.js";

const KEY = "gugudan.v1";
const STEPS = ["see", "hide", "order"]; // 외우기 3단계 = 별 3개

const blank = () => ({ progress: {}, wrong: {}, best: {}, settings: { speed: "normal", unlockAll: false } });

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch {
    return blank();
  }
}

let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 저장이 막힌 환경(시크릿 창 등)에서는 이번 세션 동안만 유지
  }
}

export const store = {
  stars(id) {
    const p = state.progress[id] || {};
    return STEPS.filter((s) => p[s]).length;
  },
  stepDone(id, step) {
    return !!state.progress[id]?.[step];
  },
  markStep(id, step) {
    const before = this.stars(id);
    state.progress[id] = { ...state.progress[id], [step]: true };
    save();
    return this.stars(id) > before;
  },
  passed(id) {
    return this.stars(id) === STEPS.length;
  },
  passedCount() {
    return MAIN_DANS.filter((d) => this.passed(d.id)).length;
  },
  bonusOpen() {
    return state.settings.unlockAll || this.passedCount() === MAIN_DANS.length;
  },
  // 시험 결과로 단별 틀린 개수를 갱신 (다 맞히면 내 묶음에서 빠짐)
  recordQuiz(perDan) {
    for (const [id, r] of Object.entries(perDan)) {
      if (r.wrong > 0) state.wrong[id] = r.wrong;
      else delete state.wrong[id];
    }
    save();
  },
  wrongIds() {
    return Object.keys(state.wrong);
  },
  // 게임 최고 기록. lower=true면 작을수록 좋은 기록(짝꿍 카드 시도 횟수)
  best(game) {
    return state.best[game];
  },
  setBest(game, score, lower = false) {
    const old = state.best[game];
    if (old !== undefined && (lower ? score >= old : score <= old)) return false;
    state.best = { ...state.best, [game]: score };
    save();
    return true;
  },
  get settings() {
    return state.settings;
  },
  setSetting(k, v) {
    state.settings = { ...state.settings, [k]: v };
    save();
  },
  // 학습 기록만 지운다. 학습자 이름과 소개를 봤는지는 남긴다
  reset() {
    const { learner, welcomed } = state.settings;
    state = blank();
    state.settings = { ...state.settings, learner, welcomed };
    save();
  },
};
