<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { AFFILIATE_LINKS, DIGITAL_PRODUCTS } from '@/consts';
import channelsData from '@/data/rates/payment-channels.json';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

// Mode: 'forward' (Gross -> Net) or 'grossup' (Net Target -> Invoiced Gross)
const calcMode = ref<'forward' | 'grossup'>('forward');

// Input state
const inputAmount = ref<number>(3000);
const midMarketRate = ref<number>(7.25); // 1 USD = 7.25 CNY
const targetCurrency = ref<'CNY' | 'USD'>('CNY');

// Quick preset amounts
const quickPresets = [500, 1500, 3000, 5000, 10000];

// Rate override drawer state
const showOverrideDrawer = ref(false);
const activeOverrideChannelId = ref<string>('paypal-commercial');

// Channel configs with reactive overrides
interface FeeStructure {
  basePercentage: number;
  fixedFeeUsd: number;
  fxMarkupPct: number;
  crossBorderSurchargePct: number;
  withdrawalFeeUsd: number;
}

interface ChannelItem {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  badge: string;
  badgeEn: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  status: string;
  payoutDuration: string;
  affiliateKey: string;
  notesZh: string;
  notesEn: string;
  defaults: FeeStructure;
  custom: FeeStructure;
  isOverridden: boolean;
}

const channelList = reactive<ChannelItem[]>(
  channelsData.channels.map((c) => ({
    id: c.id,
    name: c.name,
    nameEn: c.nameEn,
    category: c.category,
    badge: c.badge,
    badgeEn: c.badgeEn,
    sourceUrl: c.source_url,
    lastVerifiedAt: c.last_verified_at,
    status: c.status,
    payoutDuration: c.payout_duration_days,
    affiliateKey: c.affiliate_key,
    notesZh: c.notes_zh,
    notesEn: c.notes_en,
    defaults: {
      basePercentage: c.base_percentage,
      fixedFeeUsd: c.fixed_fee_usd,
      fxMarkupPct: c.fx_markup_pct,
      crossBorderSurchargePct: c.cross_border_surcharge_pct,
      withdrawalFeeUsd: c.withdrawal_fee_usd,
    },
    custom: {
      basePercentage: c.base_percentage,
      fixedFeeUsd: c.fixed_fee_usd,
      fxMarkupPct: c.fx_markup_pct,
      crossBorderSurchargePct: c.cross_border_surcharge_pct,
      withdrawalFeeUsd: c.withdrawal_fee_usd,
    },
    isOverridden: false,
  }))
);

function resetChannelOverrides(id: string) {
  const item = channelList.find((c) => c.id === id);
  if (item) {
    item.custom = { ...item.defaults };
    item.isOverridden = false;
  }
}

function resetAllOverrides() {
  channelList.forEach((item) => {
    item.custom = { ...item.defaults };
    item.isOverridden = false;
  });
}

function handleOverrideChange(item: ChannelItem) {
  item.isOverridden =
    item.custom.basePercentage !== item.defaults.basePercentage ||
    item.custom.fixedFeeUsd !== item.defaults.fixedFeeUsd ||
    item.custom.fxMarkupPct !== item.defaults.fxMarkupPct ||
    item.custom.crossBorderSurchargePct !== item.defaults.crossBorderSurchargePct ||
    item.custom.withdrawalFeeUsd !== item.defaults.withdrawalFeeUsd;
}

// Calculations
export interface ChannelCalculationRow {
  channel: ChannelItem;
  grossAmount: number;
  baseFee: number;
  crossBorderFee: number;
  platformFeeTotal: number;
  fxLoss: number;
  withdrawalFee: number;
  totalCost: number;
  netUsd: number;
  netTarget: number;
  effectiveFeePct: number;
  isBest: boolean;
  isValid: boolean;
  errorMsg?: string;
}

const calculationResults = computed<ChannelCalculationRow[]>(() => {
  const amount = Math.max(0, inputAmount.value || 0);

  if (calcMode.value === 'forward') {
    // Forward mode: Gross A -> Net N
    const rows = channelList.map((ch) => {
      const fees = ch.isOverridden ? ch.custom : ch.defaults;
      const baseFee = (amount * fees.basePercentage) / 100 + fees.fixedFeeUsd;
      const crossBorderFee = (amount * fees.crossBorderSurchargePct) / 100;
      const platformFeeTotal = baseFee + crossBorderFee;
      const remainingAfterPlatform = Math.max(0, amount - platformFeeTotal);
      const fxLoss = (remainingAfterPlatform * fees.fxMarkupPct) / 100;
      const withdrawalFee = fees.withdrawalFeeUsd;
      const totalCost = platformFeeTotal + fxLoss + withdrawalFee;
      const netUsd = Math.max(0, amount - totalCost);
      const netTarget = targetCurrency.value === 'CNY' ? netUsd * midMarketRate.value : netUsd;
      const effectiveFeePct = amount > 0 ? (totalCost / amount) * 100 : 0;

      return {
        channel: ch,
        grossAmount: amount,
        baseFee,
        crossBorderFee,
        platformFeeTotal,
        fxLoss,
        withdrawalFee,
        totalCost,
        netUsd,
        netTarget,
        effectiveFeePct,
        isBest: false,
        isValid: true,
      };
    });

    // Find the channel that gives maximum netUsd
    const maxNet = Math.max(...rows.map((r) => r.netUsd));
    rows.forEach((r) => {
      if (r.netUsd === maxNet && r.netUsd > 0) {
        r.isBest = true;
      }
    });

    return rows.sort((a, b) => b.netUsd - a.netUsd);
  } else {
    // Gross-up mode: Desired Net N -> Required Gross A
    // Formula: A = [ (N + w) / (1 - m) + f ] / (1 - r)
    // where:
    // r = (basePercentage + crossBorderSurchargePct) / 100
    // f = fixedFeeUsd
    // m = fxMarkupPct / 100
    // w = withdrawalFeeUsd
    const desiredNet = amount;

    const rows = channelList.map((ch) => {
      const fees = ch.isOverridden ? ch.custom : ch.defaults;
      const r = (fees.basePercentage + fees.crossBorderSurchargePct) / 100;
      const f = fees.fixedFeeUsd;
      const m = fees.fxMarkupPct / 100;
      const w = fees.withdrawalFeeUsd;

      if (r >= 1 || m >= 1) {
        return {
          channel: ch,
          grossAmount: 0,
          baseFee: 0,
          crossBorderFee: 0,
          platformFeeTotal: 0,
          fxLoss: 0,
          withdrawalFee: 0,
          totalCost: 0,
          netUsd: desiredNet,
          netTarget: desiredNet,
          effectiveFeePct: 0,
          isBest: false,
          isValid: false,
          errorMsg: isEn.value ? 'Fee rate >= 100%' : '费率参数异常 (超过100%)',
        };
      }

      const grossRequired = ((desiredNet + w) / (1 - m) + f) / (1 - r);
      const baseFee = (grossRequired * fees.basePercentage) / 100 + fees.fixedFeeUsd;
      const crossBorderFee = (grossRequired * fees.crossBorderSurchargePct) / 100;
      const platformFeeTotal = baseFee + crossBorderFee;
      const remainingAfterPlatform = Math.max(0, grossRequired - platformFeeTotal);
      const fxLoss = (remainingAfterPlatform * fees.fxMarkupPct) / 100;
      const withdrawalFee = fees.withdrawalFeeUsd;
      const totalCost = grossRequired - desiredNet;
      const netUsd = desiredNet;
      const netTarget = targetCurrency.value === 'CNY' ? desiredNet * midMarketRate.value : desiredNet;
      const effectiveFeePct = grossRequired > 0 ? (totalCost / grossRequired) * 100 : 0;

      return {
        channel: ch,
        grossAmount: grossRequired,
        baseFee,
        crossBorderFee,
        platformFeeTotal,
        fxLoss,
        withdrawalFee,
        totalCost,
        netUsd,
        netTarget,
        effectiveFeePct,
        isBest: false,
        isValid: true,
      };
    });

    const validRows = rows.filter((r) => r.isValid);
    const minGross = validRows.length > 0 ? Math.min(...validRows.map((r) => r.grossAmount)) : 0;
    rows.forEach((r) => {
      if (r.isValid && r.grossAmount === minGross && minGross > 0) {
        r.isBest = true;
      }
    });

    return rows.sort((a, b) => a.grossAmount - b.grossAmount);
  }
});

