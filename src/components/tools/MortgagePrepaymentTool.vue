<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
  initialLoanType?: 'commercial' | 'provident' | 'combined';
  initialScheduleMode?: 'original' | 'shorten' | 'reduce';
  initialPrepayWan?: number;
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'zh',
  initialLoanType: 'commercial',
  initialScheduleMode: 'shorten',
  initialPrepayWan: 30,
});

const isEn = computed(() => props.lang === 'en');

// Loan Category: 'commercial' | 'provident' | 'combined'
const loanType = ref<'commercial' | 'provident' | 'combined'>(props.initialLoanType);

// Repayment Method: 'epi' (Equal Principal & Interest 等额本息) | 'ep' (Equal Principal 等额本金)
const repaymentMethod = ref<'epi' | 'ep'>('epi');

// Inputs (in 万元 for amounts)
const commercialAmountWan = ref<number>(120);
const commercialRate = ref<number>(3.35);
const providentAmountWan = ref<number>(60);
const providentRate = ref<number>(2.6);
const loanYears = ref<number>(30);

// Prepayment Engine Inputs
const monthsPaid = ref<number>(36); // 3 years already paid
const prepayAmountWan = ref<number>(props.initialPrepayWan); // Lump sum prepayment in 万元
const penaltyRatePct = ref<number>(0); // Prepayment penalty %
const investReturnRate = ref<number>(2.25); // Safe investment return % (e.g., treasury/deposit)

// Schedule table controls
const scheduleMode = ref<'original' | 'shorten' | 'reduce'>(props.initialScheduleMode);
const showAllMonths = ref<boolean>(false);

const ratePresets = [
  { labelZh: '公积金 2.60%', labelEn: 'Provident 2.60%', rate: 2.6 },
  { labelZh: '首套商贷 3.10%', labelEn: 'Prime 3.10%', rate: 3.1 },
  { labelZh: '存量批量调整 3.35%', labelEn: 'Existing 3.35%', rate: 3.35 },
  { labelZh: '二套商贷 3.85%', labelEn: 'Second Home 3.85%', rate: 3.85 },
  { labelZh: '早期高息 4.65%', labelEn: 'Legacy 4.65%', rate: 4.65 },
];

// Effective total principal (in CNY) and weighted interest rate
const effectivePrincipalWan = computed(() => {
  if (loanType.value === 'commercial') return Math.max(1, commercialAmountWan.value || 0);
  if (loanType.value === 'provident') return Math.max(1, providentAmountWan.value || 0);
  return Math.max(1, (commercialAmountWan.value || 0) + (providentAmountWan.value || 0));
});

const effectiveAnnualRate = computed(() => {
  if (loanType.value === 'commercial') return Math.max(0.1, commercialRate.value || 0);
  if (loanType.value === 'provident') return Math.max(0.1, providentRate.value || 0);
  const cAmt = Math.max(0, commercialAmountWan.value || 0);
  const pAmt = Math.max(0, providentAmountWan.value || 0);
  const total = cAmt + pAmt;
  if (total <= 0) return 3.2;
  return (cAmt * (commercialRate.value || 0) + pAmt * (providentRate.value || 0)) / total;
});

const totalMonths = computed(() => Math.max(12, Math.min(360, Math.round((loanYears.value || 30) * 12))));

// Clamp monthsPaid and prepayAmountWan safely
const safeMonthsPaid = computed(() => {
  return Math.max(1, Math.min(totalMonths.value - 2, Math.round(monthsPaid.value || 1)));
});

interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remaining: number;
}

function generateSchedule(
  principalYuan: number,
  annualRatePct: number,
  months: number,
  method: 'epi' | 'ep'
): {
  schedule: AmortRow[];
  firstPayment: number;
  monthlyDecrease: number;
  totalInterest: number;
  totalPayment: number;
} {
  const r = annualRatePct / 100 / 12;
  const schedule: AmortRow[] = [];
  let remaining = principalYuan;
  let totalInterest = 0;

  if (method === 'epi') {
    const pow = Math.pow(1 + r, months);
    const monthlyPayment = r > 0 ? (principalYuan * r * pow) / (pow - 1) : principalYuan / months;

    for (let m = 1; m <= months; m++) {
      const interest = remaining * r;
      let principal = monthlyPayment - interest;
      if (m === months || principal > remaining) {
        principal = remaining;
      }
      remaining = Math.max(0, remaining - principal);
      totalInterest += interest;
      schedule.push({
        month: m,
        payment: principal + interest,
        principal,
        interest,
        remaining,
      });
    }

    return {
      schedule,
      firstPayment: monthlyPayment,
      monthlyDecrease: 0,
      totalInterest,
      totalPayment: principalYuan + totalInterest,
    };
  } else {
    const monthlyPrincipal = principalYuan / months;
    const monthlyDecrease = monthlyPrincipal * r;
    for (let m = 1; m <= months; m++) {
      const interest = remaining * r;
      const principal = m === months ? remaining : monthlyPrincipal;
      const payment = principal + interest;
      remaining = Math.max(0, remaining - principal);
      totalInterest += interest;
      schedule.push({
        month: m,
        payment,
        principal,
        interest,
        remaining,
      });
    }

    return {
      schedule,
      firstPayment: schedule[0]?.payment || 0,
      monthlyDecrease,
      totalInterest,
      totalPayment: principalYuan + totalInterest,
    };
  }
}

