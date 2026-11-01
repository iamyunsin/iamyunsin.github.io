<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

// Core Inputs
const currentAge = ref<number>(28);
const currentSavings = ref<number>(300000);
const monthlyContribution = ref<number>(8000);
const expectedAnnualReturn = ref<number>(7.5); // %
const expectedInflation = ref<number>(2.5); // %
const targetMonthlyExpense = ref<number>(10000); // In today's purchasing power
const safeWithdrawalRate = ref<number>(4.0); // 4.0% Trinity Study default
const projectionYears = ref<number>(30);

// Interactive hover year on SVG chart
const hoveredYearIdx = ref<number | null>(null);

// Quick Return Presets
function applyReturnPreset(rate: number) {
  expectedAnnualReturn.value = rate;
}

// Target FIRE Numbers (in today's real purchasing power)
const annualExpenseToday = computed(() => Math.max(0, (targetMonthlyExpense.value || 0) * 12));

const standardFireTargetReal = computed(() => {
  const swr = Math.max(0.5, safeWithdrawalRate.value || 4.0) / 100;
  return annualExpenseToday.value / swr;
});

const leanFireTargetReal = computed(() => standardFireTargetReal.value * 0.7);
const fatFireTargetReal = computed(() => standardFireTargetReal.value * 1.5);

// Real (inflation-adjusted) annual return rate: (1 + r_nom) / (1 + i) - 1
const realAnnualReturnRate = computed(() => {
  const rNom = (expectedAnnualReturn.value || 0) / 100;
  const inf = (expectedInflation.value || 0) / 100;
  return (1 + rNom) / (1 + inf) - 1;
});

// Coast FIRE (Barista/滑行 FIRE): How much principal is needed TODAY so that with ¥0 future contributions,
// real wealth grows to standardFireTargetReal by age 60
const coastFireTargetToday = computed(() => {
  const yearsTo60 = Math.max(1, 60 - (currentAge.value || 28));
  const rReal = realAnnualReturnRate.value;
  if (rReal <= 0) return standardFireTargetReal.value;
  return standardFireTargetReal.value / Math.pow(1 + rReal, yearsTo60);
});

export interface YearlyProjectionRow {
  yearOffset: number;
  age: number;
  cumulativePrincipal: number;
  nominalWealth: number;
  nominalGain: number;
  realWealth: number; // In today's purchasing power
  realGain: number;
  nominalFireTargetThatYear: number;
  monthlyPassiveIncomeReal: number;
  monthlyPassiveIncomeNominal: number;
  fireProgressPct: number;
  milestoneTag: 'none' | 'lean' | 'standard' | 'fat';
}

const projectionRows = computed<YearlyProjectionRow[]>(() => {
  const rows: YearlyProjectionRow[] = [];
  const startAge = Math.max(18, Math.min(80, currentAge.value || 28));
  const initPrincipal = Math.max(0, currentSavings.value || 0);
  const monthlySave = Math.max(0, monthlyContribution.value || 0);
  const rNomAnnual = (expectedAnnualReturn.value || 0) / 100;
  const infAnnual = (expectedInflation.value || 0) / 100;
  const rNomMonthly = rNomAnnual / 12;
  const swr = Math.max(0.5, safeWithdrawalRate.value || 4.0) / 100;
  const years = Math.max(5, Math.min(50, projectionYears.value || 30));

  let nomBalance = initPrincipal;
  let cumPrincipal = initPrincipal;

  for (let y = 0; y <= years; y++) {
    if (y > 0) {
      for (let m = 0; m < 12; m++) {
        nomBalance = nomBalance * (1 + rNomMonthly) + monthlySave;
        cumPrincipal += monthlySave;
      }
    }

    const inflationFactor = Math.pow(1 + infAnnual, y);
    const realWealth = inflationFactor > 0 ? nomBalance / inflationFactor : nomBalance;
    const nominalGain = Math.max(0, nomBalance - cumPrincipal);
    const realGain = Math.max(0, realWealth - cumPrincipal);
    const nominalFireTargetThatYear = standardFireTargetReal.value * inflationFactor;

    const monthlyPassiveIncomeReal = (realWealth * swr) / 12;
    const monthlyPassiveIncomeNominal = (nomBalance * swr) / 12;
    const fireProgressPct =
      standardFireTargetReal.value > 0
        ? Math.min(999, (realWealth / standardFireTargetReal.value) * 100)
        : 0;

    let milestoneTag: 'none' | 'lean' | 'standard' | 'fat' = 'none';
    if (realWealth >= fatFireTargetReal.value && fatFireTargetReal.value > 0) {
      milestoneTag = 'fat';
    } else if (realWealth >= standardFireTargetReal.value && standardFireTargetReal.value > 0) {
      milestoneTag = 'standard';
    } else if (realWealth >= leanFireTargetReal.value && leanFireTargetReal.value > 0) {
      milestoneTag = 'lean';
    }

    rows.push({
      yearOffset: y,
      age: startAge + y,
      cumulativePrincipal: cumPrincipal,
      nominalWealth: nomBalance,
      nominalGain,
      realWealth,
      realGain,
      nominalFireTargetThatYear,
      monthlyPassiveIncomeReal,
      monthlyPassiveIncomeNominal,
      fireProgressPct,
      milestoneTag,
    });
  }

  return rows;
});

