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
const monthlySalary = ref<number>(25000);
const yearEndBonus = ref<number>(37000); // Default inside Cliff 1 (36,001 ~ 38,566.67) to showcase the cliff detector immediately!

// Social Insurance & Housing Fund Presets
type InsPresetKey = 'tier1-max' | 'tier1-std' | 'tier2-std' | 'minimal' | 'custom';
const selectedPreset = ref<InsPresetKey>('tier1-std');

const customBaseMode = ref<'follow' | 'capped'>('capped');
const socialBaseCap = ref<number>(35283); // Typical Tier-1 city upper bound
const customSocialBase = ref<number>(25000);
const pensionMedUnempRate = ref<number>(10.5); // 8% pension + 2% medical + 0.5% unemployment
const housingFundRate = ref<number>(12); // 5% ~ 12%

function applyPreset(key: InsPresetKey) {
  selectedPreset.value = key;
  if (key === 'tier1-std') {
    customBaseMode.value = 'capped';
    socialBaseCap.value = 35283;
    pensionMedUnempRate.value = 10.5;
    housingFundRate.value = 12;
  } else if (key === 'tier1-max') {
    customBaseMode.value = 'follow';
    pensionMedUnempRate.value = 10.5;
    housingFundRate.value = 12;
  } else if (key === 'tier2-std') {
    customBaseMode.value = 'capped';
    socialBaseCap.value = 28000;
    pensionMedUnempRate.value = 10.5;
    housingFundRate.value = 8;
  } else if (key === 'minimal') {
    customBaseMode.value = 'capped';
    socialBaseCap.value = 10000;
    pensionMedUnempRate.value = 10.5;
    housingFundRate.value = 5;
  }
}

// Special Additional Deductions (专项附加扣除)
interface DeductionItem {
  id: string;
  nameZh: string;
  nameEn: string;
  amount: number;
  checked: boolean;
}

const deductionItems = ref<DeductionItem[]>([
  { id: 'rent', nameZh: '住房租金 (一线城市)', nameEn: 'Housing Rent (Tier-1)', amount: 1500, checked: true },
  { id: 'mortgage', nameZh: '首套住房贷款利息', nameEn: 'First-Home Mortgage Interest', amount: 1000, checked: false },
  { id: 'elderly-sole', nameZh: '赡养老人 (独生子女)', nameEn: 'Elderly Care (Only Child)', amount: 3000, checked: false },
  { id: 'elderly-shared', nameZh: '赡养老人 (非独生分摊)', nameEn: 'Elderly Care (Shared)', amount: 1500, checked: false },
  { id: 'child', nameZh: '子女教育 / 3岁以下婴幼儿', nameEn: 'Child Care & Education', amount: 2000, checked: false },
  { id: 'edu', nameZh: '继续教育', nameEn: 'Continuing Education', amount: 400, checked: false },
]);

const extraCustomDeduction = ref<number>(0);

const monthlySpecialDeduction = computed(() => {
  const checkedSum = deductionItems.value.reduce((acc, item) => acc + (item.checked ? item.amount : 0), 0);
  return Math.max(0, checkedSum + (extraCustomDeduction.value || 0));
});

// Effective Social & HF Base
const effectiveBase = computed(() => {
  const gross = Math.max(0, monthlySalary.value || 0);
  if (selectedPreset.value === 'custom') {
    return Math.max(0, customSocialBase.value || 0);
  }
  if (customBaseMode.value === 'capped') {
    return Math.min(gross, socialBaseCap.value);
  }
  return gross;
});

const monthlySocialPersonal = computed(() => {
  return (effectiveBase.value * pensionMedUnempRate.value) / 100;
});

const monthlyHfPersonal = computed(() => {
  return (effectiveBase.value * housingFundRate.value) / 100;
});

const monthlyFiveInsOneFund = computed(() => {
  return monthlySocialPersonal.value + monthlyHfPersonal.value;
});

// Bilateral Housing Fund (personal + employer match)
const monthlyBilateralHf = computed(() => {
  return monthlyHfPersonal.value * 2;
});

// Tax Brackets (Annual Comprehensive Income)
interface TaxBracket {
  level: number;
  maxAnnual: number; // Infinity for top bracket
  maxMonthly: number;
  rate: number; // e.g. 0.03
  quickAnnual: number;
  quickMonthly: number;
}

const TAX_BRACKETS: TaxBracket[] = [
  { level: 1, maxAnnual: 36000, maxMonthly: 3000, rate: 0.03, quickAnnual: 0, quickMonthly: 0 },
  { level: 2, maxAnnual: 144000, maxMonthly: 12000, rate: 0.1, quickAnnual: 2520, quickMonthly: 210 },
  { level: 3, maxAnnual: 300000, maxMonthly: 25000, rate: 0.2, quickAnnual: 16920, quickMonthly: 1410 },
  { level: 4, maxAnnual: 420000, maxMonthly: 35000, rate: 0.25, quickAnnual: 31920, quickMonthly: 2660 },
  { level: 5, maxAnnual: 660000, maxMonthly: 55000, rate: 0.3, quickAnnual: 52920, quickMonthly: 4410 },
  { level: 6, maxAnnual: 960000, maxMonthly: 80000, rate: 0.35, quickAnnual: 85920, quickMonthly: 7160 },
  { level: 7, maxAnnual: Infinity, maxMonthly: Infinity, rate: 0.45, quickAnnual: 181920, quickMonthly: 15160 },
];

function calcComprehensiveTax(annualTaxable: number): { tax: number; rate: number; quick: number } {
  if (annualTaxable <= 0) {
    return { tax: 0, rate: 0, quick: 0 };
  }
  const bracket = TAX_BRACKETS.find((b) => annualTaxable <= b.maxAnnual) || TAX_BRACKETS[TAX_BRACKETS.length - 1];
  const tax = Math.max(0, annualTaxable * bracket.rate - bracket.quickAnnual);
  return { tax, rate: bracket.rate, quick: bracket.quickAnnual };
}

