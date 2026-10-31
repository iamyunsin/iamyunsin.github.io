<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { AFFILIATE_LINKS } from '@/consts';
import {
  initWeb3Wasm,
  decodeCalldataWithWasm,
  type DecodedCalldataResult,
} from '@/wasm-pkg/tool-web3';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

const wasmExports = ref<Awaited<ReturnType<typeof initWeb3Wasm>> | null>(null);
const wasmReady = ref(false);

// Module 1: Offline Calldata Decoder state
const rawCalldata = ref(
  '0x095ea7b30000000000000000000000001111111254fb6c44bac0bed2854e76f90643097dffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
);

const decodedResult = ref<DecodedCalldataResult>({
  valid: true,
  selector: '0x095ea7b3',
  signature: 'approve(address spender, uint256 amount)',
  category: 'ERC-20 Token Approval',
  riskLevel: 'HIGH',
  riskReason:
    '🚨 高危预警：检测到 ERC-20 超大额或无限额度授权 (Unlimited Approve)！签名后目标地址可随时转走您钱包内的该代币。',
  byteLength: 68,
  words: [],
});

const calldataPresets = computed(() => [
  {
    label: isEn.value ? '🚨 Unlimited ERC-20 Approve (High Risk)' : '🚨 ERC-20 无限额度授权 (高危钓鱼排查)',
    hex: '0x095ea7b30000000000000000000000001111111254fb6c44bac0bed2854e76f90643097dffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  },
  {
    label: isEn.value ? '💸 ERC-20 Token Transfer (1,000 USDT)' : '💸 ERC-20 标准转账 (transfer 1,000 USDT)',
    hex: '0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045000000000000000000000000000000000000000000000000000000003b9aca00',
  },
  {
    label: isEn.value ? '🎨 NFT setApprovalForAll(true) (High Risk)' : '🎨 NFT 全集合授权 setApprovalForAll(true)',
    hex: '0xa22cb46500000000000000000000000000000000000000adc04c56bf30ac9d3c0aaf14dc0000000000000000000000000000000000000000000000000000000000000001',
  },
  {
    label: isEn.value ? '🦄 Uniswap V2 Token Swap' : '🦄 Uniswap V2 代币兑换调用',
    hex: '0x38ed17390000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000007735940000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa960450000000000000000000000000000000000000000000000000000000067c00000',
  },
]);

function runDecode() {
  if (!wasmExports.value) return;
  decodedResult.value = decodeCalldataWithWasm(wasmExports.value, rawCalldata.value);
}

watch(rawCalldata, () => {
  runDecode();
});

// Module 2: Multi-Chain RPC Latency Benchmark state
interface RpcNodeItem {
  id: string;
  chain: 'Ethereum' | 'Solana' | 'Base' | 'Arbitrum' | 'BNB Chain';
  providerName: string;
  url: string;
  protocol: 'evm' | 'solana';
  privacyNote: string;
  latencyMs: number | null;
  blockHeight: string;
  status: 'idle' | 'testing' | 'online' | 'error';
}

const selectedChain = ref<string>('ALL');
const customRpcUrl = ref('');
const isBenchmarking = ref(false);

const rpcNodes = ref<RpcNodeItem[]>([
  {
    id: 'eth-llamarpc',
    chain: 'Ethereum',
    providerName: 'LlamaNodes Public RPC',
    url: 'https://eth.llamarpc.com',
    protocol: 'evm',
    privacyNote: 'No-Tracking · MEV Protected',
    latencyMs: null,
    blockHeight: '—',
    status: 'idle',
  },
  {
    id: 'eth-publicnode',
    chain: 'Ethereum',
    providerName: 'Allnodes PublicNode',
    url: 'https://ethereum-rpc.publicnode.com',
    protocol: 'evm',
    privacyNote: 'Zero Logs · High Availability',
    latencyMs: null,
    blockHeight: '—',
    status: 'idle',
  },
  {
    id: 'eth-cloudflare',
    chain: 'Ethereum',
    providerName: 'Cloudflare Web3 Gateway',
    url: 'https://cloudflare-eth.com',
    protocol: 'evm',
    privacyNote: 'Global Anycast Edge',
    latencyMs: null,
    blockHeight: '—',
    status: 'idle',
  },
  {
    id: 'base-official',
    chain: 'Base',
    providerName: 'Base Official Mainnet RPC',
    url: 'https://mainnet.base.org',
    protocol: 'evm',
    privacyNote: 'Coinbase L2 Sequencer',
    latencyMs: null,
    blockHeight: '—',
    status: 'idle',
  },
  {
    id: 'base-publicnode',
    chain: 'Base',
    providerName: 'Base PublicNode',
    url: 'https://base-rpc.publicnode.com',
    protocol: 'evm',
    privacyNote: 'Zero Logs · Fast Sync',
    latencyMs: null,
    blockHeight: '—',
    status: 'idle',
  },
  {
    id: 'arb-official',
    chain: 'Arbitrum',
    providerName: 'Arbitrum One Official',
    url: 'https://arb1.arbitrum.io/rpc',
    protocol: 'evm',
    privacyNote: 'Offchain Labs Official',
    latencyMs: null,
    blockHeight: '—',
    status: 'idle',
  },
  {
    id: 'bsc-publicnode',
    chain: 'BNB Chain',
    providerName: 'BSC PublicNode',
    url: 'https://bsc-rpc.publicnode.com',
    protocol: 'evm',
    privacyNote: 'High Throughput',
    latencyMs: null,
    blockHeight: '—',
    status: 'idle',
  },
  {
    id: 'sol-publicnode',
    chain: 'Solana',
    providerName: 'Solana PublicNode RPC',
    url: 'https://solana-rpc.publicnode.com',
    protocol: 'solana',
    privacyNote: 'Mainnet-Beta JSON-RPC',
    latencyMs: null,
    blockHeight: '—',
    status: 'idle',
  },
]);

const filteredRpcNodes = computed(() => {
  const list = rpcNodes.value.filter(
    (n) => selectedChain.value === 'ALL' || n.chain === selectedChain.value
  );
  return [...list].sort((a, b) => {
    if (a.latencyMs !== null && b.latencyMs !== null) return a.latencyMs - b.latencyMs;
    if (a.latencyMs !== null) return -1;
    if (b.latencyMs !== null) return 1;
    return 0;
  });
});

async function pingSingleNode(node: RpcNodeItem) {
  node.status = 'testing';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  const payload =
    node.protocol === 'solana'
      ? { jsonrpc: '2.0', id: 1, method: 'getSlot', params: [] }
      : { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] };

  const t0 = performance.now();
  try {
    const res = await fetch(node.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await res.json();
    const elapsed = Math.round(performance.now() - t0);
    clearTimeout(timer);

    if (data && data.result !== undefined) {
      node.latencyMs = elapsed;
      if (node.protocol === 'solana') {
        node.blockHeight = `#${Number(data.result).toLocaleString()}`;
      } else {
        const blk = parseInt(String(data.result), 16);
        node.blockHeight = isNaN(blk) ? String(data.result) : `#${blk.toLocaleString()}`;
      }
      node.status = 'online';
    } else {
      node.status = 'error';
      node.latencyMs = null;
    }
  } catch {
    clearTimeout(timer);
    node.status = 'error';
    node.latencyMs = null;
  }
}

async function runRpcBenchmark() {
  isBenchmarking.value = true;
  const targets = rpcNodes.value.filter(
    (n) => selectedChain.value === 'ALL' || n.chain === selectedChain.value
  );
  await Promise.all(targets.map((n) => pingSingleNode(n)));
  isBenchmarking.value = false;
}

async function addAndTestCustomRpc() {
  const url = customRpcUrl.value.trim();
  if (!url.startsWith('http')) return;
  const newNode: RpcNodeItem = {
    id: `custom-${Date.now()}`,
    chain: 'Ethereum',
    providerName: isEn.value ? 'Custom RPC Endpoint' : '自定义测试节点',
    url,
    protocol: url.includes('solana') ? 'solana' : 'evm',
    privacyNote: 'User Added',
    latencyMs: null,
    blockHeight: '—',
    status: 'idle',
  };
  rpcNodes.value.unshift(newNode);
  customRpcUrl.value = '';
  await pingSingleNode(newNode);
}

onMounted(async () => {
  try {
    wasmExports.value = await initWeb3Wasm();
    wasmReady.value = true;
    runDecode();
  } catch (e) {
    console.error('Failed to load tool_web3.wasm:', e);
  }
});
</script>

<template>
  <div class="web3-tool-root">
    <!-- Section 1: Offline Calldata & Unlimited Approval Security Decoder -->
    <div class="w3-card">
      <div class="card-head">
        <div class="head-left">
          <h2 class="section-title">
            {{
              isEn
                ? '1. Offline Transaction Calldata & Approval Risk Decoder (Rust Wasm)'
                : '1. 交易 Calldata 离线解码与无限授权风险透视仪 (Rust Wasm)'
            }}
          </h2>
          <span class="wasm-status" :class="{ ready: wasmReady }">
            <span class="status-dot"></span>
            {{
              wasmReady
                ? isEn
                  ? 'Rust Wasm Decoder Active (40.7 KB)'
                  : 'Rust Wasm 离线解码器已就绪 (40.7 KB)'
                : isEn
                  ? 'Loading Wasm...'
                  : '加载 Wasm 中...'
            }}
          </span>
        </div>

        <span class="no-wallet-badge">
          🛡️ {{ isEn ? 'No Wallet Connection Required · 100% Offline Safe' : '无需连接钱包 · 纯离线防钓鱼解码' }}
        </span>
      </div>

      <!-- Preset Sample Transactions -->
      <div class="preset-bar">
        <span class="preset-label">{{ isEn ? 'Inspect sample tx:' : '一键载入典型交易样本：' }}</span>
        <button
          v-for="(p, idx) in calldataPresets"
          :key="idx"
          type="button"
          class="preset-btn"
          @click="rawCalldata = p.hex"
        >
          {{ p.label }}
        </button>
      </div>

      <textarea
        v-model="rawCalldata"
        class="hex-textarea"
        rows="3"
        :placeholder="
          isEn
            ? 'Paste raw hexadecimal transaction calldata (0x...) from your hardware wallet or block explorer...'
            : '在此粘贴待签名的十六进制交易 Calldata 数据 (0x...)，签名前先看清到底在授权什么...'
        "
      ></textarea>

      <!-- Decoded Output Box -->
      <div v-if="decodedResult.valid" class="decoded-panel">
        <!-- Risk Alert Banner -->
        <div class="risk-banner" :class="`risk-${decodedResult.riskLevel?.toLowerCase()}`">
          <div class="risk-main">
            <span class="risk-tag">{{ decodedResult.riskLevel }} RISK</span>
            <span class="risk-text">{{ decodedResult.riskReason }}</span>
          </div>
          <a
            :href="AFFILIATE_LINKS.ledger"
            target="_blank"
            rel="nofollow noopener sponsored"
            class="hw-wallet-link"
          >
            {{ isEn ? '🔒 Protect Assets with Hardware Wallet →' : '🔒 使用硬件钱包物理隔离私钥 →' }}
          </a>
        </div>

        <!-- Selector & Function Signature Summary -->
        <div class="sig-summary-grid">
          <div class="sig-box">
            <span class="sig-label">{{ isEn ? '4-Byte Selector' : '4 字节函数选择器 (Selector)' }}</span>
            <code class="sig-val accent">{{ decodedResult.selector }}</code>
          </div>
          <div class="sig-box">
            <span class="sig-label">{{ isEn ? 'Identified Function Signature' : '匹配函数签名 (ABI Signature)' }}</span>
            <code class="sig-val">{{ decodedResult.signature }}</code>
          </div>
          <div class="sig-box">
            <span class="sig-label">{{ isEn ? 'Call Category & Size' : '交易类型与字节长度' }}</span>
            <span class="sig-val">{{ decodedResult.category }} ({{ decodedResult.byteLength }} Bytes)</span>
          </div>
        </div>

        <!-- 32-Byte ABI Words Table -->
        <div v-if="decodedResult.words && decodedResult.words.length > 0" class="words-table-wrap">
          <table class="w3-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ isEn ? 'Parameter' : '参数槽位' }}</th>
                <th>{{ isEn ? 'Inferred Type' : '推断类型' }}</th>
                <th>{{ isEn ? 'Decoded Value (Human Readable)' : 'Rust Wasm 解码数值 (十进制 / 地址)' }}</th>
                <th>{{ isEn ? 'Raw 32-Byte Word' : '原始 32 字节十六进制帧' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in decodedResult.words" :key="w.index">
                <td class="mono">Word [{{ w.index }}]</td>
                <td class="bold">{{ w.name }}</td>
                <td><span class="type-pill">{{ w.kind }}</span></td>
                <td class="mono decoded-col" :class="{ danger: w.decoded.includes('MAX_UINT256') }">
                  {{ w.decoded }}
                </td>
                <td class="mono raw-col">{{ w.raw.slice(0, 14) }}...{{ w.raw.slice(-10) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="decoded-error">
        ⚠️ {{ decodedResult.error }}
      </div>
    </div>

    <!-- Section 2: Multi-Chain RPC Real-Time Latency Benchmark -->
    <div class="w3-card">
      <div class="card-head">
        <div>
          <h2 class="section-title">
            {{
              isEn
                ? '2. Multi-Chain RPC Node Latency & Block Sync Benchmark'
                : '2. 多链公共 RPC 节点真实延迟测速与区块高度检测'
            }}
          </h2>
          <p class="section-sub">
            {{
              isEn
                ? 'Directly ping Ethereum, Solana, Base, Arbitrum, and BNB Chain endpoints from your current network.'
                : '从您当前的本地浏览器网络直接向各大公链 RPC 节点发起 JSON-RPC 测速请求，找出最低延迟节点。'
            }}
          </p>
        </div>

        <button type="button" class="bench-btn" :disabled="isBenchmarking" @click="runRpcBenchmark">
          {{
            isBenchmarking
              ? isEn
                ? '⏳ Benchmarking Nodes...'
                : '⏳ 正在并发测速中...'
              : isEn
                ? '⚡ Run Live Latency Test'
                : '⚡ 立即开始全节点测速'
          }}
        </button>
      </div>

      <!-- Chain Filter & Custom RPC Input -->
      <div class="rpc-toolbar">
        <div class="chain-pills">
          <button
            v-for="ch in ['ALL', 'Ethereum', 'Solana', 'Base', 'Arbitrum', 'BNB Chain']"
            :key="ch"
            type="button"
            class="chain-pill"
            :class="{ active: selectedChain === ch }"
            @click="selectedChain = ch"
          >
            {{ ch === 'ALL' ? (isEn ? 'All Chains' : '全部公链') : ch }}
          </button>
        </div>

        <div class="custom-rpc-form">
          <input
            v-model="customRpcUrl"
            type="text"
            :placeholder="isEn ? 'Add custom https:// RPC URL...' : '输入自定义 https:// RPC 节点地址测速...'"
            class="rpc-input"
            @keyup.enter="addAndTestCustomRpc"
          />
          <button type="button" class="add-rpc-btn" @click="addAndTestCustomRpc">
            {{ isEn ? '+ Test RPC' : '+ 添加测速' }}
          </button>
        </div>
      </div>

      <!-- RPC Table -->
      <div class="words-table-wrap">
        <table class="w3-table">
          <thead>
            <tr>
              <th>{{ isEn ? 'Chain' : '公链网络' }}</th>
              <th>{{ isEn ? 'Provider & Endpoint URL' : '节点服务商与 RPC 地址' }}</th>
              <th>{{ isEn ? 'Privacy & Rate Limit' : '隐私策略与特性' }}</th>
              <th>{{ isEn ? 'Latest Block / Slot' : '最新区块高度' }}</th>
              <th>{{ isEn ? 'Real Latency' : '当前网络延迟' }}</th>
              <th>{{ isEn ? 'Action' : '操作' }}</th>
            </tr>
          </thead>
          <tbody>
            <!-- Sponsored Top Private Node Row -->
            <tr class="sponsored-rpc-row">
              <td><span class="chain-tag vip">Multi-Chain</span></td>
              <td>
                <div class="node-name">
                  👑 Alchemy / QuickNode Enterprise Private RPC
                  <span class="vip-badge">{{ isEn ? '300M Free CUs/mo' : '独享高速私有节点' }}</span>
                </div>
                <div class="node-url">https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY</div>
              </td>
              <td>{{ isEn ? 'Dedicated Throughput · No Rate Limit · Archive Data' : '零限流 · 99.99% SLA · 支持 Archive 历史查询' }}</td>
              <td class="mono">Real-Time</td>
              <td><span class="lat-badge fast">⚡ ~18 ms</span></td>
              <td>
                <a
                  :href="AFFILIATE_LINKS.alchemy"
                  target="_blank"
                  rel="nofollow noopener sponsored"
                  class="vip-cta-btn"
                >
                  {{ isEn ? 'Get Free Private Key ↗' : '免费申请私有节点 ↗' }}
                </a>
              </td>
            </tr>

            <tr v-for="node in filteredRpcNodes" :key="node.id">
              <td><span class="chain-tag">{{ node.chain }}</span></td>
              <td>
                <div class="node-name">{{ node.providerName }}</div>
                <div class="node-url">{{ node.url }}</div>
              </td>
              <td class="privacy-col">{{ node.privacyNote }}</td>
              <td class="mono">{{ node.blockHeight }}</td>
              <td>
                <span
                  v-if="node.status === 'online' && node.latencyMs !== null"
                  class="lat-badge"
                  :class="{
                    fast: node.latencyMs < 220,
                    medium: node.latencyMs >= 220 && node.latencyMs < 550,
                    slow: node.latencyMs >= 550,
                  }"
                >
                  {{ node.latencyMs }} ms
                </span>
                <span v-else-if="node.status === 'testing'" class="lat-testing">
                  {{ isEn ? 'Pinging...' : '测速中...' }}
                </span>
                <span v-else-if="node.status === 'error'" class="lat-err">
                  {{ isEn ? 'Timeout / CORS' : '超时或受限' }}
                </span>
                <span v-else class="lat-idle">
                  {{ isEn ? 'Click Run Test' : '待测速' }}
                </span>
              </td>
              <td>
                <button type="button" class="ping-one-btn" @click="pingSingleNode(node)">
                  {{ isEn ? 'Ping' : '重测' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.web3-tool-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  max-width: 100%;
}

.w3-card {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 22px 24px;
  border-radius: 16px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);

  @media (max-width: 640px) {
    padding: 16px 14px;
    border-radius: 12px;
  }
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.head-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
}

.section-title {
  margin: 0;
  font-size: 17.5px;
  font-weight: 800;
  color: var(--text-primary);

  @media (max-width: 640px) {
    font-size: 16px;
  }
}

.section-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.wasm-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background-color: var(--bg-muted);
  color: var(--text-muted);

  &.ready {
    background-color: rgba(16, 185, 129, 0.12);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
}

.no-wallet-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  background-color: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.preset-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.preset-label {
  font-size: 12px;
  color: var(--text-muted);
}

.preset-btn {
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: var(--accent-border);
    color: var(--accent);
    background-color: var(--accent-soft);
  }
}

.hex-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.55;
  margin-bottom: 14px;
  outline: none;

  &:focus {
    border-color: var(--accent);
  }
}

.risk-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 14px;

  &.risk-high {
    background-color: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #dc2626;
  }

  &.risk-medium {
    background-color: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #d97706;
  }

  &.risk-low {
    background-color: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #059669;
  }
}

.risk-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1;
}

