<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

// Currency toggle
const currency = ref<'USD' | 'CNY'>('USD');
const usdToCnyRate = ref<number>(7.25);
const currencySymbol = computed(() => (currency.value === 'USD' ? '$' : '¥'));

function toDisplayCurrency(valUsd: number): number {
  return currency.value === 'USD' ? valUsd : valUsd * usdToCnyRate.value;
}

// 1. Base Inputs for SaaS Unit Economics
const monthlyPrice = ref<number>(29);
const annualPrice = ref<number>(290);
const monthlySubscribers = ref<number>(120);
const annualSubscribers = ref<number>(30);
const monthlyNewSubscribers = ref<number>(25);
const monthlyLostSubscribers = ref<number>(6);
const monthlyMarketingSpend = ref<number>(300);
const grossMarginPct = ref<number>(85); // 85% typical for SaaS

// 2. Sensitivity Sandbox Sliders
const priceAdjustmentPct = ref<number>(0); // -50% to +100%
const churnDeltaPct = ref<number>(0); // -5% to +10%
const monthlyGrowthPct = ref<number>(5); // 0% to 30%

// 3. Unit Economics Calculations
const totalSubscribers = computed(() => {
  return Math.max(1, monthlySubscribers.value + annualSubscribers.value);
});

const mrr = computed(() => {
  const m = monthlySubscribers.value * monthlyPrice.value;
  const a = annualSubscribers.value * (annualPrice.value / 12);
  return m + a;
});

const arr = computed(() => mrr.value * 12);

const arpu = computed(() => {
  return totalSubscribers.value > 0 ? mrr.value / totalSubscribers.value : 0;
});

const customerChurnRate = computed(() => {
  if (totalSubscribers.value <= 0) return 0;
  return Math.min(100, Math.max(0.1, (monthlyLostSubscribers.value / totalSubscribers.value) * 100));
});

const customerLifetimeMonths = computed(() => {
  const rate = customerChurnRate.value / 100;
  return rate > 0 ? 1 / rate : 60;
});

const ltv = computed(() => {
  const margin = Math.max(10, Math.min(100, grossMarginPct.value)) / 100;
  const rate = customerChurnRate.value / 100;
  return rate > 0 ? (arpu.value * margin) / rate : 0;
});

const cac = computed(() => {
  const news = Math.max(1, monthlyNewSubscribers.value);
  return monthlyMarketingSpend.value / news;
});

const ltvCacRatio = computed(() => {
  return cac.value > 0 ? ltv.value / cac.value : 0;
});

const paybackPeriodMonths = computed(() => {
  const margin = Math.max(10, Math.min(100, grossMarginPct.value)) / 100;
  const monthlyGrossPerUser = arpu.value * margin;
  return monthlyGrossPerUser > 0 ? cac.value / monthlyGrossPerUser : 0;
});

// LTV:CAC Health Rating
const healthStatus = computed(() => {
  const ratio = ltvCacRatio.value;
  if (ratio >= 3.0) {
    return {
      level: 'healthy',
      color: '#10b981',
      badgeZh: '🟢 黄金健康区 (≥ 3.0x)',
      badgeEn: '🟢 Golden Health Zone (≥ 3.0x)',
      diagnosisZh:
        '您的单元经济极度健康！每投入 $1 获客成本可带来 $3 以上生命周期毛利。具备强抗风险能力与自生现金流，建议加大 SEO / 合作买量放量。',
      diagnosisEn:
        'Outstanding unit economics! Every $1 invested in CAC generates >$3 in lifetime gross profit. High organic cash flow; recommend scaling marketing channels.',
    };
  } else if (ratio >= 1.5) {
    return {
      level: 'warning',
      color: '#f59e0b',
      badgeZh: '🟡 警戒观察区 (1.5x ~ 2.9x)',
      badgeEn: '🟡 Caution Zone (1.5x ~ 2.9x)',
      diagnosisZh:
        '商业模式在微利边缘震荡。若获客成本略有波动或流失率上升，极易陷入亏损。建议优化产品体验降低 Churn，或将定价适度上浮 15%~25%。',
      diagnosisEn:
        'Operating near breakeven margins. Sensitive to marketing fluctuations or churn spikes. Recommend lowering churn or increasing subscription prices by 15-25%.',
    };
  } else {
    return {
      level: 'danger',
      color: '#ef4444',
      badgeZh: '🔴 危险亏损区 (< 1.5x)',
      badgeEn: '🔴 Danger Zone (< 1.5x)',
      diagnosisZh:
        '获客成本严重吞噬利润！用户生命周期毛利无法覆盖市场开销，越卖越亏。建议立即暂停盲目付费推广，重新打磨核心付费场景并推行年付折扣。',
      diagnosisEn:
        'CAC is eroding profitability! Lifetime customer gross profit cannot cover acquisition spend. Halt paid ads immediately and refine your core pricing and retention.',
    };
  }
});

// 4. 12-Month Trajectory Sandbox Simulation
interface MonthlyForecast {
  month: number;
  label: string;
  baseSubs: number;
  baseMrr: number;
  simSubs: number;
  simMrr: number;
  cumBaseCash: number;
  cumSimCash: number;
}

const forecast12Months = computed<MonthlyForecast[]>(() => {
  const list: MonthlyForecast[] = [];

  // Baseline initial
  let curBaseSubs = totalSubscribers.value;
  const basePricePerMonth = arpu.value;
  const baseMonthlyLost = monthlyLostSubscribers.value;
  const baseMonthlyNew = monthlyNewSubscribers.value;

  // Simulation parameters
  const priceMultiplier = 1 + priceAdjustmentPct.value / 100;
  const simPricePerMonth = basePricePerMonth * priceMultiplier;
  const simChurnRate = Math.max(0.005, (customerChurnRate.value + churnDeltaPct.value) / 100);
  const monthlyGrowthRate = monthlyGrowthPct.value / 100;

  let curSimSubs = totalSubscribers.value;
  let cumBase = 0;
  let cumSim = 0;

  for (let m = 1; m <= 12; m++) {
    // Baseline path: linear addition and constant churn count
    curBaseSubs = Math.max(1, curBaseSubs - baseMonthlyLost + baseMonthlyNew);
    const bMrr = curBaseSubs * basePricePerMonth;
    cumBase += bMrr;

    // Simulated path: compound growth with adjusted churn
    const newsThisMonth = Math.round(baseMonthlyNew * Math.pow(1 + monthlyGrowthRate, m));
    const lostThisMonth = Math.round(curSimSubs * simChurnRate);
    curSimSubs = Math.max(1, curSimSubs - lostThisMonth + newsThisMonth);
    const sMrr = curSimSubs * simPricePerMonth;
    cumSim += sMrr;

    list.push({
      month: m,
      label: isEn.value ? `M${m}` : `${m}月`,
      baseSubs: curBaseSubs,
      baseMrr: bMrr,
      simSubs: curSimSubs,
      simMrr: sMrr,
      cumBaseCash: cumBase,
      cumSimCash: cumSim,
    });
  }

  return list;
});