// Baseline Comparison: EPI vs EP on Original Loan
const baselineEpi = computed(() =>
  generateSchedule(effectivePrincipalWan.value * 10000, effectiveAnnualRate.value, totalMonths.value, 'epi')
);
const baselineEp = computed(() =>
  generateSchedule(effectivePrincipalWan.value * 10000, effectiveAnnualRate.value, totalMonths.value, 'ep')
);

const activeBaseline = computed(() => (repaymentMethod.value === 'epi' ? baselineEpi.value : baselineEp.value));

// Prepayment Decision Engine Calculation
const prepaymentAnalysis = computed(() => {
  const base = activeBaseline.value;
  const paidM = safeMonthsPaid.value;
  const r = effectiveAnnualRate.value / 100 / 12;

  const paidRows = base.schedule.slice(0, paidM);
  const interestPaidSoFar = paidRows.reduce((acc, row) => acc + row.interest, 0);
  const principalPaidSoFar = paidRows.reduce((acc, row) => acc + row.principal, 0);
  const remainingPrincipalBeforePrepay = base.schedule[paidM - 1]?.remaining || 0;
  const remainingOriginalInterest = Math.max(0, base.totalInterest - interestPaidSoFar);
  const remainingOriginalMonths = totalMonths.value - paidM;

  // Clamp prepayment lump sum so it doesn't exceed 98% of remaining principal
  const rawPrepayYuan = Math.max(1000, (prepayAmountWan.value || 0) * 10000);
  const actualPrepayYuan = Math.min(rawPrepayYuan, Math.max(0, remainingPrincipalBeforePrepay - 1000));
  const newRemainingPrincipal = Math.max(0, remainingPrincipalBeforePrepay - actualPrepayYuan);
  const penaltyFeeYuan = (actualPrepayYuan * Math.max(0, penaltyRatePct.value || 0)) / 100;

  // Plan A: Shorten Loan Term (Keep monthly payment approximately the same as month paidM)
  const currentMonthlyPayment = base.schedule[paidM - 1]?.payment || base.firstPayment;
  let shortenedNewMonths = 1;
  let planASchedule: AmortRow[] = [];
  let planARemainingInterest = 0;

  if (newRemainingPrincipal > 0) {
    if (repaymentMethod.value === 'epi') {
      // Solve n from M = P * r * (1+r)^n / ((1+r)^n - 1) => (1+r)^n = M / (M - P*r)
      const minRequiredPayment = newRemainingPrincipal * r;
      if (currentMonthlyPayment <= minRequiredPayment * 1.02) {
        shortenedNewMonths = remainingOriginalMonths;
      } else {
        const nExact = Math.log(currentMonthlyPayment / (currentMonthlyPayment - minRequiredPayment)) / Math.log(1 + r);
        shortenedNewMonths = Math.max(1, Math.min(remainingOriginalMonths, Math.ceil(nExact)));
      }
      const resA = generateSchedule(newRemainingPrincipal, effectiveAnnualRate.value, shortenedNewMonths, 'epi');
      planASchedule = resA.schedule;
      planARemainingInterest = resA.totalInterest;
    } else {
      // Equal Principal: keep monthly principal payment the same as before
      const origMonthlyPrincipal = (effectivePrincipalWan.value * 10000) / totalMonths.value;
      shortenedNewMonths = Math.max(1, Math.min(remainingOriginalMonths, Math.ceil(newRemainingPrincipal / origMonthlyPrincipal)));
      const resA = generateSchedule(newRemainingPrincipal, effectiveAnnualRate.value, shortenedNewMonths, 'ep');
      planASchedule = resA.schedule;
      planARemainingInterest = resA.totalInterest;
    }
  }

  const planATotalInterest = interestPaidSoFar + planARemainingInterest;
  const planAInterestSaved = Math.max(0, base.totalInterest - planATotalInterest);
  const planANetSaved = planAInterestSaved - penaltyFeeYuan;
  const monthsShortened = Math.max(0, remainingOriginalMonths - shortenedNewMonths);

  // Plan B: Reduce Monthly Payment (Keep remaining term unchanged)
  const resB =
    newRemainingPrincipal > 0
      ? generateSchedule(newRemainingPrincipal, effectiveAnnualRate.value, remainingOriginalMonths, repaymentMethod.value)
      : { schedule: [], firstPayment: 0, monthlyDecrease: 0, totalInterest: 0, totalPayment: 0 };

  const planBRemainingInterest = resB.totalInterest;
  const planBTotalInterest = interestPaidSoFar + planBRemainingInterest;
  const planBInterestSaved = Math.max(0, base.totalInterest - planBTotalInterest);
  const planBNetSaved = planBInterestSaved - penaltyFeeYuan;
  const monthlyPaymentDrop = Math.max(0, currentMonthlyPayment - resB.firstPayment);

  // Interest paid ratio & investment spread
  const interestPaidPct = base.totalInterest > 0 ? (interestPaidSoFar / base.totalInterest) * 100 : 0;
  const rateSpread = effectiveAnnualRate.value - (investReturnRate.value || 0);

  return {
    interestPaidSoFar,
    principalPaidSoFar,
    remainingPrincipalBeforePrepay,
    remainingOriginalInterest,
    remainingOriginalMonths,
    actualPrepayYuan,
    newRemainingPrincipal,
    penaltyFeeYuan,
    interestPaidPct,
    rateSpread,
    currentMonthlyPayment,
    planA: {
      newMonths: shortenedNewMonths,
      monthsShortened,
      firstPayment: planASchedule[0]?.payment || 0,
      remainingInterest: planARemainingInterest,
      totalInterest: planATotalInterest,
      interestSaved: planAInterestSaved,
      netSaved: planANetSaved,
      schedule: planASchedule,
    },
    planB: {
      newMonths: remainingOriginalMonths,
      firstPayment: resB.firstPayment,
      monthlyPaymentDrop,
      remainingInterest: planBRemainingInterest,
      totalInterest: planBTotalInterest,
      interestSaved: planBInterestSaved,
      netSaved: planBNetSaved,
      schedule: resB.schedule,
    },
  };
});