.risk-tag {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  background-color: rgba(0, 0, 0, 0.08);
}

.risk-text {
  font-size: 13px;
  font-weight: 700;
}

.hw-wallet-link {
  font-size: 12px;
  font-weight: 700;
  color: inherit;
  text-decoration: underline;
  white-space: nowrap;
}

.sig-summary-grid {
  display: grid;
  grid-template-columns: 0.5fr 1.2fr 0.8fr;
  gap: 12px;
  margin-bottom: 14px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
}

.sig-box {
  padding: 12px 14px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sig-label {
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 600;
}

.sig-val {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--text-primary);
  word-break: break-all;

  &.accent {
    color: var(--accent);
  }
}

.words-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.w3-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th {
    text-align: left;
    padding: 10px;
    border-bottom: 2px solid var(--border-color);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  td {
    padding: 11px 10px;
    border-bottom: 1px solid var(--border-subtle);
    vertical-align: middle;
  }
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.bold {
  font-weight: 700;
  color: var(--text-primary);
}

.type-pill {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 6px;
  background-color: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
}

.decoded-col {
  font-weight: 700;
  color: var(--text-primary);
  word-break: break-all;

  &.danger {
    color: #dc2626;
    font-weight: 800;
  }
}

.raw-col {
  color: var(--text-muted);
  font-size: 12px;
}

.bench-btn {
  padding: 9px 18px;
  border-radius: 10px;
  border: none;
  background-color: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    width: 100%;
    text-align: center;
  }
}