function calcSeparateBonusTax(bonus: number): { tax: number; rate: number; quick: number; level: number } {
  if (bonus <= 0) {
    return { tax: 0, rate: 0, quick: 0, level: 0 };
  }
  const monthlyAvg = bonus / 12;
  const bracket = TAX_BRACKETS.find((b) => monthlyAvg <= b.maxMonthly) || TAX_BRACKETS[TAX_BRACKETS.length - 1];
  const tax = Math.max(0, bonus * bracket.rate - bracket.quickMonthly);
  return { tax, rate: bracket.rate, quick: bracket.quickMonthly, level: bracket.level };
}

// 6 Notorious Year-End Bonus Tax Cliffs (年终奖6大跳档盲区)
interface BonusCliffZone {
  id: number;
  threshold: number;
  upperBound: number;
  lowRate: number;
  highRate: number;
  maxLossAtOneYuan: number;
  netAtThreshold: number;
}

const BONUS_CLIFFS: BonusCliffZone[] = [
  {
    id: 1,
    threshold: 36000,
    upperBound: 38566.67,
    lowRate: 3,
    highRate: 10,
    maxLossAtOneYuan: 2310.07,
    netAtThreshold: 34920,
  },
  {
    id: 2,
    threshold: 144000,
    upperBound: 160500.0,
    lowRate: 10,
    highRate: 20,
    maxLossAtOneYuan: 13199.9,
    netAtThreshold: 129810,
  },
  {
    id: 3,
    threshold: 300000,
    upperBound: 318333.33,
    lowRate: 20,
    highRate: 25,
    maxLossAtOneYuan: 13750.05,
    netAtThreshold: 241410,
  },
  {
    id: 4,
    threshold: 420000,
    upperBound: 447500.0,
    lowRate: 25,
    highRate: 30,
    maxLossAtOneYuan: 19250.05,
    netAtThreshold: 317660,
  },
  {
    id: 5,
    threshold: 660000,
    upperBound: 706538.46,
    lowRate: 30,
    highRate: 35,
    maxLossAtOneYuan: 30250.05,
    netAtThreshold: 466410,
  },
  {
    id: 6,
    threshold: 960000,
    upperBound: 1120000.0,
    lowRate: 35,
    highRate: 45,
    maxLossAtOneYuan: 88000.1,
    netAtThreshold: 631160,
  },
];

// Annual Salary Tax & Separate vs Combined Comparison
const annualComparison = computed(() => {
  const grossMonthly = Math.max(0, monthlySalary.value || 0);
  const bonus = Math.max(0, yearEndBonus.value || 0);
  const annualGrossSalary = grossMonthly * 12;
  const annualFiveInsOneFund = monthlyFiveInsOneFund.value * 12;
  const annualSpecialDed = monthlySpecialDeduction.value * 12;
  const annualStandardDed = 60000; // ¥5,000 * 12

  // Taxable comprehensive income without bonus
  const salaryTaxableIncome = Math.max(
    0,
    annualGrossSalary - annualStandardDed - annualFiveInsOneFund - annualSpecialDed
  );

  // Option A: Separate Bonus Tax (年终奖单独计税)
  const salaryTaxObj = calcComprehensiveTax(salaryTaxableIncome);
  const bonusTaxObj = calcSeparateBonusTax(bonus);
  const separateTotalTax = salaryTaxObj.tax + bonusTaxObj.tax;
  const separateNetCash = annualGrossSalary + bonus - annualFiveInsOneFund - separateTotalTax;

  // Option B: Combined Tax (年终奖并入当年综合所得计税)
  const combinedTaxableIncome = Math.max(
    0,
    annualGrossSalary + bonus - annualStandardDed - annualFiveInsOneFund - annualSpecialDed
  );
  const combinedTaxObj = calcComprehensiveTax(combinedTaxableIncome);
  const combinedTotalTax = combinedTaxObj.tax;
  const combinedNetCash = annualGrossSalary + bonus - annualFiveInsOneFund - combinedTotalTax;

  const betterMode = separateTotalTax <= combinedTotalTax ? 'separate' : 'combined';
  const taxSaved = Math.abs(combinedTotalTax - separateTotalTax);

  return {
    annualGrossSalary,
    bonus,
    annualTotalGross: annualGrossSalary + bonus,
    annualFiveInsOneFund,
    annualBilateralHf: monthlyBilateralHf.value * 12,
    annualSpecialDed,
    salaryTaxableIncome,
    separate: {
      salaryTax: salaryTaxObj.tax,
      salaryRate: salaryTaxObj.rate,
      bonusTax: bonusTaxObj.tax,
      bonusRate: bonusTaxObj.rate,
      totalTax: separateTotalTax,
      netCash: separateNetCash,
      comprehensivePackage: separateNetCash + monthlyBilateralHf.value * 12,
    },
    combined: {
      taxableIncome: combinedTaxableIncome,
      totalTax: combinedTotalTax,
      rate: combinedTaxObj.rate,
      netCash: combinedNetCash,
      comprehensivePackage: combinedNetCash + monthlyBilateralHf.value * 12,
    },
    betterMode,
    taxSaved,
  };
});