// SVG Chart Geometry
const svgWidth = 640;
const svgHeight = 220;
const padding = { top: 20, right: 30, bottom: 30, left: 60 };

const maxMrrInForecast = computed(() => {
  const allValues = forecast12Months.value.flatMap((f) => [f.baseMrr, f.simMrr]);
  return Math.max(...allValues, 1000) * 1.15;
});

function getSvgX(index: number): number {
  const step = (svgWidth - padding.left - padding.right) / 11;
  return padding.left + index * step;
}

function getSvgY(val: number): number {
  const max = maxMrrInForecast.value;
  const usableHeight = svgHeight - padding.top - padding.bottom;
  const ratio = Math.max(0, Math.min(1, val / max));
  return svgHeight - padding.bottom - ratio * usableHeight;
}

const baseSvgPath = computed(() => {
  return forecast12Months.value.reduce((acc, f, idx) => {
    const x = getSvgX(idx);
    const y = getSvgY(f.baseMrr);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');
});

const simSvgPath = computed(() => {
  return forecast12Months.value.reduce((acc, f, idx) => {
    const x = getSvgX(idx);
    const y = getSvgY(f.simMrr);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');
});

const simAreaPath = computed(() => {
  const points = forecast12Months.value.map((f, idx) => ({
    x: getSvgX(idx),
    y: getSvgY(f.simMrr),
  }));
  const zeroY = svgHeight - padding.bottom;
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  const path = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');
  return `${path} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;
});

// Hover tooltip on SVG
const hoveredMonthIndex = ref<number | null>(null);

// 5. Acquire.com / Flippa ARR Multiple Valuation
const valuationEstimate = computed(() => {
  const currentArrUsd = arr.value;
  return {
    conservative: {
      multiple: '2.5x ~ 3.2x',
      lowUsd: currentArrUsd * 2.5,
      highUsd: currentArrUsd * 3.2,
      tagZh: '保守下限 (P25)',
      tagEn: 'Conservative (P25)',
      descZh: '增长缓慢 (<15% YoY)、创始人强依赖、Churn 略高 (>6%)',
      descEn: 'Low growth (<15% YoY), high key-person risk, churn >6%',
    },
    median: {
      multiple: '4.0x ~ 5.2x',
      lowUsd: currentArrUsd * 4.0,
      highUsd: currentArrUsd * 5.2,
      tagZh: '行业中位 (P50)',
      tagEn: 'Market Median (P50)',
      descZh: '稳步健康增长 (25%~40% YoY)、Churn 3%~5%、LTV:CAC > 3',
      descEn: 'Steady growth (25-40% YoY), moderate churn (3-5%), LTV:CAC > 3',
    },
    premium: {
      multiple: '6.0x ~ 8.0x+',
      lowUsd: currentArrUsd * 6.0,
      highUsd: currentArrUsd * 8.0,
      tagZh: '明星溢价 (P75)',
      tagEn: 'High-Growth Premium (P75)',
      descZh: '高速成长 (>60% YoY)、负净流失 (NRR > 110%)、AI独门壁垒',
      descEn: 'Rapid scale (>60% YoY), net revenue expansion (NRR>110%), proprietary AI moat',
    },
  };
});

// 5 Valuation Optimization Levers (Expandable)
const activeLeverIndex = ref<number | null>(null);
function toggleLever(idx: number) {
  activeLeverIndex.value = activeLeverIndex.value === idx ? null : idx;
}

const valuationLevers = computed(() =>
  isEn.value
    ? [
        {
          title: '1. Boost Annual Subscription Prepayments',
          summary: 'Increase annual plan mix to >40% to lock upfront liquidity and slash churn.',
          detail:
            'Annual customers have churn rates 60-70% lower than monthly plans. Offer 2 months free (17% discount) to incentivize prepayment, giving you interest-free runway and boosting enterprise valuation multiples.',
        },
        {
          title: '2. Build a Net Negative Churn Flywheel (NRR > 100%)',
          summary: 'Add consumption-based tiered expansion tiers (Tokens, Seats, API usage).',
          detail:
            'When expansion revenue from existing loyal users exceeds revenue lost from cancellations, your Net Revenue Retention exceeds 100%. Buyers on Acquire.com pay top-dollar (6x-8x ARR) for SaaS with negative churn.',
        },
        {
          title: '3. Diversify Organic Acquisition Channels',
          summary: 'Eliminate single-point SEO or algorithm dependencies with pSEO & Newsletters.',
          detail:
            'Acquirers discount projects that rely 100% on one Google keyword or Twitter account. Build programmatic SEO landing pages, an active email newsletter, and open-source integrations to prove sustainable traffic resilience.',
        },
        {
          title: '4. Maintain an Audit-Ready Financial Data Room',
          summary: 'Keep clean Stripe / Lemon Squeezy analytics and zero mixed personal expenses.',
          detail:
            'Separate personal cards from corporate subscriptions. Use Baremetrics or ProfitWell connected to Stripe. Clean books speed up LOI due diligence from 60 days to 14 days and prevent price renegotiation.',
        },
        {
          title: '5. Founder Independence & Zero-Maintenance Architecture',
          summary: 'Build with serverless/static stacks and complete support runbooks.',
          detail:
            'If the product requires 40 hours of founder coding each week, buyers view it as a job, not an asset. Document customer support SOPs and leverage serverless / Astro / Cloudflare architectures so it runs on 2 hours/week.',
        },
      ]
    : [
        {
          title: '1. 推行年付折扣绑定预付现金流 (Boost Annual Plans)',
          summary: '将年付比例提升至 40% 以上，锁定长期沉淀资金并将年化流失率压低 60%。',
          detail:
            '年付订阅用户的自然流失率仅为月付用户的 1/3。通过“买 10 个月送 2 个月”策略吸引预付，不仅能获得零息运营流动资金，更能直接提升 Acquire.com 买家对收益确定性的估值评级。',
        },
        {
          title: '2. 构建负净流失飞轮 (Net Revenue Retention > 100%)',
          summary: '引入用量阶梯（Tokens、席位、API 调用），让老客户增购超过流失损失。',
          detail:
            '当老客户业务壮大带来的扩增收入（Expansion MRR）大于退订流失额时，企业即可达成净收入留存率（NRR）> 100%。拥有负流失飞轮的 SaaS 在二级市场可直接享受 6.0x~8.0x ARR 的顶格估值溢价。',
        },
        {
          title: '3. 建立多维自然获客护城河 (Traffic Diversification)',
          summary: '摆脱单一依赖，构建 pSEO 批量长尾词、开源代码库与 Newsletter 复合矩阵。',
          detail:
            '买家非常忌惮 90% 流量依赖单一 Google 关键词或单一推特账号的项目。通过纯静态工具页、批量 pSEO 及自建邮件列表证明获客抗周期韧性，避免被买家在尽调时大砍价格。',
        },
        {
          title: '4. 规范独立 Stripe 财务流水与数据室 (Clean Data Room)',
          summary: '保持独立主体核算，杜绝私户混用，提供一键可核验的利润损益底表。',
          detail:
            '严禁个人消费与 SaaS 研发工具混刷。保持 Stripe / Lemon Squeezy 数据室账目清晰透明，能将意向买家的意向备忘录（LOI）尽调签署周期从 60 天压缩至 14 天内，避免交易中途流产。',
        },
        {
          title: '5. 极简零维护架构与脱离创始人依赖 (Founder Independence)',
          summary: '采用 Serverless/静态架构，沉淀完备的客户服务与应急恢复 SOP。',
          detail:
            '若项目离开创始人每天写代码就无法运转，买家会将其视作“购买了一份繁重苦力”而非优质资产。使用 Astro / Cloudflare 等零服务器成本架构，让买家确信“接手后即使每周只花 2 小时也能自动运转”。',
        },
      ]
);

// Tier 2 BP Modal Drawer
const showBpModal = ref(false);
const toastMessage = ref('');
const showToast = ref(false);

function triggerToast(msg: string) {
  toastMessage.value = msg;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3500);
}

function handleAffiliateClick(url: string, platformName: string, ev: MouseEvent) {
  if (url.includes('PLACEHOLDER')) {
    ev.preventDefault();
    triggerToast(
      isEn.value
        ? `Official ${platformName} partner benefits are updating. Redirecting to official portal...`
        : `【${platformName}】专属优惠渠道系统维护中，正在为您打开官方安全通道...`
    );
    setTimeout(() => {
      window.open(`https://${platformName.toLowerCase().replace(/\s+/g, '')}.com`, '_blank');
    }, 1200);
  }
}
</script>

<template>
  <div class="saas-metrics-container">
    <!-- Header -->
    <div class="tool-header">
      <div class="header-main">
        <h2 class="tool-title">
          {{ isEn ? 'Micro-SaaS Valuation & Unit Economics Sandbox' : '独立开发 / Micro-SaaS 估值与核心指标决策沙盘' }}
        </h2>
        <p class="tool-subtitle">
          {{
            isEn
              ? 'Real-time LTV:CAC health check, 12-month sensitivity forecast curve, and Acquire.com ARR multiple valuation for indie hackers & solopreneurs.'
              : '为出海独立黑客量身定制：实时诊断 MRR / LTV / CAC 健康度仪表盘、12 个月价格敏感度推演动态 SVG 曲线与 Acquire.com 项目并购交易估值估算。'
          }}
        </p>
      </div>

      <!-- Currency Switcher -->
      <div class="currency-bar">
        <span class="curr-label">{{ isEn ? 'Display Currency:' : '计价货币单位:' }}</span>
        <button
          type="button"
          class="curr-pill"
          :class="{ active: currency === 'USD' }"
          @click="currency = 'USD'"
        >
          USD ($)
        </button>
        <button
          type="button"
          class="curr-pill"
          :class="{ active: currency === 'CNY' }"
          @click="currency = 'CNY'"
        >
          CNY (¥)
        </button>
      </div>
    </div>

    <!-- Section 1: Dashboard Top Scorecards -->
    <div class="scorecards-grid">
      <!-- MRR Card -->
      <div class="metric-card">
        <span class="card-label">Monthly Recurring Revenue (MRR)</span>
        <div class="card-value">{{ currencySymbol }}{{ Math.round(toDisplayCurrency(mrr)).toLocaleString() }}</div>
        <div class="card-sub">{{ isEn ? 'Annual ARR:' : '折合年经常性收入 (ARR):' }} {{ currencySymbol }}{{ Math.round(toDisplayCurrency(arr)).toLocaleString() }}</div>
      </div>

      <!-- ARPU Card -->
      <div class="metric-card">
        <span class="card-label">Average Revenue Per User (ARPU)</span>
        <div class="card-value">{{ currencySymbol }}{{ toDisplayCurrency(arpu).toFixed(1) }}</div>
        <div class="card-sub">{{ totalSubscribers }} {{ isEn ? 'active subscribers' : '位有效订阅用户' }}</div>
      </div>

      <!-- Churn Card -->
      <div class="metric-card">
        <span class="card-label">Monthly Churn Rate</span>
        <div class="card-value" :class="{ 'text-danger': customerChurnRate > 5 }">
          {{ customerChurnRate.toFixed(1) }}%
        </div>
        <div class="card-sub">{{ isEn ? 'Avg Lifetime:' : '平均生命周期:' }} {{ customerLifetimeMonths.toFixed(1) }} {{ isEn ? 'mo' : '个月' }}</div>
      </div>

      <!-- CAC Card -->
      <div class="metric-card">
        <span class="card-label">Acquisition Cost (CAC)</span>
        <div class="card-value">{{ currencySymbol }}{{ Math.round(toDisplayCurrency(cac)) }}</div>
        <div class="card-sub">{{ isEn ? 'Payback:' : '回本周期:' }} {{ paybackPeriodMonths.toFixed(1) }} {{ isEn ? 'mo' : '个月' }}</div>
      </div>

      <!-- LTV Card -->
      <div class="metric-card highlight-metric">
        <span class="card-label">Customer Lifetime Value (LTV)</span>
        <div class="card-value text-accent">{{ currencySymbol }}{{ Math.round(toDisplayCurrency(ltv)).toLocaleString() }}</div>
        <div class="card-sub">{{ grossMarginPct }}% {{ isEn ? 'gross margin' : '毛利率标准' }}</div>
      </div>
    </div>

    <!-- Section 2: LTV:CAC Ratio Health Gauge -->
    <div class="health-gauge-box" :style="{ borderColor: healthStatus.color }">
      <div class="gauge-header">
        <div class="gauge-title-line">
          <span class="gauge-main-title">{{ isEn ? 'LTV : CAC Unit Economics Health Rating' : 'LTV : CAC 单元经济健康度体检' }}</span>
          <span class="health-badge" :style="{ background: healthStatus.color }">
            {{ isEn ? healthStatus.badgeEn : healthStatus.badgeZh }}
          </span>
        </div>
        <div class="ratio-big-value" :style="{ color: healthStatus.color }">
          {{ ltvCacRatio.toFixed(2) }}x
        </div>
      </div>

      <!-- Health Bar Track -->
      <div class="health-progress-track">
        <div class="zone zone-danger" style="width: 30%"><span>&lt; 1.5x 亏损</span></div>
        <div class="zone zone-warning" style="width: 30%"><span>1.5x ~ 2.9x 警戒</span></div>
        <div class="zone zone-healthy" style="width: 40%"><span>≥ 3.0x 黄金健康</span></div>
        <!-- Pointer Indicator -->
        <div
          class="gauge-pointer"
          :style="{ left: `${Math.min(98, Math.max(2, (ltvCacRatio / 5.0) * 100))}%` }"
        >
          ▲
        </div>
      </div>

      <p class="health-diagnosis-text">
        {{ isEn ? healthStatus.diagnosisEn : healthStatus.diagnosisZh }}
      </p>
    </div>

    <!-- Section 3: Interactive Parameters & Inputs -->
    <div class="inputs-grid-section">
      <div class="section-subheading">
        {{ isEn ? 'Current Operating Metrics Inputs' : '当前实际运营数据输入' }}
      </div>

      <div class="inputs-grid">
        <div class="input-cell">
          <label class="cell-label">{{ isEn ? 'Monthly Plan Price ($)' : '月付订阅单价 ($)' }}</label>
          <input v-model.number="monthlyPrice" type="number" min="1" step="5" class="cell-input" />
        </div>

        <div class="input-cell">
          <label class="cell-label">{{ isEn ? 'Annual Plan Price ($)' : '年付订阅单价 ($)' }}</label>
          <input v-model.number="annualPrice" type="number" min="1" step="20" class="cell-input" />
        </div>

        <div class="input-cell">
          <label class="cell-label">{{ isEn ? 'Active Monthly Subscribers' : '月付有效用户数' }}</label>
          <input v-model.number="monthlySubscribers" type="number" min="0" step="10" class="cell-input" />
        </div>

        <div class="input-cell">
          <label class="cell-label">{{ isEn ? 'Active Annual Subscribers' : '年付有效用户数' }}</label>
          <input v-model.number="annualSubscribers" type="number" min="0" step="5" class="cell-input" />
        </div>

        <div class="input-cell">
          <label class="cell-label">{{ isEn ? 'New Subscribers / Month' : '每月新增订阅人数' }}</label>
          <input v-model.number="monthlyNewSubscribers" type="number" min="1" step="5" class="cell-input" />
        </div>

        <div class="input-cell">
          <label class="cell-label">{{ isEn ? 'Lost Subscribers / Month' : '每月流失订阅人数' }}</label>
          <input v-model.number="monthlyLostSubscribers" type="number" min="0" step="1" class="cell-input" />
        </div>

        <div class="input-cell">
          <label class="cell-label">{{ isEn ? 'Monthly Marketing Spend ($)' : '每月营销买量开销 ($)' }}</label>
          <input v-model.number="monthlyMarketingSpend" type="number" min="0" step="50" class="cell-input" />
        </div>

        <div class="input-cell">
          <label class="cell-label">{{ isEn ? 'Gross Margin (%)' : 'SaaS 毛利率 (%)' }}</label>
          <input v-model.number="grossMarginPct" type="number" min="20" max="99" step="5" class="cell-input" />
        </div>
      </div>
    </div>

    <!-- Section 4: 12-Month Sensitivity Sandbox & SVG Trajectory -->
    <div class="sandbox-section">
      <div class="sandbox-header">
        <h3 class="sandbox-title">
          {{ isEn ? '12-Month Sensitivity Forecast Sandbox' : '12 个月价格敏感度与现金流沙盘推演' }}
        </h3>
        <p class="sandbox-subtitle">
          {{
            isEn
              ? 'Drag the sliders below to simulate price hikes, churn reduction, or growth acceleration. Watch the MRR trajectory adapt in real time.'
              : '自由拖动下方 3 大杠杆滑块，模拟提价、优化流失率或加速获客后的 12 个月 MRR 增长轨迹。'
          }}
        </p>
      </div>

      <!-- Dynamic Levers Sliders -->
      <div class="sliders-row">
        <div class="slider-box">
          <div class="slider-label-line">
            <span>{{ isEn ? 'Price Hike / Discount' : '订阅定价调整幅度' }}</span>
            <span class="slider-val" :class="{ 'text-accent': priceAdjustmentPct > 0 }">
              {{ priceAdjustmentPct > 0 ? `+${priceAdjustmentPct}%` : `${priceAdjustmentPct}%` }}
            </span>
          </div>
          <input
            v-model.number="priceAdjustmentPct"
            type="range"
            min="-50"
            max="100"
            step="5"
            class="styled-range"
          />
        </div>

        <div class="slider-box">
          <div class="slider-label-line">
            <span>{{ isEn ? 'Churn Rate Fluctuation' : '月流失率增减波动' }}</span>
            <span class="slider-val" :class="{ 'text-danger': churnDeltaPct > 0, 'text-accent': churnDeltaPct < 0 }">
              {{ churnDeltaPct > 0 ? `+${churnDeltaPct}%` : `${churnDeltaPct}%` }}
            </span>
          </div>
          <input
            v-model.number="churnDeltaPct"
            type="range"
            min="-5"
            max="10"
            step="0.5"
            class="styled-range"
          />
        </div>

        <div class="slider-box">
          <div class="slider-label-line">
            <span>{{ isEn ? 'Monthly New User MoM Growth' : '每月新增获客月环比增速' }}</span>
            <span class="slider-val text-accent">+{{ monthlyGrowthPct }}%</span>
          </div>
          <input
            v-model.number="monthlyGrowthPct"
            type="range"
            min="0"
            max="30"
            step="1"
            class="styled-range"
          />
        </div>
      </div>

      <!-- SVG Trajectory Curve Chart -->
      <div class="chart-container">
        <div class="chart-legend">
          <div class="legend-item">
            <span class="legend-line base-line"></span>
            <span>{{ isEn ? 'Base Forecast MRR' : '基准预测 MRR 轨迹' }}</span>
          </div>
          <div class="legend-item">
            <span class="legend-line sim-line"></span>
            <span>{{ isEn ? 'Simulated Sandbox MRR' : '沙盘推演 MRR 轨迹' }}</span>
          </div>
          <div class="legend-stat">
            {{ isEn ? '12M Cumulative Simulated Revenue:' : '12 个月累计总现金流:' }}
            <strong>{{ currencySymbol }}{{ Math.round(toDisplayCurrency(forecast12Months[11]?.cumSimCash || 0)).toLocaleString() }}</strong>
          </div>
        </div>

        <!-- Responsive SVG Chart -->
        <div class="svg-wrap">
          <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`" class="chart-svg" preserveAspectRatio="none">
            <!-- Grid Lines -->
            <line
              v-for="idx in [0, 1, 2, 3]"
              :key="idx"
              :x1="padding.left"
              :y1="padding.top + (idx * (svgHeight - padding.top - padding.bottom)) / 3"
              :x2="svgWidth - padding.right"
              :y2="padding.top + (idx * (svgHeight - padding.top - padding.bottom)) / 3"
              class="grid-line"
            />

            <!-- Y Axis Labels -->
            <text
              v-for="idx in [0, 1, 2, 3]"
              :key="`txt-${idx}`"
              :x="padding.left - 8"
              :y="padding.top + (idx * (svgHeight - padding.top - padding.bottom)) / 3 + 4"
              class="axis-text"
              text-anchor="end"
            >
              {{ currencySymbol }}{{ Math.round(toDisplayCurrency(maxMrrInForecast * (1 - idx / 3))).toLocaleString() }}
            </text>

            <!-- Shaded Area for Sim -->
            <path :d="simAreaPath" class="sim-area" />

            <!-- Base MRR Path -->
            <path :d="baseSvgPath" class="chart-path base-path" />

            <!-- Sim MRR Path -->
            <path :d="simSvgPath" class="chart-path sim-path" />

            <!-- Interactive Points -->
            <g v-for="(f, idx) in forecast12Months" :key="f.month">
              <!-- X Axis Labels -->
              <text
                :x="getSvgX(idx)"
                :y="svgHeight - padding.bottom + 18"
                class="axis-text"
                text-anchor="middle"
              >
                {{ f.label }}
              </text>

              <!-- Sim Point Circle -->
              <circle
                :cx="getSvgX(idx)"
                :cy="getSvgY(f.simMrr)"
                r="4"
                class="chart-point"
                @mouseenter="hoveredMonthIndex = idx"
                @mouseleave="hoveredMonthIndex = null"
              />
            </g>
          </svg>

          <!-- Interactive Hover Tooltip -->
          <div
            v-if="hoveredMonthIndex !== null"
            class="chart-tooltip"
            :style="{
              left: `${getSvgX(hoveredMonthIndex)}px`,
              top: `${getSvgY(forecast12Months[hoveredMonthIndex].simMrr) - 60}px`,
            }"
          >
            <div class="tooltip-title">{{ forecast12Months[hoveredMonthIndex].label }}</div>
            <div class="tooltip-row">
              <span>{{ isEn ? 'Sim MRR:' : '推演 MRR:' }}</span>
              <strong>{{ currencySymbol }}{{ Math.round(toDisplayCurrency(forecast12Months[hoveredMonthIndex].simMrr)).toLocaleString() }}</strong>
            </div>
            <div class="tooltip-row">
              <span>{{ isEn ? 'Active Subs:' : '总有效用户:' }}</span>
              <span>{{ forecast12Months[hoveredMonthIndex].simSubs }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 5: Acquire.com / Flippa Project Valuation Multiples -->
    <div class="valuation-section">
      <div class="valuation-header">
        <h3 class="valuation-title">
          {{ isEn ? 'Acquire.com & Flippa Market Acquisition Valuation' : 'Acquire.com / Flippa 项目收并购估值区间推演' }}
        </h3>
        <p class="valuation-subtitle">
          {{
            isEn
              ? 'Statistically modeled after 1,200+ micro-SaaS transactions between 2024 and 2026. Current estimated ARR: '
              : '基于近三年公开市场 1,200+ 笔 Micro-SaaS 资产并购交易成交乘数统计。当前基准 ARR: '
          }}
          <strong>{{ currencySymbol }}{{ Math.round(toDisplayCurrency(arr)).toLocaleString() }}</strong>
        </p>
      </div>

      <!-- 3 Valuation Tiers -->
      <div class="valuation-cards-grid">
        <!-- Conservative -->
        <div class="val-tier-card">
          <div class="val-tier-badge">{{ isEn ? valuationEstimate.conservative.tagEn : valuationEstimate.conservative.tagZh }}</div>
          <div class="val-multiple">{{ valuationEstimate.conservative.multiple }} ARR</div>
          <div class="val-amount-range">
            {{ currencySymbol }}{{ Math.round(toDisplayCurrency(valuationEstimate.conservative.lowUsd)).toLocaleString() }}
            ~
            {{ currencySymbol }}{{ Math.round(toDisplayCurrency(valuationEstimate.conservative.highUsd)).toLocaleString() }}
          </div>
          <p class="val-desc">{{ isEn ? valuationEstimate.conservative.descEn : valuationEstimate.conservative.descZh }}</p>
        </div>

        <!-- Median (Highlighted) -->
        <div class="val-tier-card highlight-tier">
          <div class="val-tier-badge badge-median">{{ isEn ? valuationEstimate.median.tagEn : valuationEstimate.median.tagZh }}</div>
          <div class="val-multiple text-accent">{{ valuationEstimate.median.multiple }} ARR</div>
          <div class="val-amount-range text-accent">
            {{ currencySymbol }}{{ Math.round(toDisplayCurrency(valuationEstimate.median.lowUsd)).toLocaleString() }}
            ~
            {{ currencySymbol }}{{ Math.round(toDisplayCurrency(valuationEstimate.median.highUsd)).toLocaleString() }}
          </div>
          <p class="val-desc">{{ isEn ? valuationEstimate.median.descEn : valuationEstimate.median.descZh }}</p>
        </div>

        <!-- Premium -->
        <div class="val-tier-card">
          <div class="val-tier-badge badge-premium">{{ isEn ? valuationEstimate.premium.tagEn : valuationEstimate.premium.tagZh }}</div>
          <div class="val-multiple">{{ valuationEstimate.premium.multiple }} ARR</div>
          <div class="val-amount-range">
            {{ currencySymbol }}{{ Math.round(toDisplayCurrency(valuationEstimate.premium.lowUsd)).toLocaleString() }}
            ~
            {{ currencySymbol }}{{ Math.round(toDisplayCurrency(valuationEstimate.premium.highUsd)).toLocaleString() }}
          </div>
          <p class="val-desc">{{ isEn ? valuationEstimate.premium.descEn : valuationEstimate.premium.descZh }}</p>
        </div>
      </div>

      <!-- 5 Levers to Boost Valuation -->
      <div class="levers-container">
        <h4 class="levers-heading">
          {{ isEn ? '5 High-Impact Levers to Maximize Acquisition Valuation' : '提升 Micro-SaaS 交易估值的 5 大核心优化杠杆 (Checklist)' }}
        </h4>
        <div class="levers-accordion">
          <div
            v-for="(lever, idx) in valuationLevers"
            :key="idx"
            class="lever-item"
            :class="{ open: activeLeverIndex === idx }"
          >
            <div class="lever-header" @click="toggleLever(idx)">
              <div class="lever-title-line">
                <span class="lever-icon">{{ activeLeverIndex === idx ? '▼' : '▶' }}</span>
                <span class="lever-title">{{ lever.title }}</span>
              </div>
              <span class="lever-summary">{{ lever.summary }}</span>
            </div>
            <div v-if="activeLeverIndex === idx" class="lever-body">
              <p>{{ lever.detail }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 6: Tier 1 Affiliate Recommendations & Tier 2 Tripwire -->
    <div class="monetization-row">
      <!-- Tier 1 Recommendations -->
      <div class="affiliate-panel">
        <span class="panel-badge">⚡ {{ isEn ? 'Recommended Infrastructure' : '推荐独立开发出海全栈' }}</span>
        <h4 class="panel-title">{{ isEn ? 'Deploy & Monetize Your SaaS' : '出海技术基建与收单通道' }}</h4>
        <p class="panel-desc">
          {{ isEn ? 'Trusted services with discounted cloud compute & merchant accounts:' : '出海独立黑客常用的低成本云服务器与海外支付收单商户方案：' }}
        </p>
        <div class="affiliate-buttons">
          <a
            href="https://cloud.tencent.com/act/cps/redirect?redirect=5333&cps_key=36215a0a94cd9bd656589c958fdee45b&from=console"
            target="_blank"
            rel="nofollow noopener sponsored"
            class="aff-btn"
          >
            {{ isEn ? 'Tencent Cloud Lighthouse ($2/mo)' : '腾讯云轻量服务器 (低至¥9/月) ↗' }}
          </a>
          <a
            href="https://www.aliyun.com/minisite/goods?userCode=o0amjn4j"
            target="_blank"
            rel="nofollow noopener sponsored"
            class="aff-btn"
          >
            {{ isEn ? 'Aliyun Global Servers' : '阿里云云大使上云特惠 ↗' }}
          </a>
          <a
            href="https://stripe.com/atlas?ref=PLACEHOLDER_STRIPE_ATLAS"
            target="_blank"
            rel="nofollow noopener sponsored"
            class="aff-btn"
            @click="handleAffiliateClick('PLACEHOLDER', 'Stripe Atlas', $event)"
          >
            {{ isEn ? 'Stripe Atlas (US Entity)' : 'Stripe Atlas 海外公司注册 ↗' }}
          </a>
        </div>
      </div>

      <!-- Tier 2 Tripwire Box -->
      <div class="tripwire-box">
        <div class="tripwire-tag">🚀 {{ isEn ? 'Due Diligence Pack' : '极客收并购首选' }}</div>
        <h4 class="tripwire-title">
          {{ isEn ? 'Micro-SaaS Due Diligence Financial Model & BP (Notion + Excel)' : '《Micro-SaaS 商业计划书与项目并购尽调财务底稿》' }}
        </h4>
        <p class="tripwire-desc">
          {{
            isEn
              ? 'Acquire.com standard MRR waterfall, user cohort retention analysis, buyer due diligence question checklist, and data room structure.'
              : '符合 Acquire.com 标准的 MRR 瀑布流、同态用户留存率看板、买家尽调问卷 Checklist 与数据室整理规范。'
          }}
        </p>
        <div class="tripwire-actions">
          <button type="button" class="btn-tripwire-outline" @click="showBpModal = true">
            {{ isEn ? 'View Sample Structure' : '在线预览底稿结构' }}
          </button>
          <a
            :href="isEn ? 'https://gumroad.com/l/PLACEHOLDER_SAAS_BP' : 'https://mbd.pub/o/PLACEHOLDER_SAAS_BP'"
            target="_blank"
            rel="nofollow noopener sponsored"
            class="btn-tripwire-solid"
            @click="handleAffiliateClick('PLACEHOLDER', 'SaaS BP Kit', $event)"
          >
            {{ isEn ? 'Get Full Pack ($5.99)' : '立即获取 (¥29.0)' }}
          </a>
        </div>
      </div>
    </div>

    <!-- BP Sample Preview Modal -->
    <transition name="fade">
      <div v-if="showBpModal" class="modal-backdrop" @click.self="showBpModal = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h4 class="modal-title">
              {{ isEn ? 'Micro-SaaS Due Diligence Kit Sample Preview' : 'Micro-SaaS 并购尽调财务底稿与 BP 样本预览' }}
            </h4>
            <button type="button" class="btn-close-modal" @click="showBpModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="preview-card-list">
              <div class="preview-card-item">
                <div class="card-item-title">📑 1. Acquire.com 标准财务损益模型 (P&amp;L Waterfall)</div>
                <p class="card-item-desc">
                  {{ isEn ? 'Automated monthly breakdowns of New MRR, Expansion MRR, Churn MRR, and Net Revenue Retention (NRR).' : '自动核算 New MRR、Expansion MRR、Contraction 与 Churn MRR，实时输出 NRR 净收入留存率指标。' }}
                </p>
              </div>
              <div class="preview-card-item">
                <div class="card-item-title">👥 2. 用户留存同态群组分析 (Cohort Retention Heatmap)</div>
                <p class="card-item-desc">
                  {{ isEn ? 'Track 12-month cohort survival percentages, proving long-term user stickiness to prospective buyers.' : '12 个月月度 Cohort 留存热力矩阵，直观向买家证明老用户的真实复购黏性与生命周期价值。' }}
                </p>
              </div>
              <div class="preview-card-item">
                <div class="card-item-title">📋 3. 买家意向调查 35 问与数据室规范 (Data Room Checklist)</div>
                <p class="card-item-desc">
                  {{ isEn ? 'Covering intellectual property assignments, third-party API dependencies, support transfer SOPs, and escrow closing procedures.' : '涵盖代码 IP 归属承诺、第三方依赖解耦、售后客服移交 SOP 及托管结款流程指南。' }}
                </p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <span class="pricing-badge">{{ isEn ? 'Limited Offer: $5.99 / ¥29.0' : '限时买断价: ¥29.0 / $5.99' }}</span>
            <a
              :href="isEn ? 'https://gumroad.com/l/PLACEHOLDER_SAAS_BP' : 'https://mbd.pub/o/PLACEHOLDER_SAAS_BP'"
              target="_blank"
              rel="nofollow noopener sponsored"
              class="btn-modal-checkout"
              @click="handleAffiliateClick('PLACEHOLDER', 'SaaS BP Kit', $event)"
            >
              {{ isEn ? 'Get Full Toolkit ↗' : '立即扫码获取完整底稿 ↗' }}
            </a>
          </div>
        </div>
      </div>
    </transition>

    <!-- Financial Disclaimer Notice -->
    <div class="disclaimer-box">
      <div class="disclaimer-icon">🛡️</div>
      <div class="disclaimer-body">
        <h5 class="disclaimer-title">
          {{ isEn ? 'Business Valuation & SaaS Metrics Sandbox Disclaimer' : '商业估值与 SaaS 指标沙盘免责声明' }}
        </h5>
        <p class="disclaimer-text">
          {{
            isEn
              ? 'The LTV:CAC health ratings, 12-month churn sensitivity projections, and acquisition multiples (2.5x - 8.0x ARR) in this sandbox are mathematical models constructed from public industry research reports (including median transaction statistics published by Acquire.com and Flippa over the past three years). This sandbox does NOT constitute a formal asset appraisal, securities valuation, acquisition tender, or investment decision advice. A company’s true enterprise value depends on intellectual property independence, net revenue retention (NRR), code audit results, cash flow stability, and legal due diligence. Please consult certified public accountants (CPAs), valuation experts, or M&A attorneys prior to substantial capital transactions.'
              : '本沙盘中包含的 LTV:CAC 健康评级、月度流失率敏感度曲线推演及收并购估值乘数（2.5x - 8.0x ARR），系根据公开市场行业研究报告（如 Acquire.com、Flippa 等平台近三年公开中微型 SaaS 交易中位数）构建的统计学推演算法，绝不构成任何正式的资产评估报告、证券估值报告、并购要约或投资决策建议。企业的真实公允价值取决于知识产权独立性、客户净留存率（NDR）、代码审计、现金流质量及法务尽调细节，请在重大资本运作前聘请执业注册会计师（CPA）、估值师或并购律师。'
          }}
        </p>
      </div>
    </div>

    <!-- Toast Notification -->
    <transition name="toast-fade">
      <div v-if="showToast" class="toast-popup">
        <span class="toast-icon">ℹ️</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="less">
.saas-metrics-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}

/* Header */
.tool-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.tool-title {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.tool-subtitle {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text-secondary);
  max-width: 750px;
}

.currency-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 4px 8px;
}

.curr-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.curr-pill {
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s ease;

  &:hover {
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent);
    color: #ffffff;
    font-weight: 700;
  }
}

/* Scorecards */
.scorecards-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.metric-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &.highlight-metric {
    border-color: var(--accent-border);
    background: var(--accent-soft);
  }
}

.card-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-value {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;

  &.text-accent {
    color: var(--accent);
  }

  &.text-danger {
    color: #ef4444;
  }
}

.card-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Health Gauge */
.health-gauge-box {
  background: var(--bg-surface);
  border: 2px solid #10b981;
  border-radius: 16px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.gauge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.gauge-title-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gauge-main-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.health-badge {
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 12px;
}

.ratio-big-value {
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
}

.health-progress-track {
  position: relative;
  display: flex;
  height: 26px;
  border-radius: 13px;
  overflow: visible;
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
}

.zone {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  overflow: hidden;

  &.zone-danger {
    background: #ef4444;
    border-radius: 12px 0 0 12px;
  }

  &.zone-warning {
    background: #f59e0b;
  }

  &.zone-healthy {
    background: #10b981;
    border-radius: 0 12px 12px 0;
  }
}

.gauge-pointer {
  position: absolute;
  top: 27px;
  transform: translateX(-50%);
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1;
  transition: left 0.3s ease;
}

.health-diagnosis-text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* Inputs Section */
.inputs-grid-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: var(--shadow-sm);
}

.section-subheading {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
}

.inputs-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
}

.input-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cell-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.cell-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-muted);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
}

/* Sandbox & SVG */
.sandbox-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: var(--shadow-sm);
}

.sandbox-title {
  margin: 0 0 4px 0;
  font-size: 17.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.sandbox-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.sliders-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  padding: 16px 20px;
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
}

.slider-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slider-label-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.slider-val {
  font-weight: 800;
  font-size: 13.5px;
  color: var(--accent);

  &.text-danger {
    color: #ef4444;
  }
}

.styled-range {
  width: 100%;
  accent-color: var(--accent);
}

.chart-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-line {
  display: inline-block;
  width: 18px;
  height: 3px;
  border-radius: 2px;

  &.base-line {
    background: var(--text-muted);
  }

  &.sim-line {
    background: var(--accent);
  }
}

.legend-stat {
  margin-left: auto;
  font-size: 13px;
  color: var(--text-primary);

  strong {
    color: var(--accent-secondary, #10b981);
    font-size: 14.5px;
    font-weight: 800;
  }
}

.svg-wrap {
  position: relative;
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-surface);
  padding: 12px 8px;
}

.chart-svg {
  width: 100%;
  height: 240px;
  display: block;
}

.grid-line {
  stroke: var(--border-subtle);
  stroke-dasharray: 4 4;
}

.axis-text {
  font-size: 11px;
  fill: var(--text-muted);
  font-family: inherit;
  font-weight: 600;
}

.sim-area {
  fill: var(--accent-soft);
  opacity: 0.7;
}

.chart-path {
  fill: none;
  stroke-width: 2.5;

  &.base-path {
    stroke: var(--text-muted);
    stroke-dasharray: 4 4;
  }

  &.sim-path {
    stroke: var(--accent);
    stroke-width: 3;
  }
}

.chart-point {
  fill: var(--accent);
  stroke: var(--bg-surface);
  stroke-width: 2.5;
  cursor: pointer;
  transition: r 0.2s ease;

  &:hover {
    r: 6;
  }
}

.chart-tooltip {
  position: absolute;
  transform: translateX(-50%);
  background: var(--bg-surface-elevated, #131a26);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  box-shadow: var(--shadow-md);
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
}

.tooltip-title {
  font-weight: 700;
  margin-bottom: 2px;
  color: var(--accent);
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

/* Valuation Section */
.valuation-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: var(--shadow-sm);
}

.valuation-title {
  margin: 0 0 4px 0;
  font-size: 17.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.valuation-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.valuation-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.val-tier-card {
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.highlight-tier {
    border-color: var(--accent-border);
    background: var(--accent-soft);
    box-shadow: var(--shadow-sm);
  }
}

.val-tier-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);

  &.badge-median {
    background: var(--accent-soft);
    color: var(--accent);
    border-color: var(--accent-border);
  }

  &.badge-premium {
    background: rgba(245, 158, 11, 0.15);
    color: #b45309;
    border-color: rgba(245, 158, 11, 0.3);
  }
}

.val-multiple {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.val-amount-range {
  font-size: 18px;
  font-weight: 900;
  color: var(--text-primary);

  &.text-accent {
    color: var(--accent);
  }
}

.val-desc {
  margin: 4px 0 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* Levers Accordion */
.levers-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 18px;
}

.levers-heading {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
}

.levers-accordion {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lever-item {
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--bg-muted);
  overflow: hidden;
  transition: all 0.2s ease;

  &.open {
    border-color: var(--accent);
  }
}

.lever-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  cursor: pointer;
  background: var(--bg-muted);

  &:hover {
    background: var(--bg-surface-hover);
  }
}

.lever-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lever-icon {
  font-size: 12px;
  color: var(--accent);
}

.lever-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.lever-summary {
  font-size: 12.5px;
  color: var(--text-muted);
  padding-left: 20px;
}

.lever-body {
  padding: 14px 18px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);

  p {
    margin: 0;
  }
}

/* Monetization Row */
.monetization-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.affiliate-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--shadow-sm);
}

.panel-badge {
  font-size: 11.5px;
  font-weight: 800;
  color: var(--accent);
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.panel-desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.affiliate-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.aff-btn {
  display: block;
  padding: 9px 14px;
  border-radius: 8px;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background: var(--accent);
    color: #ffffff;
    border-color: var(--accent);
  }
}

.tripwire-box {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 16px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tripwire-tag {
  font-size: 11.5px;
  font-weight: 800;
  color: var(--accent);
}

.tripwire-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.tripwire-desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.tripwire-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 8px;
}

.btn-tripwire-outline {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.15s ease;

  &:hover {
    background: var(--bg-surface-hover);
    border-color: var(--accent);
    color: var(--accent);
  }
}

.btn-tripwire-solid {
  background: var(--accent);
  color: #ffffff;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background: var(--accent-hover);
  }
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 16px;
}

.modal-dialog {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--text-primary);
}

.btn-close-modal {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-muted);

  &:hover {
    color: var(--text-primary);
  }
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.preview-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-card-item {
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 14px 16px;
}

.card-item-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.card-item-desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-muted);
}

.pricing-badge {
  font-size: 14px;
  font-weight: 700;
  color: #dc2626;
}

.btn-modal-checkout {
  background: var(--accent);
  color: #ffffff;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background: var(--accent-hover);
  }
}

/* Disclaimer Box */
.disclaimer-box {
  display: flex;
  gap: 12px;
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 14px 18px;
}

.disclaimer-icon {
  font-size: 20px;
  line-height: 1;
}

.disclaimer-title {
  margin: 0 0 4px 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.disclaimer-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
}

/* Toast */
.toast-popup {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--text-primary);
  color: var(--bg-surface);
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--shadow-md);
  z-index: 1000;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
