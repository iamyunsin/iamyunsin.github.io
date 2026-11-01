<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

// Active Tab: 'ecommerce' (Tab 1) | 'takeout' (Tab 2)
const activeTab = ref<'ecommerce' | 'takeout'>('ecommerce');

// ============================================================================
// TAB 1: E-Commerce Stacked Coupon & Refund Prorator (电商凑单满减与退货分摊)
// ============================================================================
interface CartItem {
  id: number;
  name: string;
  originalPrice: number;
  itemDiscount: number; // 店铺立减/单品券
  role: 'keep' | 'filler'; // keep = 主买保留品, filler = 凑单退货品
}

let nextCartId = 4;
const cartItems = ref<CartItem[]>([
  { id: 1, name: '旗舰降噪耳机 (主买)', originalPrice: 799, itemDiscount: 50, role: 'keep' },
  { id: 2, name: '纯棉基础款卫衣 (主买)', originalPrice: 269, itemDiscount: 20, role: 'keep' },
  { id: 3, name: '凑单帆布包 (付款后秒退)', originalPrice: 135, itemDiscount: 0, role: 'filler' },
]);

function addCartItem(role: 'keep' | 'filler' = 'filler') {
  const idx = cartItems.value.length + 1;
  cartItems.value.push({
    id: nextCartId++,
    name:
      role === 'keep'
        ? isEn.value
          ? `Main Item #${idx}`
          : `主买商品 #${idx}`
        : isEn.value
          ? `Filler Item #${idx}`
          : `凑单退货品 #${idx}`,
    originalPrice: role === 'keep' ? 299 : 99,
    itemDiscount: 0,
    role,
  });
}

function removeCartItem(id: number) {
  if (cartItems.value.length > 1) {
    cartItems.value = cartItems.value.filter((i) => i.id !== id);
  }
}

// Global Stacked Discounts
const enableCrossStore = ref<boolean>(true);
const crossStoreEvery = ref<number>(300); // 每满 300
const crossStoreMinus = ref<number>(50); // 减 50
const crossStoreBaseMode = ref<'original' | 'afterItem'>('original'); // 淘宝跨店满减通常按标价/活动价满减

const enablePlatformCoupon = ref<boolean>(true);
const couponThreshold = ref<number>(1000); // 满 1000
const couponAmount = ref<number>(80); // 减 80

const enableVipDiscount = ref<boolean>(true);
const vipDiscountRate = ref<number>(95); // 88VIP 95折 (95%)
const redPacketAmount = ref<number>(15); // 支付红包/消费券立减

function applyEcommercePreset(preset: '618-300-50' | 'vip-800-60' | 'jd-200-30') {
  if (preset === '618-300-50') {
    enableCrossStore.value = true;
    crossStoreEvery.value = 300;
    crossStoreMinus.value = 50;
    enablePlatformCoupon.value = true;
    couponThreshold.value = 1000;
    couponAmount.value = 80;
    enableVipDiscount.value = true;
    vipDiscountRate.value = 95;
    redPacketAmount.value = 15;
  } else if (preset === 'vip-800-60') {
    enableCrossStore.value = true;
    crossStoreEvery.value = 300;
    crossStoreMinus.value = 50;
    enablePlatformCoupon.value = true;
    couponThreshold.value = 800;
    couponAmount.value = 60;
    enableVipDiscount.value = true;
    vipDiscountRate.value = 95;
    redPacketAmount.value = 0;
  } else if (preset === 'jd-200-30') {
    enableCrossStore.value = true;
    crossStoreEvery.value = 200;
    crossStoreMinus.value = 30;
    enablePlatformCoupon.value = true;
    couponThreshold.value = 500;
    couponAmount.value = 40;
    enableVipDiscount.value = false;
    vipDiscountRate.value = 100;
    redPacketAmount.value = 10;
  }
}