// Cliff Detection & Optimal Split Planner (年终奖跳档盲区检测与拆分筹划)
const cliffAnalysis = computed(() => {
  const bonus = Math.max(0, yearEndBonus.value || 0);
  const matchedCliff = BONUS_CLIFFS.find((c) => bonus > c.threshold && bonus <= c.upperBound) || null;

  // Compute current best tax (min of pure separate vs pure combined)
  const currentBestTax = Math.min(
    annualComparison.value.separate.totalTax,
    annualComparison.value.combined.totalTax
  );

  // Evaluate candidate split points:
  // Candidate separate bonus values: 0 (all combined), bonus (all separate), and all cliff thresholds < bonus
  const candidates: number[] = [0, bonus];
  BONUS_CLIFFS.forEach((c) => {
    if (c.threshold < bonus) {
      candidates.push(c.threshold);
    }
  });

  const grossMonthly = Math.max(0, monthlySalary.value || 0);
  const annualGrossSalary = grossMonthly * 12;
  const annualFiveInsOneFund = monthlyFiveInsOneFund.value * 12;
  const annualSpecialDed = monthlySpecialDeduction.value * 12;
  const baseDeductions = 60000 + annualFiveInsOneFund + annualSpecialDed;

  let bestSeparateBonus = bonus;
  let bestShiftToSalary = 0;
  let minTotalTax = currentBestTax;

  for (const candBonus of candidates) {
    const shiftToSalary = bonus - candBonus;
    const newSalaryTaxable = Math.max(0, annualGrossSalary + shiftToSalary - baseDeductions);
    const salTax = calcComprehensiveTax(newSalaryTaxable).tax;
    const bonTax = calcSeparateBonusTax(candBonus).tax;
    const totalTax = salTax + bonTax;
    if (totalTax < minTotalTax - 0.01) {
      minTotalTax = totalTax;
      bestSeparateBonus = candBonus;
      bestShiftToSalary = shiftToSalary;
    }
  }

  // Also check pure threshold cut loss if inside a cliff (how much net bonus alone loses vs threshold)
  const currentBonusNet = bonus - calcSeparateBonusTax(bonus).tax;
  const cliffBonusLoss = matchedCliff ? Math.max(0, matchedCliff.netAtThreshold - currentBonusNet) : 0;
  const excessOverCliff = matchedCliff ? bonus - matchedCliff.threshold : 0;
  const splitExtraGain = Math.max(0, currentBestTax - minTotalTax);

  return {
    inCliff: !!matchedCliff,
    matchedCliff,
    excessOverCliff,
    cliffBonusLoss,
    currentBonusNet,
    hasBetterSplit: splitExtraGain > 1,
    bestSeparateBonus,
    bestShiftToSalary,
    minTotalTax,
    splitExtraGain,
    optimizedNetCash:
      annualComparison.value.annualTotalGross -
      annualComparison.value.annualFiveInsOneFund -
      minTotalTax,
  };
});

// 12-Month Cumulative Withholding Schedule (累计预扣法逐月明细)
interface MonthlyWithholdingRow {
  month: number;
  gross: number;
  fiveInsOneFund: number;
  cumulativeTaxable: number;
  bracketRate: number;
  cumulativeTax: number;
  monthlyTax: number;
  netCash: number;
}

const monthlySchedule = computed<MonthlyWithholdingRow[]>(() => {
  const rows: MonthlyWithholdingRow[] = [];
  const gross = Math.max(0, monthlySalary.value || 0);
  const ins = monthlyFiveInsOneFund.value;
  const spec = monthlySpecialDeduction.value;
  const std = 5000;

  let prevCumulativeTax = 0;

  for (let m = 1; m <= 12; m++) {
    const cumTaxable = Math.max(0, (gross - ins - spec - std) * m);
    const { tax: cumTax, rate } = calcComprehensiveTax(cumTaxable);
    const monthTax = Math.max(0, cumTax - prevCumulativeTax);
    prevCumulativeTax = cumTax;

    rows.push({
      month: m,
      gross,
      fiveInsOneFund: ins,
      cumulativeTaxable: cumTaxable,
      bracketRate: Math.round(rate * 100),
      cumulativeTax: cumTax,
      monthlyTax: monthTax,
      netCash: Math.max(0, gross - ins - monthTax),
    });
  }
  return rows;
});

function applyOptimalBonusThreshold() {
  if (cliffAnalysis.value.matchedCliff) {
    yearEndBonus.value = cliffAnalysis.value.matchedCliff.threshold;
  }
}

