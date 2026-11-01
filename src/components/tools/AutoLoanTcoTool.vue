<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

// ============================================================================
// MODULE 1: Out-the-Door (OTD) Price Breakdown
// ============================================================================
const bareCarPrice = ref<number>(180000); // ¥180,000
const vehicleType = ref<'nev-exempt' | 'nev-half' | 'fuel-standard' | 'fuel-half'>('nev-exempt');
const compulsoryIns = ref<number>(950); // 交强险 6座以下 ¥950
const vesselTax = ref<number>(0); // 车船税 (新能源0，燃油车约360)
const licenseFee = ref<number>(500); // 上牌费
const thirdPartyCoverageWan = ref<number>(300); // 三者险保额 (万)
const customCommercialIns = ref<number | null>(null);

function handleVehicleTypeChange(type: 'nev-exempt' | 'nev-half' | 'fuel-standard' | 'fuel-half') {
  vehicleType.value = type;
  vesselTax.value = type.startsWith('nev') ? 0 : 360;
}

const purchaseTax = computed(() => {
  const baseTax = (bareCarPrice.value || 0) / 1.13 * 0.1;
  if (vehicleType.value === 'nev-exempt') {
    // 免税额上限 30,000 元
    return Math.max(0, baseTax - 30000);
  }
  if (vehicleType.value === 'nev-half') {
    // 减半征收，减税额上限 15,000 元
    const deduction = Math.min(baseTax * 0.5, 15000);
    return Math.max(0, baseTax - deduction);
  }
  if (vehicleType.value === 'fuel-half') {
    return baseTax * 0.5;
  }
  return baseTax;
});

const estimatedCommercialIns = computed(() => {
  if (customCommercialIns.value !== null && customCommercialIns.value >= 0) {
    return customCommercialIns.value;
  }
  // 车损险约 1200 + 裸车价 * 1.15% (电车略高 1.3%) + 三者险 (200万约1100, 300万约1350)
  const isNev = vehicleType.value.startsWith('nev');
  const damageRate = isNev ? 0.0135 : 0.0115;
  const damageIns = 1100 + (bareCarPrice.value || 0) * damageRate;
  const thirdPartyPrice = thirdPartyCoverageWan.value >= 300 ? 1350 : 1080;
  return Math.round(damageIns + thirdPartyPrice + 180);
});

const totalMandatoryFees = computed(() => {
  return purchaseTax.value + (compulsoryIns.value || 0) + (vesselTax.value || 0) + (licenseFee.value || 0);
});

const totalOtdPrice = computed(() => {
  return (bareCarPrice.value || 0) + totalMandatoryFees.value + estimatedCommercialIns.value;
});

// ============================================================================
// MODULE 2: 4S Dealer Flat-Fee Loan to True APR (IRR) Detector
// ============================================================================
const downPaymentPct = ref<number>(30); // 首付比例 30%
const loanMonths = ref<number>(36); // 36期 (3年)
const dealerRateMode = ref<'annual-flat' | 'monthly-flat'>('annual-flat');
const dealerQuotedRate = ref<number>(3.0); // 4S店宣称年费率 3.0% (或月费率 0.25%)
const dealerServiceFee = ref<number>(3000); // 金融服务费 / GPS / 抵押费

const loanPrincipal = computed(() => {
  const ratio = Math.max(0, Math.min(90, downPaymentPct.value || 0)) / 100;
  return Math.round((bareCarPrice.value || 0) * (1 - ratio));
});

const downPaymentCash = computed(() => {
  return (bareCarPrice.value || 0) - loanPrincipal.value + totalMandatoryFees.value + estimatedCommercialIns.value + (dealerServiceFee.value || 0);
});

// Solve monthly IRR via Newton-Raphson for net Principal P_net and fixed monthly payment M over n months
function solveMonthlyIrr(netPrincipal: number, monthlyPayment: number, n: number): number {
  if (netPrincipal <= 0 || monthlyPayment <= 0 || n <= 0) return 0;
  if (monthlyPayment * n <= netPrincipal) return 0;

  let r = 0.005; // initial guess 0.5% per month
  for (let iter = 0; iter < 60; iter++) {
    let f = -netPrincipal;
    let df = 0;
    for (let t = 1; t <= n; t++) {
      const denom = Math.pow(1 + r, t);
      f += monthlyPayment / denom;
      df -= (t * monthlyPayment) / Math.pow(1 + r, t + 1);
    }
    if (Math.abs(df) < 1e-12) break;
    const nextR = r - f / df;
    if (Math.abs(nextR - r) < 1e-9) {
      r = nextR;
      break;
    }
    r = Math.max(1e-6, Math.min(0.5, nextR));
  }
  return r;
}