// Helper to compute checkout for a given list of items
function simulateCheckout(items: CartItem[]) {
  const totalOriginal = items.reduce((s, i) => s + Math.max(0, i.originalPrice || 0), 0);
  const totalItemDisc = items.reduce(
    (s, i) => s + Math.min(Math.max(0, i.originalPrice || 0), Math.max(0, i.itemDiscount || 0)),
    0
  );
  const totalAfterItem = Math.max(0, totalOriginal - totalItemDisc);

  // 1. Cross-store tiered discount (跨店满减)
  const crossBase = crossStoreBaseMode.value === 'original' ? totalOriginal : totalAfterItem;
  const tiers =
    enableCrossStore.value && crossStoreEvery.value > 0
      ? Math.floor(crossBase / crossStoreEvery.value)
      : 0;
  const totalCrossDisc = tiers * Math.max(0, crossStoreMinus.value || 0);
  const nextTierGap =
    enableCrossStore.value && crossStoreEvery.value > 0
      ? crossStoreEvery.value - (crossBase % crossStoreEvery.value)
      : 0;

  // 2. Platform Category Coupon (平台品类券/消费券)
  const qualifiesCoupon =
    enablePlatformCoupon.value && crossBase >= Math.max(0, couponThreshold.value || 0);
  const totalCouponDisc = qualifiesCoupon ? Math.max(0, couponAmount.value || 0) : 0;

  // 3. Subtotal before VIP 95折 & Red Packet
  const subtotalAfterCoupons = Math.max(0, totalAfterItem - totalCrossDisc - totalCouponDisc);
  const effectiveVipRate = enableVipDiscount.value
    ? Math.min(100, Math.max(1, vipDiscountRate.value || 100)) / 100
    : 1;
  const totalVipDisc = subtotalAfterCoupons * (1 - effectiveVipRate);
  const totalRedPacket = Math.min(
    subtotalAfterCoupons - totalVipDisc,
    Math.max(0, redPacketAmount.value || 0)
  );

  // Prorate across each item
  const rows = items.map((item) => {
    const orig = Math.max(0, item.originalPrice || 0);
    const singleDisc = Math.min(orig, Math.max(0, item.itemDiscount || 0));
    const afterSingle = Math.max(0, orig - singleDisc);

    const weightOrig = totalOriginal > 0 ? orig / totalOriginal : 0;
    const weightAfterSingle = totalAfterItem > 0 ? afterSingle / totalAfterItem : weightOrig;
    const prorationWeight = crossStoreBaseMode.value === 'original' ? weightOrig : weightAfterSingle;

    const itemCrossDisc = totalCrossDisc * prorationWeight;
    const itemCouponDisc = totalCouponDisc * weightAfterSingle;
    const itemSubtotal = Math.max(0, afterSingle - itemCrossDisc - itemCouponDisc);
    const itemVipDisc = itemSubtotal * (1 - effectiveVipRate);
    const itemRedPacket = totalRedPacket * weightAfterSingle;

    const finalPay = Math.max(0, itemSubtotal - itemVipDisc - itemRedPacket);
    const totalSaved = Math.max(0, orig - finalPay);
    const discountFold = orig > 0 ? (finalPay / orig) * 10 : 10;

    return {
      ...item,
      orig,
      singleDisc,
      itemCrossDisc,
      itemCouponDisc,
      itemVipAndRed: itemVipDisc + itemRedPacket,
      finalPay,
      totalSaved,
      discountFold,
    };
  });

  const finalTotalPay = rows.reduce((s, r) => s + r.finalPay, 0);

  return {
    totalOriginal,
    totalItemDisc,
    totalCrossDisc,
    tiers,
    nextTierGap,
    qualifiesCoupon,
    totalCouponDisc,
    totalVipDisc,
    totalRedPacket,
    finalTotalPay,
    rows,
  };
}

const ecommerceResult = computed(() => {
  const fullOrder = simulateCheckout(cartItems.value);
  const keepItemsOnly = cartItems.value.filter((i) => i.role === 'keep');
  const standaloneKeepOrder = simulateCheckout(keepItemsOnly);

  const keepFinalPay = fullOrder.rows
    .filter((r) => r.role === 'keep')
    .reduce((s, r) => s + r.finalPay, 0);
  const fillerRefundTotal = fullOrder.rows
    .filter((r) => r.role === 'filler')
    .reduce((s, r) => s + r.finalPay, 0);
  const keepOriginalTotal = fullOrder.rows
    .filter((r) => r.role === 'keep')
    .reduce((s, r) => s + r.orig, 0);

  // Extra money saved on Keep items specifically by adding the Filler items
  const extraSavedByFiller = Math.max(0, standaloneKeepOrder.finalTotalPay - keepFinalPay);

  return {
    ...fullOrder,
    keepOriginalTotal,
    keepFinalPay,
    fillerRefundTotal,
    standaloneKeepPay: standaloneKeepOrder.finalTotalPay,
    extraSavedByFiller,
  };
});

// ============================================================================
// TAB 2: Fair Group Takeout / Dining Bill Splitter (外卖拼单公平 AA 计算器)
// ============================================================================
interface DinerItem {
  id: number;
  name: string;
  originalAmount: number;
}

let nextDinerId = 5;
const diners = ref<DinerItem[]>([
  { id: 1, name: '阿杰 (点单发起人)', originalAmount: 38.0 },
  { id: 2, name: '小王', originalAmount: 26.5 },
  { id: 3, name: '林姐', originalAmount: 45.0 },
  { id: 4, name: '大刘', originalAmount: 19.0 },
]);