function formatMoney(val: number): string {
  return val.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
</script>

<template>
  <div class="salary-tax-tool">
    <!-- Top Workspace Grid -->
    <div class="workspace-grid">
      <!-- Left Column: Input Controls -->
      <div class="input-panel">
        <div class="panel-header">
          <h2 class="panel-title">
            {{ isEn ? '💼 Salary, Insurance & Bonus Parameters' : '💼 薪资、五险一金与年终奖参数配置' }}
          </h2>
          <span class="policy-tag">
            {{ isEn ? '2026-2027 Tax Policy' : '最新个税与年终奖政策' }}
          </span>
        </div>

        <!-- Monthly Gross Salary -->
        <div class="field-group">
          <div class="field-label-row">
            <label class="field-label">
              {{ isEn ? 'Monthly Gross Salary (¥)' : '月税前固定薪资 (元/月)' }}
            </label>
            <div class="preset-pills">
              <button
                v-for="amt in [12000, 20000, 30000, 45000, 65000]"
                :key="amt"
                type="button"
                class="mini-pill"
                :class="{ active: monthlySalary === amt }"
                @click="monthlySalary = amt"
              >
                ¥{{ (amt / 1000).toFixed(0) }}k
              </button>
            </div>
          </div>
          <div class="number-input-wrap">
            <span class="currency-prefix">¥</span>
            <input
              v-model.number="monthlySalary"
              type="number"
              min="0"
              step="500"
              class="number-input"
            />
          </div>
        </div>

        <!-- Year-End Bonus + Cliff Test Triggers -->
        <div class="field-group bonus-group">
          <div class="field-label-row">
            <label class="field-label">
              {{ isEn ? 'Year-End Gross Bonus (¥)' : '全年一次性奖金 / 年终奖 (元)' }}
            </label>
            <div class="preset-pills">
              <button
                type="button"
                class="mini-pill"
                :class="{ active: yearEndBonus === 36000 }"
                @click="yearEndBonus = 36000"
              >
                {{ isEn ? '¥36k (Safe)' : '¥3.6万 (安全顶格)' }}
              </button>
              <button
                type="button"
                class="mini-pill warn-pill"
                :class="{ active: yearEndBonus === 37000 }"
                @click="yearEndBonus = 37000"
              >
                {{ isEn ? '⚠️ ¥37k (Cliff 1)' : '⚠️ ¥3.7万 (盲区1)' }}
              </button>
              <button
                type="button"
                class="mini-pill warn-pill"
                :class="{ active: yearEndBonus === 148000 }"
                @click="yearEndBonus = 148000"
              >
                {{ isEn ? '⚠️ ¥148k (Cliff 2)' : '⚠️ ¥14.8万 (盲区2)' }}
              </button>
              <button
                type="button"
                class="mini-pill warn-pill"
                :class="{ active: yearEndBonus === 305000 }"
                @click="yearEndBonus = 305000"
              >
                {{ isEn ? '⚠️ ¥305k (Cliff 3)' : '⚠️ ¥30.5万 (盲区3)' }}
              </button>
            </div>
          </div>
          <div class="number-input-wrap">
            <span class="currency-prefix">¥</span>
            <input
              v-model.number="yearEndBonus"
              type="number"
              min="0"
              step="1000"
              class="number-input"
            />
          </div>
        </div>

        <!-- Social Insurance & Housing Fund Presets -->
        <div class="field-group">
          <label class="field-label">
            {{ isEn ? 'Social Insurance & Housing Fund Tier' : '五险一金缴纳标准与公积金比例' }}
          </label>
          <div class="tier-tabs">
            <button
              type="button"
              class="tier-tab"
              :class="{ active: selectedPreset === 'tier1-std' }"
              @click="applyPreset('tier1-std')"
            >
              {{ isEn ? 'Tier-1 Standard (12% HF)' : '一线城市标准 (22.5%·公积金12%)' }}
            </button>
            <button
              type="button"
              class="tier-tab"
              :class="{ active: selectedPreset === 'tier2-std' }"
              @click="applyPreset('tier2-std')"
            >
              {{ isEn ? 'Standard 8% HF' : '省会/标准档 (18.5%·公积金8%)' }}
            </button>
            <button
              type="button"
              class="tier-tab"
              :class="{ active: selectedPreset === 'minimal' }"
              @click="applyPreset('minimal')"
            >
              {{ isEn ? 'Basic 5% HF' : '基础档 (15.5%·公积金5%)' }}
            </button>
            <button
              type="button"
              class="tier-tab"
              :class="{ active: selectedPreset === 'custom' }"
              @click="applyPreset('custom')"
            >
              {{ isEn ? 'Custom Base/Rate' : '自定义基数/比例' }}
            </button>
          </div>

          <div class="ins-subgrid">
            <div class="sub-field">
              <label>{{ isEn ? 'Contribution Base (¥)' : '当前核算缴纳基数' }}</label>
              <input
                v-if="selectedPreset === 'custom'"
                v-model.number="customSocialBase"
                type="number"
                min="0"
                step="500"
                class="sub-input"
              />
              <div v-else class="sub-readonly">
                ¥{{ formatMoney(effectiveBase) }}
                <span class="sub-hint">
                  {{ effectiveBase < monthlySalary ? (isEn ? '(Capped)' : '(已触发封顶线)') : (isEn ? '(Full Salary)' : '(按全额月薪)') }}
                </span>
              </div>
            </div>
            <div class="sub-field">
              <label>{{ isEn ? 'Housing Fund Rate (%)' : '个人公积金比例 (5%~12%)' }}</label>
              <div class="rate-slider-row">
                <input
                  v-model.number="housingFundRate"
                  type="range"
                  min="5"
                  max="12"
                  step="1"
                  class="range-slider"
                />
                <span class="rate-val">{{ housingFundRate }}%</span>
              </div>
            </div>
          </div>

          <div class="ins-summary-strip">
            <span>
              {{ isEn ? 'Monthly Personal 5-Ins + HF:' : '个人月缴五险一金：' }}
              <strong>¥{{ formatMoney(monthlyFiveInsOneFund) }}</strong>
              ({{ isEn ? 'Ins' : '三险' }} ¥{{ formatMoney(monthlySocialPersonal) }} + {{ isEn ? 'HF' : '公积金' }} ¥{{ formatMoney(monthlyHfPersonal) }})
            </span>
            <span class="hf-badge">
              🏦 {{ isEn ? 'Bilateral HF Value:' : '双边公积金福利入账：' }}
              <strong>¥{{ formatMoney(monthlyBilateralHf) }}/{{ isEn ? 'mo' : '月' }}</strong>
            </span>
          </div>
        </div>

        <!-- Special Additional Deductions (专项附加扣除) -->
        <div class="field-group">
          <div class="field-label-row">
            <label class="field-label">
              {{ isEn ? 'Special Additional Tax Deductions (Monthly)' : '个税专项附加扣除 (勾选自动累加)' }}
            </label>
            <span class="deduction-total-badge">
              {{ isEn ? 'Total:' : '当前抵扣：' }} ¥{{ formatMoney(monthlySpecialDeduction) }} / {{ isEn ? 'mo' : '月' }}
            </span>
          </div>
          <div class="deduction-grid">
            <label
              v-for="item in deductionItems"
              :key="item.id"
              class="deduction-card"
              :class="{ checked: item.checked }"
            >
              <input v-model="item.checked" type="checkbox" class="deduction-checkbox" />
              <div class="deduction-info">
                <span class="deduction-name">{{ isEn ? item.nameEn : item.nameZh }}</span>
                <span class="deduction-amt">-¥{{ item.amount }}/{{ isEn ? 'mo' : '月' }}</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Right Column: Results & Comparison Dashboard -->
      <div class="result-panel">
        <!-- Hero Take-Home Summary -->
        <div class="hero-summary-card">
          <div class="hero-top-row">
            <div>
              <span class="hero-eyebrow">
                {{ isEn ? 'OPTIMAL ANNUAL NET TAKE-HOME CASH' : '全年最优实发到手净现金 (含年终奖)' }}
              </span>
              <div class="hero-main-amount">
                ¥{{ formatMoney(Math.max(annualComparison.separate.netCash, annualComparison.combined.netCash)) }}
              </div>
            </div>
            <div class="hero-pkg-box">
              <span class="pkg-label">
                {{ isEn ? 'Total Value (Incl. Bilateral HF)' : '含双边公积金全年综合总包净值' }}
              </span>
              <span class="pkg-val">
                ¥{{ formatMoney(Math.max(annualComparison.separate.comprehensivePackage, annualComparison.combined.comprehensivePackage)) }}
              </span>
            </div>
          </div>

          <div class="hero-metrics-grid">
            <div class="metric-cell">
              <span class="m-label">{{ isEn ? 'Annual Gross Total' : '全年税前总收入' }}</span>
              <span class="m-val">¥{{ formatMoney(annualComparison.annualTotalGross) }}</span>
            </div>
            <div class="metric-cell">
              <span class="m-label">{{ isEn ? 'Annual 5-Ins & HF' : '全年个人五险一金' }}</span>
              <span class="m-val">-¥{{ formatMoney(annualComparison.annualFiveInsOneFund) }}</span>
            </div>
            <div class="metric-cell">
              <span class="m-label">{{ isEn ? 'Optimal Total Tax' : '最优方案全年个税' }}</span>
              <span class="m-val tax-highlight">
                -¥{{ formatMoney(Math.min(annualComparison.separate.totalTax, annualComparison.combined.totalTax)) }}
              </span>
            </div>
            <div class="metric-cell">
              <span class="m-label">{{ isEn ? 'Avg Monthly Net Cash' : '折合月均到手现金' }}</span>
              <span class="m-val">
                ¥{{ formatMoney(Math.max(annualComparison.separate.netCash, annualComparison.combined.netCash) / 12) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Separate vs Combined Tax Comparison Card -->
        <div class="comparison-card">
          <div class="comp-header">
            <h3 class="comp-title">
              ⚖️ {{ isEn ? 'Separate Bonus Tax vs. Combined Comprehensive Tax' : '年终奖计税方式 PK：单独计税 vs 并入综合所得' }}
            </h3>
            <span class="winner-pill">
              {{
                annualComparison.taxSaved > 0
                  ? isEn
                    ? `${annualComparison.betterMode === 'separate' ? 'Separate Tax' : 'Combined Tax'} Saves ¥${formatMoney(annualComparison.taxSaved)}`
                    : `推荐【${annualComparison.betterMode === 'separate' ? '单独计税' : '并入综合所得'}】立省个税 ¥${formatMoney(annualComparison.taxSaved)}`
                  : isEn
                    ? 'Both Methods Equal'
                    : '两种计税方式税额一致'
              }}
            </span>
          </div>

          <div class="comp-columns">
            <!-- Option A: Separate Tax -->
            <div class="comp-box" :class="{ 'is-winner': annualComparison.betterMode === 'separate' }">
              <div class="comp-box-head">
                <span class="method-name">
                  {{ isEn ? 'Option A: Separate Bonus Tax' : '方案 A：年终奖单独计税' }}
                </span>
                <span v-if="annualComparison.betterMode === 'separate'" class="best-badge">
                  {{ isEn ? '★ OPTIMAL' : '★ 更省税首选' }}
                </span>
              </div>
              <div class="comp-Line">
                <span>{{ isEn ? 'Annual Salary Tax:' : '全年工资综合个税：' }}</span>
                <strong>¥{{ formatMoney(annualComparison.separate.salaryTax) }} ({{ Math.round(annualComparison.separate.salaryRate * 100) }}%)</strong>
              </div>
              <div class="comp-Line">
                <span>{{ isEn ? 'Separate Bonus Tax:' : '年终奖单独计税额：' }}</span>
                <strong>¥{{ formatMoney(annualComparison.separate.bonusTax) }} ({{ Math.round(annualComparison.separate.bonusRate * 100) }}%)</strong>
              </div>
              <div class="comp-Line total-line">
                <span>{{ isEn ? 'Total Annual Tax:' : '全年累计总个税：' }}</span>
                <strong class="tax-num">¥{{ formatMoney(annualComparison.separate.totalTax) }}</strong>
              </div>
              <div class="comp-Line net-line">
                <span>{{ isEn ? 'Annual Net Cash:' : '全年实发到手现金：' }}</span>
                <strong class="net-num">¥{{ formatMoney(annualComparison.separate.netCash) }}</strong>
              </div>
            </div>

            <!-- Option B: Combined Tax -->
            <div class="comp-box" :class="{ 'is-winner': annualComparison.betterMode === 'combined' }">
              <div class="comp-box-head">
                <span class="method-name">
                  {{ isEn ? 'Option B: Combined Income Tax' : '方案 B：并入当年综合所得' }}
                </span>
                <span v-if="annualComparison.betterMode === 'combined'" class="best-badge">
                  {{ isEn ? '★ OPTIMAL' : '★ 更省税首选' }}
                </span>
              </div>
              <div class="comp-Line">
                <span>{{ isEn ? 'Combined Taxable Income:' : '合并后应纳税所得额：' }}</span>
                <strong>¥{{ formatMoney(annualComparison.combined.taxableIncome) }}</strong>
              </div>
              <div class="comp-Line">
                <span>{{ isEn ? 'Marginal Tax Bracket:' : '适用最高边际税率：' }}</span>
                <strong>{{ Math.round(annualComparison.combined.rate * 100) }}%</strong>
              </div>
              <div class="comp-Line total-line">
                <span>{{ isEn ? 'Total Annual Tax:' : '全年累计总个税：' }}</span>
                <strong class="tax-num">¥{{ formatMoney(annualComparison.combined.totalTax) }}</strong>
              </div>
              <div class="comp-Line net-line">
                <span>{{ isEn ? 'Annual Net Cash:' : '全年实发到手现金：' }}</span>
                <strong class="net-num">¥{{ formatMoney(annualComparison.combined.netCash) }}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- 🔥 Tax Cliff Alert & Smart Bonus Split Optimizer -->
        <div
          class="cliff-detector-card"
          :class="{ 'is-danger': cliffAnalysis.inCliff, 'is-safe': !cliffAnalysis.inCliff }"
        >
          <div class="cliff-header">
            <span class="cliff-badge" :class="{ danger: cliffAnalysis.inCliff }">
              {{
                cliffAnalysis.inCliff
                  ? isEn
                    ? `🚨 TAX CLIFF ALERT (Zone #${cliffAnalysis.matchedCliff?.id})`
                    : `🚨 触发第 ${cliffAnalysis.matchedCliff?.id} 级【年终奖跳档盲区】警报！`
                  : isEn
                    ? '✅ Safe From Bonus Tax Cliffs'
                    : '✅ 当前年终奖未落入单独计税跳档盲区'
              }}
            </span>
            <span v-if="cliffAnalysis.inCliff" class="cliff-rate-jump">
              {{ isEn ? 'Tax Rate Jumps:' : '税率直接跳档：' }}
              {{ cliffAnalysis.matchedCliff?.lowRate }}% → {{ cliffAnalysis.matchedCliff?.highRate }}%
            </span>
          </div>

          <div v-if="cliffAnalysis.inCliff && cliffAnalysis.matchedCliff" class="cliff-alert-body">
            <p class="cliff-explain">
              <template v-if="!isEn">
                您的年终奖 <strong>¥{{ formatMoney(yearEndBonus) }}</strong> 恰好落入第
                {{ cliffAnalysis.matchedCliff.id }} 级盲区区间
                （<code>¥{{ cliffAnalysis.matchedCliff.threshold.toLocaleString() }}.01 ~ ¥{{ cliffAnalysis.matchedCliff.upperBound.toLocaleString() }}</code>）。
                相比临界点 <strong>¥{{ cliffAnalysis.matchedCliff.threshold.toLocaleString() }}</strong>，公司虽然多发了
                <strong>¥{{ formatMoney(cliffAnalysis.excessOverCliff) }}</strong>，但由于全额跳入
                {{ cliffAnalysis.matchedCliff.highRate }}% 税率档且速算扣除数仅按 1/12 抵扣，您的年终奖到手反而<strong>净缩水了 ¥{{ formatMoney(cliffAnalysis.cliffBonusLoss) }}</strong>！
              </template>
              <template v-else>
                Your bonus of <strong>¥{{ formatMoney(yearEndBonus) }}</strong> falls inside Tax Cliff Zone #{{ cliffAnalysis.matchedCliff.id }}
                (<code>¥{{ cliffAnalysis.matchedCliff.threshold.toLocaleString() }}.01 ~ ¥{{ cliffAnalysis.matchedCliff.upperBound.toLocaleString() }}</code>).
                Even though your gross bonus is <strong>¥{{ formatMoney(cliffAnalysis.excessOverCliff) }}</strong> above the
                ¥{{ cliffAnalysis.matchedCliff.threshold.toLocaleString() }} threshold, the bracket jump reduces your net bonus by
                <strong>¥{{ formatMoney(cliffAnalysis.cliffBonusLoss) }}</strong>!
              </template>
            </p>

            <!-- Smart Split Recommendation Box -->
            <div class="split-plan-box">
              <div class="split-plan-info">
                <div class="split-plan-title">
                  💡 {{ isEn ? 'Smart Bonus Split & Salary Shift Solution:' : 'HR 薪资拆分筹划最优解（总发薪成本不变）：' }}
                </div>
                <div class="split-plan-detail">
                  <template v-if="cliffAnalysis.hasBetterSplit">
                    <span v-if="!isEn">
                      建议将年终奖定为临界点 <strong>¥{{ formatMoney(cliffAnalysis.bestSeparateBonus) }}</strong>（单独计税），并将超出的
                      <strong>¥{{ formatMoney(cliffAnalysis.bestShiftToSalary) }}</strong> 并入平时月薪或综合所得发放，全年可立即<strong>净多拿现金 ¥{{ formatMoney(cliffAnalysis.splitExtraGain) }}</strong>！
                    </span>
                    <span v-else>
                      Cap separate bonus at <strong>¥{{ formatMoney(cliffAnalysis.bestSeparateBonus) }}</strong> and shift the remaining
                      <strong>¥{{ formatMoney(cliffAnalysis.bestShiftToSalary) }}</strong> into regular salary to immediately gain
                      <strong>+¥{{ formatMoney(cliffAnalysis.splitExtraGain) }}</strong> in net take-home cash!
                    </span>
                  </template>
                  <template v-else>
                    <span v-if="!isEn">
                      若无法拆入月薪，即便主动放弃超出临界点的 ¥{{ formatMoney(cliffAnalysis.excessOverCliff) }}（按 ¥{{ cliffAnalysis.matchedCliff.threshold.toLocaleString() }} 发放），年终奖也能立省并多拿 <strong>¥{{ formatMoney(cliffAnalysis.cliffBonusLoss) }}</strong>！
                    </span>
                    <span v-else>
                      Even reducing gross bonus down to the <strong>¥{{ cliffAnalysis.matchedCliff.threshold.toLocaleString() }}</strong> threshold increases your net bonus payout by <strong>+¥{{ formatMoney(cliffAnalysis.cliffBonusLoss) }}</strong>!
                    </span>
                  </template>
                </div>
              </div>
              <button type="button" class="btn-apply-cliff" @click="applyOptimalBonusThreshold">
                {{ isEn ? `Cap Bonus at ¥${cliffAnalysis.matchedCliff.threshold.toLocaleString()}` : `一键卡点至 ¥${cliffAnalysis.matchedCliff.threshold.toLocaleString()}` }}
              </button>
            </div>
          </div>

          <div v-else class="cliff-safe-body">
            <p v-if="!isEn" class="cliff-explain">
              当前年终奖 <strong>¥{{ formatMoney(yearEndBonus) }}</strong> 处于安全计税区间。
              <span v-if="cliffAnalysis.hasBetterSplit">
                但经过【年终奖+综合所得联合寻优算法】检测：若将年终奖保留 <strong>¥{{ formatMoney(cliffAnalysis.bestSeparateBonus) }}</strong> 单独计税，其余 <strong>¥{{ formatMoney(cliffAnalysis.bestShiftToSalary) }}</strong> 并入综合所得，全年仍可额外再省个税 <strong>¥{{ formatMoney(cliffAnalysis.splitExtraGain) }}</strong>！
              </span>
            </p>
            <p v-else class="cliff-explain">
              Your bonus of <strong>¥{{ formatMoney(yearEndBonus) }}</strong> is outside all 6 tax cliff zones.
              <span v-if="cliffAnalysis.hasBetterSplit">
                However, splitting <strong>¥{{ formatMoney(cliffAnalysis.bestSeparateBonus) }}</strong> as separate bonus and <strong>¥{{ formatMoney(cliffAnalysis.bestShiftToSalary) }}</strong> into comprehensive income saves an extra <strong>¥{{ formatMoney(cliffAnalysis.splitExtraGain) }}</strong>!
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Section 1: 6 Major Bonus Tax Cliffs Reference Table -->
    <div class="table-section">
      <div class="section-head">
        <div>
          <h3 class="section-title">
            📊 {{ isEn ? 'The 6 Year-End Bonus "Tax Cliff" Blind Zones Reference' : '年终奖 6 大“跳档盲区（多发 1 元少拿数千至数万元）”红线速查表' }}
          </h3>
          <p class="section-desc">
            {{
              isEn
                ? 'Click any test button to simulate how falling into a cliff zone drastically reduces net payout.'
                : '单独计税时，年终奖除以 12 确定税率，但速算扣除数只扣 1 个月而非 12 个月，从而在每个税率临界点后形成恐怖的“负收益盲区”。'
            }}
          </p>
        </div>
      </div>

      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ isEn ? 'Zone' : '盲区档位' }}</th>
              <th>{{ isEn ? 'Optimal Safe Edge' : '最优卡点金额 (元)' }}</th>
              <th>{{ isEn ? 'Tax Cliff Blind Zone (¥)' : '⚠️ 跳档盲区区间 (宁可少发也别落入)' }}</th>
              <th>{{ isEn ? 'Rate Jump' : '税率跳变' }}</th>
              <th>{{ isEn ? 'Loss for +¥1 Extra' : '多发 1 元净亏金额' }}</th>
              <th>{{ isEn ? 'Action' : '一键实测' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cliff in BONUS_CLIFFS"
              :key="cliff.id"
              :class="{ 'active-cliff-row': cliffAnalysis.matchedCliff?.id === cliff.id }"
            >
              <td>
                <span class="zone-pill">#{{ cliff.id }}</span>
              </td>
              <td class="mono-bold">¥{{ cliff.threshold.toLocaleString() }}</td>
              <td class="mono-danger">
                ¥{{ (cliff.threshold + 0.01).toLocaleString() }} ~ ¥{{ cliff.upperBound.toLocaleString() }}
              </td>
              <td>{{ cliff.lowRate }}% → {{ cliff.highRate }}%</td>
              <td class="loss-cell">-¥{{ formatMoney(cliff.maxLossAtOneYuan) }}</td>
              <td>
                <button
                  type="button"
                  class="table-test-btn"
                  @click="yearEndBonus = cliff.threshold + 1000"
                >
                  {{ isEn ? 'Simulate Cliff' : '测算此盲区' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Bottom Section 2: 12-Month Cumulative Withholding Schedule -->
    <div class="table-section">
      <div class="section-head">
        <div>
          <h3 class="section-title">
            🗓️ {{ isEn ? '12-Month Cumulative Withholding Tax & Take-Home Schedule' : '1~12 月工资【累计预扣法】逐月个税与实发到手明细表' }}
          </h3>
          <p class="section-desc">
            {{
              isEn
                ? 'Explains why your monthly take-home pay is highest in Jan–Mar and gradually decreases in Q3–Q4 as cumulative income crosses higher brackets.'
                : '为什么年初到手工资高、年底到手工资变少？因为我国采用“累计预扣法”，前几个月累计应纳税所得额低（适用 3% 税率），下半年累计跨档后税率逐级递进。'
            }}
          </p>
        </div>
      </div>

      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ isEn ? 'Month' : '月份' }}</th>
              <th>{{ isEn ? 'Monthly Gross' : '当月税前薪资' }}</th>
              <th>{{ isEn ? '5-Ins & HF' : '个人五险一金' }}</th>
              <th>{{ isEn ? 'Cum. Taxable Income' : '累计应纳税所得额' }}</th>
              <th>{{ isEn ? 'Bracket' : '预扣税率' }}</th>
              <th>{{ isEn ? 'Monthly Tax' : '当月预扣个税' }}</th>
              <th>{{ isEn ? 'Monthly Net Cash' : '当月实发到手' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in monthlySchedule" :key="row.month">
              <td class="mono-bold">
                {{ isEn ? `Month ${row.month}` : `第 ${row.month} 月` }}
              </td>
              <td>¥{{ formatMoney(row.gross) }}</td>
              <td>-¥{{ formatMoney(row.fiveInsOneFund) }}</td>
              <td>¥{{ formatMoney(row.cumulativeTaxable) }}</td>
              <td>
                <span class="rate-tag">{{ row.bracketRate }}%</span>
              </td>
              <td class="tax-cell">-¥{{ formatMoney(row.monthlyTax) }}</td>
              <td class="net-cell">¥{{ formatMoney(row.netCash) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.salary-tax-tool {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
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
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-color);
}

.panel-title {
  margin: 0;
  font-size: 16.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.policy-tag {
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
}

.bonus-group {
  border-color: var(--accent-border);
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.preset-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.mini-pill {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover,
  &.active {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-soft);
  }

  &.warn-pill.active {
    background: rgba(239, 68, 68, 0.12);
    border-color: #ef4444;
    color: #dc2626;
  }
}

.number-input-wrap {
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0 12px;
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: var(--accent);
  }
}

.currency-prefix {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-secondary);
  margin-right: 6px;
}

.number-input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 9px 0;
  font-size: 16px;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);
  outline: none;
}

.tier-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
}

.tier-tab {
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;

  &.active {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 700;
  }
}

.ins-subgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 4px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
}

.sub-field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-secondary);
  }
}