// Best channel for Gross-Up communication snippet
const selectedRowForTemplate = ref<ChannelCalculationRow | null>(null);
const activeSnippetChannel = computed<ChannelCalculationRow>(() => {
  if (selectedRowForTemplate.value && calculationResults.value.includes(selectedRowForTemplate.value)) {
    return selectedRowForTemplate.value;
  }
  return calculationResults.value.find((r) => r.isBest) || calculationResults.value[0];
});

// Email Memo Snippet Fields
const memoClientName = ref('Client');
const memoProjectName = ref('Global Web Dev & Consulting');
const memoInvoiceNo = ref('INV-2026-001');
const memoYourName = ref('Freelancer');
const memoPaymentLink = ref('https://wise.com/pay/me');
const copyFeedback = ref(false);

const emailSnippetEn = computed(() => {
  const row = activeSnippetChannel.value;
  if (!row) return '';
  return `Subject: Invoice #${memoInvoiceNo.value} – Payment Details for ${memoProjectName.value}

Hi ${memoClientName.value},

Thank you for your business! Please find attached Invoice #${memoInvoiceNo.value} for ${memoProjectName.value}.

To ensure our agreed net compensation of $${row.netUsd.toFixed(2)} is received in full, the total invoiced amount is set to $${row.grossAmount.toFixed(2)} to account for cross-border merchant processing and intermediary handling fees ($${row.totalCost.toFixed(2)} via ${row.channel.nameEn}).

• Agreed Net Service Fee: $${row.netUsd.toFixed(2)}
• Payment Processing & Surcharge: $${row.totalCost.toFixed(2)}
• Total Payable Invoice: $${row.grossAmount.toFixed(2)}

Recommended Payment Options:
• Direct Bank Transfer / Wise (Recommended – Lowest Surcharge): ${memoPaymentLink.value}
• International Wire (SWIFT): Please request our multi-currency routing sheet.

Please let me know if you have any questions or require an updated purchase order.

Best regards,
${memoYourName.value}`;
});

const emailSnippetZh = computed(() => {
  const row = activeSnippetChannel.value;
  if (!row) return '';
  return `关于【${memoProjectName.value}】款项结算与跨境手续费明细说明：

${memoClientName.value} 您好：

附件为本次技术服务对应的形式发票（Invoice #${memoInvoiceNo.value}）。
为保障双方约定的服务报酬净到账额（$${row.netUsd.toFixed(2)}），发票应付总额为 $${row.grossAmount.toFixed(2)}。其中包含了境外跨境收单服务商（${row.channel.name}）按规则扣除的交易手续费、跨境卡附加费及货币转换点差（共计 $${row.totalCost.toFixed(2)}）。

• 双方约定净服务费：$${row.netUsd.toFixed(2)}
• 跨境通道综合扣除费：$${row.totalCost.toFixed(2)}
• 形式账单应付总额：$${row.grossAmount.toFixed(2)}

推荐支付方式：通过 Wise 或海外虚拟银行账户转账支付（损耗最低，即时到账）。如需修改账单信息请随时告知。

祝商祺！
${memoYourName.value}`;
});

function copyToClipboard(text: string) {
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        copyFeedback.value = true;
        setTimeout(() => {
          copyFeedback.value = false;
        }, 2000);
      })
      .catch((err) => {
        console.warn('Clipboard copy failed, using fallback:', err);
        fallbackCopy(text);
      });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      copyFeedback.value = true;
      setTimeout(() => {
        copyFeedback.value = false;
      }, 2000);
    } else {
      triggerToast(isEn.value ? 'Failed to copy to clipboard. Please copy manually.' : '复制失败，请手动选中文本复制。');
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
    triggerToast(isEn.value ? 'Failed to copy to clipboard. Please copy manually.' : '复制失败，请手动选中文本复制。');
  }
}

// Modal Drawer for Tier 2 Excel Model
const showExcelModal = ref(false);
const activeExcelSheetTab = ref<'sheet1' | 'sheet2' | 'sheet3'>('sheet1');

// Toast notification for placeholder links
const toastMessage = ref('');
const showToast = ref(false);

