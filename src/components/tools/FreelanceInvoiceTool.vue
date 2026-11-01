<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { AFFILIATE_LINKS, DIGITAL_PRODUCTS } from '@/consts';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

// --- Document Types / Stages ---
export type DocumentStage = 'quote' | 'sow' | 'invoice' | 'receipt';

interface StageMeta {
  key: DocumentStage;
  label: string;
  labelEn: string;
  badge: string;
  badgeEn: string;
  color: string;
  desc: string;
  descEn: string;
}

const STAGES: StageMeta[] = [
  {
    key: 'quote',
    label: '1. 项目报价单',
    labelEn: '1. Quote / Estimate',
    badge: 'ESTIMATE / 项目报价单',
    badgeEn: 'ESTIMATE / PROPOSAL',
    color: '#3b82f6',
    desc: '前期立项估价与意向报价，支持有效期与确认签字',
    descEn: 'Pre-project cost estimation with validity date and signature block',
  },
  {
    key: 'sow',
    label: '2. 服务确认单 (SOW)',
    labelEn: '2. Scope of Work (SOW)',
    badge: 'SCOPE OF WORK / 服务确认单',
    badgeEn: 'SCOPE OF WORK (SOW)',
    color: '#8b5cf6',
    desc: '交付物范围、阶段里程碑、验收标准与修改限制约定',
    descEn: 'Deliverables specification, acceptance criteria & revision limits',
  },
  {
    key: 'invoice',
    label: '3. 商业结算发票',
    labelEn: '3. Commercial Invoice',
    badge: 'PAYMENT DUE / 商业应付发票',
    badgeEn: 'PAYMENT DUE / INVOICE',
    color: '#f59e0b',
    desc: '交付验收结算账单，支持分期付款、税率折扣与电汇/多渠道收款',
    descEn: 'Post-delivery billing memo with milestone splits and wire details',
  },
  {
    key: 'receipt',
    label: '4. 已付款收据',
    labelEn: '4. Official Receipt',
    badge: 'PAID IN FULL / 款项已结清',
    badgeEn: 'PAID IN FULL / RECEIPT',
    color: '#10b981',
    desc: '跨境电汇/收款入账确认书，包含支付流水号与结清公章',
    descEn: 'Payment confirmation memo with transaction ID and green seal',
  },
];

// --- Currencies ---
interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  nameEn: string;
}

const CURRENCIES: CurrencyOption[] = [
  { code: 'CNY', symbol: '¥', name: '人民币 (CNY)', nameEn: 'Chinese Yuan (CNY)' },
  { code: 'USD', symbol: '$', name: '美元 (USD)', nameEn: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', name: '欧元 (EUR)', nameEn: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', name: '英镑 (GBP)', nameEn: 'British Pound (GBP)' },
  { code: 'JPY', symbol: '¥', name: '日元 (JPY)', nameEn: 'Japanese Yen (JPY)' },
  { code: 'USDT', symbol: '₮', name: '泰达币 (USDT)', nameEn: 'Tether (USDT)' },
  { code: 'USDC', symbol: '$', name: '美元稳定币 (USDC)', nameEn: 'USD Coin (USDC)' },
];

// --- Line Item Model ---
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

// --- Milestone Item Model ---
export interface MilestoneItem {
  id: string;
  label: string;
  percentage: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid';
}

// --- Bank Details ---
export interface BankDetails {
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  swiftBic: string;
  ibanRouting: string;
  bankAddress: string;
}

// --- Crypto Details ---
export interface CryptoDetails {
  enabled: boolean;
  network: string;
  token: string;
  walletAddress: string;
}

// --- Complete Invoice Schema ---
export interface InvoiceState {
  version: '1.0.0';
  lastModified: number;
  docType: DocumentStage;
  docNumber: string;
  issueDate: string;
  dueDate: string;
  validUntilDate: string;
  paidDate: string;
  transactionId: string;
  currency: string;
  issuer: {
    name: string;
    title: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    website: string;
  };
  client: {
    name: string;
    company: string;
    email: string;
    address: string;
    taxId: string;
  };
  items: LineItem[];
  taxRatePercent: number;
  taxLabel: string;
  discountPercent: number;
  enableMilestones: boolean;
  milestones: MilestoneItem[];
  customQrCodeUrl: string;
  paypalMe: string;
  bank: BankDetails;
  crypto: CryptoDetails;
  notes: string;
  terms: string;
}

// Default initial state
function createDefaultState(): InvoiceState {
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

  return {
    version: '1.0.0',
    lastModified: Date.now(),
    docType: 'invoice',
    docNumber: `INV-${new Date().getFullYear()}-001`,
    issueDate: today,
    dueDate: nextMonth,
    validUntilDate: nextMonth,
    paidDate: today,
    transactionId: `TXN-WISE-${Date.now().toString().slice(-6)}`,
    currency: 'USD',
    issuer: {
      name: '原心 (Yunsin)',
      title: 'Senior Full-Stack & Rust Wasm Engineer',
      company: 'Yunsin Tech Studio',
      email: 'yunsin@vip.qq.com',
      phone: '+86 138-0000-0000',
      address: 'Shenzhen, Guangdong, China',
      website: 'https://yunsin.top',
    },
    client: {
      name: 'Alex Johnson',
      company: 'Acme Global Ventures Ltd.',
      email: 'billing@acmeventures.io',
      address: '548 Market St, Suite 1200, San Francisco, CA 94104, USA',
      taxId: 'US-94-2391048',
    },
    items: [
      {
        id: '1',
        description: 'Astro 5.3 + Vue 3.5 纯客户端响应式工坊与高性能 Canvas 导出架构开发',
        quantity: 40,
        unit: '小时 (Hours)',
        unitPrice: 75,
      },
      {
        id: '2',
        description: 'Rust WebAssembly 图像编解码器集成与跨浏览器内存优化 (Zero Server Cost)',
        quantity: 20,
        unit: '小时 (Hours)',
        unitPrice: 90,
      },
      {
        id: '3',
        description: '国际化中英双语 SEO 结构化元数据注入与 Google Pagefind 离线检索优化',
        quantity: 1,
        unit: '项目 (Item)',
        unitPrice: 800,
      },
    ],
    taxRatePercent: 0,
    taxLabel: 'VAT / 增值税',
    discountPercent: 0,
    enableMilestones: true,
    milestones: [
      {
        id: 'm1',
        label: '50% 预付开工定金 (Upfront Deposit)',
        percentage: 50,
        amount: 2800,
        dueDate: today,
        status: 'paid',
      },
      {
        id: 'm2',
        label: '50% 终审验收尾款 (Final Completion)',
        percentage: 50,
        amount: 2800,
        dueDate: nextMonth,
        status: 'pending',
      },
    ],
    customQrCodeUrl: '',
    paypalMe: 'https://paypal.me/iamyunsin/1000USD',
    bank: {
      beneficiaryName: 'Yunsin Tech Studio',
      bankName: 'Wise Payments Ltd (Standard Federal/JP Morgan Chase)',
      accountNumber: '883901928301',
      swiftBic: 'TRWIBEB1',
      ibanRouting: '026073150',
      bankAddress: '56 Shoreditch High Street, London, E1 6JJ, United Kingdom',
    },
    crypto: {
      enabled: false,
      network: 'Ethereum (ERC20)',
      token: 'USDT',
      walletAddress: '0x71C678d3C1e39958043477114A3df84cB115306e',
    },
    notes: '感谢您的信任与合作！本项目源码交付已全部通过自动化测试与类型检查。',
    terms: '1. 款项结算需在到期日前电汇至指定账户。\n2. 逾期支付每日加收未付金额 0.05% 的滞纳金。\n3. Notice: This document is an informational commercial billing invoice issued for freelance memorandum and cross-border settlement purposes. It does not constitute a certified tax receipt or official government fiscal assessment.',
  };
}

const STORAGE_KEY = 'yunsin_freelance_invoice_state_v1';
const invoice = ref<InvoiceState>(createDefaultState());
const autoSaveStatus = ref<string>('就绪 / Ready');

// Load from LocalStorage on mount
onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.version === '1.0.0') {
        invoice.value = parsed;
        autoSaveStatus.value = isEn.value ? 'Restored from local browser' : '已自动载入本地存档';
      }
    }
  } catch (e) {
    console.error('Failed to load local invoice state:', e);
  }
});