.sub-input,
.sub-readonly {
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.sub-hint {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 4px;
}

.rate-slider-row {
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

.rate-val {
  font-size: 13px;
  font-weight: 800;
  color: var(--accent);
  min-width: 34px;
  text-align: right;
}

.ins-summary-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px dashed var(--border-color);
  font-size: 12px;
  color: var(--text-secondary);

  strong {
    color: var(--text-primary);
  }
}

.hf-badge {
  color: var(--accent);
}

.deduction-total-badge {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

.deduction-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
}

.deduction-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.15s ease;

  &.checked {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
}

.deduction-checkbox {
  accent-color: var(--accent);
  width: 15px;
  height: 15px;
}

.deduction-info {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  line-height: 1.35;
}

.deduction-name {
  font-weight: 600;
  color: var(--text-primary);
}

.deduction-amt {
  font-size: 11px;
  color: var(--accent);
  font-weight: 700;
}

/* Right Column Cards */
.hero-summary-card {
  background: var(--bg-surface);
  border: 2px solid var(--accent);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-eyebrow {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--accent);
}

.hero-main-amount {
  font-size: 30px;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);
  line-height: 1.2;
  margin-top: 4px;
}

.hero-pkg-box {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 10px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.pkg-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
}

.pkg-val {
  font-size: 16px;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent);
}