const autoLoanAnalysis = computed(() => {
  const P = loanPrincipal.value;
  const n = Math.max(6, loanMonths.value || 36);
  const monthlyFlatRate =
    dealerRateMode.value === 'annual-flat'
      ? (dealerQuotedRate.value || 0) / 100 / 12
      : (dealerQuotedRate.value || 0) / 100;
  const quotedAnnualFlatPct = monthlyFlatRate * 12 * 100;

  // Dealer Equal Principal & Equal Interest (等本等息)
  const dealerMonthlyPrincipal = P / n;
  const dealerMonthlyInterest = P * monthlyFlatRate;
  const dealerMonthlyPayment = dealerMonthlyPrincipal + dealerMonthlyInterest;
  const dealerTotalInterest = dealerMonthlyInterest * n;
  const dealerTotalCostWithFee = dealerTotalInterest + (dealerServiceFee.value || 0);

  // True IRR without service fee & with upfront service fee
  const irrWithoutFeeMonthly = solveMonthlyIrr(P, dealerMonthlyPayment, n);
  const netBorrowedAfterFee = Math.max(1, P - (dealerServiceFee.value || 0));
  const irrWithFeeMonthly = solveMonthlyIrr(netBorrowedAfterFee, dealerMonthlyPayment, n);

  const trueNominalAprNoFee = irrWithoutFeeMonthly * 12 * 100;
  const trueNominalAprWithFee = irrWithFeeMonthly * 12 * 100;
  const trueCompoundEarWithFee = (Math.pow(1 + irrWithFeeMonthly, 12) - 1) * 100;

  // Compare against a genuine Bank Reducing-Balance Loan at the exact same headline rate
  const bankR = quotedAnnualFlatPct / 100 / 12;
  const pow = Math.pow(1 + bankR, n);
  const bankMonthlyPayment = bankR > 0 ? (P * bankR * pow) / (pow - 1) : P / n;
  const bankTotalInterest = Math.max(0, bankMonthlyPayment * n - P);
  const overpaidVsBank = Math.max(0, dealerTotalCostWithFee - bankTotalInterest);

  return {
    quotedAnnualFlatPct,
    dealerMonthlyPayment,
    dealerTotalInterest,
    dealerTotalCostWithFee,
    trueNominalAprNoFee,
    trueNominalAprWithFee,
    trueCompoundEarWithFee,
    bankMonthlyPayment,
    bankTotalInterest,
    overpaidVsBank,
    totalLoanedCarCost: (bareCarPrice.value || 0) + totalMandatoryFees.value + estimatedCommercialIns.value + dealerTotalCostWithFee,
  };
});

// ============================================================================
// MODULE 3: Fuel vs EV 5-Year TCO & Break-Even Mileage Simulator
// ============================================================================
const annualKm = ref<number>(15000); // 每年行驶里程 15,000 km
const fuelConsumption = ref<number>(7.8); // 燃油车百公里油耗 7.8 L/100km
const gasPricePerLiter = ref<number>(7.75); // 油价 ¥7.75/L
const evConsumption = ref<number>(14.5); // 电车百公里电耗 14.5 kWh/100km
const elecPricePerKwh = ref<number>(0.62); // 电价 ¥0.62/kWh
const fuelPricePremiumForEv = ref<number>(10000); // 同级别电车比油车裸车贵多少（可为0或负数，默认+10,000）
const fuelResale5YrPct = ref<number>(46); // 燃油车5年保值率 %
const evResale5YrPct = ref<number>(38); // 电车5年保值率 %

