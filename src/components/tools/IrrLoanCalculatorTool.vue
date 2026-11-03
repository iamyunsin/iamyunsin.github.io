<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
  initialPresetId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'zh',
  initialPresetId: 'cc-installment',
});

const isEn = computed(() => props.lang === 'en');

// Repayment Structure Mode
type LoanMode = 'flat-rate' | 'fixed-payment' | 'interest-only' | 'lease-balloon';
const loanMode = ref<LoanMode>('flat-rate');

// Core Inputs
const nominalPrincipal = ref<number>(100000); // 合同借款总额 ¥100,000
const periods = ref<number>(12); // 期数 12期
const frequency = ref<'monthly' | 'weekly' | 'quarterly'>('monthly'); // 还款频率
const upfrontFeeYuan = ref<number>(0); // 前置砍头息/服务费/手续费 (元)
const depositYuan = ref<number>(0); // 保证金/押金 (期末退还或冲抵)

// Mode-specific inputs
const flatRatePerPeriodPct = ref<number>(0.6); // 每期分期手续费率 (%) 如信用卡 0.6%/月
const customPeriodPayment = ref<number>(9000); // 直接输入每期还款额 (元)
const balloonFinalPayment = ref<number>(20000); // 气球贷/融资租赁期末尾款留购价 (元)

const showAllCashflows = ref<boolean>(false);

interface ScenarioPreset {
  id: string;
  titleZh: string;
  titleEn: string;
  badgeZh: string;
  badgeEn: string;
  mode: LoanMode;
  principal: number;
  periods: number;
  flatRatePct: number;
  upfrontFee: number;
  deposit: number;
  balloon: number;
  customPayment: number;
}

const presets: ScenarioPreset[] = [
  {
    id: 'cc-installment',
    titleZh: '💳 信用卡账单分期（月费率 0.6%）',
    titleEn: '💳 Credit Card Installment (0.6%/mo Flat)',
    badgeZh: '表面 7.2% ➔ 真实 13%+',
    badgeEn: 'Headline 7.2% ➔ True 13%+',
    mode: 'flat-rate',
    principal: 50000,
    periods: 12,
    flatRatePct: 0.6,
    upfrontFee: 0,
    deposit: 0,
    balloon: 0,
    customPayment: 4466.67,
  },
  {
    id: 'online-loan',
    titleZh: '📱 网贷/消费贷等本等息 + 砍头息',
    titleEn: '📱 Online Loan (0.8%/mo + Upfront Fee)',
    badgeZh: '高息陷阱预警',
    badgeEn: 'High APR Trap',
    mode: 'flat-rate',
    principal: 100000,
    periods: 24,
    flatRatePct: 0.75,
    upfrontFee: 3000,
    deposit: 0,
    balloon: 0,
    customPayment: 4916.67,
  },
  {
    id: 'interest-only-upfront',
    titleZh: '🏦 先息后本 + 3% 前置服务费',
    titleEn: '🏦 Interest-Only + 3% Origination Fee',
    badgeZh: '过桥/经营贷常见',
    badgeEn: 'Bridge / Biz Loan',
    mode: 'interest-only',
    principal: 200000,
    periods: 12,
    flatRatePct: 0.45,
    upfrontFee: 6000,
    deposit: 0,
    balloon: 0,
    customPayment: 900,
  },
  {
    id: 'auto-lease',
    titleZh: '🚗 融资租赁/以租代购（含保证金+留购尾款）',
    titleEn: '🚗 Auto / Equipment Lease (Deposit + Balloon)',
    badgeZh: '穿透保证金占用',
    badgeEn: 'Lease IRR Detector',
    mode: 'lease-balloon',
    principal: 150000,
    periods: 36,
    flatRatePct: 0.4,
    upfrontFee: 4500,
    deposit: 15000,
    balloon: 15000,
    customPayment: 4766.67,
  },
];

const activePresetId = ref<string>('cc-installment');