// Debounced auto-save to LocalStorage (300ms)
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
watch(
  invoice,
  (newVal) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    autoSaveStatus.value = isEn.value ? 'Saving...' : '保存中...';
    saveTimeout = setTimeout(() => {
      try {
        newVal.lastModified = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
        const timeStr = new Date().toLocaleTimeString();
        autoSaveStatus.value = isEn.value ? `Auto-saved (${timeStr})` : `已自动保存到本地 (${timeStr})`;
      } catch (err) {
        console.error('Failed to auto-save to localStorage:', err);
      }
    }, 300);
  },
  { deep: true }
);

// --- Financial Calculations ---
const subtotal = computed(() => {
  return invoice.value.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice || 0), 0);
});

const discountAmount = computed(() => {
  const pct = Math.max(0, Math.min(100, invoice.value.discountPercent || 0));
  return subtotal.value * (pct / 100);
});

const taxableAmount = computed(() => {
  return Math.max(0, subtotal.value - discountAmount.value);
});

const taxAmount = computed(() => {
  const rate = Math.max(0, invoice.value.taxRatePercent || 0);
  return taxableAmount.value * (rate / 100);
});

const totalDue = computed(() => {
  return taxableAmount.value + taxAmount.value;
});

// Update milestones when totalDue changes
watch(totalDue, (newTotal) => {
  if (invoice.value.enableMilestones && invoice.value.milestones.length > 0) {
    for (const m of invoice.value.milestones) {
      m.amount = Math.round(newTotal * (m.percentage / 100) * 100) / 100;
    }
  }
});

// Currency Symbol
const currentCurrencySymbol = computed(() => {
  const found = CURRENCIES.find((c) => c.code === invoice.value.currency);
  return found ? found.symbol : '$';
});

// Current Stage Meta
const currentStage = computed<StageMeta>(() => {
  const found = STAGES.find((s) => s.key === invoice.value.docType);
  return found || STAGES[2];
});

// --- Chinese Uppercase Amount (人民币大写金额) ---
function toChineseRmb(n: number): string {
  if (isNaN(n) || n === 0) return '零元整';
  const fraction = ['角', '分'];
  const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const unit = [
    ['元', '万', '亿'],
    ['', '拾', '佰', '仟'],
  ];
  const head = n < 0 ? '欠' : '';
  n = Math.abs(n);
  let s = '';
  for (let i = 0; i < fraction.length; i++) {
    s += (digit[Math.floor(n * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
  }
  s = s || '整';
  n = Math.floor(n);
  for (let i = 0; i < unit[0].length && n > 0; i++) {
    let p = '';
    for (let j = 0; j < unit[1].length && n > 0; j++) {
      p = digit[n % 10] + unit[1][j] + p;
      n = Math.floor(n / 10);
    }
    s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
  }
  return head + s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
}

// --- English Currency Words ---
function toEnglishWords(n: number, currency: string = 'USD'): string {
  if (isNaN(n) || n === 0) return 'Zero Dollars Only';
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion'];

  function convertHundreds(num: number): string {
    let str = '';
    if (num >= 100) {
      str += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + (num % 10 > 0 ? '-' + ones[num % 10] : '') + ' ';
    } else if (num > 0) {
      str += ones[num] + ' ';
    }
    return str.trim();
  }

  const intPart = Math.floor(Math.abs(n));
  const cents = Math.round((Math.abs(n) - intPart) * 100);

  if (intPart === 0 && cents === 0) return 'Zero Only';

  let words = '';
  let temp = intPart;
  let scaleIdx = 0;

  while (temp > 0) {
    const chunk = temp % 1000;
    if (chunk > 0) {
      const chunkStr = convertHundreds(chunk);
      words = chunkStr + (scales[scaleIdx] ? ' ' + scales[scaleIdx] : '') + (words ? ' ' + words : '');
    }
    temp = Math.floor(temp / 1000);
    scaleIdx++;
  }

  const currName = currency === 'USD' ? 'US Dollars' : currency === 'EUR' ? 'Euros' : currency === 'GBP' ? 'Pounds' : currency === 'CNY' ? 'Yuan' : 'Units';
  let result = words + ' ' + currName;
  if (cents > 0) {
    result += ` and ${convertHundreds(cents)} Cents`;
  }
  return result.trim() + ' Only';
}

const chineseAmountWords = computed(() => toChineseRmb(totalDue.value));
const englishAmountWords = computed(() => toEnglishWords(totalDue.value, invoice.value.currency));

// --- Embedded Pure TypeScript QR Code Matrix Generator (Zero External Dependency) ---
function generateQrMatrix(text: string): boolean[][] {
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = val;
    EXP[i + 255] = val;
    LOG[val] = i;
    val = (val << 1) ^ (val >= 128 ? 0x11d : 0);
  }

  function gfMul(x: number, y: number): number {
    if (x === 0 || y === 0) return 0;
    return EXP[LOG[x] + LOG[y]];
  }

  function polyMul(p: Uint8Array, q: Uint8Array): Uint8Array {
    const res = new Uint8Array(p.length + q.length - 1);
    for (let i = 0; i < p.length; i++) {
      for (let j = 0; j < q.length; j++) {
        res[i + j] ^= gfMul(p[i], q[j]);
      }
    }
    return res;
  }

  function rsGenPoly(degree: number): Uint8Array {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < degree; i++) {
      poly = polyMul(poly, new Uint8Array([1, EXP[i]]));
    }
    return poly;
  }

  const VERSION_SPECS = [
    null,
    { version: 1, totalData: 16, ecBytes: 10, g1Blocks: 1, g1Data: 16, g2Blocks: 0, g2Data: 0, size: 21, align: [] as number[] },
    { version: 2, totalData: 28, ecBytes: 16, g1Blocks: 1, g1Data: 28, g2Blocks: 0, g2Data: 0, size: 25, align: [6, 18] },
    { version: 3, totalData: 44, ecBytes: 26, g1Blocks: 1, g1Data: 44, g2Blocks: 0, g2Data: 0, size: 29, align: [6, 22] },
    { version: 4, totalData: 64, ecBytes: 18, g1Blocks: 2, g1Data: 32, g2Blocks: 0, g2Data: 0, size: 33, align: [6, 26] },
    { version: 5, totalData: 86, ecBytes: 24, g1Blocks: 2, g1Data: 43, g2Blocks: 0, g2Data: 0, size: 37, align: [6, 30] },
    { version: 6, totalData: 108, ecBytes: 16, g1Blocks: 4, g1Data: 27, g2Blocks: 0, g2Data: 0, size: 41, align: [6, 34] },
    { version: 7, totalData: 124, ecBytes: 18, g1Blocks: 4, g1Data: 31, g2Blocks: 0, g2Data: 0, size: 45, align: [6, 22, 38] },
  ];

  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(text);
  let chosenSpec = null;
  for (let v = 1; v <= 7; v++) {
    const spec = VERSION_SPECS[v]!;
    const countBits = 8;
    const requiredBits = 4 + countBits + utf8Bytes.length * 8;
    if (requiredBits <= spec.totalData * 8) {
      chosenSpec = spec;
      break;
    }
  }

  if (!chosenSpec) {
    chosenSpec = VERSION_SPECS[7]!;
  }

  const bits: number[] = [];
  function pushBits(v: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((v >> i) & 1);
    }
  }

  // Byte mode
  pushBits(0b0100, 4);
  pushBits(utf8Bytes.length, 8);
  for (let i = 0; i < utf8Bytes.length; i++) {
    pushBits(utf8Bytes[i], 8);
  }

  const maxBits = chosenSpec.totalData * 8;
  const termBits = Math.min(4, maxBits - bits.length);
  pushBits(0, termBits);
  while (bits.length % 8 !== 0) bits.push(0);

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataBytes = new Uint8Array(chosenSpec.totalData);
  for (let i = 0; i < chosenSpec.totalData; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j];
    }
    dataBytes[i] = b;
  }

  const numBlocks = chosenSpec.g1Blocks + chosenSpec.g2Blocks;
  const blocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  const gen = rsGenPoly(chosenSpec.ecBytes);

  let byteOffset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const isGroup2 = b >= chosenSpec.g1Blocks;
    const blockSize = isGroup2 ? chosenSpec.g2Data : chosenSpec.g1Data;
    const blockData = dataBytes.subarray(byteOffset, byteOffset + blockSize);
    byteOffset += blockSize;
    blocks.push(blockData);

    const ec = new Uint8Array(chosenSpec.ecBytes);
    for (let i = 0; i < blockData.length; i++) {
      const factor = blockData[i] ^ ec[0];
      ec.copyWithin(0, 1);
      ec[chosenSpec.ecBytes - 1] = 0;
      for (let j = 0; j < chosenSpec.ecBytes; j++) {
        ec[j] ^= gfMul(gen[j + 1], factor);
      }
    }
    ecBlocks.push(ec);
  }

  const finalSequence: number[] = [];
  const maxBlockLen = chosenSpec.g2Blocks > 0 ? chosenSpec.g2Data : chosenSpec.g1Data;
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < blocks[b].length) {
        finalSequence.push(blocks[b][i]);
      }
    }
  }
  for (let i = 0; i < chosenSpec.ecBytes; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalSequence.push(ecBlocks[b][i]);
    }
  }

  const size = chosenSpec.size;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunction(r: number, c: number, v: boolean) {
    matrix[r][c] = v;
    isFunction[r][c] = true;
  }

  function drawFinder(row: number, col: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setFunction(row + r, col + c, isBorder || isCenter);
      }
    }
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (!isFunction[nr][nc]) setFunction(nr, nc, false);
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunction(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setFunction(i, 6, i % 2 === 0);
  }

  for (const ar of chosenSpec.align) {
    for (const ac of chosenSpec.align) {
      if (isFunction[ar][ac]) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2;
          const isCenter = r === 0 && c === 0;
          setFunction(ar + r, ac + c, isEdge || isCenter);
        }
      }
    }
  }

  setFunction(size - 8, 8, true);

  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
    if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = true;
  }

  let seqBitIdx = 0;
  const totalBits = finalSequence.length * 8;
  let dir = -1;
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--;
    const c1 = col;
    const c2 = col - 1;

    for (let r = 0; r < size; r++) {
      const row = dir === -1 ? size - 1 - r : r;
      for (const c of [c1, c2]) {
        if (!isFunction[row][c]) {
          let bit = false;
          if (seqBitIdx < totalBits) {
            const byteVal = finalSequence[Math.floor(seqBitIdx / 8)];
            const bitOffset = 7 - (seqBitIdx % 8);
            bit = ((byteVal >> bitOffset) & 1) === 1;
            seqBitIdx++;
          }
          if ((row + c) % 2 === 0) bit = !bit;
          matrix[row][c] = bit;
        }
      }
    }
    dir = -dir;
    col -= 2;
  }

  const formatBits = 0x5412;
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> (14 - i)) & 1) === 1;
    if (i <= 5) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix;
}