// Active schedule for the amortization table
const activeScheduleRows = computed<AmortRow[]>(() => {
  if (scheduleMode.value === 'original') {
    return activeBaseline.value.schedule;
  }
  const paidRows = activeBaseline.value.schedule.slice(0, safeMonthsPaid.value);
  const futureRows =
    scheduleMode.value === 'shorten'
      ? prepaymentAnalysis.value.planA.schedule
      : prepaymentAnalysis.value.planB.schedule;

  return [
    ...paidRows,
    ...futureRows.map((r, idx) => ({
      ...r,
      month: safeMonthsPaid.value + idx + 1,
    })),
  ];
});

const displayedScheduleRows = computed(() => {
  if (showAllMonths.value) return activeScheduleRows.value;
  return activeScheduleRows.value.slice(0, 36);
});

function formatWan(yuan: number): string {
  const wan = yuan / 10000;
  return isEn.value ? `¥${(yuan / 1000).toFixed(1)}k` : `¥${wan.toFixed(2)}万`;
}

function formatYuan(yuan: number): string {
  return `¥${yuan.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
</script>

<template>
  <div class="mortgage-tool-shell">
    <!-- Top Header -->
    <div class="tool-header-card">
      <div class="header-content">
        <span class="category-chip">
          {{ isEn ? '🏠 Mortgage & Prepayment Decision Engine' : '🏠 房贷精算与提前还贷决策引擎' }}
        </span>
        <h2 class="tool-title">
          {{
            isEn
              ? 'Mortgage Amortization & Early Prepayment Optimizer'
              : '商贷/公积金/组合贷精算 & 提前还贷【缩短年限 vs 减少月供】决策器'
          }}
        </h2>
        <p class="tool-desc">
          {{
            isEn
              ? 'Compare Equal Principal & Interest vs Equal Principal side by side. Simulate lump-sum prepayments to quantify exact interest saved, term reduction, and investment opportunity cost.'
              : '一键对比等额本息与等额本金全周期利息差额；内置提前还贷划算度诊断模型，精准测算已还利息占比、缩短年限与减少月供的省息差距及理财机会成本。'
          }}
        </p>
      </div>
    </div>

    <!-- Main Control Grid -->
    <div class="control-grid">
      <!-- Left Card: Original Loan Parameters -->
      <div class="panel-card">
        <div class="panel-header">
          <h3 class="panel-title">
            {{ isEn ? '1. Original Mortgage Parameters' : '① 原房贷基础参数配置' }}
          </h3>
        </div>

        <!-- Loan Type Selector -->
        <div class="field-block">
          <label class="field-label">{{ isEn ? 'Loan Category' : '贷款组合类型' }}</label>
          <div class="segmented-tabs">
            <button
              type="button"
              class="seg-btn"
              :class="{ active: loanType === 'commercial' }"
              @click="loanType = 'commercial'"
            >
              {{ isEn ? 'Commercial Loan' : '商业贷款' }}
            </button>
            <button
              type="button"
              class="seg-btn"
              :class="{ active: loanType === 'provident' }"
              @click="loanType = 'provident'"
            >
              {{ isEn ? 'Provident Fund' : '公积金贷款' }}
            </button>
            <button
              type="button"
              class="seg-btn"
              :class="{ active: loanType === 'combined' }"
              @click="loanType = 'combined'"
            >
              {{ isEn ? 'Combined Loan' : '商贷+公积金组合' }}
            </button>
          </div>
        </div>

        <!-- Repayment Method Selector -->
        <div class="field-block">
          <label class="field-label">{{ isEn ? 'Repayment Method' : '还款方式选择' }}</label>
          <div class="segmented-tabs">
            <button
              type="button"
              class="seg-btn"
              :class="{ active: repaymentMethod === 'epi' }"
              @click="repaymentMethod = 'epi'"
            >
              {{ isEn ? 'Equal Principal & Interest (Fixed)' : '等额本息（每月月供恒定）' }}
            </button>
            <button
              type="button"
              class="seg-btn"
              :class="{ active: repaymentMethod === 'ep' }"
              @click="repaymentMethod = 'ep'"
            >
              {{ isEn ? 'Equal Principal (Decreasing)' : '等额本金（首月高逐月递减）' }}
            </button>
          </div>
        </div>

        <!-- Commercial Loan Amount & Rate -->
        <div v-if="loanType === 'commercial' || loanType === 'combined'" class="two-col-inputs">
          <div class="field-block">
            <label class="field-label">
              {{ isEn ? 'Commercial Principal (10k CNY)' : '商业贷款总额 (万元)' }}
            </label>
            <input
              v-model.number="commercialAmountWan"
              type="number"
              min="1"
              max="5000"
              step="5"
              class="num-input"
            />
          </div>
          <div class="field-block">
            <label class="field-label">
              {{ isEn ? 'Commercial Rate (% p.a.)' : '商贷执行年利率 (%)' }}
            </label>
            <input
              v-model.number="commercialRate"
              type="number"
              min="0.5"
              max="12"
              step="0.05"
              class="num-input"
            />
          </div>
        </div>

        <!-- Provident Loan Amount & Rate -->
        <div v-if="loanType === 'provident' || loanType === 'combined'" class="two-col-inputs">
          <div class="field-block">
            <label class="field-label">
              {{ isEn ? 'Provident Principal (10k CNY)' : '公积金贷款总额 (万元)' }}
            </label>
            <input
              v-model.number="providentAmountWan"
              type="number"
              min="1"
              max="500"
              step="5"
              class="num-input"
            />
          </div>
          <div class="field-block">
            <label class="field-label">
              {{ isEn ? 'Provident Rate (% p.a.)' : '公积金年利率 (%)' }}
            </label>
            <input
              v-model.number="providentRate"
              type="number"
              min="0.5"
              max="10"
              step="0.05"
              class="num-input"
            />
          </div>
        </div>

        <!-- Quick Rate Presets -->
        <div class="preset-row">
          <span class="preset-caption">{{ isEn ? 'Rate Presets:' : '常用利率快选:' }}</span>
          <button
            v-for="p in ratePresets"
            :key="p.rate"
            type="button"
            class="chip-btn"
            @click="loanType === 'provident' ? (providentRate = p.rate) : (commercialRate = p.rate)"
          >
            {{ isEn ? p.labelEn : p.labelZh }}
          </button>
        </div>

        <!-- Loan Term Slider -->
        <div class="field-block">
          <div class="label-row">
            <label class="field-label">{{ isEn ? 'Original Loan Term' : '原定按揭总年限' }}</label>
            <span class="highlight-val">
              {{ loanYears }} {{ isEn ? `Years (${totalMonths} mos)` : `年 (共 ${totalMonths} 期)` }}
            </span>
          </div>
          <input
            v-model.number="loanYears"
            type="range"
            min="5"
            max="30"
            step="1"
            class="range-input"
          />
          <div class="range-marks">
            <span>5Y</span>
            <span>10Y</span>
            <span>15Y</span>
            <span>20Y</span>
            <span>25Y</span>
            <span>30Y</span>
          </div>
        </div>
      </div>

      <!-- Right Card: Early Prepayment Decision Parameters -->
      <div class="panel-card">
        <div class="panel-header">
          <h3 class="panel-title">
            {{ isEn ? '2. Early Prepayment Simulation' : '② 提前还贷模拟与机会成本参数' }}
          </h3>
        </div>

        <!-- Months Already Paid -->
        <div class="field-block">
          <div class="label-row">
            <label class="field-label">{{ isEn ? 'Months Already Paid' : '已正常归还期数 (月)' }}</label>
            <span class="highlight-val">
              {{ safeMonthsPaid }} {{ isEn ? 'mos' : '个月' }}
              ({{ (safeMonthsPaid / 12).toFixed(1) }} {{ isEn ? 'yrs' : '年' }})
            </span>
          </div>
          <input
            v-model.number="monthsPaid"
            type="range"
            min="1"
            :max="Math.max(2, totalMonths - 2)"
            step="1"
            class="range-input"
          />
        </div>

        <!-- Lump Sum Prepayment Amount & Penalty -->
        <div class="two-col-inputs">
          <div class="field-block">
            <label class="field-label">
              {{ isEn ? 'Prepayment Lump Sum (10k CNY)' : '拟提前还贷本金 (万元)' }}
            </label>
            <input
              v-model.number="prepayAmountWan"
              type="number"
              min="1"
              max="2000"
              step="5"
              class="num-input"
            />
          </div>
          <div class="field-block">
            <label class="field-label">
              {{ isEn ? 'Prepayment Penalty (%)' : '银行违约金比例 (%)' }}
            </label>
            <input
              v-model.number="penaltyRatePct"
              type="number"
              min="0"
              max="5"
              step="0.1"
              class="num-input"
            />
          </div>
        </div>

        <!-- Safe Investment Return Rate -->
        <div class="field-block">
          <div class="label-row">
            <label class="field-label">
              {{ isEn ? 'Safe Investment Return (% p.a.)' : '手头闲钱稳健理财年化收益率 (%)' }}
            </label>
            <span class="highlight-val">{{ investReturnRate.toFixed(2) }}%</span>
          </div>
          <input
            v-model.number="investReturnRate"
            type="range"
            min="1.0"
            max="6.0"
            step="0.05"
            class="range-input"
          />
          <p class="field-hint">
            {{
              isEn
                ? 'Used to evaluate whether prepaying your mortgage beats keeping cash in deposits/bonds.'
                : '参考大额存单/储蓄国债收益率（约 2.0%~2.5%），用于判断提前还贷是否跑赢无风险理财。'
            }}
          </p>
        </div>

        <!-- Instant Baseline Comparison Mini Box (EPI vs EP) -->
        <div class="mini-compare-box">
          <div class="mini-title">
            {{ isEn ? 'Original Full-Term Comparison (No Prepayment)' : '原合同全周期对比（不提前还贷基准）' }}
          </div>
          <div class="mini-grid">
            <div class="mini-item" :class="{ selected: repaymentMethod === 'epi' }">
              <span class="m-tag">{{ isEn ? 'Equal P&I (等额本息)' : '等额本息' }}</span>
              <span class="m-main">{{ formatYuan(baselineEpi.firstPayment) }} / {{ isEn ? 'mo' : '月' }}</span>
              <span class="m-sub">
                {{ isEn ? 'Total Interest:' : '总利息:' }} {{ formatWan(baselineEpi.totalInterest) }}
              </span>
            </div>
            <div class="mini-item" :class="{ selected: repaymentMethod === 'ep' }">
              <span class="m-tag">{{ isEn ? 'Equal Principal (等额本金)' : '等额本金' }}</span>
              <span class="m-main">
                {{ formatYuan(baselineEp.firstPayment) }}
                <small>(-¥{{ baselineEp.monthlyDecrease.toFixed(0) }}/{{ isEn ? 'mo' : '月' }})</small>
              </span>
              <span class="m-sub">
                {{ isEn ? 'Total Interest:' : '总利息:' }} {{ formatWan(baselineEp.totalInterest) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Diagnostic Banner -->
    <div class="diagnosis-banner">
      <div class="diag-header">
        <span class="diag-badge">
          {{ isEn ? '💡 Prepayment Diagnostic Verdict' : '💡 提前还贷划算度智能诊断结论' }}
        </span>
        <span
          class="spread-pill"
          :class="prepaymentAnalysis.rateSpread > 0 ? 'spread-positive' : 'spread-negative'"
        >
          {{
            prepaymentAnalysis.rateSpread > 0
              ? isEn
                ? `Mortgage Rate exceeds Investment by +${prepaymentAnalysis.rateSpread.toFixed(2)}% · Prepay Recommended`
                : `房贷利率高于理财收益 +${prepaymentAnalysis.rateSpread.toFixed(2)}% · 建议优先提前还贷`
              : isEn
                ? `Investment Yield beats Mortgage by +${Math.abs(prepaymentAnalysis.rateSpread).toFixed(2)}% · Keep Cash`
                : `理财收益率跑赢房贷利率 +${Math.abs(prepaymentAnalysis.rateSpread).toFixed(2)}% · 建议保留现金流`
          }}
        </span>
      </div>

      <p class="diag-summary-text">
        <template v-if="!isEn">
          截至第 <strong>{{ safeMonthsPaid }}</strong> 期，您已累计归还本金
          <strong>{{ formatWan(prepaymentAnalysis.principalPaidSoFar) }}</strong>、已归还利息
          <strong>{{ formatWan(prepaymentAnalysis.interestPaidSoFar) }}</strong>（占原定总利息的
          <strong>{{ prepaymentAnalysis.interestPaidPct.toFixed(1) }}%</strong>），当前剩余本金为
          <strong>{{ formatWan(prepaymentAnalysis.remainingPrincipalBeforePrepay) }}</strong>。若此时提前冲抵本金
          <strong>{{ formatWan(prepaymentAnalysis.actualPrepayYuan) }}</strong>：选择【<strong>方案A：缩短年限</strong>】可节省未来利息
          <strong class="text-emerald">{{ formatWan(prepaymentAnalysis.planA.interestSaved) }}</strong>，比【方案B：减少月供】多省息
          <strong class="text-emerald">{{
            formatWan(Math.max(0, prepaymentAnalysis.planA.interestSaved - prepaymentAnalysis.planB.interestSaved))
          }}</strong>！
        </template>
        <template v-else>
          By month <strong>{{ safeMonthsPaid }}</strong>, you have paid
          <strong>{{ formatWan(prepaymentAnalysis.principalPaidSoFar) }}</strong> in principal and
          <strong>{{ formatWan(prepaymentAnalysis.interestPaidSoFar) }}</strong> in interest
          (<strong>{{ prepaymentAnalysis.interestPaidPct.toFixed(1) }}%</strong> of total scheduled interest).
          Prepaying <strong>{{ formatWan(prepaymentAnalysis.actualPrepayYuan) }}</strong> now under
          <strong>Plan A (Shorten Term)</strong> saves
          <strong class="text-emerald">{{ formatWan(prepaymentAnalysis.planA.interestSaved) }}</strong> in future
          interest — beating Plan B (Reduce Payment) by
          <strong class="text-emerald">{{
            formatWan(Math.max(0, prepaymentAnalysis.planA.interestSaved - prepaymentAnalysis.planB.interestSaved))
          }}</strong>!
        </template>
      </p>

      <!-- Progress Bar of Interest Already Paid -->
      <div class="progress-wrap">
        <div class="progress-labels">
          <span>
            {{ isEn ? 'Interest Paid So Far:' : '已还利息占比进度:' }}
            <strong>{{ prepaymentAnalysis.interestPaidPct.toFixed(1) }}%</strong>
          </span>
          <span>
            {{ isEn ? 'Remaining Unpaid Interest:' : '剩余未还利息池:' }}
            <strong>{{ formatWan(prepaymentAnalysis.remainingOriginalInterest) }}</strong>
          </span>
        </div>
        <div class="progress-track">
          <div
            class="progress-fill"
            :style="{ width: `${Math.min(100, prepaymentAnalysis.interestPaidPct)}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Side-by-Side Comparison: Plan A (Shorten Term) vs Plan B (Reduce Monthly Payment) -->
    <div class="plans-comparison-grid">
      <!-- Plan A Card -->
      <div class="plan-card plan-best">
        <div class="plan-card-top">
          <div>
            <span class="plan-recommend-badge">
              {{ isEn ? '★ Best for Maximum Interest Savings' : '★ 省息最大化首选方案' }}
            </span>
            <h3 class="plan-name">
              {{ isEn ? 'Plan A: Shorten Loan Term (Keep Monthly Payment)' : '方案 A：缩短还款年限（月供基本不变）' }}
            </h3>
          </div>
        </div>

        <div class="hero-saving-box">
          <span class="saving-label">{{ isEn ? 'Total Interest Saved' : '累计节省房贷利息' }}</span>
          <div class="saving-amount">{{ formatWan(prepaymentAnalysis.planA.interestSaved) }}</div>
          <span class="saving-exact">({{ formatYuan(prepaymentAnalysis.planA.interestSaved) }})</span>
        </div>

        <div class="metrics-list">
          <div class="metric-row">
            <span class="m-label">{{ isEn ? 'New Monthly Payment' : '提前还贷后首月新月供' }}</span>
            <span class="m-value">{{ formatYuan(prepaymentAnalysis.planA.firstPayment) }}</span>
          </div>
          <div class="metric-row">
            <span class="m-label">{{ isEn ? 'Remaining Term After Prepay' : '剩余还款期限' }}</span>
            <span class="m-value">
              {{ prepaymentAnalysis.planA.newMonths }} {{ isEn ? 'mos' : '期' }}
              ({{ (prepaymentAnalysis.planA.newMonths / 12).toFixed(1) }} {{ isEn ? 'yrs' : '年' }})
            </span>
          </div>
          <div class="metric-row highlight-row">
            <span class="m-label">{{ isEn ? 'Time Shortened' : '累计缩短还贷时间' }}</span>
            <span class="m-value text-emerald">
              -{{ prepaymentAnalysis.planA.monthsShortened }} {{ isEn ? 'months' : '个月' }}
              ({{ (prepaymentAnalysis.planA.monthsShortened / 12).toFixed(1) }} {{ isEn ? 'yrs' : '年' }})
            </span>
          </div>
          <div class="metric-row">
            <span class="m-label">{{ isEn ? 'Remaining Future Interest' : '未来仍需支付利息' }}</span>
            <span class="m-value">{{ formatWan(prepaymentAnalysis.planA.remainingInterest) }}</span>
          </div>
          <div class="metric-row">
            <span class="m-label">{{ isEn ? 'Net Savings (After Penalty)' : '扣除违约金后净省息' }}</span>
            <span class="m-value">{{ formatYuan(prepaymentAnalysis.planA.netSaved) }}</span>
          </div>
        </div>
      </div>

      <!-- Plan B Card -->
      <div class="plan-card">
        <div class="plan-card-top">
          <div>
            <span class="plan-secondary-badge">
              {{ isEn ? '⚡ Best for Monthly Cashflow Relief' : '⚡ 降低月供压力首选' }}
            </span>
            <h3 class="plan-name">
              {{ isEn ? 'Plan B: Reduce Monthly Payment (Keep Term)' : '方案 B：减少每月月供（还款年限不变）' }}
            </h3>
          </div>
        </div>

        <div class="hero-saving-box secondary-box">
          <span class="saving-label">{{ isEn ? 'Total Interest Saved' : '累计节省房贷利息' }}</span>
          <div class="saving-amount">{{ formatWan(prepaymentAnalysis.planB.interestSaved) }}</div>
          <span class="saving-exact">({{ formatYuan(prepaymentAnalysis.planB.interestSaved) }})</span>
        </div>

        <div class="metrics-list">
          <div class="metric-row highlight-row">
            <span class="m-label">{{ isEn ? 'New Monthly Payment' : '提前还贷后首月新月供' }}</span>
            <span class="m-value text-accent">
              {{ formatYuan(prepaymentAnalysis.planB.firstPayment) }}
              <small>(-{{ formatYuan(prepaymentAnalysis.planB.monthlyPaymentDrop) }})</small>
            </span>
          </div>
          <div class="metric-row">
            <span class="m-label">{{ isEn ? 'Remaining Term After Prepay' : '剩余还款期限' }}</span>
            <span class="m-value">
              {{ prepaymentAnalysis.planB.newMonths }} {{ isEn ? 'mos' : '期' }}
              ({{ (prepaymentAnalysis.planB.newMonths / 12).toFixed(1) }} {{ isEn ? 'yrs' : '年' }})
            </span>
          </div>
          <div class="metric-row">
            <span class="m-label">{{ isEn ? 'Time Shortened' : '累计缩短还贷时间' }}</span>
            <span class="m-value">0 {{ isEn ? 'months (Unchanged)' : '个月（年限不变）' }}</span>
          </div>
          <div class="metric-row">
            <span class="m-label">{{ isEn ? 'Remaining Future Interest' : '未来仍需支付利息' }}</span>
            <span class="m-value">{{ formatWan(prepaymentAnalysis.planB.remainingInterest) }}</span>
          </div>
          <div class="metric-row">
            <span class="m-label">{{ isEn ? 'Net Savings (After Penalty)' : '扣除违约金后净省息' }}</span>
            <span class="m-value">{{ formatYuan(prepaymentAnalysis.planB.netSaved) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Interactive Amortization Schedule Table -->
    <div class="schedule-section">
      <div class="schedule-header">
        <div>
          <h3 class="panel-title">
            {{ isEn ? '3. Month-by-Month Amortization Schedule' : '③ 逐期还款本息明细对账表' }}
          </h3>
          <p class="schedule-sub">
            {{
              isEn
                ? `Highlighting prepayment transition at Month #${safeMonthsPaid}.`
                : `第 ${safeMonthsPaid} 期为提前还贷执行节点，可自由切换对比三种还款轨迹。`
            }}
          </p>
        </div>

        <div class="schedule-tabs">
          <button
            type="button"
            class="sched-tab"
            :class="{ active: scheduleMode === 'shorten' }"
            @click="scheduleMode = 'shorten'"
          >
            {{ isEn ? 'Plan A (Shorten Term)' : '方案A：缩短年限明细' }}
          </button>
          <button
            type="button"
            class="sched-tab"
            :class="{ active: scheduleMode === 'reduce' }"
            @click="scheduleMode = 'reduce'"
          >
            {{ isEn ? 'Plan B (Reduce Payment)' : '方案B：减少月供明细' }}
          </button>
          <button
            type="button"
            class="sched-tab"
            :class="{ active: scheduleMode === 'original' }"
            @click="scheduleMode = 'original'"
          >
            {{ isEn ? 'Original Schedule' : '原计划还款明细' }}
          </button>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="amort-table">
          <thead>
            <tr>
              <th>{{ isEn ? 'Period' : '期次' }}</th>
              <th>{{ isEn ? 'Monthly Payment' : '本期月供总额' }}</th>
              <th>{{ isEn ? 'Principal Paid' : '归还本金' }}</th>
              <th>{{ isEn ? 'Interest Paid' : '归还利息' }}</th>
              <th>{{ isEn ? 'Remaining Principal' : '期末剩余本金' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in displayedScheduleRows"
              :key="row.month"
              :class="{ 'prepay-marker-row': row.month === safeMonthsPaid }"
            >
              <td class="col-period">
                #{{ row.month }}
                <span v-if="row.month === safeMonthsPaid" class="marker-pill">
                  {{ isEn ? 'Prepay Point' : '提前还贷节点' }}
                </span>
              </td>
              <td class="col-money">{{ formatYuan(row.payment) }}</td>
              <td class="col-principal">{{ formatYuan(row.principal) }}</td>
              <td class="col-interest">{{ formatYuan(row.interest) }}</td>
              <td class="col-remaining">{{ formatYuan(row.remaining) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeScheduleRows.length > 36" class="table-footer-bar">
        <button type="button" class="toggle-all-btn" @click="showAllMonths = !showAllMonths">
          {{
            showAllMonths
              ? isEn
                ? '▲ Collapse to First 36 Months'
                : '▲ 收起长表（仅显示前 36 期）'
              : isEn
                ? `▼ Expand All ${activeScheduleRows.length} Months`
                : `▼ 展开查看全部 ${activeScheduleRows.length} 期完整明细`
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mortgage-tool-shell {
  display: flex;
  flex-direction: column;
  gap: 22px;
  color: var(--text-primary);
}

.tool-header-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: var(--shadow-sm);
}

.category-chip {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.tool-title {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.3;
}

.tool-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

@media (max-width: 900px) {
  .control-grid {
    grid-template-columns: 1fr;
  }
}

.panel-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.panel-header {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.highlight-val {
  font-size: 13px;
  font-weight: 800;
  color: var(--accent);
}

.segmented-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
}

.seg-btn {
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-btn:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.seg-btn.active {
  background: var(--accent);
  color: #ffffff;
  border-color: var(--accent);
  font-weight: 700;
}

.two-col-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.num-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-muted);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  outline: none;
  box-sizing: border-box;
}

.num-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.preset-caption {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}

.chip-btn {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.range-input {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}

.range-marks {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

.field-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.45;
}

.mini-compare-box {
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.mini-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mini-item {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mini-item.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.m-tag {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-secondary);
}

.m-main {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.m-sub {
  font-size: 11.5px;
  color: var(--text-secondary);
}

/* Diagnosis Banner */
.diagnosis-banner {
  background: var(--bg-surface);
  border: 2px solid var(--accent-border);
  border-radius: 16px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.diag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.diag-badge {
  font-size: 14px;
  font-weight: 800;
  color: var(--accent);
}

.spread-pill {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}

.spread-positive {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.spread-negative {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.diag-summary-text {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--text-primary);
}

.text-emerald {
  color: #10b981;
}

.text-accent {
  color: var(--accent);
}

.progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.progress-track {
  width: 100%;
  height: 10px;
  background: var(--bg-muted);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #10b981);
  border-radius: 999px;
  transition: width 0.25s ease;
}

/* Plans Side by Side */
.plans-comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

@media (max-width: 860px) {
  .plans-comparison-grid {
    grid-template-columns: 1fr;
  }
}

.plan-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card.plan-best {
  border: 2px solid #10b981;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.08);
}

.plan-recommend-badge {
  display: inline-block;
  font-size: 11.5px;
  font-weight: 800;
  color: #059669;
  background: rgba(16, 185, 129, 0.14);
  padding: 3px 9px;
  border-radius: 6px;
  margin-bottom: 6px;
}

.plan-secondary-badge {
  display: inline-block;
  font-size: 11.5px;
  font-weight: 800;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 3px 9px;
  border-radius: 6px;
  margin-bottom: 6px;
}

.plan-name {
  margin: 0;
  font-size: 16.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.hero-saving-box {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hero-saving-box.secondary-box {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.saving-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.saving-amount {
  font-size: 26px;
  font-weight: 900;
  color: #10b981;
}

.secondary-box .saving-amount {
  color: var(--accent);
}

.saving-exact {
  font-size: 12px;
  color: var(--text-secondary);
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13.5px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--border-color);
}

.metric-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.m-label {
  color: var(--text-secondary);
  font-weight: 600;
}

.m-value {
  font-weight: 800;
  color: var(--text-primary);
}

/* Amortization Schedule */
.schedule-section {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.schedule-sub {
  margin: 4px 0 0 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.schedule-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sched-tab {
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.sched-tab.active {
  background: var(--accent);
  color: #ffffff;
  border-color: var(--accent);
  font-weight: 700;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.amort-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.amort-table th,
.amort-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}

.amort-table th {
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-weight: 700;
}

.prepay-marker-row {
  background: var(--accent-soft);
  font-weight: 700;
}

.marker-pill {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 6px;
  font-size: 11px;
  border-radius: 4px;
  background: var(--accent);
  color: #ffffff;
}

.table-footer-bar {
  display: flex;
  justify-content: center;
}

.toggle-all-btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-muted);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.toggle-all-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