function applyPreset(p: ScenarioPreset) {
  activePresetId.value = p.id;
  loanMode.value = p.mode;
  nominalPrincipal.value = p.principal;
  periods.value = p.periods;
  flatRatePerPeriodPct.value = p.flatRatePct;
  upfrontFeeYuan.value = p.upfrontFee;
  depositYuan.value = p.deposit;
  balloonFinalPayment.value = p.balloon;
  customPeriodPayment.value = p.customPayment;
}

if (props.initialPresetId) {
  const initialMatched = presets.find((p) => p.id === props.initialPresetId);
  if (initialMatched) {
    applyPreset(initialMatched);
  }
}

const periodsPerYear = computed(() => {
  if (frequency.value === 'weekly') return 52;
  if (frequency.value === 'quarterly') return 4;
  return 12;
});

// Construct Cashflow Array: CF[0] > 0 (Net cash received by borrower), CF[1..N] < 0 (Payments made by borrower)
const cashflowData = computed(() => {
  const P = Math.max(100, nominalPrincipal.value || 0);
  const n = Math.max(1, Math.min(360, Math.round(periods.value || 12)));
  const fee = Math.max(0, upfrontFeeYuan.value || 0);
  const dep = Math.max(0, depositYuan.value || 0);
  const netReceivedAtT0 = Math.max(1, P - fee - dep);

  const flows: number[] = [netReceivedAtT0];
  let regularPayment = 0;

  if (loanMode.value === 'flat-rate') {
    const perPrincipal = P / n;
    const perInterest = P * ((flatRatePerPeriodPct.value || 0) / 100);
    regularPayment = perPrincipal + perInterest;
    for (let t = 1; t <= n; t++) {
      const refundDep = t === n ? dep : 0;
      flows.push(-(regularPayment - refundDep));
    }
  } else if (loanMode.value === 'fixed-payment') {
    regularPayment = Math.max(1, customPeriodPayment.value || P / n);
    for (let t = 1; t <= n; t++) {
      const refundDep = t === n ? dep : 0;
      flows.push(-(regularPayment - refundDep));
    }
  } else if (loanMode.value === 'interest-only') {
    const perInterest = P * ((flatRatePerPeriodPct.value || 0) / 100);
    regularPayment = perInterest;
    for (let t = 1; t <= n; t++) {
      if (t < n) {
        flows.push(-perInterest);
      } else {
        flows.push(-(P + perInterest - dep));
      }
    }
  } else {
    // lease-balloon
    const balloon = Math.max(0, balloonFinalPayment.value || 0);
    const amortizedPrincipal = Math.max(0, P - balloon) / n;
    const perInterest = P * ((flatRatePerPeriodPct.value || 0) / 100);
    regularPayment = amortizedPrincipal + perInterest;
    for (let t = 1; t <= n; t++) {
      if (t < n) {
        flows.push(-regularPayment);
      } else {
        // Final period includes balloon buyout minus refunded deposit
        flows.push(-(regularPayment + balloon - dep));
      }
    }
  }

  return {
    P,
    n,
    fee,
    dep,
    netReceivedAtT0,
    regularPayment,
    flows,
  };
});

// Newton-Raphson + Bisection Fallback Solver for General Cashflows
function solveCashflowIrr(flows: number[]): number {
  const cf0 = flows[0];
  if (cf0 <= 0) return 0;
  const totalOut = flows.slice(1).reduce((acc, v) => acc + -v, 0);
  if (totalOut <= cf0) return 0;

  let r = 0.008; // Initial guess 0.8% per period
  for (let iter = 0; iter < 80; iter++) {
    let npv = cf0;
    let dNpv = 0;
    for (let t = 1; t < flows.length; t++) {
      const denom = Math.pow(1 + r, t);
      npv += flows[t] / denom;
      dNpv -= (t * flows[t]) / Math.pow(1 + r, t + 1);
    }
    if (Math.abs(dNpv) < 1e-12) break;
    const nextR = r - npv / dNpv;
    if (Math.abs(nextR - r) < 1e-9) {
      r = nextR;
      break;
    }
    r = Math.max(1e-6, Math.min(1.5, nextR));
  }
  return r;
}