// Dynamic QR Matrix
const dynamicQrText = computed(() => {
  if (invoice.value.crypto.enabled && invoice.value.crypto.walletAddress) {
    return invoice.value.crypto.walletAddress;
  }
  return invoice.value.paypalMe || 'https://paypal.me/iamyunsin';
});

const qrMatrix = computed(() => {
  try {
    return generateQrMatrix(dynamicQrText.value);
  } catch (e) {
    return [];
  }
});

// --- Custom QR Upload ---
const fileInputRef = ref<HTMLInputElement | null>(null);

function onUploadCustomQr(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    if (e.target?.result) {
      invoice.value.customQrCodeUrl = e.target.result as string;
    }
  };
  reader.readAsDataURL(file);
}

function clearCustomQr() {
  invoice.value.customQrCodeUrl = '';
  if (fileInputRef.value) fileInputRef.value.value = '';
}

// --- Line Items Handlers ---
function addLineItem() {
  invoice.value.items.push({
    id: Date.now().toString(),
    description: isEn.value ? 'New Service / Deliverable' : '新增技术服务或开发交付物',
    quantity: 1,
    unit: isEn.value ? 'Item' : '项',
    unitPrice: 100,
  });
}

function removeLineItem(index: number) {
  if (invoice.value.items.length <= 1) return;
  invoice.value.items.splice(index, 1);
}

// --- Milestone Preset Handlers ---
function applyMilestonePreset(preset: '50-50' | '30-40-30' | '100') {
  invoice.value.enableMilestones = true;
  const today = invoice.value.issueDate;
  const due = invoice.value.dueDate;

  if (preset === '50-50') {
    invoice.value.milestones = [
      {
        id: 'm1',
        label: isEn.value ? '50% Upfront Deposit' : '50% 预付开工定金',
        percentage: 50,
        amount: Math.round(totalDue.value * 0.5 * 100) / 100,
        dueDate: today,
        status: 'paid',
      },
      {
        id: 'm2',
        label: isEn.value ? '50% Final Acceptance & Delivery' : '50% 终审验收上线款',
        percentage: 50,
        amount: Math.round(totalDue.value * 0.5 * 100) / 100,
        dueDate: due,
        status: 'pending',
      },
    ];
  } else if (preset === '30-40-30') {
    invoice.value.milestones = [
      {
        id: 'm1',
        label: isEn.value ? '30% Project Kickoff' : '30% 项目立项定金',
        percentage: 30,
        amount: Math.round(totalDue.value * 0.3 * 100) / 100,
        dueDate: today,
        status: 'paid',
      },
      {
        id: 'm2',
        label: isEn.value ? '40% Midterm Milestone Delivery' : '40% 中期架构交付评审',
        percentage: 40,
        amount: Math.round(totalDue.value * 0.4 * 100) / 100,
        dueDate: due,
        status: 'pending',
      },
      {
        id: 'm3',
        label: isEn.value ? '30% Final Handover & Deployment' : '30% 终审上线交付尾款',
        percentage: 30,
        amount: Math.round(totalDue.value * 0.3 * 100) / 100,
        dueDate: due,
        status: 'pending',
      },
    ];
  } else if (preset === '100') {
    invoice.value.milestones = [
      {
        id: 'm1',
        label: isEn.value ? '100% Full Payment in Advance' : '100% 一次性预付全款',
        percentage: 100,
        amount: totalDue.value,
        dueDate: today,
        status: 'pending',
      },
    ];
  }
}

// --- Industry Presets ---
function applyIndustryPreset(presetIndex: number) {
  if (presetIndex === 0) {
    // Full-stack Web Development
    invoice.value.items = [
      {
        id: '1',
        description: 'Astro 5.3 + Vue 3 纯前端微工坊核心架构设计与开发',
        quantity: 36,
        unit: '小时 (Hours)',
        unitPrice: 80,
      },
      {
        id: '2',
        description: 'Rust Wasm 离线高性能计算与图像处理模块集成',
        quantity: 18,
        unit: '小时 (Hours)',
        unitPrice: 95,
      },
      {
        id: '3',
        description: '双语国际化 SEO 架构、移动端响应式与 Lighthouse 100 优化',
        quantity: 1,
        unit: '阶段 (Phase)',
        unitPrice: 650,
      },
    ];
    invoice.value.currency = 'USD';
  } else if (presetIndex === 1) {
    // UI/UX Design System
    invoice.value.items = [
      {
        id: '1',
        description: 'Figma 响应式高保真原型设计 (桌面端 + 移动端 20+ 页面)',
        quantity: 1,
        unit: '套 (Set)',
        unitPrice: 2400,
      },
      {
        id: '2',
        description: 'Design System 规范文档、色彩变量与 Tailwind/UnoCSS Token',
        quantity: 1,
        unit: '系统 (System)',
        unitPrice: 1200,
      },
    ];
    invoice.value.currency = 'USD';
  } else if (presetIndex === 2) {
    // Technical Writing & Consulting
    invoice.value.items = [
      {
        id: '1',
        description: '深度技术架构剖析长文撰写 (WebAssembly / Performance, 4,000+ Words)',
        quantity: 3,
        unit: '篇 (Articles)',
        unitPrice: 600,
      },
      {
        id: '2',
        description: '开源项目海外传播、Hacker News 与 Twitter 技术推文全案策划',
        quantity: 1,
        unit: '案 (Campaign)',
        unitPrice: 850,
      },
    ];
    invoice.value.currency = 'USD';
  } else if (presetIndex === 3) {
    // Web3 / Smart Contract Audit
    invoice.value.items = [
      {
        id: '1',
        description: 'Solidity / EVM 智能合约安全审计与重入漏洞排查报告',
        quantity: 1,
        unit: '审计报告 (Audit)',
        unitPrice: 3500,
      },
      {
        id: '2',
        description: 'Foundry 单元测试套件重构与 Gas 优化方案落地',
        quantity: 24,
        unit: '小时 (Hours)',
        unitPrice: 120,
      },
    ];
    invoice.value.currency = 'USDT';
    invoice.value.crypto.enabled = true;
  }
}