const tcoComparison = computed(() => {
  const years = 5;
  const totalKm = (annualKm.value || 0) * years;

  // Fuel Car
  const fuelBare = bareCarPrice.value || 180000;
  const fuelPurchaseTax = (fuelBare / 1.13) * 0.1;
  const fuelCostPerKm = ((fuelConsumption.value || 0) * (gasPricePerLiter.value || 0)) / 100;
  const fuel5YrEnergy = fuelCostPerKm * totalKm;
  const fuel5YrMaint = 1800 * years; // 油车年均保养 ¥1,800
  const fuel5YrIns = 4600 * years; // 油车5年均摊保险 + 车船税
  const fuelResaleValue = fuelBare * ((fuelResale5YrPct.value || 0) / 100);
  const fuel5YrTco = fuelBare + fuelPurchaseTax + fuel5YrEnergy + fuel5YrMaint + fuel5YrIns - fuelResaleValue;

  // EV / NEV Car
  const evBare = fuelBare + (fuelPricePremiumForEv.value || 0);
  const evBaseTax = (evBare / 1.13) * 0.1;
  const evPurchaseTax = Math.max(0, evBaseTax - 30000);
  const evCostPerKm = ((evConsumption.value || 0) * (elecPricePerKwh.value || 0)) / 100;
  const ev5YrEnergy = evCostPerKm * totalKm;
  const ev5YrMaint = 650 * years; // 电车年均保养 ¥650
  const ev5YrIns = 5400 * years; // 电车保费略高，无车船税
  const evResaleValue = evBare * ((evResale5YrPct.value || 0) / 100);
  const ev5YrTco = evBare + evPurchaseTax + ev5YrEnergy + ev5YrMaint + ev5YrIns - evResaleValue;

  // Savings & Break-even Km
  const energySaving5Yr = fuel5YrEnergy - ev5YrEnergy;
  const net5YrDiff = fuel5YrTco - ev5YrTco; // Positive means EV saves money overall

  // Fixed 5-yr non-energy cost difference: (EV non-energy net cost) - (Fuel non-energy net cost)
  const fuelNonEnergyNet = fuelBare + fuelPurchaseTax + fuel5YrMaint + fuel5YrIns - fuelResaleValue;
  const evNonEnergyNet = evBare + evPurchaseTax + ev5YrMaint + ev5YrIns - evResaleValue;
  const nonEnergyGap = evNonEnergyNet - fuelNonEnergyNet;
  const savingPerKm = Math.max(0.01, fuelCostPerKm - evCostPerKm);

  // Total 5-yr km needed to break even (0 if EV is already cheaper upfront/non-energy)
  const breakEvenTotalKm = nonEnergyGap <= 0 ? 0 : Math.round(nonEnergyGap / savingPerKm);
  const breakEvenAnnualKm = Math.round(breakEvenTotalKm / years);

  return {
    totalKm,
    fuelCostPerKm,
    evCostPerKm,
    fuel5YrEnergy,
    ev5YrEnergy,
    energySaving5Yr,
    fuel5YrTco,
    ev5YrTco,
    net5YrDiff,
    breakEvenTotalKm,
    breakEvenAnnualKm,
    fuelPurchaseTax,
    evPurchaseTax,
    fuelResaleValue,
    evResaleValue,
  };
});

function fmtMoney(val: number): string {
  return `¥${Math.round(val).toLocaleString('en-US')}`;
}
</script>