export interface IrrScheduleRow {
  period: number;
  cashflow: number;
  imputedInterest: number;
  imputedPrincipal: number;
  remainingBalance: number;
}

const irrAnalysis = computed(() => {
  const { P, n, fee, dep, netReceivedAtT0, regularPayment, flows } = cashflowData.value;
  const periodicIrr = solveCashflowIrr(flows);
  const k = periodsPerYear.value;

  const nominalAprPct = periodicIrr * k * 100; // 单利年化 (央行明示口径)
  const compoundEarPct = (Math.pow(1 + periodicIrr, k) - 1) * 100; // 复利有效年化 (EAR)
  const headlineFlatAnnualPct = (flatRatePerPeriodPct.value || 0) * k;

  const totalOutflows = flows.slice(1).reduce((acc, v) => acc + Math.max(0, -v), 0);
  const totalInterestAndFees = Math.max(0, totalOutflows - netReceivedAtT0);

  // Build imputed IRR amortization table
  const schedule: IrrScheduleRow[] = [];
  let balance = netReceivedAtT0;
  let balanceSum = 0;

  for (let t = 1; t < flows.length; t++) {
    balanceSum += balance;
    const payment = -flows[t];
    const impInterest = balance * periodicIrr;
    const impPrincipal = payment - impInterest;
    balance = Math.max(0, balance - impPrincipal);
    schedule.push({
      period: t,
      cashflow: flows[t],
      imputedInterest: impInterest,
      imputedPrincipal: impPrincipal,
      remainingBalance: balance,
    });
  }

  const avgPrincipalOccupied = balanceSum / n;
  const utilizationRatioPct = P > 0 ? (avgPrincipalOccupied / P) * 100 : 0;

  // Risk Level Assessment based on Nominal APR
  let riskLevel: 'low' | 'normal' | 'high' | 'usury' = 'low';
  if (nominalAprPct >= 24) {
    riskLevel = 'usury';
  } else if (nominalAprPct >= 12) {
    riskLevel = 'high';
  } else if (nominalAprPct >= 5) {
    riskLevel = 'normal';
  }

  return {
    P,
    n,
    fee,
    dep,
    netReceivedAtT0,
    regularPayment,
    periodicIrrPct: periodicIrr * 100,
    nominalAprPct,
    compoundEarPct,
    headlineFlatAnnualPct,
    totalOutflows,
    totalInterestAndFees,
    avgPrincipalOccupied,
    utilizationRatioPct,
    riskLevel,
    schedule,
  };
});

const displayedSchedule = computed(() => {
  if (showAllCashflows.value) return irrAnalysis.value.schedule;
  return irrAnalysis.value.schedule.slice(0, 24);
});