// --- JSON Backup Export & Restore ---
function exportJsonBackup() {
  const jsonStr = JSON.stringify(invoice.value, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${invoice.value.docNumber}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const jsonUploadInputRef = ref<HTMLInputElement | null>(null);

function importJsonBackup(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      if (data && data.version === '1.0.0') {
        invoice.value = data;
        alert(isEn.value ? 'Invoice restored successfully!' : '发票备份数据恢复成功！');
      } else {
        alert(isEn.value ? 'Invalid backup file format' : '备份文件格式不兼容');
      }
    } catch (err) {
      alert(isEn.value ? 'Failed to parse JSON file' : '解析 JSON 文件失败');
    }
  };
  reader.readAsText(file);
}

// --- Native Print & PDF Trigger ---
function printInvoice() {
  window.print();
}

// --- Tier 2 Legal Contract Pack Drawer Modal ---
const showLegalModal = ref<boolean>(false);
const checkoutNotice = ref<string>('');

function handleDigitalCheckout(url: string, ev: MouseEvent) {
  if (!url || url.includes('placeholder') || url.includes('PLACEHOLDER')) {
    ev.preventDefault();
    checkoutNotice.value = isEn.value
      ? '📦 This legal contract pack is currently being packaged for release. Stay tuned!'
      : '📦 该双语外包服务合同与催款话术包正在整理上架中，敬请期待！';
    setTimeout(() => {
      checkoutNotice.value = '';
    }, 3500);
  }
}
</script>