<template>
  <div class="auto-tco-shell">
    <!-- Top Header -->
    <div class="header-banner">
      <span class="chip-tag">
        {{ isEn ? '🚗 Car Buyer Anti-Trap & EV TCO Workbench' : '🚗 买车全款落地、车贷防坑与油电回本精算台' }}
      </span>
      <h2 class="main-heading">
        {{
          isEn
            ? 'Out-the-Door Car Price, Dealer Flat-Rate True APR (IRR) & 5-Year EV vs. Gas TCO'
            : '购车全款落地价 + 4S店“等本等息”转真实年化 (IRR) + 油车vs电车 5 年回本里程推演'
        }}
      </h2>
      <p class="sub-desc">
        {{
          isEn
            ? 'Calculate exact out-the-door taxes and insurance, expose hidden dealer flat-fee loan APRs using Newton-Raphson IRR, and find your exact break-even annual mileage between EV and gas cars.'
            : '买车前必算三笔账：① 裸车+购置税减免+商业险全款落地价；② 戳破 4S 店“年费率 3%”背后的真实 IRR 年化利率与服务费套路；③ 结合年行驶里程与保值率算清电车几年回本。'
        }}
      </p>
    </div>

    <!-- MODULE 1: Out-the-Door Price Breakdown -->
    <div class="module-card">
      <div class="module-header">
        <div>
          <span class="step-badge">{{ isEn ? 'Module 1' : '核心模块 ①' }}</span>
          <h3 class="module-title">
            {{ isEn ? 'Out-the-Door (OTD) Full Cash Price Breakdown' : '全款购车落地总价明细（含新能源购置税减免）' }}
          </h3>
        </div>
        <div class="otd-hero-pill">
          <span>{{ isEn ? 'Total OTD Price:' : '全款落地总价:' }}</span>
          <strong>{{ fmtMoney(totalOtdPrice) }}</strong>
        </div>
      </div>

      <div class="module-grid-2">
        <!-- OTD Inputs -->
        <div class="inputs-col">
          <div class="field-item">
            <label class="f-label">{{ isEn ? 'Negotiated Bare Car Price (CNY)' : '谈妥裸车发票价 (元)' }}</label>
            <input v-model.number="bareCarPrice" type="number" min="20000" max="5000000" step="5000" class="f-input" />
            <div class="quick-chips">
              <button
                v-for="p in [100000, 150000, 180000, 250000, 350000]"
                :key="p"
                type="button"
                class="q-chip"
                :class="{ active: bareCarPrice === p }"
                @click="bareCarPrice = p"
              >
                {{ isEn ? `¥${p / 1000}k` : `${p / 10000}万` }}
              </button>
            </div>
          </div>

          <div class="field-item">
            <label class="f-label">{{ isEn ? 'Vehicle Purchase Tax Policy' : '车型与车辆购置税政策' }}</label>
            <div class="policy-grid">
              <button
                type="button"
                class="policy-btn"
                :class="{ active: vehicleType === 'nev-exempt' }"
                @click="handleVehicleTypeChange('nev-exempt')"
              >
                {{ isEn ? 'NEV Tax Exempt (Cap ¥30k)' : '新能源免税（上限减3万）' }}
              </button>
              <button
                type="button"
                class="policy-btn"
                :class="{ active: vehicleType === 'nev-half' }"
                @click="handleVehicleTypeChange('nev-half')"
              >
                {{ isEn ? 'NEV Half Tax (Cap ¥15k)' : '新能源减半（上限减1.5万）' }}
              </button>
              <button
                type="button"
                class="policy-btn"
                :class="{ active: vehicleType === 'fuel-standard' }"
                @click="handleVehicleTypeChange('fuel-standard')"
              >
                {{ isEn ? 'Standard Fuel (10% Tax)' : '传统燃油车（标准10%）' }}
              </button>
              <button
                type="button"
                class="policy-btn"
                :class="{ active: vehicleType === 'fuel-half' }"
                @click="handleVehicleTypeChange('fuel-half')"
              >
                {{ isEn ? 'Fuel Promo (5% Half Tax)' : '燃油车减半特惠（5%）' }}
              </button>
            </div>
          </div>

          <div class="three-col-mini">
            <div class="field-item">
              <label class="f-label">{{ isEn ? 'Compulsory Ins.' : '交强险 (元)' }}</label>
              <input v-model.number="compulsoryIns" type="number" step="50" class="f-input" />
            </div>
            <div class="field-item">
              <label class="f-label">{{ isEn ? 'Vessel Tax' : '车船税 (元)' }}</label>
              <input v-model.number="vesselTax" type="number" step="60" class="f-input" />
            </div>
            <div class="field-item">
              <label class="f-label">{{ isEn ? 'Licensing Fee' : '上牌费 (元)' }}</label>
              <input v-model.number="licenseFee" type="number" step="100" class="f-input" />
            </div>
          </div>
        </div>

        <!-- OTD Breakdown Summary Card -->
        <div class="summary-col">
          <div class="otd-breakdown-list">
            <div class="otd-row">
              <span class="r-name">{{ isEn ? '1. Bare Car Invoice Price' : '① 裸车开票价' }}</span>
              <span class="r-val">{{ fmtMoney(bareCarPrice) }}</span>
            </div>
            <div class="otd-row">
              <span class="r-name">
                {{ isEn ? '2. Purchase Tax (裸车÷1.13×10%)' : '② 车辆购置税 (裸车÷1.13×10%)' }}
              </span>
              <span class="r-val" :class="{ 'text-green': purchaseTax === 0 }">
                {{ purchaseTax === 0 ? (isEn ? '¥0 (Exempt)' : '¥0 (全额免征)') : fmtMoney(purchaseTax) }}
              </span>
            </div>
            <div class="otd-row">
              <span class="r-name">{{ isEn ? '3. Compulsory Ins. + Vessel Tax + Plate' : '③ 交强险 + 车船税 + 上牌费' }}</span>
              <span class="r-val">{{ fmtMoney(compulsoryIns + vesselTax + licenseFee) }}</span>
            </div>
            <div class="otd-row">
              <span class="r-name">{{ isEn ? '4. Commercial Insurance (3M Liability + Damage)' : '④ 首年商业险估算 (车损+300万三者)' }}</span>
              <span class="r-val">{{ fmtMoney(estimatedCommercialIns) }}</span>
            </div>
            <div class="otd-row total-row">
              <span class="r-name">{{ isEn ? 'Out-the-Door Full Cash Total' : '全款落地总计' }}</span>
              <span class="r-val highlight-price">{{ fmtMoney(totalOtdPrice) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODULE 2: 4S Dealer Flat-Rate Loan to True APR (IRR) Detector -->
    <div class="module-card">
      <div class="module-header">
        <div>
          <span class="step-badge badge-danger">{{ isEn ? 'Module 2 · Anti-Trap' : '核心模块 ② · 照妖镜' }}</span>
          <h3 class="module-title">
            {{
              isEn
                ? '4S Dealer "Flat-Fee" Auto Loan vs. True Annualized Rate (IRR)'
                : '4S 店车贷“等本等息/月费率”套路转真实年化利率 (IRR) 照妖镜'
            }}
          </h3>
        </div>
      </div>

      <div class="module-grid-2">
        <!-- Dealer Loan Inputs -->
        <div class="inputs-col">
          <div class="two-col-mini">
            <div class="field-item">
              <label class="f-label">
                {{ isEn ? `Down Payment (${downPaymentPct}%)` : `首付比例 (${downPaymentPct}%)` }}
              </label>
              <input v-model.number="downPaymentPct" type="range" min="0" max="80" step="5" class="range-bar" />
              <span class="sub-note">
                {{ isEn ? 'Loan Principal:' : '贷款本金:' }} <strong>{{ fmtMoney(loanPrincipal) }}</strong>
              </span>
            </div>

            <div class="field-item">
              <label class="f-label">{{ isEn ? 'Loan Term (Months)' : '分期还款期数' }}</label>
              <div class="quick-chips">
                <button
                  v-for="m in [12, 24, 36, 48, 60]"
                  :key="m"
                  type="button"
                  class="q-chip"
                  :class="{ active: loanMonths === m }"
                  @click="loanMonths = m"
                >
                  {{ m }}{{ isEn ? 'm' : '期' }}
                </button>
              </div>
            </div>
          </div>

          <div class="field-item">
            <label class="f-label">{{ isEn ? 'Dealer Quoted Rate Type' : '4S店销售话术报价方式' }}</label>
            <div class="policy-grid">
              <button
                type="button"
                class="policy-btn"
                :class="{ active: dealerRateMode === 'annual-flat' }"
                @click="
                  dealerRateMode = 'annual-flat';
                  dealerQuotedRate = 3.0;
                "
              >
                {{ isEn ? 'Quoted Annual Flat Fee (e.g. 3%/yr)' : '按年费率报价（如“年息仅 3%”）' }}
              </button>
              <button
                type="button"
                class="policy-btn"
                :class="{ active: dealerRateMode === 'monthly-flat' }"
                @click="
                  dealerRateMode = 'monthly-flat';
                  dealerQuotedRate = 0.25;
                "
              >
                {{ isEn ? 'Quoted Monthly Flat Fee (e.g. 0.25%/mo)' : '按月费率报价（如“月费率 2厘5”）' }}
              </button>
            </div>
          </div>

          <div class="two-col-mini">
            <div class="field-item">
              <label class="f-label">
                {{
                  dealerRateMode === 'annual-flat'
                    ? isEn
                      ? 'Quoted Annual Flat Rate (%)'
                      : '4S店宣称年费率 (%)'
                    : isEn
                      ? 'Quoted Monthly Flat Rate (%)'
                      : '4S店宣称月费率 (%)'
                }}
              </label>
              <input v-model.number="dealerQuotedRate" type="number" min="0" max="20" step="0.05" class="f-input" />
            </div>

            <div class="field-item">
              <label class="f-label">{{ isEn ? 'Upfront Service / GPS Fee (CNY)' : '前置金融服务费/GPS费 (元)' }}</label>
              <input v-model.number="dealerServiceFee" type="number" min="0" max="50000" step="500" class="f-input" />
            </div>
          </div>
        </div>

        <!-- True APR Verdict Card -->
        <div class="summary-col">
          <div class="irr-expose-card">
            <div class="expose-top">
              <div class="rate-compare-block">
                <span class="rc-label">{{ isEn ? 'Dealer Headline Rate' : '销售宣称表面年费率' }}</span>
                <span class="rc-fake">{{ autoLoanAnalysis.quotedAnnualFlatPct.toFixed(2) }}%</span>
              </div>
              <div class="rc-arrow">➔</div>
              <div class="rate-compare-block">
                <span class="rc-label">{{ isEn ? 'True Effective APR (IRR)' : '穿透后真实年化利率 (IRR)' }}</span>
                <span class="rc-true">{{ autoLoanAnalysis.trueNominalAprWithFee.toFixed(2) }}%</span>
                <small class="rc-ear">
                  ({{ isEn ? 'Compound EAR:' : '复利年化:' }} {{ autoLoanAnalysis.trueCompoundEarWithFee.toFixed(2) }}%)
                </small>
              </div>
            </div>

            <div class="expose-details">
              <div class="ed-row">
                <span>{{ isEn ? 'Initial Down Payment + Taxes + Fee:' : '首付落地总首付（含税险+服务费）:' }}</span>
                <strong>{{ fmtMoney(downPaymentCash) }}</strong>
              </div>
              <div class="ed-row">
                <span>{{ isEn ? 'Monthly Fixed Payment:' : '每月固定月供:' }}</span>
                <strong>{{ fmtMoney(autoLoanAnalysis.dealerMonthlyPayment) }} × {{ loanMonths }}{{ isEn ? 'm' : '期' }}</strong>
              </div>
              <div class="ed-row">
                <span>{{ isEn ? 'Total Interest + Service Fee:' : '累计总利息 + 金融服务费:' }}</span>
                <strong class="text-danger">{{ fmtMoney(autoLoanAnalysis.dealerTotalCostWithFee) }}</strong>
              </div>
              <div class="ed-row highlight-ed">
                <span>
                  {{
                    isEn
                      ? `Overpaid vs. True ${autoLoanAnalysis.quotedAnnualFlatPct.toFixed(1)}% Bank Loan:`
                      : `比真正 ${autoLoanAnalysis.quotedAnnualFlatPct.toFixed(1)}% 银行等额本息多掏:`
                  }}
                </span>
                <strong class="text-danger">+{{ fmtMoney(autoLoanAnalysis.overpaidVsBank) }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODULE 3: Fuel vs EV 5-Year TCO & Break-Even Mileage Simulator -->
    <div class="module-card">
      <div class="module-header">
        <div>
          <span class="step-badge badge-green">{{ isEn ? 'Module 3 · 5-Year TCO' : '核心模块 ③ · 油电决战' }}</span>
          <h3 class="module-title">
            {{
              isEn
                ? 'Gas vs. Electric (NEV) 5-Year Total Cost of Ownership & Break-Even Mileage'
                : '同级燃油车 vs 新能源电车 5 年持有总成本 (TCO) 与回本里程推演'
            }}
          </h3>
        </div>
      </div>

      <!-- Mileage Slider -->
      <div class="mileage-banner">
        <div class="label-row">
          <span class="m-title">
            {{ isEn ? 'Your Estimated Annual Driving Mileage:' : '您预计每年行驶里程:' }}
            <strong class="text-accent">{{ annualKm.toLocaleString() }} km / {{ isEn ? 'yr' : '年' }}</strong>
            ({{ isEn ? '5-Year Total:' : '5年累计:' }} {{ tcoComparison.totalKm.toLocaleString() }} km)
          </span>
          <span class="breakeven-tag">
            {{
              tcoComparison.breakEvenAnnualKm === 0
                ? isEn
                  ? '⚡ EV is cheaper from Day 1 (0 km break-even)!'
                  : '⚡ 免购置税后电车落地即省钱（0 公里直接回本）！'
                : isEn
                  ? `🎯 Break-even at ${tcoComparison.breakEvenAnnualKm.toLocaleString()} km/yr (${tcoComparison.breakEvenTotalKm.toLocaleString()} km in 5 yrs)`
                  : `🎯 年均跑满 ${tcoComparison.breakEvenAnnualKm.toLocaleString()} 公里即可回本（5年共 ${tcoComparison.breakEvenTotalKm.toLocaleString()} km）`
            }}
          </span>
        </div>
        <input v-model.number="annualKm" type="range" min="5000" max="45000" step="1000" class="range-bar" />
      </div>

      <div class="module-grid-2">
        <!-- Fuel vs EV Inputs -->
        <div class="inputs-col">
          <div class="two-col-mini">
            <div class="field-item">
              <label class="f-label">{{ isEn ? 'Gas Consumption (L/100km)' : '油车百公里油耗 (L)' }}</label>
              <input v-model.number="fuelConsumption" type="number" step="0.5" class="f-input" />
            </div>
            <div class="field-item">
              <label class="f-label">{{ isEn ? 'Gas Price (CNY/L)' : '92/95号汽油单价 (元/L)' }}</label>
              <input v-model.number="gasPricePerLiter" type="number" step="0.1" class="f-input" />
            </div>
          </div>

          <div class="two-col-mini">
            <div class="field-item">
              <label class="f-label">{{ isEn ? 'EV Consumption (kWh/100km)' : '电车百公里电耗 (kWh)' }}</label>
              <input v-model.number="evConsumption" type="number" step="0.5" class="f-input" />
            </div>
            <div class="field-item">
              <label class="f-label">{{ isEn ? 'Electricity Cost (CNY/kWh)' : '充电综合度电均价 (元/度)' }}</label>
              <input v-model.number="elecPricePerKwh" type="number" step="0.05" class="f-input" />
            </div>
          </div>

          <div class="two-col-mini">
            <div class="field-item">
              <label class="f-label">{{ isEn ? '5-Yr Gas Resale (%)' : '油车 5 年残值率 (%)' }}</label>
              <input v-model.number="fuelResale5YrPct" type="number" min="15" max="75" class="f-input" />
            </div>
            <div class="field-item">
              <label class="f-label">{{ isEn ? '5-Yr EV Resale (%)' : '电车 5 年残值率 (%)' }}</label>
              <input v-model.number="evResale5YrPct" type="number" min="15" max="75" class="f-input" />
            </div>
          </div>
        </div>

        <!-- 5-Year TCO Verdict Table -->
        <div class="summary-col">
          <div class="tco-compare-box">
            <div class="tco-header-row">
              <span>{{ isEn ? '5-Year Cost Item' : '5 年周期成本项' }}</span>
              <span>{{ isEn ? '⛽ Gas Vehicle' : '⛽ 同级燃油车' }}</span>
              <span>{{ isEn ? '🔋 Electric (NEV)' : '🔋 新能源电车' }}</span>
            </div>
            <div class="tco-row">
              <span>{{ isEn ? 'Cost per Kilometer' : '每公里能源成本' }}</span>
              <span>¥{{ tcoComparison.fuelCostPerKm.toFixed(2) }}/km</span>
              <span class="text-green">¥{{ tcoComparison.evCostPerKm.toFixed(2) }}/km</span>
            </div>
            <div class="tco-row">
              <span>{{ isEn ? '5-Yr Fuel / Electricity' : '5 年累计油费/电费' }}</span>
              <span>{{ fmtMoney(tcoComparison.fuel5YrEnergy) }}</span>
              <span class="text-green">{{ fmtMoney(tcoComparison.ev5YrEnergy) }}</span>
            </div>
            <div class="tco-row">
              <span>{{ isEn ? 'Purchase Tax' : '购置税支出' }}</span>
              <span>{{ fmtMoney(tcoComparison.fuelPurchaseTax) }}</span>
              <span class="text-green">{{ fmtMoney(tcoComparison.evPurchaseTax) }}</span>
            </div>
            <div class="tco-row">
              <span>{{ isEn ? '5-Yr Resale Value (-)' : '5 年后卖车回血残值 (-)' }}</span>
              <span>-{{ fmtMoney(tcoComparison.fuelResaleValue) }}</span>
              <span>-{{ fmtMoney(tcoComparison.evResaleValue) }}</span>
            </div>
            <div class="tco-row tco-final-row">
              <span>{{ isEn ? '5-Yr Net TCO Cost' : '5 年净持有总成本 (TCO)' }}</span>
              <strong>{{ fmtMoney(tcoComparison.fuel5YrTco) }}</strong>
              <strong class="text-green">{{ fmtMoney(tcoComparison.ev5YrTco) }}</strong>
            </div>

            <div class="tco-verdict-bar">
              <template v-if="tcoComparison.net5YrDiff >= 0">
                {{
                  isEn
                    ? `🏆 Over 5 years (${tcoComparison.totalKm.toLocaleString()} km), driving EV saves ${fmtMoney(tcoComparison.energySaving5Yr)} in energy and ${fmtMoney(tcoComparison.net5YrDiff)} in total net TCO!`
                    : `🏆 5 年跑 ${tcoComparison.totalKm.toLocaleString()} 公里，买电车光能源费就省下 ${fmtMoney(tcoComparison.energySaving5Yr)}，扣除折旧与保费差额后净省 ${fmtMoney(tcoComparison.net5YrDiff)}！`
                }}
              </template>
              <template v-else>
                {{
                  isEn
                    ? `⚠️ Due to low annual mileage, Gas car has a lower 5-year net TCO by ${fmtMoney(Math.abs(tcoComparison.net5YrDiff))}.`
                    : `⚠️ 由于您年行驶里程较少，5年省下的油费尚不足以抵消电车折旧/保费差，燃油车 5 年总成本反而省 ${fmtMoney(Math.abs(tcoComparison.net5YrDiff))}。`
                }}
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auto-tco-shell {
  display: flex;
  flex-direction: column;
  gap: 22px;
  color: var(--text-primary);
}

.header-banner {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: var(--shadow-sm);
}

.chip-tag {
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

.main-heading {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
}

.sub-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.module-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: var(--shadow-sm);
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
}

.step-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 8px;
  border-radius: 6px;
  margin-bottom: 4px;
}

.step-badge.badge-danger {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.12);
}

.step-badge.badge-green {
  color: #059669;
  background: rgba(16, 185, 129, 0.14);
}

.module-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--text-primary);
}