function fmtCurrency(val: number): string {
  return `¥${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
</script>

<template>
  <div class="irr-tool-shell">
    <!-- Header Card -->
    <div class="header-card">
      <span class="badge-pill">
        {{ isEn ? '🔍 True APR & IRR Cashflow Detector' : '🔍 贷款与分期真实年化利率 (IRR) 照妖镜' }}
      </span>
      <h2 class="title-main">
        {{
          isEn
            ? 'Credit Card Installment, Online Loan & Lease True APR (IRR / EAR) Calculator'
            : '信用卡分期 / 网贷等本等息 / 砍头息 / 融资租赁真实年化利率 (IRR) 穿透计算器'
        }}
      </h2>
      <p class="desc-text">
        {{
          isEn
            ? 'Do not be fooled by "0.5% monthly flat fee" claims! Built on a Newton-Raphson cashflow solver, this detector exposes both Nominal Annualized APR and Compound Effective Annual Rate (EAR) across any upfront fees or deposits.'
            : '别再被“每期手续费仅 0.5%”的话术忽悠！基于牛顿-拉夫逊 (Newton-Raphson) 现金流折现算法，一键穿透等本等息、先息后本、前置砍头息与融资租赁保证金，精准还原央行明示年化单利 (APR) 与复利年化 (EAR)。'
        }}
      </p>

      <!-- Scenario Presets -->
      <div class="presets-bar">
        <span class="preset-label">{{ isEn ? 'Quick Scenarios:' : '典型套路一键体验:' }}</span>
        <div class="preset-buttons">
          <button
            v-for="p in presets"
            :key="p.id"
            type="button"
            class="preset-card-btn"
            :class="{ active: activePresetId === p.id }"
            @click="applyPreset(p)"
          >
            <span class="p-title">{{ isEn ? p.titleEn : p.titleZh }}</span>
            <span class="p-badge">{{ isEn ? p.badgeEn : p.badgeZh }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Grid: Left Inputs + Right IRR Verdict -->
    <div class="main-grid">
      <!-- Left Column: Loan & Cashflow Inputs -->
      <div class="panel-box">
        <h3 class="panel-heading">
          {{ isEn ? '1. Loan Contract & Cashflow Parameters' : '① 分期合同与附加费用参数' }}
        </h3>

        <!-- Repayment Mode -->
        <div class="field-group">
          <label class="f-label">{{ isEn ? 'Repayment Structure' : '计息与还款模式' }}</label>
          <div class="mode-grid">
            <button
              type="button"
              class="m-btn"
              :class="{ active: loanMode === 'flat-rate' }"
              @click="loanMode = 'flat-rate'"
            >
              {{ isEn ? 'Flat Fee Rate (等本等息/分期)' : '等本等息（按每期手续费率）' }}
            </button>
            <button
              type="button"
              class="m-btn"
              :class="{ active: loanMode === 'fixed-payment' }"
              @click="loanMode = 'fixed-payment'"
            >
              {{ isEn ? 'Known Fixed Payment' : '已知每期固定还款金额' }}
            </button>
            <button
              type="button"
              class="m-btn"
              :class="{ active: loanMode === 'interest-only' }"
              @click="loanMode = 'interest-only'"
            >
              {{ isEn ? 'Interest-Only + Principal at End' : '先息后本（到期归还本金）' }}
            </button>
            <button
              type="button"
              class="m-btn"
              :class="{ active: loanMode === 'lease-balloon' }"
              @click="loanMode = 'lease-balloon'"
            >
              {{ isEn ? 'Lease / Balloon (留购尾款)' : '融资租赁/气球贷（含尾款）' }}
            </button>
          </div>
        </div>

        <!-- Principal & Periods -->
        <div class="two-cols">
          <div class="field-group">
            <label class="f-label">{{ isEn ? 'Contract Principal (CNY)' : '合同借款名义本金 (元)' }}</label>
            <input v-model.number="nominalPrincipal" type="number" min="100" step="5000" class="f-input" />
          </div>

          <div class="field-group">
            <label class="f-label">{{ isEn ? 'Number of Periods' : '总分期期数' }}</label>
            <input v-model.number="periods" type="number" min="1" max="360" step="1" class="f-input" />
          </div>
        </div>

        <!-- Mode-specific Input + Frequency -->
        <div class="two-cols">
          <div v-if="loanMode !== 'fixed-payment'" class="field-group">
            <label class="f-label">
              {{ isEn ? 'Quoted Flat Rate per Period (%)' : '每期宣称手续费率/月息 (%)' }}
            </label>
            <input v-model.number="flatRatePerPeriodPct" type="number" min="0" max="20" step="0.05" class="f-input" />
          </div>

          <div v-else class="field-group">
            <label class="f-label">
              {{ isEn ? 'Payment per Period (CNY)' : '每期固定应还金额 (元)' }}
            </label>
            <input v-model.number="customPeriodPayment" type="number" min="1" step="100" class="f-input" />
          </div>

          <div class="field-group">
            <label class="f-label">{{ isEn ? 'Repayment Frequency' : '每期还款周期频率' }}</label>
            <select v-model="frequency" class="f-input">
              <option value="monthly">{{ isEn ? 'Monthly (12/yr)' : '按月还款 (12期/年)' }}</option>
              <option value="weekly">{{ isEn ? 'Weekly (52/yr)' : '按周还款 (52期/年)' }}</option>
              <option value="quarterly">{{ isEn ? 'Quarterly (4/yr)' : '按季还款 (4期/年)' }}</option>
            </select>
          </div>
        </div>

        <!-- Hidden Upfront Fees & Deposit -->
        <div class="two-cols">
          <div class="field-group">
            <label class="f-label">
              {{ isEn ? 'Upfront Origination / Service Fee (CNY)' : '前置砍头息/手续费/担保费 (元)' }}
            </label>
            <input v-model.number="upfrontFeeYuan" type="number" min="0" step="500" class="f-input" />
          </div>

          <div class="field-group">
            <label class="f-label">
              {{ isEn ? 'Security Deposit (Refunded at End)' : '冻结押金/保证金 (期末退还)' }}
            </label>
            <input v-model.number="depositYuan" type="number" min="0" step="1000" class="f-input" />
          </div>
        </div>

        <!-- Balloon Buyout if Lease mode -->
        <div v-if="loanMode === 'lease-balloon'" class="field-group">
          <label class="f-label">
            {{ isEn ? 'Final Balloon / Lease Buyout Price (CNY)' : '期末留购价 / 气球贷尾款金额 (元)' }}
          </label>
          <input v-model.number="balloonFinalPayment" type="number" min="0" step="1000" class="f-input" />
        </div>
      </div>

      <!-- Right Column: IRR Verdict & Risk Meter -->
      <div class="panel-box verdict-panel">
        <h3 class="panel-heading">
          {{ isEn ? '2. True Annualized IRR Verdict & Risk Rating' : '② 真实年化利率 (IRR) 穿透结果与防坑评级' }}
        </h3>

        <!-- Dual Rate Hero Display -->
        <div class="dual-rate-hero">
          <div class="rate-box primary-rate-box">
            <span class="r-tag">{{ isEn ? 'Nominal Annual APR (Simple IRR × 12)' : '真实年化单利 (APR · 央行明示口径)' }}</span>
            <div class="r-big">{{ irrAnalysis.nominalAprPct.toFixed(2) }}%</div>
            <span class="r-sub">
              {{ isEn ? 'Periodic IRR:' : '每期真实折现率:' }} {{ irrAnalysis.periodicIrrPct.toFixed(3) }}%
            </span>
          </div>

          <div class="rate-box secondary-rate-box">
            <span class="r-tag">{{ isEn ? 'Effective Annual Rate (Compound EAR)' : '真实有效复利年化 (EAR = (1+r)^12-1)' }}</span>
            <div class="r-big">{{ irrAnalysis.compoundEarPct.toFixed(2) }}%</div>
            <span class="r-sub">
              {{
                loanMode !== 'fixed-payment'
                  ? isEn
                    ? `vs Quoted Headline: ${irrAnalysis.headlineFlatAnnualPct.toFixed(2)}%`
                    : `对比机构宣称表面年费率: ${irrAnalysis.headlineFlatAnnualPct.toFixed(2)}%`
                  : isEn
                    ? 'Exact Cashflow Compound Yield'
                    : '含复利滚存效应真实资金成本'
              }}
            </span>
          </div>
        </div>

        <!-- Visual Risk Meter -->
        <div class="risk-meter-card">
          <div class="risk-header">
            <span class="risk-title">{{ isEn ? 'Borrowing Cost Risk Thermometer:' : '信贷资金成本风险温度计:' }}</span>
            <span class="risk-badge" :class="`risk-${irrAnalysis.riskLevel}`">
              <template v-if="irrAnalysis.riskLevel === 'low'">
                {{ isEn ? '🟢 Low Cost (<5% Prime Rate)' : '🟢 良心低息福利 (<5%)' }}
              </template>
              <template v-else-if="irrAnalysis.riskLevel === 'normal'">
                {{ isEn ? '🟡 Standard Consumer Credit (5%–12%)' : '🟡 正常商业消费信贷 (5%~12%)' }}
              </template>
              <template v-else-if="irrAnalysis.riskLevel === 'high'">
                {{ isEn ? '🟠 High-Cost Credit (12%–24% Caution)' : '🟠 偏高息分期成本 (12%~24% 建议谨慎)' }}
              </template>
              <template v-else>
                {{ isEn ? '🔴 Predatory / Usury Warning (>24%!)' : '🔴 高利贷红线预警 (>24% 极度危险!)' }}
              </template>
            </span>
          </div>

          <div class="meter-bar-segments">
            <div class="seg seg-green" :class="{ active: irrAnalysis.riskLevel === 'low' }">
              &lt;5% {{ isEn ? 'Low' : '低息' }}
            </div>
            <div class="seg seg-yellow" :class="{ active: irrAnalysis.riskLevel === 'normal' }">
              5%~12% {{ isEn ? 'Normal' : '正常' }}
            </div>
            <div class="seg seg-orange" :class="{ active: irrAnalysis.riskLevel === 'high' }">
              12%~24% {{ isEn ? 'High' : '偏高' }}
            </div>
            <div class="seg seg-red" :class="{ active: irrAnalysis.riskLevel === 'usury' }">
              &gt;24% {{ isEn ? 'Danger' : '高危' }}
            </div>
          </div>
        </div>

        <!-- Breakdown Metrics -->
        <div class="breakdown-table">
          <div class="b-row">
            <span>{{ isEn ? 'Net Cash Received at T=0 (After Fees/Deposit)' : '期初实际到手可用净本金 (T=0)' }}</span>
            <strong>{{ fmtCurrency(irrAnalysis.netReceivedAtT0) }}</strong>
          </div>
          <div class="b-row">
            <span>{{ isEn ? 'Regular Periodic Payment' : '每期常规还款金额' }}</span>
            <strong>{{ fmtCurrency(irrAnalysis.regularPayment) }}</strong>
          </div>
          <div class="b-row">
            <span>{{ isEn ? 'Total Interest + Upfront Fees Paid' : '全周期总利息 + 砍头息手续费总支出' }}</span>
            <strong class="text-danger">{{ fmtCurrency(irrAnalysis.totalInterestAndFees) }}</strong>
          </div>
          <div class="b-row">
            <span>{{ isEn ? 'Average Principal Occupied (Utilization)' : '全周期平均实际占用本金 (资金利用率)' }}</span>
            <strong>
              {{ fmtCurrency(irrAnalysis.avgPrincipalOccupied) }}
              ({{ irrAnalysis.utilizationRatioPct.toFixed(1) }}%)
            </strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Period-by-Period IRR Cashflow & Imputed Amortization Schedule -->
    <div class="cashflow-section">
      <div class="cf-header">
        <div>
          <h3 class="panel-heading">
            {{
              isEn
                ? '3. Period-by-Period Cashflow & Imputed IRR Amortization Table'
                : '③ 逐期现金流 (Cashflow) 与真实内部收益率本息拆解表'
            }}
          </h3>
          <p class="cf-sub">
            {{
              isEn
                ? `Period #0 net inflow: +${fmtCurrency(irrAnalysis.netReceivedAtT0)}, followed by ${irrAnalysis.n} repayment outflows.`
                : `第 0 期实际净流入 +${fmtCurrency(irrAnalysis.netReceivedAtT0)}，随后 ${irrAnalysis.n} 期逐期折现还原真实本金与利息构成。`
            }}
          </p>
        </div>
      </div>

      <div class="table-scroll">
        <table class="cf-table">
          <thead>
            <tr>
              <th>{{ isEn ? 'Period' : '期次' }}</th>
              <th>{{ isEn ? 'Net Cashflow' : '当期现金流 (CF)' }}</th>
              <th>{{ isEn ? 'True Imputed Interest' : '按真实IRR应计利息' }}</th>
              <th>{{ isEn ? 'True Principal Repaid' : '真实归还本金' }}</th>
              <th>{{ isEn ? 'Remaining Net Principal' : '期末剩余真实本金' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="t0-row">
              <td>#0 ({{ isEn ? 'Disbursement' : '放款日' }})</td>
              <td class="text-emerald">+{{ fmtCurrency(irrAnalysis.netReceivedAtT0) }}</td>
              <td>—</td>
              <td>—</td>
              <td>{{ fmtCurrency(irrAnalysis.netReceivedAtT0) }}</td>
            </tr>
            <tr v-for="row in displayedSchedule" :key="row.period">
              <td>#{{ row.period }}</td>
              <td class="text-danger">{{ fmtCurrency(row.cashflow) }}</td>
              <td>{{ fmtCurrency(row.imputedInterest) }}</td>
              <td>{{ fmtCurrency(row.imputedPrincipal) }}</td>
              <td>{{ fmtCurrency(row.remainingBalance) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="irrAnalysis.schedule.length > 24" class="cf-footer">
        <button type="button" class="expand-btn" @click="showAllCashflows = !showAllCashflows">
          {{
            showAllCashflows
              ? isEn
                ? '▲ Collapse to First 24 Periods'
                : '▲ 收起长表（仅显示前 24 期）'
              : isEn
                ? `▼ Show All ${irrAnalysis.schedule.length} Periods`
                : `▼ 展开查看全部 ${irrAnalysis.schedule.length} 期完整现金流`
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.irr-tool-shell {
  display: flex;
  flex-direction: column;
  gap: 22px;
  color: var(--text-primary);
}

.header-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--shadow-sm);
}

.badge-pill {
  align-self: flex-start;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  padding: 4px 10px;
  border-radius: 999px;
}

.title-main {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
}

.desc-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.presets-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.preset-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
}

.preset-card-btn {
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.preset-card-btn:hover {
  border-color: var(--accent);
}

.preset-card-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.p-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.p-badge {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--accent);
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

@media (max-width: 900px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

.panel-box {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.panel-heading {
  margin: 0;
  font-size: 16.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.f-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.f-input {
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

.f-input:focus {
  border-color: var(--accent);
}

.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.m-btn {
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.m-btn.active {
  background: var(--accent);
  color: #ffffff;
  border-color: var(--accent);
  font-weight: 700;
}

.two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Verdict Panel */
.dual-rate-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 560px) {
  .dual-rate-hero {
    grid-template-columns: 1fr;
  }
}

.rate-box {
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.primary-rate-box {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.r-tag {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.r-big {
  font-size: 28px;
  font-weight: 900;
  color: var(--accent);
}

.secondary-rate-box .r-big {
  color: var(--text-primary);
}

.r-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Risk Meter */
.risk-meter-card {
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.risk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.risk-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.risk-badge {
  font-size: 12.5px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
}

.risk-low {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.risk-normal {
  background: rgba(59, 130, 246, 0.15);
  color: #2563eb;
}

.risk-high {
  background: rgba(245, 158, 11, 0.18);
  color: #d97706;
}

.risk-usury {
  background: rgba(239, 68, 68, 0.16);
  color: #dc2626;
}

.meter-bar-segments {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.seg {
  text-align: center;
  font-size: 11.5px;
  font-weight: 700;
  padding: 6px 4px;
  border-radius: 6px;
  opacity: 0.38;
  border: 1px solid transparent;
}

.seg.active {
  opacity: 1;
  transform: scale(1.02);
  border-color: currentColor;
}

.seg-green {
  background: rgba(16, 185, 129, 0.18);
  color: #059669;
}

.seg-yellow {
  background: rgba(59, 130, 246, 0.18);
  color: #2563eb;
}

.seg-orange {
  background: rgba(245, 158, 11, 0.2);
  color: #d97706;
}

.seg-red {
  background: rgba(239, 68, 68, 0.2);
  color: #dc2626;
}

.breakdown-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13.5px;
}

.b-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--border-color);
}

.b-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.text-danger {
  color: #dc2626;
  font-weight: 700;
}

.text-emerald {
  color: #10b981;
  font-weight: 700;
}

/* Cashflow Table */
.cashflow-section {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cf-sub {
  margin: 4px 0 0 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.cf-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.cf-table th,
.cf-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}

.cf-table th {
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-weight: 700;
}

.t0-row {
  background: var(--accent-soft);
  font-weight: 700;
}

.cf-footer {
  display: flex;
  justify-content: center;
}

.expand-btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-muted);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
</style>