<template>
  <div class="freelance-invoice-root">
    <!-- 1. Top Amber Compliance Alert Banner (Decree No. 764 Safeguard) -->
    <div class="no-print compliance-alert-banner">
      <div class="alert-icon">⚠️</div>
      <div class="alert-content">
        <div class="alert-title">
          {{
            isEn
              ? 'Legal Notice & Decree No. 764 Compliance Disclaimer'
              : '法律效力特别声明 · 《中华人民共和国发票管理办法》（国务院令第764号）合规告知'
          }}
        </div>
        <div class="alert-text">
          {{
            isEn
              ? 'This tool generates Commercial Invoices, Pro-forma Billing Memos, Quotes, and Receipts for international freelance settlements, cross-border wire verification, and civil contract performance. It is strictly NOT an official VAT Fapiao or statutory government tax receipt in China. Chinese domestic tax compliance must be performed via the State Taxation Administration e-tax system.'
              : '本工具生成的单据性质属于国际商业结算备忘单据（Commercial Invoice / Pro-forma Invoice / Receipt），专用于自由职业者与境外企业之间的劳务明细确认、外汇电汇（如 Wise、Stripe、银行国际电汇）付款对账或民商事履约凭据。本工具生成的单据绝非《发票管理办法》规定的增值税专用发票、增值税普通发票或全电发票，不具备中国境内税务抵扣、成本列支或法定报销效力。境内用户请依法通过国家税务总局电子税务局开具正式合规发票并申报纳税。'
          }}
        </div>
      </div>
    </div>

    <!-- Action Bar & Controls Header -->
    <div class="no-print action-toolbar">
      <div class="toolbar-left">
        <!-- Stage State Machine Selector -->
        <div class="stage-tabs">
          <button
            v-for="st in STAGES"
            :key="st.key"
            type="button"
            class="stage-tab-btn"
            :class="{ active: invoice.docType === st.key }"
            @click="invoice.docType = st.key"
          >
            <span>{{ isEn ? st.labelEn : st.label }}</span>
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- Storage Indicator -->
        <span class="auto-save-pill">
          <span class="dot-green"></span>
          {{ autoSaveStatus }}
        </span>

        <!-- Print / PDF -->
        <button
          type="button"
          class="btn-primary print-trigger-btn"
          @click="printInvoice"
        >
          <span>🖨️</span>
          <span>{{ isEn ? 'Print / Save as PDF' : '打印 / 导出矢量 A4 PDF' }}</span>
        </button>

        <!-- JSON Backup Dropdown -->
        <button
          type="button"
          class="btn-secondary"
          @click="exportJsonBackup"
        >
          <span>💾</span>
          <span>{{ isEn ? 'Export JSON' : '备份 JSON' }}</span>
        </button>

        <label class="btn-ghost file-upload-btn">
          <span>📂</span>
          <span>{{ isEn ? 'Restore' : '导入备份' }}</span>
          <input
            ref="jsonUploadInputRef"
            type="file"
            accept=".json"
            class="hidden"
            @change="importJsonBackup"
          />
        </label>
      </div>
    </div>

    <!-- Industry Quick Presets & Monetization Bar -->
    <div class="no-print presets-bar">
      <div class="presets-row flex items-center">
        <span class="preset-label font-bold text-gray-400">
          {{ isEn ? 'Quick Industry Presets:' : '快速行业范本预设:' }}
        </span>
        <div class="preset-buttons">
          <button type="button" class="preset-tag" @click="applyIndustryPreset(0)">
            💻 {{ isEn ? 'Full-Stack Web Dev' : '全栈开发交付' }}
          </button>
          <button type="button" class="preset-tag" @click="applyIndustryPreset(1)">
            🎨 {{ isEn ? 'UI/UX Design System' : 'UI/UX 界面设计' }}
          </button>
          <button type="button" class="preset-tag" @click="applyIndustryPreset(2)">
            ✍️ {{ isEn ? 'Tech Writing & Advisory' : '技术写作与出海咨询' }}
          </button>
          <button type="button" class="preset-tag" @click="applyIndustryPreset(3)">
            🛡️ {{ isEn ? 'Web3 Smart Contract Audit' : 'Web3 智能合约审计' }}
          </button>
        </div>
      </div>

      <!-- Free Legal Clause Reference & WeChat Reward Drawer Trigger -->
      <button
        type="button"
        class="contract-pack-trigger"
        @click="showLegalModal = true"
      >
        <span>☕</span>
        <span>{{ isEn ? 'Free Anti-Default Clauses & Buy a Coffee' : '防拖欠核心条款参考 · 请作者喝杯咖啡' }}</span>
      </button>
    </div>

    <!-- MAIN INVOICE PAPER (WYSIWYG EDITABLE & PRINT TARGET) -->
    <div class="invoice-paper-container">
      <div class="invoice-paper">
        <!-- 1. Document Header -->
        <div class="invoice-header print-avoid-break">
          <div class="header-left">
            <input
              v-model="invoice.issuer.company"
              type="text"
              class="editable-h1"
              placeholder="您的工作室 / 公司名称"
            />
            <input
              v-model="invoice.issuer.name"
              type="text"
              class="editable-text-bold"
              placeholder="您的姓名"
            />
            <input
              v-model="invoice.issuer.title"
              type="text"
              class="editable-text text-muted"
              placeholder="您的职位头衔 (如: Senior Full-Stack Engineer)"
            />
            <div class="meta-row">
              <input v-model="invoice.issuer.email" type="text" class="editable-mini" placeholder="邮箱" />
              <span>·</span>
              <input v-model="invoice.issuer.website" type="text" class="editable-mini" placeholder="个人网站 / 作品集" />
            </div>
            <input v-model="invoice.issuer.address" type="text" class="editable-mini text-muted" placeholder="地址 / 城市" />
          </div>

          <div class="header-right">
            <!-- Stage Status Badge -->
            <div
              class="doc-stage-badge"
              :style="{ borderColor: currentStage.color, color: currentStage.color }"
            >
              {{ isEn ? currentStage.badgeEn : currentStage.badge }}
            </div>

            <div class="doc-number-row">
              <label>{{ isEn ? 'Document #' : '单据编号' }}:</label>
              <input v-model="invoice.docNumber" type="text" class="doc-num-input" />
            </div>

            <div class="doc-date-row">
              <label>{{ isEn ? 'Issue Date' : '开具日期' }}:</label>
              <input v-model="invoice.issueDate" type="date" />
            </div>

            <div v-if="invoice.docType === 'quote'" class="doc-date-row">
              <label>{{ isEn ? 'Valid Until' : '报价有效期' }}:</label>
              <input v-model="invoice.validUntilDate" type="date" />
            </div>

            <div v-else-if="invoice.docType === 'receipt'" class="doc-date-row">
              <label>{{ isEn ? 'Paid Date' : '结清入账日期' }}:</label>
              <input v-model="invoice.paidDate" type="date" />
            </div>

            <div v-else class="doc-date-row">
              <label>{{ isEn ? 'Payment Due' : '付款截止日' }}:</label>
              <input v-model="invoice.dueDate" type="date" />
            </div>
          </div>
        </div>

        <!-- 2. Client Bill-To Section -->
        <div class="client-billto-section print-avoid-break">
          <div class="bill-to-box">
            <div class="box-label">{{ isEn ? 'BILLED TO / CLIENT DETAILS' : '客户信息 / 付款方信息' }}</div>
            <input
              v-model="invoice.client.company"
              type="text"
              class="editable-bold"
              placeholder="客户公司名称 (Client Company Name)"
            />
            <input
              v-model="invoice.client.name"
              type="text"
              class="editable-text"
              placeholder="客户联系人姓名 (Client Contact Name)"
            />
            <input
              v-model="invoice.client.email"
              type="text"
              class="editable-text text-muted"
              placeholder="客户财务 / 负责人邮箱"
            />
            <input
              v-model="invoice.client.address"
              type="text"
              class="editable-text text-muted"
              placeholder="客户注册经营地址 (Address, City, Country)"
            />
            <div class="tax-id-row flex items-center">
              <span class="tax-id-label text-muted">{{ isEn ? 'Tax / VAT ID:' : '税号 / 统一信用代码:' }}</span>
              <input v-model="invoice.client.taxId" type="text" class="editable-mini" placeholder="可选 (Optional)" />
            </div>
          </div>

          <div class="currency-selector-box no-print">
            <div class="box-label">{{ isEn ? 'SETTLEMENT CURRENCY' : '结算币种与汇率设置' }}</div>
            <select v-model="invoice.currency" class="currency-select">
              <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">
                {{ isEn ? c.nameEn : c.name }}
              </option>
            </select>
            <p class="currency-hint">
              {{ isEn ? 'Supports cross-border wire & stablecoin invoicing' : '支持跨境商业电汇、PayPal 及 USDT/USDC 标价' }}
            </p>
          </div>
        </div>

        <!-- 3. Line Items Table -->
        <div class="table-container print-avoid-break">
          <table class="items-table">
            <thead>
              <tr>
                <th class="col-desc">{{ isEn ? 'Description / Deliverables' : '项目明细 / 交付物说明' }}</th>
                <th class="col-qty">{{ isEn ? 'Qty' : '数量' }}</th>
                <th class="col-unit">{{ isEn ? 'Unit' : '单位' }}</th>
                <th class="col-price">{{ isEn ? 'Unit Price' : '单价' }} ({{ currentCurrencySymbol }})</th>
                <th class="col-amount">{{ isEn ? 'Total' : '金额' }} ({{ currentCurrencySymbol }})</th>
                <th class="col-actions no-print"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in invoice.items" :key="item.id" class="invoice-item-row">
                <td class="col-desc">
                  <textarea
                    v-model="item.description"
                    rows="2"
                    class="item-desc-input"
                    placeholder="输入交付物与服务说明..."
                  ></textarea>
                </td>
                <td class="col-qty">
                  <input v-model.number="item.quantity" type="number" min="1" step="0.5" class="item-num-input" />
                </td>
                <td class="col-unit">
                  <input v-model="item.unit" type="text" class="item-unit-input" />
                </td>
                <td class="col-price">
                  <input v-model.number="item.unitPrice" type="number" min="0" step="1" class="item-num-input" />
                </td>
                <td class="col-amount font-mono font-bold">
                  {{ currentCurrencySymbol }}{{ (item.quantity * item.unitPrice || 0).toFixed(2) }}
                </td>
                <td class="col-actions no-print">
                  <button
                    type="button"
                    class="del-item-btn"
                    title="删除行"
                    @click="removeLineItem(index)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="no-print add-item-row">
            <button type="button" class="add-row-btn" @click="addLineItem">
              <span>＋</span>
              <span>{{ isEn ? 'Add Line Item' : '添加服务明细项目' }}</span>
            </button>
          </div>
        </div>

        <!-- 4. Summary & Uppercase Calculation -->
        <div class="summary-section print-avoid-break">
          <!-- Left: Chinese Uppercase & English In Words -->
          <div class="amount-words-box">
            <div class="words-title">{{ isEn ? 'AMOUNT IN WORDS' : '大写金额核验 (防止篡改与电汇对照)' }}</div>
            <div class="chinese-words font-bold">{{ chineseAmountWords }}</div>
            <div class="english-words font-mono text-muted">{{ englishAmountWords }}</div>

            <!-- Receipt Stamp Seal (Visible in receipt stage) -->
            <div v-if="invoice.docType === 'receipt'" class="paid-stamp-seal">
              <div class="stamp-inner">
                <div class="stamp-text-top">OFFICIAL RECEIPT</div>
                <div class="stamp-text-center">PAID IN FULL</div>
                <div class="stamp-text-bottom">{{ invoice.paidDate }} · YUNSIN</div>
              </div>
            </div>
          </div>

          <!-- Right: Math Summary -->
          <div class="math-summary-box">
            <div class="summary-row">
              <span>{{ isEn ? 'Subtotal' : '项目小计' }}:</span>
              <span class="font-mono">{{ currentCurrencySymbol }}{{ subtotal.toFixed(2) }}</span>
            </div>

            <div class="summary-row">
              <div class="flex items-center gap-1">
                <span>{{ isEn ? 'Discount' : '商务折扣' }}</span>
                <input
                  v-model.number="invoice.discountPercent"
                  type="number"
                  min="0"
                  max="100"
                  class="mini-percent-input no-print"
                />
                <span>%:</span>
              </div>
              <span class="font-mono text-emerald-600">-{{ currentCurrencySymbol }}{{ discountAmount.toFixed(2) }}</span>
            </div>

            <div class="summary-row">
              <div class="flex items-center gap-1">
                <input v-model="invoice.taxLabel" type="text" class="mini-label-input no-print" />
                <input
                  v-model.number="invoice.taxRatePercent"
                  type="number"
                  min="0"
                  max="100"
                  class="mini-percent-input no-print"
                />
                <span>%:</span>
              </div>
              <span class="font-mono">+{{ currentCurrencySymbol }}{{ taxAmount.toFixed(2) }}</span>
            </div>

            <div class="summary-total-row">
              <span class="total-label">{{ isEn ? 'Total Amount Due' : '应付款总额' }}:</span>
              <span class="total-amount font-mono">
                {{ currentCurrencySymbol }}{{ totalDue.toFixed(2) }} {{ invoice.currency }}
              </span>
            </div>
          </div>
        </div>

        <!-- 5. Milestone Payment Split (If Enabled) -->
        <div v-if="invoice.enableMilestones" class="milestones-section print-avoid-break">
          <div class="milestones-header">
            <div class="milestones-title font-bold">
              {{ isEn ? 'MILESTONE PAYMENT SCHEDULE' : '分期与里程碑付款安排' }}
            </div>
            <div class="milestone-presets no-print flex gap-2">
              <button type="button" class="mini-btn" @click="applyMilestonePreset('50-50')">50 / 50</button>
              <button type="button" class="mini-btn" @click="applyMilestonePreset('30-40-30')">30 / 40 / 30</button>
              <button type="button" class="mini-btn" @click="applyMilestonePreset('100')">100%</button>
            </div>
          </div>

          <div class="milestones-grid">
            <div
              v-for="m in invoice.milestones"
              :key="m.id"
              class="milestone-card"
              :class="{ 'status-paid': m.status === 'paid' }"
            >
              <div class="milestone-top">
                <input v-model="m.label" type="text" class="editable-mini font-bold" />
                <select v-model="m.status" class="status-select no-print">
                  <option value="pending">{{ isEn ? 'Pending' : '待支付' }}</option>
                  <option value="paid">{{ isEn ? 'Paid' : '已结清' }}</option>
                </select>
                <span class="print-only milestone-status-badge font-bold" :class="m.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'">
                  [{{ m.status === 'paid' ? 'PAID' : 'PENDING' }}]
                </span>
              </div>
              <div class="milestone-amount font-mono font-extrabold">
                {{ currentCurrencySymbol }}{{ m.amount.toFixed(2) }}
              </div>
              <div class="milestone-date text-muted">
                {{ isEn ? 'Due' : '截止' }}: {{ m.dueDate }} ({{ m.percentage }}%)
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Payment Details & QR Code Section -->
        <div class="payment-details-box print-avoid-break">
          <div class="payment-left">
            <div class="section-sub-title">
              {{ isEn ? 'PAYMENT INSTRUCTIONS & WIRE DETAILS' : '银行电汇与收款指引' }}
            </div>

            <!-- Bank Wire Details -->
            <div class="wire-details-grid">
              <div>
                <span class="wire-lbl">{{ isEn ? 'Beneficiary Name:' : '收款方姓名 / 开户公司:' }}</span>
                <input v-model="invoice.bank.beneficiaryName" type="text" class="wire-input font-bold" />
              </div>
              <div>
                <span class="wire-lbl">{{ isEn ? 'Bank Name:' : '开户银行:' }}</span>
                <input v-model="invoice.bank.bankName" type="text" class="wire-input" />
              </div>
              <div>
                <span class="wire-lbl">{{ isEn ? 'Account / IBAN:' : '银行账号 / IBAN:' }}</span>
                <input v-model="invoice.bank.accountNumber" type="text" class="wire-input font-mono font-bold" />
              </div>
              <div>
                <span class="wire-lbl">{{ isEn ? 'SWIFT / BIC:' : 'SWIFT / BIC 码:' }}</span>
                <input v-model="invoice.bank.swiftBic" type="text" class="wire-input font-mono" />
              </div>
              <div>
                <span class="wire-lbl">{{ isEn ? 'Routing / Sort Code:' : '支行路由代码 (Routing/Sort):' }}</span>
                <input v-model="invoice.bank.ibanRouting" type="text" class="wire-input font-mono" />
              </div>
              <div>
                <span class="wire-lbl">{{ isEn ? 'Bank Address:' : '银行机构地址:' }}</span>
                <input v-model="invoice.bank.bankAddress" type="text" class="wire-input" />
              </div>
            </div>

            <!-- Optional Crypto Payment Box -->
            <div v-if="invoice.crypto.enabled" class="crypto-box">
              <div class="crypto-title font-bold text-amber-500">
                ⚡ {{ isEn ? 'Cryptocurrency Stablecoin Payment:' : '加密货币稳定币收款 (免跨境汇损)' }}
              </div>
              <div class="crypto-address-row">
                <span class="crypto-net-label font-mono font-bold text-gray-700">{{ invoice.crypto.network }} ({{ invoice.crypto.token }}):</span>
                <input v-model="invoice.crypto.walletAddress" type="text" class="wire-input font-mono" />
              </div>
            </div>

            <!-- Notes & Terms -->
            <div class="notes-row">
              <label class="notes-label font-bold text-muted">{{ isEn ? 'Notes & Terms' : '单据备注与商业条款' }}:</label>
              <textarea v-model="invoice.terms" rows="3" class="terms-textarea"></textarea>
            </div>
          </div>

          <!-- Payment QR Code Right Side -->
          <div class="payment-right-qr">
            <!-- If custom uploaded QR exists -->
            <div v-if="invoice.customQrCodeUrl" class="qr-wrapper">
              <img :src="invoice.customQrCodeUrl" alt="Payment QR" class="uploaded-qr-img" />
              <div class="qr-label">{{ isEn ? 'Scan to Pay' : '扫码快速付款' }}</div>
              <button type="button" class="no-print remove-qr-btn" @click="clearCustomQr">✕ 清除</button>
            </div>

            <!-- Otherwise render dynamic vector SVG QR code (PayPal / Crypto) -->
            <div v-else class="qr-wrapper">
              <div class="dynamic-svg-qr">
                <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
                  <rect width="130" height="130" fill="#ffffff" />
                  <g v-if="qrMatrix.length > 0">
                    <template v-for="(row, r) in qrMatrix" :key="r">
                      <rect
                        v-for="(cell, c) in row"
                        v-show="cell"
                        :key="c"
                        :x="(c * (130 / qrMatrix.length)).toFixed(2)"
                        :y="(r * (130 / qrMatrix.length)).toFixed(2)"
                        :width="(130 / qrMatrix.length).toFixed(2)"
                        :height="(130 / qrMatrix.length).toFixed(2)"
                        fill="#111827"
                      />
                    </template>
                  </g>
                </svg>
              </div>
              <div class="qr-label">
                {{ invoice.crypto.enabled ? 'Scan Wallet / 扫码转账' : 'PayPal.me / 扫码支付' }}
              </div>

              <!-- Upload Custom QR Button (no-print) -->
              <label class="no-print upload-qr-btn">
                <span>📷 {{ isEn ? 'Upload QR' : '上传微信/支付宝码' }}</span>
                <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onUploadCustomQr" />
              </label>
            </div>
          </div>
        </div>

        <!-- 7. Signature Sign-off (Quote / SOW Mode) -->
        <div v-if="invoice.docType === 'quote' || invoice.docType === 'sow'" class="signature-section print-avoid-break">
          <div class="sign-box">
            <div class="sign-line"></div>
            <div class="sign-label">{{ isEn ? 'Service Provider Signature' : '服务方签署 (Authorized Provider)' }}</div>
          </div>
          <div class="sign-box">
            <div class="sign-line"></div>
            <div class="sign-label">{{ isEn ? 'Client Acceptance Signature' : '客户确认盖章 / 签字 (Client Acceptance)' }}</div>
          </div>
        </div>

        <!-- 8. PERMANENT 9pt LIGHT-GRAY VECTOR WATERMARK (Decree No. 764 Requirement) -->
        <div class="legal-watermark-footer">
          【商业结算形式对账凭单 · 非中国法定税务发票】Commercial Billing Memo Only · Not Official Tax Fapiao
        </div>
      </div>
    </div>

    <!-- Monetization Partner Affiliate Cards (Wise Business & Payoneer & OneKey) -->
    <div class="no-print affiliate-recommend-section">
      <div class="affiliate-title">
        <span>💡</span>
        <span>{{ isEn ? 'Recommended Cross-Border Financial Partners:' : '推荐自由职业者跨境外汇与低汇损工具:' }}</span>
      </div>

      <div class="affiliate-grid">
        <!-- Wise Business ($75 CPS) -->
        <div class="partner-card">
          <div class="partner-header">
            <div class="partner-logo">🟢 Wise</div>
            <div class="partner-badge">极力推荐</div>
          </div>
          <div class="partner-desc">
            {{
              isEn
                ? 'Wise Business multi-currency account. Receive USD, EUR, GBP fee-free with mid-market exchange rate.'
                : '跨境自由职业标配：开通 Wise 商业多币种账户，直接获取独立美元/欧元 IBAN，免手续费接收海外电汇，中间市场真实汇率结汇。'
            }}
          </div>
          <a
            :href="AFFILIATE_LINKS.wiseBusiness || 'https://wise.com/zh-cn/business/'"
            target="_blank"
            rel="noopener noreferrer"
            class="partner-btn"
          >
            {{ isEn ? 'Open Wise Business Account →' : '免费开通 Wise 商业账户 →' }}
          </a>
        </div>

        <!-- Payoneer -->
        <div class="partner-card">
          <div class="partner-header">
            <div class="partner-logo">🟠 Payoneer</div>
            <div class="partner-badge">满千送$25</div>
          </div>
          <div class="partner-desc">
            {{
              isEn
                ? 'Global payment collection platform. Fast withdrawals to local bank accounts across 190+ countries.'
                : '派安盈全球收款账户，支持 Upwork、Fiverr、GitHub Sponsors 收入结汇，直接提现至中国大陆个人银行卡。'
            }}
          </div>
          <a
            :href="AFFILIATE_LINKS.payoneer || 'https://www.payoneer.com.cn/'"
            target="_blank"
            rel="noopener noreferrer"
            class="partner-btn"
          >
            {{ isEn ? 'Register Payoneer Account →' : '注册派安盈领取奖励 →' }}
          </a>
        </div>

        <!-- OneKey Hardware Wallet (Crypto) -->
        <div class="partner-card">
          <div class="partner-header">
            <div class="partner-logo">🔐 OneKey 冷钱包</div>
            <div class="partner-badge">Web3 安全</div>
          </div>
          <div class="partner-desc">
            {{
              isEn
                ? 'Open-source hardware cold wallet. Safeguard your USDC / USDT stablecoin earnings from contract hacks.'
                : '开源硬件冷钱包，安全存储自由职业加密货币稳定币收入。私钥离线芯片物理签名，彻底防范网络钓鱼风险。'
            }}
          </div>
          <a
            :href="AFFILIATE_LINKS.ledger || 'https://onekey.so/r/T1HD5Q'"
            target="_blank"
            rel="noopener noreferrer"
            class="partner-btn"
          >
            {{ isEn ? 'Explore OneKey Wallet →' : '前往 OneKey 官网了解 →' }}
          </a>
        </div>
      </div>
    </div>

    <!-- Tier 2 Legal Contract Pack Drawer / Modal -->
    <div v-if="showLegalModal" class="template-modal-overlay no-print" @click.self="showLegalModal = false">
      <div class="template-modal-card">
        <div class="modal-header">
          <div class="modal-header-left flex items-center">
            <span class="modal-icon">⚖️</span>
            <h3 class="modal-title">
              {{ isEn ? 'Freelancer Bilingual Legal Contract & Demand Letter Pack' : '自由职业者标准双语外包服务合同范本与催款律师函话术包' }}
            </h3>
          </div>
          <button type="button" class="close-modal-btn" @click="showLegalModal = false">✕</button>
        </div>

        <div class="modal-body">
          <p class="modal-desc">
            {{
              isEn
                ? 'Protect your IP and stop client payment delays. Includes production-ready Word/PDF contracts vetted by commercial legal advisors.'
                : '由涉外商事合规律师团队校订。彻底终结“需求无底线蔓延”、“交付后客户拖欠尾款”、“知识产权归属不清”等自由职业痛点。'
            }}
          </p>

          <!-- 3 Critical Clauses Read-Only Preview -->
          <div class="clause-preview-box">
            <div class="clause-item">
              <div class="clause-badge">核心条款 1</div>
              <div class="clause-title">知识产权所有权转移与尾款结清生效条款 (IP Transfer Conditioned on Full Payment)</div>
              <div class="clause-text">
                “所有成果之著作权与知识产权仅在客户结清本项目全部款项（含尾款）之日起转移。任何款项结清前，客户仅享有受限之测试评审权，无权将成果投入商业运营，否则构成恶意侵权。”
              </div>
            </div>

            <div class="clause-item">
              <div class="clause-badge">核心条款 2</div>
              <div class="clause-title">需求蔓延控制与额外工时阶梯计费条款 (Scope Creep & Change Order Hourly Rate)</div>
              <div class="clause-text">
                “超出本 SOW 单据所列功能清单之额外修改，每次评审轮次不得超过 2 次；任何架构重构或新增需求，双方须签署《工程变更单 (Change Order)》，并按每工时 $80 / ¥500 阶梯另行计费。”
              </div>
            </div>

            <div class="clause-item">
              <div class="clause-badge">核心条款 3</div>
              <div class="clause-title">逾期滞纳金与阶梯式催款法律函告 (Late Payment Interest & Escalation Notice)</div>
              <div class="clause-text">
                “逾期超过 7 个工作日，按日加收 0.05% 违约金；逾期超过 14 日，服务方有权暂停代码运维并向客户注册地商业法庭提请仲裁与简易诉讼，诉讼费与律师代理费由违约方全额承担。”
              </div>
            </div>
          </div>

          <div class="checkout-actions-row" style="flex-direction: column; align-items: center; gap: 10px; margin-top: 16px;">
            <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary); text-align: center;">
              {{
                isEn
                  ? '☕ Found these billing templates & clauses helpful? Feel free to scan with WeChat to buy me a coffee!'
                  : '☕ 以上 3 大核心防拖欠条款供您免费复制入合同使用。若本工具帮您省下时间，欢迎微信扫码请作者喝杯咖啡！'
              }}
            </div>
            <img
              src="/site-images/wechat-reward.png"
              alt="原心 的赞赏码"
              style="width: 100%; max-width: 240px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);"
            />
          </div>

          <div class="legal-note">
            {{
              isEn
                ? '100% Pure Local Invoicing • Zero Server Uploads • Thank you for supporting indie open tools!'
                : '100% 浏览器本地制单 · 零服务器上传 · 感谢您的每一份鼓励与支持！'
            }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.freelance-invoice-root {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--text-primary);
  font-size: 14px;
}