.hero-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);

  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
}

.metric-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-muted);
}

.m-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.m-val {
  font-size: 13.5px;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);

  &.tax-highlight {
    color: #dc2626;
  }
}

/* Comparison Card */
.comparison-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.comp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.comp-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
}

.winner-pill {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.comp-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
}

.comp-box {
  padding: 14px;
  border-radius: 12px;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.is-winner {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
}

.comp-box-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--border-color);
}

.method-name {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-primary);
}

.best-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--accent);
  color: #fff;
}

.comp-Line {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--text-secondary);

  strong {
    color: var(--text-primary);
    font-family: 'JetBrains Mono', monospace;
  }

  &.total-line {
    padding-top: 6px;
    border-top: 1px dashed var(--border-color);
  }
}

.tax-num {
  color: #dc2626 !important;
}

.net-num {
  color: #059669 !important;
  font-size: 14px;
}

/* Cliff Detector Card */
.cliff-detector-card {
  border-radius: 16px;
  padding: 18px 20px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  gap: 12px;

  &.is-danger {
    border: 2px solid #ef4444;
    background: rgba(239, 68, 68, 0.05);
  }

  &.is-safe {
    border-color: rgba(16, 185, 129, 0.4);
  }
}

.cliff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.cliff-badge {
  font-size: 13px;
  font-weight: 800;
  color: #059669;

  &.danger {
    color: #dc2626;
  }
}

.cliff-rate-jump {
  font-size: 12px;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.cliff-explain {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-secondary);

  strong {
    color: var(--text-primary);
  }

  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--bg-muted);
    color: #dc2626;
  }
}

.split-plan-box {
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--accent-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.split-plan-info {
  flex: 1;
  min-width: 220px;
}

.split-plan-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--accent);
  margin-bottom: 4px;
}

.split-plan-detail {
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--text-secondary);

  strong {
    color: #059669;
  }
}

.btn-apply-cliff {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}

/* Tables */
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
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 660px;

  th,
  td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  th {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    background: var(--bg-muted);
  }

  tr.active-cliff-row {
    background: rgba(239, 68, 68, 0.08);
  }
}

.zone-pill {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11.5px;
  font-weight: 800;
  background: var(--accent-soft);
  color: var(--accent);
}

.mono-bold {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: var(--text-primary);
}

.mono-danger {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: #dc2626;
}

.loss-cell,
.tax-cell {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: #dc2626;
}

.net-cell {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  color: #059669;
}

.rate-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
}

.table-test-btn {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  border: 1px solid var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
  cursor: pointer;

  &:hover {
    background: var(--accent);
    color: #fff;
  }
}
</style>