// Find exact years to Lean FIRE, Standard FIRE, and Fat FIRE (up to 60 years simulation)
const fireMilestones = computed(() => {
  const startAge = Math.max(18, Math.min(80, currentAge.value || 28));
  const initPrincipal = Math.max(0, currentSavings.value || 0);
  const monthlySave = Math.max(0, monthlyContribution.value || 0);
  const rNomAnnual = (expectedAnnualReturn.value || 0) / 100;
  const infAnnual = (expectedInflation.value || 0) / 100;
  const rNomMonthly = rNomAnnual / 12;

  let nomBalance = initPrincipal;
  let leanYear: number | null = initPrincipal >= leanFireTargetReal.value ? 0 : null;
  let stdYear: number | null = initPrincipal >= standardFireTargetReal.value ? 0 : null;
  let fatYear: number | null = initPrincipal >= fatFireTargetReal.value ? 0 : null;
  let stdNominalAtHit = standardFireTargetReal.value;

  for (let m = 1; m <= 60 * 12; m++) {
    nomBalance = nomBalance * (1 + rNomMonthly) + monthlySave;
    const yExact = m / 12;
    const infFactor = Math.pow(1 + infAnnual, yExact);
    const realW = nomBalance / infFactor;

    if (leanYear === null && realW >= leanFireTargetReal.value) {
      leanYear = Number(yExact.toFixed(1));
    }
    if (stdYear === null && realW >= standardFireTargetReal.value) {
      stdYear = Number(yExact.toFixed(1));
      stdNominalAtHit = nomBalance;
    }
    if (fatYear === null && realW >= fatFireTargetReal.value) {
      fatYear = Number(yExact.toFixed(1));
    }
  }

  const currentProgressPct =
    standardFireTargetReal.value > 0
      ? Math.min(100, (initPrincipal / standardFireTargetReal.value) * 100)
      : 0;

  return {
    currentProgressPct,
    isCoastFireReached: initPrincipal >= coastFireTargetToday.value,
    lean: {
      targetReal: leanFireTargetReal.value,
      years: leanYear,
      retireAge: leanYear !== null ? Math.round((startAge + leanYear) * 10) / 10 : null,
    },
    standard: {
      targetReal: standardFireTargetReal.value,
      targetNominalAtHit: stdNominalAtHit,
      years: stdYear,
      retireAge: stdYear !== null ? Math.round((startAge + stdYear) * 10) / 10 : null,
    },
    fat: {
      targetReal: fatFireTargetReal.value,
      years: fatYear,
      retireAge: fatYear !== null ? Math.round((startAge + fatYear) * 10) / 10 : null,
    },
  };
});