.rpc-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.chain-pills {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.chain-pill {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &.active {
    background-color: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
}

.custom-rpc-form {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;

  @media (max-width: 640px) {
    width: 100%;
  }
}

.rpc-input {
  width: 240px;
  max-width: 100%;
  min-width: 0;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12px;

  @media (max-width: 640px) {
    flex: 1;
    width: auto;
  }
}

.add-rpc-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--accent-border);
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.sponsored-rpc-row td {
  background-color: rgba(16, 185, 129, 0.07);
}

.chain-tag {
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background-color: var(--bg-muted);
  color: var(--text-primary);

  &.vip {
    background-color: var(--accent-soft);
    color: var(--accent);
  }
}

.node-name {
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.vip-badge {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 999px;
  background-color: #10b981;
  color: #fff;
}

.node-url {
  font-family: monospace;
  font-size: 11.5px;
  color: var(--text-muted);
}

.lat-badge {
  display: inline-flex;
  padding: 3px 9px;
  border-radius: 999px;
  font-family: monospace;
  font-size: 12px;
  font-weight: 800;

  &.fast {
    background-color: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }
  &.medium {
    background-color: rgba(245, 158, 11, 0.15);
    color: #d97706;
  }
  &.slow {
    background-color: rgba(239, 68, 68, 0.15);
    color: #dc2626;
  }
}

.vip-cta-btn {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: 7px;
  background-color: var(--accent);
  color: #fff;
  font-size: 11.5px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.ping-one-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 11.5px;
  cursor: pointer;
}
</style>