function addDiner() {
  const idx = diners.value.length + 1;
  diners.value.push({
    id: nextDinerId++,
    name: isEn.value ? `Friend #${idx}` : `拼单伙伴 #${idx}`,
    originalAmount: 25.0,
  });
}

function removeDiner(id: number) {
  if (diners.value.length > 1) {
    diners.value = diners.value.filter((d) => d.id !== id);
  }
}

const takeoutInputMode = ref<'finalPaid' | 'itemized'>('finalPaid');
const sharedDeliveryPackingFee = ref<number>(6.5); // 打包费+配送费
const actualOrderTotalPaid = ref<number>(86.8); // 订单最终实付总额
const itemizedDiscountTotal = ref<number>(48.2); // 满减+神券总额
const deliverySplitRule = ref<'proportional' | 'equalFee'>('proportional');

const takeoutResult = computed(() => {
  const foodOriginalSum = diners.value.reduce((s, d) => s + Math.max(0, d.originalAmount || 0), 0);
  const fee = Math.max(0, sharedDeliveryPackingFee.value || 0);
  const grossWithFee = foodOriginalSum + fee;

  const finalPaid =
    takeoutInputMode.value === 'finalPaid'
      ? Math.max(0, actualOrderTotalPaid.value || 0)
      : Math.max(0, grossWithFee - Math.max(0, itemizedDiscountTotal.value || 0));

  const netDiscountSaved = Math.max(0, grossWithFee - finalPaid);
  const effectiveRatio = foodOriginalSum > 0 ? finalPaid / foodOriginalSum : 1;

  const count = Math.max(1, diners.value.length);

  const dinerRows = diners.value.map((d) => {
    const orig = Math.max(0, d.originalAmount || 0);
    const weight = foodOriginalSum > 0 ? orig / foodOriginalSum : 1 / count;

    let shouldPay = 0;
    let feeShare = 0;
    let discountShare = 0;

    if (deliverySplitRule.value === 'proportional') {
      // Proportional everything (industry standard & fairest)
      feeShare = fee * weight;
      discountShare = netDiscountSaved * weight;
      shouldPay = finalPaid * weight;
    } else {
      // Equal delivery/packing fee + proportional discount on food
      feeShare = fee / count;
      discountShare = netDiscountSaved * weight;
      shouldPay = Math.max(0, orig + feeShare - discountShare);
    }

    return {
      ...d,
      orig,
      weightPct: weight * 100,
      feeShare,
      discountShare,
      shouldPay,
      savedNet: orig + feeShare - shouldPay,
    };
  });

  return {
    foodOriginalSum,
    fee,
    grossWithFee,
    finalPaid,
    netDiscountSaved,
    effectiveFold: (effectiveRatio * 10).toFixed(1),
    dinerRows,
  };
});

// One-Click Copyable WeChat Group AA Bill Text
const copySuccess = ref<boolean>(false);

const wechatBillText = computed(() => {
  const r = takeoutResult.value;
  if (isEn.value) {
    const lines = [
      `🍱 [Group Order Fair Split Bill]`,
      `• Food Subtotal: ¥${r.foodOriginalSum.toFixed(2)} (+Fee ¥${r.fee.toFixed(2)})`,
      `• Total Discount Saved: -¥${r.netDiscountSaved.toFixed(2)}`,
      `• Actual Total Paid: ¥${r.finalPaid.toFixed(2)} (~${(Number(r.effectiveFold) * 10).toFixed(0)}% of menu price)`,
      `------------------------`,
      ...r.dinerRows.map(
        (d, idx) =>
          `${idx + 1}. ${d.name}: Menu ¥${d.orig.toFixed(2)} 👉 Pay ¥${d.shouldPay.toFixed(2)} (Saved ¥${d.savedNet.toFixed(2)})`
      ),
    ];
    return lines.join('\n');
  } else {
    const lines = [
      `🍱【外卖拼单公平 AA 结算单】`,
      `• 菜品原价合计：¥${r.foodOriginalSum.toFixed(2)}（含打包配送费 ¥${r.fee.toFixed(2)}）`,
      `• 满减红包共省：-¥${r.netDiscountSaved.toFixed(2)}`,
      `• 整单实付总计：¥${r.finalPaid.toFixed(2)}（相当于点餐原价 ${r.effectiveFold} 折）`,
      `----------------------`,
      ...r.dinerRows.map(
        (d, idx) =>
          `${idx + 1}. ${d.name}：原价 ¥${d.orig.toFixed(2)} 👉 应付 ¥${d.shouldPay.toFixed(2)}（已省 ¥${d.savedNet.toFixed(2)}）`
      ),
    ];
    return lines.join('\n');
  }
});