/* Compliance Banner */
.compliance-alert-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 18px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 12px;
}

.alert-icon {
  font-size: 24px;
  line-height: 1;
}

.alert-title {
  font-size: 14.5px;
  font-weight: 800;
  color: #d97706;
}

.alert-text {
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-top: 4px;
}

/* Action Toolbar */
.action-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.stage-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-surface);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.stage-tab-btn {
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
  background: none;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.stage-tab-btn:hover {
  color: var(--text-primary);
}

.stage-tab-btn.active {
  background: var(--accent);
  color: #ffffff;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.auto-save-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-surface);
  padding: 5px 12px;
  border-radius: 9999px;
  border: 1px solid var(--border-color);
}

.dot-green {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--accent);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent-border);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-ghost:hover {
  color: var(--text-primary);
  border-color: var(--accent);
}

.hidden {
  display: none;
}

/* Presets Bar */
.presets-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.presets-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-muted);
}

.preset-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-tag {
  padding: 5px 11px;
  font-size: 12.5px;
  font-weight: 600;
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-tag:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.contract-pack-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.3);
  color: #a855f7;
  font-size: 12.5px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
}

/* Invoice Paper Container & Framing */
.invoice-paper-container {
  display: flex;
  justify-content: center;
  width: 100%;
  margin: 0;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.invoice-paper {
  width: 100%;
  max-width: 960px;
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 36px 40px;
  box-shadow: var(--shadow-md);
  font-size: 14px;
}

/* Header */
.invoice-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 2px solid var(--border-subtle);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.editable-h1 {
  font-size: 24px;
  font-weight: 900;
  color: var(--text-primary);
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
}

.editable-text-bold {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  border: none;
  background: transparent;
  outline: none;
}

.editable-text {
  font-size: 13.5px;
  color: var(--text-secondary);
  border: none;
  background: transparent;
  outline: none;
}

.editable-mini {
  font-size: 12.5px;
  color: var(--text-muted);
  border: none;
  background: transparent;
  outline: none;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 12.5px;
}

.doc-stage-badge {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 4px 12px;
  border: 2px solid;
  border-radius: 6px;
  text-transform: uppercase;
}

.doc-number-row,
.doc-date-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.doc-number-row label,
.doc-date-row label {
  font-weight: 600;
}

.doc-num-input,
.doc-date-row input {
  border: 1px solid var(--border-color);
  background: var(--bg-muted);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
}

/* Bill To Section */
.client-billto-section {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin: 24px 0;
}

.bill-to-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.box-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 6px;
}