function triggerToast(msg: string) {
  toastMessage.value = msg;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3500);
}

function getChannelAffiliateUrl(ch: ChannelItem): string {
  const mapped = (AFFILIATE_LINKS as Record<string, string>)[ch.affiliateKey];
  return mapped || ch.sourceUrl;
}

function handleDigitalCheckout(url: string, ev: MouseEvent) {
  if (!url || url.includes('placeholder') || url.includes('PLACEHOLDER')) {
    ev.preventDefault();
    triggerToast(
      isEn.value
        ? '📦 This Excel financial model is currently being packaged for release. Stay tuned!'
        : '📦 该跨境收款汇损 Excel 动态核算模型正在整理上架中，敬请期待！'
    );
  }
}
</script>

<template>
  <div class="payment-calc-container">
    <!-- Header / Intro & Metadata Badge -->
    <div class="tool-header">
      <div class="header-main">
        <h2 class="tool-title">
          {{ isEn ? 'Global Payment & FX Spread Fee Calculator' : '全球跨境支付汇损与真实到账精算器' }}
        </h2>
        <p class="tool-subtitle">
          {{
            isEn
              ? 'Penetrate hidden FX markups, cross-border card surcharges, and tiered wire fees across 7 global gateways. O(1) Gross-up formula & bilingual client memo.'
              : '一键穿透 PayPal、Stripe、Wise、连连等 7 大主流收款通道的隐性汇损加价与阶梯扣费；支持发票反向倒推加价与中英双语客户说明函。'
          }}
        </p>
      </div>

      <!-- Rate Decay Defense Badge -->
      <div class="rate-badge-bar">
        <div class="badge-item verified-badge">
          <span class="status-dot"></span>
          {{
            isEn
              ? `Benchmark Verified: ${channelsData.metadata.last_verified_at.slice(0, 10)} · Weekly Audited`
              : `基准库生效日期: ${channelsData.metadata.last_verified_at.slice(0, 10)} · 官方周度复核`
          }}
        </div>
        <button
          type="button"
          class="badge-btn customize-btn"
          @click="showOverrideDrawer = !showOverrideDrawer"
        >
          {{ showOverrideDrawer ? (isEn ? '✕ Close Overrides' : '✕ 收起自定义费率') : (isEn ? '⚙️ Override Rates' : '⚙️ 费率不符？开启自定义覆盖') }}
        </button>
      </div>
    </div>

    <!-- Rate Override Drawer (Self-Healing) -->
    <transition name="slide-fade">
      <div v-if="showOverrideDrawer" class="override-drawer-box">
        <div class="drawer-header">
          <div class="drawer-title">
            {{ isEn ? 'Custom Rate Overrides (Client-side Sandbox)' : '通道费率自定义沙盘（防官方规则突变）' }}
          </div>
          <button type="button" class="btn-text-danger" @click="resetAllOverrides">
            {{ isEn ? '↺ Reset All to Defaults' : '↺ 重置全部官方基准' }}
          </button>
        </div>
        <p class="drawer-tip">
          {{
            isEn
              ? 'Adjust sliders to test custom fees or negotiated merchant rates. Real-time calculations adapt immediately.'
              : '若您的商户等级享受专属费率或平台官方突发调整，可在此自由拖动修改，所有测算即时联动响应。'
          }}
        </p>

        <!-- Channel Selector for Override -->
        <div class="override-channel-tabs">
          <button
            v-for="ch in channelList"
            :key="ch.id"
            type="button"
            class="channel-tab-btn"
            :class="{ active: activeOverrideChannelId === ch.id, overridden: ch.isOverridden }"
            @click="activeOverrideChannelId = ch.id"
          >
            {{ isEn ? ch.nameEn : ch.name }}
            <span v-if="ch.isOverridden" class="tab-dot" title="Customized">•</span>
          </button>
        </div>

        <!-- Sliders for Active Channel -->
        <div
          v-for="ch in channelList.filter((c) => c.id === activeOverrideChannelId)"
          :key="ch.id"
          class="channel-sliders-grid"
        >
          <div class="slider-field">
            <div class="field-label-line">
              <span>{{ isEn ? 'Base Processing Fee (%)' : '基础百分比费率 (%)' }}</span>
              <span class="field-val">{{ ch.custom.basePercentage.toFixed(2) }}%</span>
            </div>
            <input
              v-model.number="ch.custom.basePercentage"
              type="range"
              min="0"
              max="6"
              step="0.05"
              class="range-slider"
              @input="handleOverrideChange(ch)"
            />
          </div>

          <div class="slider-field">
            <div class="field-label-line">
              <span>{{ isEn ? 'Fixed Fee per Transaction ($)' : '单笔固定费用 ($)' }}</span>
              <span class="field-val">${{ ch.custom.fixedFeeUsd.toFixed(2) }}</span>
            </div>
            <input
              v-model.number="ch.custom.fixedFeeUsd"
              type="range"
              min="0"
              max="50"
              step="0.1"
              class="range-slider"
              @input="handleOverrideChange(ch)"
            />
          </div>

          <div class="slider-field">
            <div class="field-label-line">
              <span>{{ isEn ? 'Hidden FX Spread Markup (%)' : '隐性汇率加价点差 (%)' }}</span>
              <span class="field-val">{{ ch.custom.fxMarkupPct.toFixed(2) }}%</span>
            </div>
            <input
              v-model.number="ch.custom.fxMarkupPct"
              type="range"
              min="0"
              max="5"
              step="0.05"
              class="range-slider"
              @input="handleOverrideChange(ch)"
            />
          </div>

          <div class="slider-field">
            <div class="field-label-line">
              <span>{{ isEn ? 'Cross-Border Surcharge (%)' : '跨境卡刷卡附加费 (%)' }}</span>
              <span class="field-val">{{ ch.custom.crossBorderSurchargePct.toFixed(2) }}%</span>
            </div>
            <input
              v-model.number="ch.custom.crossBorderSurchargePct"
              type="range"
              min="0"
              max="3"
              step="0.1"
              class="range-slider"
              @input="handleOverrideChange(ch)"
            />
          </div>

          <div class="slider-field">
            <div class="field-label-line">
              <span>{{ isEn ? 'Withdrawal / Wire Fee ($)' : '提现到本地银行固定费 ($)' }}</span>
              <span class="field-val">${{ ch.custom.withdrawalFeeUsd.toFixed(2) }}</span>
            </div>
            <input
              v-model.number="ch.custom.withdrawalFeeUsd"
              type="range"
              min="0"
              max="60"
              step="1"
              class="range-slider"
              @input="handleOverrideChange(ch)"
            />
          </div>

          <div class="slider-actions">
            <button
              v-if="ch.isOverridden"
              type="button"
              class="btn-reset-single"
              @click="resetChannelOverrides(ch.id)"
            >
              {{ isEn ? 'Reset this channel' : '重置此渠道参数' }}
            </button>
            <a
              :href="ch.sourceUrl"
              target="_blank"
              rel="nofollow noopener noreferrer"
              class="link-official-docs"
            >
              {{ isEn ? 'Official pricing source ↗' : '官方费率文档 ↗' }}
            </a>
          </div>
        </div>
      </div>
    </transition>

    <!-- Calculation Mode Switcher & Input Controls -->
    <div class="calc-control-panel">
      <!-- Mode Tabs -->
      <div class="mode-tabs">
        <button
          type="button"
          class="mode-tab"
          :class="{ active: calcMode === 'forward' }"
          @click="calcMode = 'forward'"
        >
          <span class="tab-icon">📥</span>
          <div class="tab-text">
            <span class="title">{{ isEn ? 'Forward Mode (Gross → Net)' : '正向测算模式（发票金额 → 实收到账）' }}</span>
            <span class="desc">{{ isEn ? 'Input billed amount to inspect net cash' : '输入预开发票总额，精准穿透实际到手净额' }}</span>
          </div>
        </button>

        <button
          type="button"
          class="mode-tab"
          :class="{ active: calcMode === 'grossup' }"
          @click="calcMode = 'grossup'"
        >
          <span class="tab-icon">📤</span>
          <div class="tab-text">
            <span class="title">{{ isEn ? 'Gross-Up Mode (Net → Gross)' : '反向加价倒推（期望净到账 → 账单应收）' }}</span>
            <span class="desc">{{ isEn ? 'Ensure 100% net payout covered by client' : '确保扣除所有手续费后实收足额，附带客户沟通信' }}</span>
          </div>
        </button>
      </div>

      <!-- Main Input Section -->
      <div class="inputs-row">
        <div class="input-card main-amount-box">
          <label class="control-label">
            {{
              calcMode === 'forward'
                ? (isEn ? 'Invoice Gross Amount (USD)' : '发票账面金额 (USD)')
                : (isEn ? 'Target Net Payout (USD)' : '目标净实收到账 (USD)')
            }}
          </label>
          <div class="amount-input-wrap">
            <span class="currency-prefix">$</span>
            <input
              v-model.number="inputAmount"
              type="number"
              min="1"
              step="100"
              class="styled-number-input"
              placeholder="3000"
            />
          </div>

          <!-- Quick presets -->
          <div class="quick-presets-row">
            <span class="preset-label">{{ isEn ? 'Quick Select:' : '快速预设:' }}</span>
            <button
              v-for="amt in quickPresets"
              :key="amt"
              type="button"
              class="preset-chip"
              :class="{ active: inputAmount === amt }"
              @click="inputAmount = amt"
            >
              ${{ amt.toLocaleString() }}
            </button>
          </div>
        </div>

        <div class="input-card secondary-settings-box">
          <div class="setting-item">
            <label class="control-label">{{ isEn ? 'Target Settlement Currency' : '最终结算到账货币' }}</label>
            <div class="currency-toggle-group">
              <button
                type="button"
                class="curr-btn"
                :class="{ active: targetCurrency === 'CNY' }"
                @click="targetCurrency = 'CNY'"
              >
                ¥ 人民币 (CNY)
              </button>
              <button
                type="button"
                class="curr-btn"
                :class="{ active: targetCurrency === 'USD' }"
                @click="targetCurrency = 'USD'"
              >
                $ 美元 (USD)
              </button>
            </div>
          </div>

          <div v-if="targetCurrency === 'CNY'" class="setting-item">
            <div class="field-label-line">
              <label class="control-label">{{ isEn ? 'Reference Mid-Market Rate' : '参考中间市场即期汇率' }}</label>
              <span class="sub-tip">1 USD = {{ midMarketRate.toFixed(4) }} CNY</span>
            </div>
            <div class="rate-input-wrap">
              <input
                v-model.number="midMarketRate"
                type="number"
                min="5.0"
                max="10.0"
                step="0.01"
                class="styled-rate-input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Comparison Results Table -->
    <div class="results-section">
      <div class="section-title-line">
        <h3 class="section-heading">
          {{ isEn ? '7 Channels Full Spectrum Fee Comparison' : '7 大主流跨境收汇通道费用全景穿透对比' }}
        </h3>
        <span class="summary-tip">
          {{
            calcMode === 'forward'
              ? (isEn ? 'Ranked by highest net received payout' : '按最终实际到手金额从高到低排序')
              : (isEn ? 'Ranked by lowest invoice billed amount' : '按需向客户开具的发票总额从低到高排序')
          }}
        </span>
      </div>

      <div class="table-scroll-container">
        <table class="fee-table">
          <thead>
            <tr>
              <th>{{ isEn ? 'Channel & Category' : '收款通道与性质' }}</th>
              <th>{{ isEn ? 'Platform Processing' : '平台扣除基础费' }}</th>
              <th>{{ isEn ? 'Hidden FX Loss' : '隐性汇损点差' }}</th>
              <th>{{ isEn ? 'Withdrawal Fee' : '本地提现结汇费' }}</th>
              <th>{{ isEn ? 'Total Loss' : '综合总扣费' }}</th>
              <th class="highlight-th">
                {{
                  calcMode === 'forward'
                    ? (isEn ? 'Net Payout Received' : '最终实收到账')
                    : (isEn ? 'Required Bill Amount' : '应开具账单总额 (Gross)')
                }}
              </th>
              <th>{{ isEn ? 'Effective Fee Rate' : '综合损耗率' }}</th>
              <th>{{ isEn ? 'Official / Perks' : '官方权益与申请' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in calculationResults"
              :key="row.channel.id"
              :class="{ 'best-row': row.isBest }"
            >
              <!-- Channel Info -->
              <td class="col-channel">
                <div class="channel-identity">
                  <div class="name-line">
                    <span class="name">{{ isEn ? row.channel.nameEn : row.channel.name }}</span>
                    <span
                      v-if="row.isBest"
                      class="badge-pill best-badge"
                    >
                      {{ isEn ? '★ Best Value' : '★ 最优到账' }}
                    </span>
                    <span v-else class="badge-pill normal-badge">
                      {{ isEn ? row.channel.badgeEn : row.channel.badge }}
                    </span>
                  </div>
                  <div class="notes-line">
                    <span class="duration-tag">⏱ {{ row.channel.payoutDuration }}</span>
                    <span class="channel-note">{{ isEn ? row.channel.notesEn : row.channel.notesZh }}</span>
                  </div>
                </div>
              </td>

              <!-- Platform Fee -->
              <td class="col-num">
                <div class="val-usd">${{ row.platformFeeTotal.toFixed(2) }}</div>
                <div class="sub-val">
                  {{ (row.channel.isOverridden ? row.channel.custom.basePercentage : row.channel.defaults.basePercentage).toFixed(2) }}%
                  + ${{ (row.channel.isOverridden ? row.channel.custom.fixedFeeUsd : row.channel.defaults.fixedFeeUsd).toFixed(2) }}
                </div>
              </td>

              <!-- Hidden FX Markup Loss -->
              <td class="col-num">
                <div class="val-usd" :class="{ 'text-danger': row.fxLoss > 10 }">
                  ${{ row.fxLoss.toFixed(2) }}
                </div>
                <div class="sub-val">
                  {{
                    row.channel.defaults.fxMarkupPct === 0
                      ? (isEn ? '0% (Reuters Mid)' : '0% (路孚特中间价)')
                      : `+${(row.channel.isOverridden ? row.channel.custom.fxMarkupPct : row.channel.defaults.fxMarkupPct).toFixed(2)}% 点差`
                  }}
                </div>
              </td>

              <!-- Withdrawal Fee -->
              <td class="col-num">
                <div class="val-usd">${{ row.withdrawalFee.toFixed(2) }}</div>
                <div class="sub-val">{{ isEn ? 'Local clearing' : '本地清算入账' }}</div>
              </td>

              <!-- Total Cost -->
              <td class="col-num total-cost-col">
                <div class="val-cost">-${{ row.totalCost.toFixed(2) }}</div>
                <div class="sub-cost-cny">≈ ¥{{ (row.totalCost * midMarketRate).toFixed(2) }}</div>
              </td>

              <!-- Net Result / Gross-up Result -->
              <td class="col-highlight">
                <template v-if="calcMode === 'forward'">
                  <div class="highlight-primary">
                    {{ targetCurrency === 'CNY' ? `¥${row.netTarget.toFixed(2)}` : `$${row.netUsd.toFixed(2)}` }}
                  </div>
                  <div v-if="targetCurrency === 'CNY'" class="highlight-sub">
                    (${{ row.netUsd.toFixed(2) }} USD)
                  </div>
                </template>
                <template v-else>
                  <div class="highlight-primary">${{ row.grossAmount.toFixed(2) }}</div>
                  <div class="highlight-sub">
                    {{ isEn ? `Client pays +$${row.totalCost.toFixed(2)}` : `需客户多付 $${row.totalCost.toFixed(2)}` }}
                  </div>
                </template>
              </td>

              <!-- Effective Fee Percentage -->
              <td class="col-num">
                <div
                  class="loss-rate-pill"
                  :class="{
                    'rate-low': row.effectiveFeePct <= 1.0,
                    'rate-mid': row.effectiveFeePct > 1.0 && row.effectiveFeePct <= 3.5,
                    'rate-high': row.effectiveFeePct > 3.5,
                  }"
                >
                  {{ row.effectiveFeePct.toFixed(2) }}%
                </div>
              </td>

              <!-- Action / Affiliate Button -->
              <td class="col-action">
                <a
                  :href="getChannelAffiliateUrl(row.channel)"
                  target="_blank"
                  rel="nofollow noopener sponsored"
                  class="action-btn"
                  :class="{ 'btn-accent': row.isBest }"
                >
                  {{ isEn ? 'Open Account ↗' : '免费开通 ↗' }}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Gross-Up Bilingual Email Communication Generator -->
    <div v-if="calcMode === 'grossup'" class="memo-generator-section">
      <div class="memo-header">
        <div class="memo-title-block">
          <h3 class="memo-title">
            {{ isEn ? 'Bilingual Client Invoice Communication Generator' : '中英双语客户催款说明函一键生成器' }}
          </h3>
          <p class="memo-desc">
            {{
              isEn
                ? 'Copy and send this professional explanation to clients, clarifying why cross-border processing fees are included.'
                : '向境外客户开具包含加价的总发票时，一键复制专业沟通说明函，消除客户对“为什么金额多了几十美元”的疑虑。'
            }}
          </p>
        </div>

        <!-- Channel picker for Memo -->
        <div class="memo-channel-picker">
          <label class="picker-label">{{ isEn ? 'Selected Channel:' : '生成说明函所选渠道:' }}</label>
          <select
            v-model="selectedRowForTemplate"
            class="channel-dropdown"
          >
            <option v-for="r in calculationResults" :key="r.channel.id" :value="r">
              {{ isEn ? r.channel.nameEn : r.channel.name }} ({{ isEn ? 'Gross' : '应收' }}: ${{ r.grossAmount.toFixed(2) }})
            </option>
          </select>
        </div>
      </div>

      <!-- Quick Template Variable Inputs -->
      <div class="memo-variable-inputs">
        <div class="var-field">
          <label>{{ isEn ? 'Client Name' : '客户名称' }}</label>
          <input v-model="memoClientName" type="text" class="input-text" />
        </div>
        <div class="var-field">
          <label>{{ isEn ? 'Project / Service' : '服务项目' }}</label>
          <input v-model="memoProjectName" type="text" class="input-text" />
        </div>
        <div class="var-field">
          <label>{{ isEn ? 'Invoice #' : '发票编号' }}</label>
          <input v-model="memoInvoiceNo" type="text" class="input-text" />
        </div>
        <div class="var-field">
          <label>{{ isEn ? 'Your Name / Team' : '您的署名' }}</label>
          <input v-model="memoYourName" type="text" class="input-text" />
        </div>
        <div class="var-field var-field-wide">
          <label>{{ isEn ? 'Payment Link / Instructions' : '支付链接 / 收款账号' }}</label>
          <input v-model="memoPaymentLink" type="text" class="input-text" />
        </div>
      </div>

      <!-- Preview & Copy Tabs -->
      <div class="template-previews-grid">
        <!-- English Template Box -->
        <div class="template-box">
          <div class="template-box-header">
            <span class="box-tag">🇬🇧 English Version</span>
            <button
              type="button"
              class="copy-btn"
              @click="copyToClipboard(emailSnippetEn)"
            >
              {{ copyFeedback ? (isEn ? '✓ Copied' : '✓ 已复制') : (isEn ? '📋 Copy English' : '📋 复制英文版') }}
            </button>
          </div>
          <textarea
            readonly
            class="template-textarea"
            :value="emailSnippetEn"
            rows="10"
          ></textarea>
        </div>

        <!-- Chinese Template Box -->
        <div class="template-box">
          <div class="template-box-header">
            <span class="box-tag">🇨🇳 中文沟通版本</span>
            <button
              type="button"
              class="copy-btn"
              @click="copyToClipboard(emailSnippetZh)"
            >
              {{ copyFeedback ? (isEn ? '✓ Copied' : '✓ 已复制') : (isEn ? '📋 Copy Chinese' : '📋 复制中文版') }}
            </button>
          </div>
          <textarea
            readonly
            class="template-textarea"
            :value="emailSnippetZh"
            rows="10"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- Tier 2 Monetization: Digital Asset Excel Model Tripwire -->
    <div class="tripwire-banner">
      <div class="tripwire-content">
        <div class="tripwire-badge">🔥 {{ isEn ? 'Fintech Digital Model' : '出海财务提效神器' }}</div>
        <h4 class="tripwire-title">
          {{
            isEn
              ? '2026 Global Payment & FX Hidden Cost Dynamic Audit Model (Excel)'
              : '《2026 全球跨境收款与电汇隐性汇损 Excel 动态穿透核算底表》'
          }}
        </h4>
        <p class="tripwire-desc">
          {{
            isEn
              ? 'Built-in tiered formula macros for 12 payment channels. Multi-currency batch reconciliation and foreign exchange net profit sensitivity radar.'
              : '内嵌 12 大跨境收付款通道阶梯费率公式与动态宏，支持多币种批量发票对账与外币结汇净利敏感度雷达图。'
          }}
        </p>
      </div>
      <div class="tripwire-action">
        <button
          type="button"
          class="btn-tripwire-preview"
          @click="showExcelModal = true"
        >
          {{ isEn ? 'View Sample Preview' : '在线预览样本结构' }}
        </button>
        <a
          :href="(isEn ? DIGITAL_PRODUCTS.crossBorderFxModel.checkoutUrlEn : DIGITAL_PRODUCTS.crossBorderFxModel.checkoutUrlZh) || '#'"
          target="_blank"
          rel="nofollow noopener sponsored"
          class="btn-tripwire-buy"
          @click="handleDigitalCheckout(isEn ? DIGITAL_PRODUCTS.crossBorderFxModel.checkoutUrlEn : DIGITAL_PRODUCTS.crossBorderFxModel.checkoutUrlZh, $event)"
        >
          {{ isEn ? 'Instant Get ($5.99)' : '立即获取 (¥29.0)' }}
        </a>
      </div>
    </div>

    <!-- Sample Preview Modal Drawer -->
    <transition name="fade">
      <div v-if="showExcelModal" class="modal-backdrop" @click.self="showExcelModal = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h4 class="modal-title">
              {{ isEn ? 'Excel Financial Model Sample Preview' : 'Excel 财务核算模型结构与样本预览' }}
            </h4>
            <button type="button" class="btn-close-modal" @click="showExcelModal = false">✕</button>
          </div>

          <div class="modal-sheet-tabs">
            <button
              type="button"
              class="sheet-tab"
              :class="{ active: activeExcelSheetTab === 'sheet1' }"
              @click="activeExcelSheetTab = 'sheet1'"
            >
              Sheet 1: {{ isEn ? 'Tiered Fee Matrix' : '多通道阶梯费率对照底表' }}
            </button>
            <button
              type="button"
              class="sheet-tab"
              :class="{ active: activeExcelSheetTab === 'sheet2' }"
              @click="activeExcelSheetTab = 'sheet2'"
            >
              Sheet 2: {{ isEn ? 'Batch Invoice Reconciliation' : '批量跨境发票对账表' }}
            </button>
            <button
              type="button"
              class="sheet-tab"
              :class="{ active: activeExcelSheetTab === 'sheet3' }"
              @click="activeExcelSheetTab = 'sheet3'"
            >
              Sheet 3: {{ isEn ? 'FX Sensitivity Radar' : '结汇净利敏感度分析' }}
            </button>
          </div>

          <div class="modal-body">
            <div v-if="activeExcelSheetTab === 'sheet1'" class="sheet-preview-pane">
              <div class="table-mockup">
                <div class="mockup-header-row">
                  <span>Channel ID</span>
                  <span>Base Rate %</span>
                  <span>Fixed Fee ($)</span>
                  <span>FX Spread %</span>
                  <span>Break-Even Volume</span>
                </div>
                <div class="mockup-row">
                  <span>PayPal Commercial</span>
                  <span>4.40%</span>
                  <span>$0.30</span>
                  <span>3.50%</span>
                  <span>&lt; $300 (Micro)</span>
                </div>
                <div class="mockup-row highlight-row">
                  <span>Wise Business</span>
                  <span>0.43%</span>
                  <span>$0.00</span>
                  <span>0.00%</span>
                  <span>$300 ~ $20,000</span>
                </div>
                <div class="mockup-row">
                  <span>SWIFT Wire</span>
                  <span>0.00%</span>
                  <span>$45.00</span>
                  <span>2.00%</span>
                  <span>&gt; $15,000 (Bulk)</span>
                </div>
              </div>
              <p class="sheet-note">
                {{ isEn ? 'Includes pre-programmed Excel formulas for automatic threshold evaluation.' : '包含内嵌 Excel 公式与条件格式，录入交易流水自动高亮费率最优路径。' }}
              </p>
            </div>

            <div v-if="activeExcelSheetTab === 'sheet2'" class="sheet-preview-pane">
              <div class="table-mockup">
                <div class="mockup-header-row">
                  <span>Invoice #</span>
                  <span>Client / Region</span>
                  <span>Billed (USD)</span>
                  <span>Gateway Fee</span>
                  <span>Net Bank Realized</span>
                </div>
                <div class="mockup-row">
                  <span>INV-2026-081</span>
                  <span>Acme Corp (US)</span>
                  <span>$4,500.00</span>
                  <span>-$19.35 (Wise)</span>
                  <span>$4,480.65</span>
                </div>
                <div class="mockup-row">
                  <span>INV-2026-082</span>
                  <span>Nordic Studio (EU)</span>
                  <span>$1,200.00</span>
                  <span>-$71.10 (PayPal)</span>
                  <span>$1,128.90</span>
                </div>
              </div>
              <p class="sheet-note">
                {{ isEn ? 'Pre-built VAT/GST columns and automated client currency conversion reconciler.' : '预置国际增值税/GST 扣除列与月末自动化结汇凭单对账统计逻辑。' }}
              </p>
            </div>

            <div v-if="activeExcelSheetTab === 'sheet3'" class="sheet-preview-pane">
              <div class="sensitivity-mockup">
                <div class="radar-box">
                  <div class="radar-title">{{ isEn ? 'Simulated Monthly Savings (Annual $50k Flow)' : '年交易额 $50,000 场景下多通道年度省钱模拟' }}</div>
                  <div class="bar-chart-row">
                    <span class="bar-label">PayPal</span>
                    <div class="bar-track"><div class="bar-fill" style="width: 25%"></div></div>
                    <span class="bar-val">$46,050 实收</span>
                  </div>
                  <div class="bar-chart-row">
                    <span class="bar-label">SWIFT</span>
                    <div class="bar-track"><div class="bar-fill" style="width: 45%"></div></div>
                    <span class="bar-val">$48,250 实收</span>
                  </div>
                  <div class="bar-chart-row highlight-bar">
                    <span class="bar-label">Wise / 连连</span>
                    <div class="bar-track"><div class="bar-fill best-fill" style="width: 95%"></div></div>
                    <span class="bar-val">$49,785 实收 (+¥26,000)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <span class="pricing-badge">{{ isEn ? 'Limited Time: $5.99 / ¥29.0' : '限时买断价: ¥29.0 / $5.99' }}</span>
            <a
              :href="(isEn ? DIGITAL_PRODUCTS.crossBorderFxModel.checkoutUrlEn : DIGITAL_PRODUCTS.crossBorderFxModel.checkoutUrlZh) || '#'"
              target="_blank"
              rel="nofollow noopener sponsored"
              class="btn-modal-checkout"
              @click="handleDigitalCheckout(isEn ? DIGITAL_PRODUCTS.crossBorderFxModel.checkoutUrlEn : DIGITAL_PRODUCTS.crossBorderFxModel.checkoutUrlZh, $event)"
            >
              {{ isEn ? 'Get Full Excel Model ↗' : '立即扫码获取完整模型 ↗' }}
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
          {{ isEn ? 'Financial Actuarial & Real-time FX Disclaimer' : '金融精算与实时汇率免责声明' }}
        </h5>
        <p class="disclaimer-text">
          {{
            isEn
              ? 'This calculator displays fee ratios, tiered deductions, mid-market foreign exchange rates, and final payout estimations across gateways (PayPal, Stripe, Wise, Payoneer, Lianlian, Airwallex, SWIFT) based on public documentation and third-party API benchmarks for browser-side offline mathematical simulation. Payment providers dynamically adjust charges based on merchant tier, chargeback ratio, instantaneous FX spread, and intermediary routing. This tool is for budgetary estimation only and does NOT constitute binding financial settlement, tax advisory, or investment guarantees. Final amounts are subject to official statements and bank settlement slips.'
              : '本精算器展示的各渠道（PayPal、Stripe、Wise、Payoneer、连连国际、Airwallex、SWIFT等）手续费比率、阶梯费率扣除公式、中间市场汇率及最终到账预估，系基于各官方平台公开费率文档与第三方公共汇率 API 开展的浏览器端离线数学模拟。由于各跨境支付服务商在实际结算时可能依据用户商户等级、争议发生率、即时货币转换加价（FX Spread）、周末汇率缓冲点差及中转行电汇费用动态计费，本测算数据仅作为业务预算参考，绝不构成任何形式的资金结算承诺、税务清算或金融投资建议。最终实际结算金额与币种汇率以各平台官方后台流水账单及银行结汇水单为准。'
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
.payment-calc-container {
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

/* Header & Badges */
.tool-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
}

.rate-badge-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.verified-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-secondary, #059669);
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.customize-btn {
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  padding: 5px 12px;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s ease;

  &:hover {
    background: var(--bg-surface-hover);
    color: var(--text-primary);
    border-color: var(--accent);
  }
}

/* Override Drawer */
.override-drawer-box {
  background: var(--bg-muted);
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  padding: 16px 18px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.btn-text-danger {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.drawer-tip {
  margin: 6px 0 12px 0;
  font-size: 12.5px;
  color: var(--text-muted);
}

.override-channel-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.channel-tab-btn {
  position: relative;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 7px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--accent);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent);
    color: #ffffff;
    border-color: var(--accent);
  }

  &.overridden {
    font-weight: 700;
  }

  .tab-dot {
    color: #f59e0b;
    font-size: 16px;
    line-height: 0;
    margin-left: 2px;
  }
}

.channel-sliders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}

.slider-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label-line {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.field-val {
  font-weight: 700;
  color: var(--text-primary);
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}

.slider-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.btn-reset-single {
  background: none;
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
  border-radius: 5px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(239, 68, 68, 0.08);
  }
}

.link-official-docs {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

/* Control Panel */
.calc-control-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: var(--shadow-sm);
}

.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--bg-muted);
  border: 2px solid transparent;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  .tab-icon {
    font-size: 22px;
  }

  .tab-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .desc {
    font-size: 12px;
    color: var(--text-muted);
  }

  &.active {
    background: var(--bg-surface);
    border-color: var(--accent);
    box-shadow: 0 4px 12px var(--accent-soft);

    .title {
      color: var(--accent);
    }
  }
}