// SVG Chart Geometry Calculations
const chartConfig = computed(() => {
  const width = 720;
  const height = 270;
  const padLeft = 64;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const rows = projectionRows.value;
  const maxVal = Math.max(
    100000,
    ...rows.map((r) => Math.max(r.nominalWealth, r.realWealth, standardFireTargetReal.value * 1.1))
  );

  const toX = (idx: number) =>
    padLeft + (rows.length > 1 ? (idx / (rows.length - 1)) * plotW : 0);
  const toY = (val: number) => padTop + plotH - Math.min(1, Math.max(0, val / maxVal)) * plotH;

  const nominalPath = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(r.nominalWealth).toFixed(1)}`)
    .join(' ');

  const realPath = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(r.realWealth).toFixed(1)}`)
    .join(' ');

  const principalPath = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(r.cumulativePrincipal).toFixed(1)}`)
    .join(' ');

  const fireLineY = toY(standardFireTargetReal.value);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    val: maxVal * t,
    y: toY(maxVal * t),
  }));

  return {
    width,
    height,
    padLeft,
    padRight,
    padTop,
    padBottom,
    plotW,
    plotH,
    toX,
    toY,
    nominalPath,
    realPath,
    principalPath,
    fireLineY,
    yTicks,
  };
});

const inspectedRow = computed(() => {
  const rows = projectionRows.value;
  if (hoveredYearIdx.value !== null && rows[hoveredYearIdx.value]) {
    return rows[hoveredYearIdx.value];
  }
  return rows[rows.length - 1];
});

function fmtMoney(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtCompact(n: number): string {
  if (isEn.value) {
    if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `¥${(n / 1_000).toFixed(0)}k`;
    return `¥${n.toFixed(0)}`;
  } else {
    if (n >= 10000) return `¥${(n / 10000).toFixed(1)}万`;
    return `¥${n.toFixed(0)}`;
  }
}
</script>

<template>
  <div class="compound-fire-tool">
    <div class="workspace-grid">
      <!-- Left: Inputs & Assumptions -->
      <div class="input-panel">
        <div class="panel-header">
          <h2 class="panel-title">
            {{ isEn ? '🌱 Compound SIP & FIRE Parameters' : '🌱 复利定投 & FIRE 财务自由参数设定' }}
          </h2>
          <span class="badge-pill">
            {{ isEn ? 'Real Purchasing Power Adjusted' : '内置通胀折现真实购买力引擎' }}
          </span>
        </div>

        <div class="input-two-col">
          <div class="field-box">
            <label>{{ isEn ? 'Current Age' : '当前年龄 (岁)' }}</label>
            <input v-model.number="currentAge" type="number" min="18" max="75" class="num-input" />
          </div>
          <div class="field-box">
            <label>{{ isEn ? 'Projection Horizon (Yrs)' : '复利推演年限 (年)' }}</label>
            <input v-model.number="projectionYears" type="number" min="5" max="50" class="num-input" />
          </div>
        </div>

        <!-- Initial Principal -->
        <div class="field-box">
          <div class="label-row">
            <label>{{ isEn ? 'Current Investable Savings (¥)' : '当前已攒初始投资本金 (元)' }}</label>
            <div class="mini-pills">
              <button
                v-for="p in [100000, 300000, 500000, 1000000]"
                :key="p"
                type="button"
                class="mini-pill"
                :class="{ active: currentSavings === p }"
                @click="currentSavings = p"
              >
                {{ isEn ? `¥${p / 1000}k` : `${p / 10000}万` }}
              </button>
            </div>
          </div>
          <input v-model.number="currentSavings" type="number" min="0" step="10000" class="num-input" />
        </div>

        <!-- Monthly Investment Contribution -->
        <div class="field-box">
          <div class="label-row">
            <label>{{ isEn ? 'Monthly Investment Contribution (¥/mo)' : '每月定投储蓄金额 (元/月)' }}</label>
            <div class="mini-pills">
              <button
                v-for="m in [3000, 5000, 8000, 15000, 25000]"
                :key="m"
                type="button"
                class="mini-pill"
                :class="{ active: monthlyContribution === m }"
                @click="monthlyContribution = m"
              >
                ¥{{ m.toLocaleString() }}
              </button>
            </div>
          </div>
          <input v-model.number="monthlyContribution" type="number" min="0" step="500" class="num-input" />
        </div>

        <!-- Return & Inflation Rates -->
        <div class="field-box">
          <div class="label-row">
            <label>
              {{ isEn ? 'Expected Annual Return (%)' : '预期年化投资收益率 (%)' }}
            </label>
            <div class="mini-pills">
              <button type="button" class="mini-pill" @click="applyReturnPreset(4.5)">
                {{ isEn ? '4.5% Conservative' : '4.5% 稳健红利' }}
              </button>
              <button type="button" class="mini-pill" @click="applyReturnPreset(7.5)">
                {{ isEn ? '7.5% Balanced' : '7.5% 股债平衡' }}
              </button>
              <button type="button" class="mini-pill" @click="applyReturnPreset(10.0)">
                {{ isEn ? '10% Equity Index' : '10% 标普/纳指' }}
              </button>
            </div>
          </div>
          <div class="slider-row">
            <input
              v-model.number="expectedAnnualReturn"
              type="range"
              min="1"
              max="20"
              step="0.5"
              class="range-slider"
            />
            <span class="slider-val">{{ expectedAnnualReturn.toFixed(1) }}%</span>
          </div>
        </div>

        <div class="input-two-col">
          <div class="field-box">
            <label>{{ isEn ? 'Expected Annual Inflation (%)' : '预期年均通胀率 (%)' }}</label>
            <div class="slider-row">
              <input
                v-model.number="expectedInflation"
                type="range"
                min="0"
                max="8"
                step="0.5"
                class="range-slider"
              />
              <span class="slider-val">{{ expectedInflation.toFixed(1) }}%</span>
            </div>
          </div>
          <div class="field-box">
            <label>{{ isEn ? 'Real Return (After Inflation)' : '扣除通胀后真实年化收益率' }}</label>
            <div class="readonly-stat">
              {{ (realAnnualReturnRate * 100).toFixed(2) }}% / {{ isEn ? 'yr' : '年' }}
            </div>
          </div>
        </div>

        <!-- Retirement Monthly Spending & SWR -->
        <div class="field-box highlight-box">
          <div class="label-row">
            <label>
              {{ isEn ? "Target Retirement Monthly Spending (Today's Purchasing Power)" : '退休后理想月支出（按今日物价购买力算）' }}
            </label>
          </div>
          <input
            v-model.number="targetMonthlyExpense"
            type="number"
            min="1000"
            step="1000"
            class="num-input"
          />

          <div class="label-row" style="margin-top: 6px">
            <label>
              {{ isEn ? 'Safe Withdrawal Rate (SWR %)' : '安全提领率 (SWR · 经典4%法则)' }}
            </label>
            <div class="mini-pills">
              <button
                v-for="swr in [3.0, 3.5, 4.0, 4.5]"
                :key="swr"
                type="button"
                class="mini-pill"
                :class="{ active: safeWithdrawalRate === swr }"
                @click="safeWithdrawalRate = swr"
              >
                {{ swr.toFixed(1) }}% ({{ Math.round(100 / swr) }}x)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: FIRE Target & Milestones Dashboard -->
      <div class="result-panel">
        <!-- Hero FIRE Number Card -->
        <div class="hero-summary-card">
          <div class="hero-top">
            <div>
              <span class="hero-eyebrow">
                {{ isEn ? "STANDARD FIRE NUMBER (TODAY'S PURCHASING POWER)" : '标准 FIRE 财务自由目标本金（折合今日购买力）' }}
              </span>
              <div class="hero-amount">¥{{ fmtMoney(fireMilestones.standard.targetReal) }}</div>
              <span class="hero-sub">
                {{
                  isEn
                    ? `Covers ¥${fmtMoney(targetMonthlyExpense)}/mo (¥${fmtMoney(annualExpenseToday)}/yr) at ${safeWithdrawalRate}% SWR`
                    : `按 ${safeWithdrawalRate}% 提领率，可永续覆盖每月 ¥${fmtMoney(targetMonthlyExpense)}（年支出 ¥${fmtMoney(annualExpenseToday)}）`
                }}
              </span>
            </div>

            <div class="countdown-box">
              <span class="c-label">
                {{ isEn ? 'Estimated Time to FIRE' : '预计达成财务自由还需' }}
              </span>
              <span class="c-val">
                {{
                  fireMilestones.standard.years !== null
                    ? isEn
                      ? `${fireMilestones.standard.years} Yrs (Age ${fireMilestones.standard.retireAge})`
                      : `${fireMilestones.standard.years} 年（${fireMilestones.standard.retireAge} 岁退休）`
                    : isEn
                      ? '> 60 Years'
                      : '需提高定投或收益率'
                }}
              </span>
            </div>
          </div>

          <!-- 3-Tier FIRE Milestones Grid -->
          <div class="milestones-grid">
            <div class="ms-card">
              <span class="ms-tag">🌱 Lean FIRE (70%)</span>
              <strong class="ms-amt">¥{{ fmtCompact(fireMilestones.lean.targetReal) }}</strong>
              <span class="ms-time">
                {{
                  fireMilestones.lean.years !== null
                    ? isEn
                      ? `In ${fireMilestones.lean.years} yrs (Age ${fireMilestones.lean.retireAge})`
                      : `${fireMilestones.lean.years} 年后达成 (${fireMilestones.lean.retireAge}岁)`
                    : isEn
                      ? 'Not reached'
                      : '暂未达成'
                }}
              </span>
            </div>

            <div class="ms-card active-ms">
              <span class="ms-tag">🔥 Standard FIRE (100%)</span>
              <strong class="ms-amt">¥{{ fmtCompact(fireMilestones.standard.targetReal) }}</strong>
              <span class="ms-time">
                {{
                  fireMilestones.standard.years !== null
                    ? isEn
                      ? `In ${fireMilestones.standard.years} yrs (Age ${fireMilestones.standard.retireAge})`
                      : `${fireMilestones.standard.years} 年后达成 (${fireMilestones.standard.retireAge}岁)`
                    : isEn
                      ? 'Not reached'
                      : '暂未达成'
                }}
              </span>
            </div>

            <div class="ms-card">
              <span class="ms-tag">💎 Fat FIRE (150%)</span>
              <strong class="ms-amt">¥{{ fmtCompact(fireMilestones.fat.targetReal) }}</strong>
              <span class="ms-time">
                {{
                  fireMilestones.fat.years !== null
                    ? isEn
                      ? `In ${fireMilestones.fat.years} yrs (Age ${fireMilestones.fat.retireAge})`
                      : `${fireMilestones.fat.years} 年后达成 (${fireMilestones.fat.retireAge}岁)`
                    : isEn
                      ? 'Not reached'
                      : '暂未达成'
                }}
              </span>
            </div>
          </div>

          <!-- Coast FIRE Indicator -->
          <div class="coast-bar">
            <span>
              🏖️
              {{
                isEn
                  ? `Coast FIRE Threshold Today (to retire at 60 with ¥0 more savings):`
                  : `Coast FIRE（滑行半退休）今日所需本金阈值（后续0定投靠复利60岁退休）：`
              }}
              <strong>¥{{ fmtMoney(coastFireTargetToday) }}</strong>
            </span>
            <span class="coast-status" :class="{ reached: fireMilestones.isCoastFireReached }">
              {{
                fireMilestones.isCoastFireReached
                  ? isEn
                    ? '✅ Already Reached!'
                    : '✅ 您已跨越 Coast FIRE！'
                  : isEn
                    ? `${fireMilestones.currentProgressPct.toFixed(1)}% of Standard FIRE`
                    : `当前本金已达成标准 FIRE 的 ${fireMilestones.currentProgressPct.toFixed(1)}%`
              }}
            </span>
          </div>
        </div>

        <!-- Interactive SVG Compound Growth Curve -->
        <div class="chart-card">
          <div class="chart-head">
            <div>
              <h3 class="chart-title">
                📈 {{ isEn ? 'Compound Wealth Snowball Curve' : '复利滚雪球曲线（名义总资产 vs 真实购买力 vs 累计本金）' }}
              </h3>
              <p class="chart-sub">
                {{
                  isEn
                    ? `Year ${inspectedRow.yearOffset} (Age ${inspectedRow.age}): Real Wealth ¥${fmtMoney(inspectedRow.realWealth)} · Nominal ¥${fmtMoney(inspectedRow.nominalWealth)} · Principal ¥${fmtMoney(inspectedRow.cumulativePrincipal)}`
                    : `第 ${inspectedRow.yearOffset} 年 (${inspectedRow.age}岁)：真实购买力 ¥${fmtMoney(inspectedRow.realWealth)} · 名义账面资产 ¥${fmtMoney(inspectedRow.nominalWealth)} · 累计投入本金 ¥${fmtMoney(inspectedRow.cumulativePrincipal)}`
                }}
              </p>
            </div>
            <div class="chart-legend">
              <span class="leg-item"><i class="dot nom"></i>{{ isEn ? 'Nominal' : '名义总资产' }}</span>
              <span class="leg-item"><i class="dot real"></i>{{ isEn ? 'Real (Inflation-Adj)' : '真实购买力' }}</span>
              <span class="leg-item"><i class="dot prin"></i>{{ isEn ? 'Principal' : '累计本金' }}</span>
            </div>
          </div>

          <div class="svg-container">
            <svg :viewBox="`0 0 ${chartConfig.width} ${chartConfig.height}`" class="wealth-svg">
              <!-- Horizontal Grid Lines -->
              <g v-for="(tick, idx) in chartConfig.yTicks" :key="idx">
                <line
                  :x1="chartConfig.padLeft"
                  :x2="chartConfig.width - chartConfig.padRight"
                  :y1="tick.y"
                  :y2="tick.y"
                  stroke="var(--border-color)"
                  stroke-dasharray="3 3"
                />
                <text
                  :x="chartConfig.padLeft - 8"
                  :y="tick.y + 4"
                  text-anchor="end"
                  class="svg-axis-label"
                >
                  {{ fmtCompact(tick.val) }}
                </text>
              </g>

              <!-- Standard FIRE Target Threshold Line -->
              <line
                v-if="chartConfig.fireLineY >= chartConfig.padTop"
                :x1="chartConfig.padLeft"
                :x2="chartConfig.width - chartConfig.padRight"
                :y1="chartConfig.fireLineY"
                :y2="chartConfig.fireLineY"
                stroke="#ef4444"
                stroke-width="1.8"
                stroke-dasharray="6 4"
              />
              <text
                v-if="chartConfig.fireLineY >= chartConfig.padTop"
                :x="chartConfig.width - chartConfig.padRight - 6"
                :y="chartConfig.fireLineY - 6"
                text-anchor="end"
                class="svg-fire-label"
              >
                🔥 FIRE Target ({{ fmtCompact(standardFireTargetReal) }})
              </text>

              <!-- Principal Curve -->
              <path :d="chartConfig.principalPath" fill="none" stroke="#94a3b8" stroke-width="2.2" />

              <!-- Real Purchasing Power Curve -->
              <path :d="chartConfig.realPath" fill="none" stroke="#10b981" stroke-width="3" />

              <!-- Nominal Wealth Curve -->
              <path :d="chartConfig.nominalPath" fill="none" stroke="var(--accent)" stroke-width="2.5" />

              <!-- Interactive Hover Points -->
              <g
                v-for="(r, idx) in projectionRows"
                :key="r.yearOffset"
                class="hover-col"
                @mouseenter="hoveredYearIdx = idx"
              >
                <circle
                  :cx="chartConfig.toX(idx)"
                  :cy="chartConfig.toY(r.realWealth)"
                  r="4"
                  fill="#10b981"
                />
                <text
                  v-if="idx % Math.max(1, Math.floor(projectionRows.length / 6)) === 0 || idx === projectionRows.length - 1"
                  :x="chartConfig.toX(idx)"
                  :y="chartConfig.height - 10"
                  text-anchor="middle"
                  class="svg-axis-label"
                >
                  {{ r.age }}{{ isEn ? 'y' : '岁' }}
                </text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom: Year-by-Year Projection Schedule -->
    <div class="table-section">
      <div class="section-head">
        <h3 class="section-title">
          🗓️ {{ isEn ? 'Year-by-Year Compound Growth & Passive Income Schedule' : '逐年复利资产增长、通胀折现购买力与月被动收入明细表' }}
        </h3>
        <p class="section-desc">
          {{
            isEn
              ? 'Compares cumulative principal contributed vs. compound gains and real monthly passive income at your chosen Safe Withdrawal Rate.'
              : '清晰展示每一年的累计投入本金、复利投资总收益、账面名义总资产、折合今日物价的真实购买力，以及按 SWR 安全提领率可产生的月被动现金流。'
          }}
        </p>
      </div>

      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ isEn ? 'Year / Age' : '年份 / 年龄' }}</th>
              <th>{{ isEn ? 'Cumulative Principal' : '累计投入本金' }}</th>
              <th>{{ isEn ? 'Nominal Net Worth' : '年末账面名义总资产' }}</th>
              <th>{{ isEn ? "Real Wealth (Today's ¥)" : '折合今日真实购买力' }}</th>
              <th>{{ isEn ? 'Real Passive Income/Mo' : '可提领月被动收入(真实)' }}</th>
              <th>{{ isEn ? 'FIRE Progress' : 'FIRE 达成进度' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in projectionRows"
              :key="row.yearOffset"
              :class="{ 'fire-reached-row': row.milestoneTag === 'standard' || row.milestoneTag === 'fat' }"
            >
              <td class="mono-bold">
                {{ isEn ? `Yr ${row.yearOffset} (Age ${row.age})` : `第 ${row.yearOffset} 年 (${row.age}岁)` }}
              </td>
              <td class="mono">¥{{ fmtMoney(row.cumulativePrincipal) }}</td>
              <td class="mono">¥{{ fmtMoney(row.nominalWealth) }}</td>
              <td class="mono real-col">¥{{ fmtMoney(row.realWealth) }}</td>
              <td class="mono passive-col">¥{{ fmtMoney(row.monthlyPassiveIncomeReal) }}/{{ isEn ? 'mo' : '月' }}</td>
              <td>
                <span class="ms-pill" :class="row.milestoneTag">
                  {{ row.fireProgressPct.toFixed(0) }}%
                  <template v-if="row.milestoneTag === 'fat'">💎 Fat FIRE</template>
                  <template v-else-if="row.milestoneTag === 'standard'">🔥 FIRE</template>
                  <template v-else-if="row.milestoneTag === 'lean'">🌱 Lean</template>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.compound-fire-tool {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 20px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.input-panel,
.result-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--border-color);
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.badge-pill {
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.input-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
}

.field-box {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 11px 13px;
  border-radius: 12px;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);

  label {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-primary);
  }

  &.highlight-box {
    border-color: var(--accent-border);
  }
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
}

.mini-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.mini-pill {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;

  &:hover,
  &.active {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-soft);
  }
}

.num-input {
  padding: 8px 11px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 800;
  outline: none;

  &:focus {
    border-color: var(--accent);
  }
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
}

.range-slider {
  flex: 1;
  accent-color: var(--accent);
}

.slider-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13.5px;
  font-weight: 800;
  color: var(--accent);
  min-width: 44px;
  text-align: right;
}

.readonly-stat {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 800;
  color: #059669;
}

/* Right Dashboard */
.hero-summary-card {
  background: var(--bg-surface);
  border: 2px solid var(--accent);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-eyebrow {
  font-size: 11px;
  font-weight: 800;
  color: var(--accent);
}

.hero-amount {
  font-size: 30px;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);
  margin: 4px 0;
}

.hero-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.countdown-box {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.c-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
}

.c-val {
  font-size: 15.5px;
  font-weight: 800;
  color: var(--accent);
  margin-top: 2px;
}

.milestones-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
}

.ms-card {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 3px;

  &.active-ms {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
}

.ms-tag {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-secondary);
}

.ms-amt {
  font-size: 16px;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);
}

.ms-time {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--accent);
}

.coast-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 8px;
  background: var(--bg-muted);
  font-size: 12px;
  color: var(--text-secondary);

  strong {
    color: var(--text-primary);
    font-family: 'JetBrains Mono', monospace;
  }
}

.coast-status {
  font-weight: 700;
  color: var(--accent);

  &.reached {
    color: #059669;
  }
}

/* SVG Chart Card */
.chart-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
}

.chart-sub {
  margin: 0;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
}

.chart-legend {
  display: flex;
  gap: 10px;
  font-size: 11.5px;
  color: var(--text-secondary);
}

.leg-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;

  &.nom {
    background: var(--accent);
  }
  &.real {
    background: #10b981;
  }
  &.prin {
    background: #94a3b8;
  }
}

.svg-container {
  width: 100%;
  overflow: hidden;
}

.wealth-svg {
  width: 100%;
  height: auto;
  display: block;
}

.svg-axis-label {
  font-size: 10.5px;
  font-family: 'JetBrains Mono', monospace;
  fill: var(--text-secondary);
}

.svg-fire-label {
  font-size: 11px;
  font-weight: 700;
  fill: #ef4444;
}

.hover-col {
  cursor: pointer;
}

/* Table Section */
.table-section {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.section-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.table-scroll {
  overflow-x: auto;
  max-height: 440px;
  overflow-y: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 640px;

  th,
  td {
    padding: 9px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  th {
    position: sticky;
    top: 0;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    background: var(--bg-muted);
    z-index: 1;
  }

  tr.fire-reached-row {
    background: rgba(16, 185, 129, 0.06);
  }
}

.mono {
  font-family: 'JetBrains Mono', monospace;
}

.mono-bold {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: var(--text-primary);
}

.real-col {
  font-weight: 800;
  color: #059669;
}

.passive-col {
  font-weight: 700;
  color: var(--accent);
}

.ms-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--bg-muted);
  color: var(--text-secondary);

  &.lean {
    background: rgba(59, 130, 246, 0.12);
    color: #2563eb;
  }

  &.standard,
  &.fat {
    background: rgba(16, 185, 129, 0.15);
    color: #059669;
  }
}
</style>