.tax-id-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.tax-id-label {
  font-size: 12.5px;
  color: var(--text-muted);
}

.editable-bold {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-primary);
  border: none;
  background: transparent;
  outline: none;
}

.currency-selector-box {
  width: 220px;
}

.currency-select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  background: var(--bg-muted);
  color: var(--text-primary);
}

.currency-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Table */
.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th {
  text-align: left;
  padding: 10px 10px;
  border-bottom: 2px solid var(--border-color);
  font-size: 12.5px;
  font-weight: 800;
  color: var(--text-secondary);
  background: var(--bg-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.items-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: top;
  font-size: 13.5px;
}

.col-desc { width: 48%; }
.col-qty { width: 10%; text-align: center; }
.col-unit { width: 14%; text-align: center; }
.col-price { width: 14%; text-align: right; }
.col-amount {
  width: 14%;
  text-align: right;
  font-size: 14px !important;
  font-family: monospace;
  font-weight: 700;
}
.col-actions { width: 4%; text-align: center; }

.item-desc-input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13.5px;
  resize: vertical;
  color: var(--text-primary);
}

.item-num-input,
.item-unit-input {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  outline: none;
  text-align: inherit;
  font-size: 13.5px;
  padding: 3px 6px;
  border-radius: 4px;
  color: var(--text-primary);
}

.item-num-input:hover,
.item-unit-input:hover,
.item-desc-input:hover {
  background: var(--bg-muted);
}

.item-num-input:focus,
.item-unit-input:focus,
.item-desc-input:focus {
  background: var(--bg-muted);
  border-color: var(--accent);
}

.del-item-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
}

.add-item-row {
  margin-top: 8px;
  padding: 8px 0;
}

.add-row-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px dashed var(--border-color);
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-row-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

/* Summary */
.summary-section {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin: 24px 0;
  padding-top: 20px;
  border-top: 2px solid var(--border-subtle);
}

.amount-words-box {
  position: relative;
  flex: 1;
}

.words-title {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.chinese-words {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 4px;
}

.english-words {
  font-size: 12.5px;
  color: var(--text-muted);
  font-family: monospace;
  margin-top: 4px;
  line-height: 1.4;
}

.math-summary-box {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13.5px;
  color: var(--text-secondary);
}

.summary-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 2px solid var(--border-color);
  margin-top: 4px;
}