.inputs-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.input-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.amount-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-prefix {
  position: absolute;
  left: 14px;
  font-size: 20px;
  font-weight: 800;
  color: var(--text-muted);
}

.styled-number-input {
  width: 100%;
  padding: 10px 14px 10px 36px;
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
}

.quick-presets-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.preset-chip {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  &.active {
    background: var(--accent);
    color: #ffffff;
    border-color: var(--accent);
  }
}

.secondary-settings-box {
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: center;
}

.currency-toggle-group {
  display: flex;
  gap: 8px;
}

.curr-btn {
  flex: 1;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--accent);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent);
    color: #ffffff;
    border-color: var(--accent);
    font-weight: 700;
  }
}

.sub-tip {
  font-size: 12px;
  color: var(--accent-secondary, #059669);
  font-weight: 600;
}

.rate-input-wrap {
  width: 100%;
}

.styled-rate-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-muted);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
}

/* Results Table */
.results-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.section-heading {
  margin: 0;
  font-size: 17.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.summary-tip {
  font-size: 12.5px;
  color: var(--text-muted);
}

.table-scroll-container {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.fee-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13.5px;

  th,
  td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-subtle);
  }

  th {
    background: var(--bg-muted);
    color: var(--text-secondary);
    font-weight: 700;
    font-size: 12.5px;
    white-space: nowrap;
  }

  .highlight-th {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 800;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: var(--bg-surface-hover);
  }

  tbody tr.best-row {
    background: var(--accent-soft);
  }
}