async function copyWechatBill() {
  try {
    await navigator.clipboard.writeText(wechatBillText.value);
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2200);
  } catch {
    copySuccess.value = false;
  }
}

function fmt(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<template>
  <div class="discount-splitter-tool">
    <!-- Top Mode Switcher Tabs -->
    <div class="mode-switcher">
      <button
        type="button"
        class="mode-tab"
        :class="{ active: activeTab === 'ecommerce' }"
        @click="activeTab = 'ecommerce'"
      >
        <span class="tab-icon">🛒</span>
        <div class="tab-text">
          <span class="tab-title">
            {{ isEn ? 'E-Commerce Stacked Coupon & Refund Prorator' : '电商大促凑单满减 & 退货实付分摊计算器' }}
          </span>
          <span class="tab-sub">
            {{ isEn ? '618 / Double 11 Cross-Store Discount + Filler Refund Net Cost' : '跨店满减 + 品类券 + 88VIP 95折平行分摊 · 秒算退掉凑单品后净扣款' }}
          </span>
        </div>
      </button>

      <button
        type="button"
        class="mode-tab"
        :class="{ active: activeTab === 'takeout' }"
        @click="activeTab = 'takeout'"
      >
        <span class="tab-icon">🍱</span>
        <div class="tab-text">
          <span class="tab-title">
            {{ isEn ? 'Fair Group Takeout & Dining Bill Splitter' : '外卖拼单 / 聚餐红包配送费公平 AA 计算器' }}
          </span>
          <span class="tab-sub">
            {{ isEn ? 'Proportional Red Packet & Delivery Fee Split + WeChat Copy Text' : '按原价权重精准分摊神券与打包配送费 · 一键复制微信群收款文案' }}
          </span>
        </div>
      </button>
    </div>

    <!-- =================================================================== -->
    <!-- TAB 1: E-COMMERCE STACKED COUPON & REFUND PRORATOR                  -->
    <!-- =================================================================== -->
    <div v-if="activeTab === 'ecommerce'" class="tab-workspace">
      <div class="workspace-grid">
        <!-- Left: Shopping Cart & Stacked Rules -->
        <div class="input-panel">
          <div class="panel-header">
            <h2 class="panel-title">
              {{ isEn ? '🛍️ 1. Shopping Cart Items (Keep vs. Filler)' : '🛍️ 1. 购物车商品清单（区分主买保留 vs 凑单退货）' }}
            </h2>
            <div class="add-btn-group">
              <button type="button" class="btn-add keep" @click="addCartItem('keep')">
                + {{ isEn ? 'Add Main Item' : '加主买品' }}
              </button>
              <button type="button" class="btn-add filler" @click="addCartItem('filler')">
                + {{ isEn ? 'Add Filler Item' : '加凑单品' }}
              </button>
            </div>
          </div>

          <div class="cart-list">
            <div
              v-for="item in cartItems"
              :key="item.id"
              class="cart-row"
              :class="{ 'is-filler': item.role === 'filler' }"
            >
              <div class="cart-row-top">
                <button
                  type="button"
                  class="role-toggle"
                  :class="item.role"
                  @click="item.role = item.role === 'keep' ? 'filler' : 'keep'"
                >
                  {{
                    item.role === 'keep'
                      ? isEn
                        ? '🎯 KEEP'
                        : '🎯 主买保留'
                      : isEn
                        ? '🔄 FILLER (Refund)'
                        : '🔄 凑单退货'
                  }}
                </button>
                <input
                  v-model="item.name"
                  type="text"
                  class="item-name-input"
                  :placeholder="isEn ? 'Item Name' : '商品名称'"
                />
                <button
                  v-if="cartItems.length > 1"
                  type="button"
                  class="btn-del"
                  @click="removeCartItem(item.id)"
                >
                  ✕
                </button>
              </div>

              <div class="cart-row-inputs">
                <div class="mini-field">
                  <label>{{ isEn ? 'Original / List Price (¥)' : '商品标价 / 活动原价 (元)' }}</label>
                  <input v-model.number="item.originalPrice" type="number" min="0" step="10" />
                </div>
                <div class="mini-field">
                  <label>{{ isEn ? 'Store / Item Coupon (-¥)' : '店铺立减 / 单品券 (-元)' }}</label>
                  <input v-model.number="item.itemDiscount" type="number" min="0" step="5" />
                </div>
              </div>
            </div>
          </div>

          <!-- Global Stacked Discounts -->
          <div class="panel-header" style="margin-top: 8px">
            <h2 class="panel-title">
              {{ isEn ? '🧧 2. Stacked Platform Discounts' : '🧧 2. 跨店满减与平台叠加券配置' }}
            </h2>
            <div class="preset-pills">
              <button type="button" class="mini-pill" @click="applyEcommercePreset('618-300-50')">
                {{ isEn ? 'Every 300-50' : '每满300减50' }}
              </button>
              <button type="button" class="mini-pill" @click="applyEcommercePreset('vip-800-60')">
                {{ isEn ? '88VIP 800-60' : '88VIP满800减60' }}
              </button>
              <button type="button" class="mini-pill" @click="applyEcommercePreset('jd-200-30')">
                {{ isEn ? 'Every 200-30' : '每满200减30' }}
              </button>
            </div>
          </div>

          <div class="rules-box">
            <!-- Rule 1: Cross-store discount -->
            <div class="rule-row">
              <label class="rule-check">
                <input v-model="enableCrossStore" type="checkbox" />
                <span>{{ isEn ? 'Cross-Store Tiered:' : '跨店每满减：' }}</span>
              </label>
              <div class="rule-inline-inputs">
                <span>{{ isEn ? 'Every ¥' : '每满' }}</span>
                <input v-model.number="crossStoreEvery" type="number" min="1" class="inline-num" />
                <span>{{ isEn ? 'Minus ¥' : '减' }}</span>
                <input v-model.number="crossStoreMinus" type="number" min="0" class="inline-num" />
              </div>
            </div>

            <!-- Rule 2: Platform Category Coupon -->
            <div class="rule-row">
              <label class="rule-check">
                <input v-model="enablePlatformCoupon" type="checkbox" />
                <span>{{ isEn ? 'Platform Coupon:' : '平台品类/消费券：' }}</span>
              </label>
              <div class="rule-inline-inputs">
                <span>{{ isEn ? 'Spend ¥' : '满' }}</span>
                <input v-model.number="couponThreshold" type="number" min="0" class="inline-num" />
                <span>{{ isEn ? 'Minus ¥' : '减' }}</span>
                <input v-model.number="couponAmount" type="number" min="0" class="inline-num" />
              </div>
            </div>

            <!-- Rule 3: 88VIP & Red Packet -->
            <div class="rule-row">
              <label class="rule-check">
                <input v-model="enableVipDiscount" type="checkbox" />
                <span>{{ isEn ? 'VIP Discount / Red Packet:' : '88VIP 折上折 & 红包：' }}</span>
              </label>
              <div class="rule-inline-inputs">
                <input v-model.number="vipDiscountRate" type="number" min="50" max="100" class="inline-num" />
                <span>{{ isEn ? '% + Red Packet ¥' : '% 折 + 红包' }}</span>
                <input v-model.number="redPacketAmount" type="number" min="0" class="inline-num" />
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Proration & Refund Breakdown -->
        <div class="result-panel">
          <!-- Hero Card: Net Out-of-Pocket for Keep Items -->
          <div class="hero-summary-card">
            <div class="hero-top">
              <div>
                <span class="hero-eyebrow">
                  {{ isEn ? 'NET COST FOR MAIN ITEMS (AFTER REFUNDING FILLERS)' : '退掉凑单品后 · 主买保留商品最终净实付' }}
                </span>
                <div class="hero-amount">¥{{ fmt(ecommerceResult.keepFinalPay) }}</div>
              </div>
              <div class="savings-pill-box">
                <span class="s-label">
                  {{ isEn ? 'Extra Saved via Filler Proration' : '通过凑单额外多省金额' }}
                </span>
                <span class="s-val">+¥{{ fmt(ecommerceResult.extraSavedByFiller) }}</span>
              </div>
            </div>

            <div class="checkout-flow-grid">
              <div class="flow-step">
                <span class="f-label">{{ isEn ? '1. Combined Checkout Pay' : '① 合并下单先付总额' }}</span>
                <span class="f-val">¥{{ fmt(ecommerceResult.finalTotalPay) }}</span>
              </div>
              <div class="flow-step refund-step">
                <span class="f-label">{{ isEn ? '2. Instant Filler Refund' : '② 退掉凑单品秒退回' }}</span>
                <span class="f-val refund-color">+¥{{ fmt(ecommerceResult.fillerRefundTotal) }}</span>
              </div>
              <div class="flow-step">
                <span class="f-label">{{ isEn ? 'Buy Standalone (No Filler)' : '若不凑单单独买主商品需付' }}</span>
                <span class="f-val muted">¥{{ fmt(ecommerceResult.standaloneKeepPay) }}</span>
              </div>
            </div>

            <!-- Tier Status Strip -->
            <div class="tier-status-bar">
              <span>
                🔥
                {{
                  isEn
                    ? `Triggered ${ecommerceResult.tiers}x Cross-Store Tiers (-¥${fmt(ecommerceResult.totalCrossDisc)})`
                    : `已触发 ${ecommerceResult.tiers} 档跨店满减（立减 ¥${fmt(ecommerceResult.totalCrossDisc)}）`
                }}
              </span>
              <span v-if="ecommerceResult.nextTierGap > 0" class="gap-hint">
                {{
                  isEn
                    ? `Add ¥${fmt(ecommerceResult.nextTierGap)} more to hit next tier!`
                    : `再凑 ¥${fmt(ecommerceResult.nextTierGap)} 可再多减一档！`
                }}
              </span>
            </div>
          </div>

          <!-- Item-by-Item Prorated Payment Table -->
          <div class="proration-card">
            <h3 class="sub-card-title">
              📋 {{ isEn ? 'Item-by-Item Prorated Payment & Refund Schedule' : '单品平行分摊明细与退货实退金额表' }}
            </h3>
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>{{ isEn ? 'Item & Role' : '商品与角色' }}</th>
                    <th>{{ isEn ? 'Original' : '原价' }}</th>
                    <th>{{ isEn ? 'Total Saved' : '分摊共省' }}</th>
                    <th>{{ isEn ? 'Eff. Rate' : '折算率' }}</th>
                    <th>{{ isEn ? 'Prorated Pay / Refund' : '分摊实付 (退货实退)' }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in ecommerceResult.rows"
                    :key="row.id"
                    :class="{ 'filler-row': row.role === 'filler' }"
                  >
                    <td>
                      <div class="row-item-cell">
                        <span class="role-dot" :class="row.role">
                          {{ row.role === 'keep' ? (isEn ? 'KEEP' : '主买') : (isEn ? 'REFUND' : '凑单退') }}
                        </span>
                        <span class="row-name">{{ row.name }}</span>
                      </div>
                    </td>
                    <td class="mono">¥{{ fmt(row.orig) }}</td>
                    <td class="mono saved-col">-¥{{ fmt(row.totalSaved) }}</td>
                    <td>
                      <span class="fold-tag">
                        {{ isEn ? `${(100 - row.discountFold * 10).toFixed(0)}% OFF` : `${row.discountFold.toFixed(1)} 折` }}
                      </span>
                    </td>
                    <td class="mono final-col">
                      ¥{{ fmt(row.finalPay) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- TAB 2: FAIR GROUP TAKEOUT & DINING BILL SPLITTER                    -->
    <!-- =================================================================== -->
    <div v-else class="tab-workspace">
      <div class="workspace-grid">
        <!-- Left: Diners & Order Fees -->
        <div class="input-panel">
          <div class="panel-header">
            <h2 class="panel-title">
              {{ isEn ? '👥 1. Diners & Original Menu Prices' : '👥 1. 拼单伙伴与各自点餐原价' }}
            </h2>
            <button type="button" class="btn-add keep" @click="addDiner">
              + {{ isEn ? 'Add Person' : '添加拼单伙伴' }}
            </button>
          </div>

          <div class="diner-list">
            <div v-for="(diner, idx) in diners" :key="diner.id" class="diner-row">
              <span class="diner-idx">#{{ idx + 1 }}</span>
              <input
                v-model="diner.name"
                type="text"
                class="diner-name-input"
                :placeholder="isEn ? 'Name' : '昵称'"
              />
              <div class="diner-price-wrap">
                <span class="prefix">¥</span>
                <input
                  v-model.number="diner.originalAmount"
                  type="number"
                  min="0"
                  step="1"
                  class="diner-price-input"
                />
              </div>
              <button
                v-if="diners.length > 1"
                type="button"
                class="btn-del"
                @click="removeDiner(diner.id)"
              >
                ✕
              </button>
            </div>
          </div>

          <div class="panel-header" style="margin-top: 8px">
            <h2 class="panel-title">
              {{ isEn ? '🛵 2. Delivery Fee & Final Payment' : '🛵 2. 打包配送费与实付总金额' }}
            </h2>
          </div>

          <div class="rules-box">
            <div class="sub-mode-pills">
              <button
                type="button"
                class="sub-pill"
                :class="{ active: takeoutInputMode === 'finalPaid' }"
                @click="takeoutInputMode = 'finalPaid'"
              >
                {{ isEn ? 'Enter Final Paid Total (Fastest)' : '直接填最终实付总额 (最快最准)' }}
              </button>
              <button
                type="button"
                class="sub-pill"
                :class="{ active: takeoutInputMode === 'itemized' }"
                @click="takeoutInputMode = 'itemized'"
              >
                {{ isEn ? 'Enter Total Red Packet Discount' : '按满减红包总额正向扣减' }}
              </button>
            </div>

            <div class="takeout-inputs-grid">
              <div class="mini-field">
                <label>{{ isEn ? 'Shared Packing + Delivery Fee (¥)' : '公共打包费 + 配送费合计 (元)' }}</label>
                <input v-model.number="sharedDeliveryPackingFee" type="number" min="0" step="0.5" />
              </div>

              <div v-if="takeoutInputMode === 'finalPaid'" class="mini-field highlight-field">
                <label>{{ isEn ? 'Actual Order Total Paid (¥)' : '手机账单最终实付总金额 (元)' }}</label>
                <input v-model.number="actualOrderTotalPaid" type="number" min="0" step="0.5" />
              </div>

              <div v-else class="mini-field highlight-field">
                <label>{{ isEn ? 'Total Coupons & Red Packets (-¥)' : '满减 + 膨胀红包总优惠 (-元)' }}</label>
                <input v-model.number="itemizedDiscountTotal" type="number" min="0" step="0.5" />
              </div>
            </div>

            <div class="split-rule-toggle">
              <span>{{ isEn ? 'Split Algorithm:' : '分摊规则：' }}</span>
              <button
                type="button"
                class="mini-pill"
                :class="{ active: deliverySplitRule === 'proportional' }"
                @click="deliverySplitRule = 'proportional'"
              >
                {{ isEn ? 'All Proportional by Menu Price (Recommended)' : '运费与红包均按点餐原价比例分摊 (最公平推荐)' }}
              </button>
              <button
                type="button"
                class="mini-pill"
                :class="{ active: deliverySplitRule === 'equalFee' }"
                @click="deliverySplitRule = 'equalFee'"
              >
                {{ isEn ? 'Equal Delivery Fee + Proportional Discount' : '运费按人头平摊 + 红包按比例分摊' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Fair AA Breakdown & WeChat Copyable Text -->
        <div class="result-panel">
          <div class="hero-summary-card">
            <div class="hero-top">
              <div>
                <span class="hero-eyebrow">
                  {{ isEn ? 'ACTUAL TOTAL PAID BY GROUP' : '整单拼单实付总金额' }}
                </span>
                <div class="hero-amount">¥{{ fmt(takeoutResult.finalPaid) }}</div>
              </div>
              <div class="savings-pill-box">
                <span class="s-label">{{ isEn ? 'Effective Group Discount' : '全员折合点餐原价' }}</span>
                <span class="s-val">
                  {{ isEn ? `${takeoutResult.effectiveFold}x` : `${takeoutResult.effectiveFold} 折` }}
                </span>
              </div>
            </div>

            <div class="checkout-flow-grid">
              <div class="flow-step">
                <span class="f-label">{{ isEn ? 'Menu Subtotal' : '菜品原价合计' }}</span>
                <span class="f-val">¥{{ fmt(takeoutResult.foodOriginalSum) }}</span>
              </div>
              <div class="flow-step">
                <span class="f-label">{{ isEn ? 'Packing & Delivery' : '公共打包配送费' }}</span>
                <span class="f-val">+¥{{ fmt(takeoutResult.fee) }}</span>
              </div>
              <div class="flow-step refund-step">
                <span class="f-label">{{ isEn ? 'Red Packet Saved' : '红包满减共省' }}</span>
                <span class="f-val refund-color">-¥{{ fmt(takeoutResult.netDiscountSaved) }}</span>
              </div>
            </div>
          </div>

          <!-- Per-Person AA Table -->
          <div class="proration-card">
            <h3 class="sub-card-title">
              🧾 {{ isEn ? 'Per-Person Fair AA Breakdown' : '每人公平 AA 应付金额明细表' }}
            </h3>
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>{{ isEn ? 'Name' : '拼单伙伴' }}</th>
                    <th>{{ isEn ? 'Menu Price' : '点餐原价' }}</th>
                    <th>{{ isEn ? 'Weight' : '占比权重' }}</th>
                    <th>{{ isEn ? 'Net Saved' : '分摊净省' }}</th>
                    <th>{{ isEn ? 'Should Pay (AA)' : '👉 实际应付金额' }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="d in takeoutResult.dinerRows" :key="d.id">
                    <td class="mono-bold">{{ d.name }}</td>
                    <td class="mono">¥{{ fmt(d.orig) }}</td>
                    <td class="mono">{{ d.weightPct.toFixed(1) }}%</td>
                    <td class="mono saved-col">-¥{{ fmt(d.savedNet) }}</td>
                    <td class="mono final-col">¥{{ fmt(d.shouldPay) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- WeChat Group Copyable Snippet -->
          <div class="wechat-copy-card">
            <div class="wechat-head">
              <span class="wechat-title">
                💬 {{ isEn ? 'One-Click Group Chat AA Bill Notice' : '微信群收款 AA 账单透明公示文案（一键复制发群里）' }}
              </span>
              <button type="button" class="btn-copy-wechat" @click="copyWechatBill">
                {{
                  copySuccess
                    ? isEn
                      ? '✅ Copied!'
                      : '✅ 已复制，快去群里粘贴吧！'
                    : isEn
                      ? '📋 Copy Group Bill Text'
                      : '📋 一键复制群收款明细'
                }}
              </button>
            </div>
            <pre class="wechat-pre">{{ wechatBillText }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.discount-splitter-tool {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.mode-switcher {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 14px;
  background: var(--bg-surface);
  border: 2px solid var(--border-color);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-border);
  }

  &.active {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
}

.tab-icon {
  font-size: 26px;
  flex-shrink: 0;
}

.tab-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tab-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
}

.tab-sub {
  font-size: 12px;
  color: var(--text-secondary);
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
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--border-color);
}

.panel-title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.add-btn-group {
  display: flex;
  gap: 6px;
}

.btn-add {
  padding: 5px 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);

  &.filler {
    border-color: rgba(245, 158, 11, 0.4);
    background: rgba(245, 158, 11, 0.12);
    color: #d97706;
  }
}

.cart-list,
.diner-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cart-row {
  padding: 12px;
  border-radius: 12px;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 10px;

  &.is-filler {
    border-style: dashed;
    border-color: rgba(245, 158, 11, 0.55);
  }
}

.cart-row-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-toggle {
  padding: 4px 9px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  white-space: nowrap;

  &.keep {
    background: var(--accent);
    color: #fff;
  }

  &.filler {
    background: rgba(245, 158, 11, 0.2);
    color: #d97706;
    border: 1px solid rgba(245, 158, 11, 0.45);
  }
}

.item-name-input,
.diner-name-input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  outline: none;
}

.btn-del {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  padding: 4px 6px;

  &:hover {
    color: #dc2626;
  }
}

.cart-row-inputs,
.takeout-inputs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
}

.mini-field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  input {
    padding: 7px 10px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 700;
    outline: none;

    &:focus {
      border-color: var(--accent);
    }
  }

  &.highlight-field input {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
}

.rules-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
}

.rule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
}

.rule-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;

  input {
    accent-color: var(--accent);
  }
}

.rule-inline-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.inline-num {
  width: 68px;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

.preset-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mini-pill {
  padding: 4px 9px;
  border-radius: 6px;
  font-size: 11.5px;
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

/* Right Panel */
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
  font-size: 11.5px;
  font-weight: 800;
  color: var(--accent);
}

.hero-amount {
  font-size: 30px;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);
  margin-top: 4px;
}

.savings-pill-box {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 10px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.s-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
}

.s-val {
  font-size: 16px;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  color: #059669;
}

.checkout-flow-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
}

.flow-step {
  padding: 9px 11px;
  border-radius: 10px;
  background: var(--bg-muted);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.f-label {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.f-val {
  font-size: 14.5px;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);

  &.refund-color {
    color: #059669;
  }

  &.muted {
    color: var(--text-secondary);
    text-decoration: line-through;
  }
}

.tier-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--accent-soft);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--accent);
}