.total-label {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.total-amount {
  font-size: 22px;
  font-weight: 900;
  color: var(--accent);
}

.mini-percent-input,
.mini-label-input {
  width: 48px;
  border: 1px solid var(--border-color);
  background: var(--bg-muted);
  color: var(--text-primary);
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 12.5px;
  text-align: center;
}

.mini-label-input {
  width: 90px;
}

/* Receipt Stamp Seal */
.paid-stamp-seal {
  position: absolute;
  top: 10px;
  right: 20px;
  width: 140px;
  height: 60px;
  border: 3px double #10b981;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-10deg);
  opacity: 0.85;
}

.stamp-inner {
  text-align: center;
  color: #10b981;
}

.stamp-text-top { font-size: 11px; font-weight: 900; letter-spacing: 1px; }
.stamp-text-center { font-size: 15px; font-weight: 900; letter-spacing: 1px; }
.stamp-text-bottom { font-size: 11px; font-weight: 700; }

/* Milestones */
.milestones-section {
  margin: 20px 0;
  padding: 16px;
  background: var(--bg-muted);
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.milestones-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.mini-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mini-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.milestones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.milestone-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 12px;
  border-radius: 8px;
}

.milestone-card.status-paid {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.milestone-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-select {
  font-size: 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-surface);
  color: var(--text-primary);
  padding: 2px 6px;
}

.milestones-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.milestone-amount {
  font-size: 15px !important;
  font-family: monospace;
  font-weight: 800;
  color: var(--text-primary);
  margin-top: 4px;
}

.milestone-date {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.milestone-status-badge {
  font-size: 12px;
  font-weight: 700;
}

/* Payment Details */
.payment-details-box {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid var(--border-subtle);
}

.payment-left {
  flex: 1;
}

.section-sub-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 10px;
}

.wire-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-size: 13px;
}

.wire-lbl {
  color: var(--text-muted);
  display: block;
  font-size: 12px;
}

.wire-input {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

.crypto-box {
  background: rgba(245, 158, 11, 0.08);
  border: 1px dashed rgba(245, 158, 11, 0.4);
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 12px;
}

.crypto-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #f59e0b;
  margin-bottom: 4px;
}

.crypto-net-label {
  font-size: 12.5px;
  font-family: monospace;
  font-weight: 700;
  color: var(--text-secondary);
}

.notes-row {
  margin-top: 12px;
}

.notes-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-muted);
  display: block;
  margin-bottom: 4px;
}

.terms-textarea {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  resize: vertical;
}

.payment-right-qr {
  width: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-surface);
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.uploaded-qr-img {
  width: 120px;
  height: 120px;
  object-fit: contain;
}

.qr-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  margin-top: 4px;
}

.upload-qr-btn {
  margin-top: 6px;
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  font-weight: 600;
}

.remove-qr-btn {
  margin-top: 4px;
  font-size: 12px;
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
}

/* Signature */
.signature-section {
  display: flex;
  justify-content: space-between;
  gap: 36px;
  margin-top: 28px;
  padding-top: 20px;
}

.sign-box {
  flex: 1;
}

.sign-line {
  border-bottom: 1px solid var(--border-color);
  height: 40px;
}

.sign-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}

/* PERMANENT WATERMARK FOOTER */
.legal-watermark-footer {
  margin-top: 32px;
  padding-top: 14px;
  border-top: 1px solid var(--border-subtle);
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  user-select: none;
  pointer-events: none;
  font-family: system-ui, -apple-system, sans-serif;
}

/* Partners Section (Screen Only) */
.affiliate-recommend-section {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: var(--shadow-sm);
}

.affiliate-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.affiliate-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .affiliate-grid {
    grid-template-columns: 1fr;
  }
}

.partner-card {
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.partner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.partner-logo {
  font-weight: 800;
  font-size: 15px;
  color: var(--text-primary);
}

.partner-badge {
  font-size: 12px;
  font-weight: 700;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  padding: 2px 7px;
  border-radius: 4px;
}

.partner-desc {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 14px;
}

.partner-btn {
  display: block;
  text-align: center;
  padding: 8px 12px;
  background: var(--accent);
  color: #ffffff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.15s ease;
}

.partner-btn:hover {
  background: var(--accent-hover);
}

/* Legal Modal */
.template-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.template-modal-card {
  width: 100%;
  max-width: 680px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-md);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-icon {
  font-size: 20px;
  line-height: 1;
}

.template-modal-card .text-xl,
.text-xl {
  font-size: 20px !important;
}

.modal-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
}

.close-modal-btn:hover {
  color: var(--text-primary);
}

.modal-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 18px;
}

.clause-preview-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
}

.clause-item {
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 12px 14px;
}

.clause-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: #a855f7;
  background: rgba(168, 85, 247, 0.12);
  padding: 2px 7px;
  border-radius: 4px;
  margin-bottom: 4px;
}

.clause-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.clause-text {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.checkout-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

@media (max-width: 640px) {
  .checkout-actions-row {
    grid-template-columns: 1fr;
  }
}

.checkout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 9px;
  font-weight: 700;
  font-size: 13.5px;
  text-decoration: none;
  transition: all 0.15s ease;
}

.mianbaoduo-btn {
  background: #10b981;
  color: #ffffff;
}

.mianbaoduo-btn:hover {
  background: #059669;
}

.gumroad-btn {
  background: #ff5277;
  color: #ffffff;
}

.gumroad-btn:hover {
  background: #f43f5e;
}

.legal-note {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.print-only {
  display: none;
}

/* RESPONSIVE SCREEN LAYOUT (Mobile Polish) */
@media screen and (max-width: 768px) {
  .freelance-invoice-root {
    padding: 0;
  }

  .action-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .stage-tabs {
    width: 100%;
    overflow-x: auto;
  }

  .toolbar-right {
    justify-content: flex-start;
  }

  .invoice-paper-container {
    padding: 12px;
    border-radius: 12px;
  }

  .invoice-paper {
    padding: 18px 14px;
    border-radius: 8px;
  }

  .invoice-header {
    flex-direction: column;
    gap: 18px;
    padding-bottom: 18px;
  }

  .header-right {
    align-items: flex-start;
  }

  .client-billto-section {
    flex-direction: column;
    gap: 18px;
    margin: 18px 0;
  }

  .currency-selector-box {
    width: 100%;
  }

  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    margin-bottom: 14px;
  }

  .items-table {
    min-width: 580px;
  }

  .summary-section {
    flex-direction: column-reverse;
    gap: 20px;
    margin: 18px 0;
  }

  .math-summary-box {
    width: 100%;
  }

  .payment-details-box {
    flex-direction: column;
    gap: 20px;
  }

  .wire-details-grid {
    grid-template-columns: 1fr;
  }

  .payment-right-qr {
    width: 100%;
  }

  .signature-section {
    flex-direction: column;
    gap: 20px;
  }
}

/* NATIVE CSS PRINT & PDF ENGINE (@media print) */
@page {
  size: A4 portrait;
  margin: 15mm;
}

@media print {
  /* 1. Hide all web chrome, toolbars, buttons, banners, partner cards */
  header,
  footer,
  .no-print,
  .action-toolbar,
  .presets-bar,
  .compliance-alert-banner,
  .affiliate-recommend-section,
  .template-modal-overlay {
    display: none !important;
  }

  .print-only {
    display: inline-block !important;
  }

  /* 2. Pure white background, pure dark text, remove shadows and borders */
  body,
  .freelance-invoice-root,
  .invoice-paper-container {
    background: #ffffff !important;
    color: #111827 !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }

  .invoice-paper {
    width: 100% !important;
    max-width: 100% !important;
    background: #ffffff !important;
    color: #111827 !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  .editable-h1,
  .editable-text-bold,
  .editable-text,
  .editable-mini,
  .editable-bold,
  .chinese-words,
  .total-label,
  .total-amount,
  .item-desc-input,
  .item-num-input,
  .item-unit-input,
  .doc-num-input,
  .doc-date-row input,
  .wire-input,
  .terms-textarea {
    color: #111827 !important;
  }

  .items-table th {
    background: #f3f4f6 !important;
    color: #374151 !important;
    border-bottom: 2px solid #e5e7eb !important;
  }

  .items-table td {
    border-bottom: 1px solid #e5e7eb !important;
  }

  .invoice-header,
  .summary-section,
  .payment-details-box {
    border-color: #e5e7eb !important;
  }

  /* 3. Force background and borders to print sharply */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* 4. Avoid breaking inside invoice items and blocks */
  .print-avoid-break,
  .invoice-item-row,
  .milestone-card,
  .payment-details-box,
  .signature-section,
  .legal-watermark-footer {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
}
</style>