.channel-identity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 220px;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  font-weight: 700;
  font-size: 14.5px;
  color: var(--text-primary);
}

.badge-pill {
  font-size: 11.5px;
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 700;
}

.best-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.normal-badge {
  background: var(--bg-muted);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
}

.notes-line {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.duration-tag {
  font-size: 11.5px;
  color: var(--accent);
  font-weight: 600;
}

.channel-note {
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.4;
}

.col-num {
  white-space: nowrap;
}

.val-usd {
  font-weight: 700;
  font-size: 13.5px;
  color: var(--text-primary);
}

.sub-val {
  font-size: 12px;
  color: var(--text-muted);
}

.total-cost-col {
  .val-cost {
    font-weight: 700;
    font-size: 13.5px;
    color: #dc2626;
  }

  .sub-cost-cny {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.col-highlight {
  min-width: 130px;
  background: var(--accent-soft);

  .highlight-primary {
    font-size: 15px;
    font-weight: 800;
    color: var(--accent);
  }

  .highlight-sub {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.loss-rate-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;

  &.rate-low {
    background: rgba(16, 185, 129, 0.12);
    color: #15803d;
  }

  &.rate-mid {
    background: rgba(245, 158, 11, 0.15);
    color: #b45309;
  }

  &.rate-high {
    background: rgba(239, 68, 68, 0.12);
    color: #b91c1c;
  }
}

.action-btn {
  display: inline-block;
  padding: 7px 14px;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  background: var(--bg-muted);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    background: var(--accent);
    color: #ffffff;
    border-color: var(--accent);
  }

  &.btn-accent {
    background: var(--accent);
    color: #ffffff;
    border-color: var(--accent);

    &:hover {
      background: var(--accent-hover);
    }
  }
}

/* Memo Generator */
.memo-generator-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: var(--shadow-sm);
}

.memo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.memo-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.memo-desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-muted);
}