.otd-hero-pill {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  padding: 8px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.otd-hero-pill strong {
  font-size: 20px;
  font-weight: 900;
  color: var(--accent);
}

.module-grid-2 {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .module-grid-2 {
    grid-template-columns: 1fr;
  }
}

.inputs-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-item {
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

.quick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.q-chip {
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.q-chip.active,
.q-chip:hover {
  background: var(--accent);
  color: #ffffff;
  border-color: var(--accent);
}

.policy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.policy-btn {
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.policy-btn.active {
  background: var(--accent);
  color: #ffffff;
  border-color: var(--accent);
  font-weight: 700;
}

.three-col-mini {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.two-col-mini {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.range-bar {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}

.sub-note {
  font-size: 12px;
  color: var(--text-secondary);
}

.otd-breakdown-list {
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.otd-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13.5px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--border-color);
}

.otd-row.total-row {
  border-bottom: none;
  padding-bottom: 0;
  padding-top: 4px;
  font-size: 15px;
  font-weight: 800;
}

.r-name {
  color: var(--text-secondary);
  font-weight: 600;
}

.r-val {
  font-weight: 800;
  color: var(--text-primary);
}

.highlight-price {
  font-size: 20px;
  color: var(--accent);
}

.text-green {
  color: #10b981;
}

.text-danger {
  color: #dc2626;
}

.text-accent {
  color: var(--accent);
}

/* IRR Expose Card */
.irr-expose-card {
  background: var(--bg-muted);
  border: 2px solid rgba(239, 68, 68, 0.35);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.expose-top {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px;
}

.rate-compare-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.rc-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}

.rc-fake {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-secondary);
  text-decoration: line-through;
}

.rc-true {
  font-size: 26px;
  font-weight: 900;
  color: #dc2626;
}

.rc-ear {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.rc-arrow {
  font-size: 20px;
  color: var(--text-secondary);
}

.expose-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.ed-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.highlight-ed {
  padding-top: 8px;
  border-top: 1px dashed var(--border-color);
  font-size: 13.5px;
}

/* Mileage & TCO */
.mileage-banner {
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13.5px;
}

.breakeven-tag {
  font-size: 12.5px;
  font-weight: 700;
  color: #059669;
  background: rgba(16, 185, 129, 0.14);
  padding: 4px 10px;
  border-radius: 999px;
}

.tco-compare-box {
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
}

.tco-header-row,
.tco-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  align-items: center;
  gap: 8px;
}

.tco-header-row {
  font-weight: 800;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.tco-final-row {
  border-top: 1px solid var(--border-color);
  padding-top: 8px;
  font-size: 14px;
}

.tco-verdict-bar {
  margin-top: 4px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.5;
}
</style>