.gap-hint {
  color: #d97706;
}

.proration-card,
.wechat-copy-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
}

.table-scroll {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 10px 10px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  th {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-secondary);
    background: var(--bg-muted);
  }

  tr.filler-row {
    background: rgba(245, 158, 11, 0.06);
  }
}

.row-item-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.role-dot {
  font-size: 10.5px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;

  &.keep {
    background: var(--accent-soft);
    color: var(--accent);
  }

  &.filler {
    background: rgba(245, 158, 11, 0.2);
    color: #d97706;
  }
}

.row-name {
  font-weight: 600;
  color: var(--text-primary);
}

.mono {
  font-family: 'JetBrains Mono', monospace;
}

.mono-bold {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: var(--text-primary);
}

.saved-col {
  color: #059669;
  font-weight: 700;
}

.final-col {
  font-weight: 800;
  color: var(--accent);
  font-size: 14px;
}

.fold-tag {
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
}

/* Diner Row */
.diner-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
}

.diner-idx {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-secondary);
  width: 24px;
}

.diner-price-wrap {
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 7px;
  padding: 0 8px;
  width: 120px;

  .prefix {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-secondary);
    margin-right: 4px;
  }
}

.diner-price-input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 6px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  outline: none;
}

.sub-mode-pills {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.sub-pill {
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;

  &.active {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 700;
  }
}

.split-rule-toggle {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.wechat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.wechat-title {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.btn-copy-wechat {
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.wechat-pre {
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--text-primary);
  white-space: pre-wrap;
}
</style>