.memo-channel-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.picker-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.channel-dropdown {
  padding: 7px 12px;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background: var(--bg-muted);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  outline: none;
}

.memo-variable-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.var-field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .input-text {
    padding: 7px 12px;
    border-radius: 7px;
    border: 1px solid var(--border-color);
    background: var(--bg-muted);
    font-size: 13px;
    color: var(--text-primary);
    outline: none;

    &:focus {
      border-color: var(--accent);
    }
  }
}

.var-field-wide {
  grid-column: 1 / -1;
}

.template-previews-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.template-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 14px 16px;
}

.template-box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.box-tag {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.copy-btn {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  color: var(--accent);
  transition: all 0.15s ease;

  &:hover {
    background: var(--accent);
    color: #ffffff;
  }
}

.template-textarea {
  width: 100%;
  font-family: monospace;
  font-size: 12.5px;
  line-height: 1.55;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  resize: vertical;
  outline: none;
}

/* Tripwire Banner */
.tripwire-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 16px;
  padding: 20px 24px;
}

.tripwire-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.tripwire-title {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.tripwire-desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
  max-width: 600px;
  line-height: 1.5;
}

.tripwire-action {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-tripwire-preview {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
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

.btn-tripwire-buy {
  background: var(--accent);
  color: #ffffff;
  text-decoration: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;

  &:hover {
    background: var(--accent-hover);
  }
}

/* Modal Drawer */
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
  max-width: 680px;
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

.modal-sheet-tabs {
  display: flex;
  background: var(--bg-muted);
  border-bottom: 1px solid var(--border-subtle);
}

.sheet-tab {
  flex: 1;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;

  &.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    background: var(--bg-surface);
    font-weight: 700;
  }
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.table-mockup {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  font-size: 12.5px;
}

.mockup-header-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
  padding: 10px 12px;
  background: var(--bg-muted);
  font-weight: 700;
  color: var(--text-secondary);
}

.mockup-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
  padding: 10px 12px;
  border-top: 1px solid var(--border-subtle);
  color: var(--text-primary);

  &.highlight-row {
    background: var(--accent-soft);
    font-weight: 700;
    color: var(--accent);
  }
}

.sheet-note {
  margin: 12px 0 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.radar-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-muted);
  padding: 16px;
  border-radius: 10px;
}

.radar-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.bar-chart-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12.5px;

  .bar-label {
    width: 80px;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .bar-track {
    flex: 1;
    height: 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: var(--text-muted);

    &.best-fill {
      background: #10b981;
    }
  }

  .bar-val {
    width: 130px;
    font-weight: 700;
    text-align: right;
    color: var(--text-primary);
  }

  &.highlight-bar .bar-val {
    color: #10b981;
  }
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
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

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
