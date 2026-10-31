<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  initDeepLinkWasm,
  compileDeepLinkWithWasm,
  type DeepLinkCompileResult,
} from '@/wasm-pkg/tool-deeplink';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

const wasmExports = ref<Awaited<ReturnType<typeof initDeepLinkWasm>> | null>(null);
const wasmReady = ref(false);

// Form inputs
const teamId = ref('9JA89QQLNQ');
const bundleId = ref('com.yunsin.demoapp');
const paths = ref('/app/*, /product/*, NOT /app/internal/*');
const androidPkg = ref('com.yunsin.demoapp');
const sha256 = ref(
  '14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5'
);
const schemeUrl = ref('yunsinapp://product/detail?id=888');
const universalUrl = ref('https://yunsin.top/app/product/888');
const iosStore = ref('https://apps.apple.com/app/id123456789');
const androidStore = ref('https://yunsin.top/download/app-release.apk');

const activeTab = ref<'aasa' | 'assetlinks' | 'h5'>('aasa');
const copiedState = ref(false);
const envInfo = ref({
  os: 'Desktop',
  inApp: 'Standard Browser',
  ua: '',
});

const compiled = ref<DeepLinkCompileResult>({
  aasaJson: '{\n  "applinks": {}\n}',
  assetlinksJson: '[]',
  h5Snippet: '// Loading Rust Wasm compiler...',
  valid: true,
  warnings: [],
});

function runCompile() {
  if (!wasmExports.value) return;
  compiled.value = compileDeepLinkWithWasm(wasmExports.value, {
    teamId: teamId.value,
    bundleId: bundleId.value,
    paths: paths.value,
    androidPkg: androidPkg.value,
    sha256: sha256.value,
    schemeUrl: schemeUrl.value,
    universalUrl: universalUrl.value,
    iosStore: iosStore.value,
    androidStore: androidStore.value,
  });
}

onMounted(async () => {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    envInfo.value.ua = ua;
    if (/iphone|ipad|ipod/i.test(ua)) envInfo.value.os = 'iOS';
    else if (/android/i.test(ua)) envInfo.value.os = 'Android';
    else if (/macintosh/i.test(ua)) envInfo.value.os = 'macOS';
    else if (/windows/i.test(ua)) envInfo.value.os = 'Windows';

    if (/micromessenger/i.test(ua)) envInfo.value.inApp = 'WeChat WebView (Blocks Custom Scheme)';
    else if (/weibo/i.test(ua)) envInfo.value.inApp = 'Weibo WebView';
    else if (/qq\//i.test(ua)) envInfo.value.inApp = 'QQ WebView';
    else envInfo.value.inApp = isEn.value ? 'System / Standard Browser' : '标准系统浏览器（支持直接唤醒）';
  }

  try {
    wasmExports.value = await initDeepLinkWasm();
    wasmReady.value = true;
    runCompile();
  } catch (e) {
    console.error('Failed to load tool_deeplink.wasm:', e);
  }
});

watch(
  [teamId, bundleId, paths, androidPkg, sha256, schemeUrl, universalUrl, iosStore, androidStore],
  () => {
    runCompile();
  }
);

const currentCode = computed(() => {
  if (activeTab.value === 'aasa') return compiled.value.aasaJson;
  if (activeTab.value === 'assetlinks') return compiled.value.assetlinksJson;
  return compiled.value.h5Snippet;
});

async function copyCode() {
  try {
    await navigator.clipboard.writeText(currentCode.value);
    copiedState.value = true;
    setTimeout(() => {
      copiedState.value = false;
    }, 1800);
  } catch {}
}

function downloadConfigFile() {
  const filename =
    activeTab.value === 'aasa'
      ? 'apple-app-site-association'
      : activeTab.value === 'assetlinks'
        ? 'assetlinks.json'
        : 'openAppWithFallback.js';
  const blob = new Blob([currentCode.value], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="dl-tool-root">
    <!-- Top Status & Environment Bar -->
    <div class="dl-card">
      <div class="card-head">
        <div class="head-left">
          <h2 class="section-title">
            {{
              isEn
                ? '1. iOS Universal Links & Android App Links Configurator'
                : '1. iOS Universal Links 与 Android App Links 参数配置'
            }}
          </h2>
          <span class="wasm-status" :class="{ ready: wasmReady }">
            <span class="status-dot"></span>
            {{
              wasmReady
                ? isEn
                  ? 'Rust Wasm Compiler Ready (47.9 KB)'
                  : 'Rust Wasm 校验编译器已就绪 (47.9 KB)'
                : isEn
                  ? 'Loading Wasm...'
                  : '加载 Wasm 中...'
            }}
          </span>
        </div>

        <div class="env-pill">
          📱 {{ isEn ? 'Current Device:' : '当前访问环境：' }}
          <strong>{{ envInfo.os }} · {{ envInfo.inApp }}</strong>
        </div>
      </div>

      <!-- Validation Alert Banner -->
      <div v-if="compiled.valid" class="valid-banner ok">
        ✅
        {{
          isEn
            ? 'All Apple Team ID, Bundle ID, Path Rules, and Android SHA-256 Certificate Fingerprints passed format validation!'
            : 'Apple Team ID、Bundle ID、路径规则及 Android SHA-256 签名证书指纹均已通过语法校验！'
        }}
      </div>
      <div v-else class="valid-banner warn">
        <div class="warn-title">
          ⚠️ {{ isEn ? 'Configuration Format Warnings:' : '检测到以下配置格式问题，请修正后再部署至服务器：' }}
        </div>
        <ul>
          <li v-for="(w, idx) in compiled.warnings" :key="idx">{{ w }}</li>
        </ul>
      </div>

      <!-- Form Grid -->
      <div class="form-grid">
        <!-- iOS Column -->
        <div class="platform-box">
          <div class="plat-title">🍎 iOS Universal Links (AASA)</div>
          <div class="field-group">
            <label>{{ isEn ? 'Apple Team ID (10 chars)' : 'Apple 开发者 Team ID (10位字符)' }}</label>
            <input v-model="teamId" type="text" maxlength="10" placeholder="9JA89QQLNQ" class="text-input" />
          </div>
          <div class="field-group">
            <label>{{ isEn ? 'iOS Bundle Identifier' : 'iOS Bundle ID (包名)' }}</label>
            <input v-model="bundleId" type="text" placeholder="com.company.app" class="text-input" />
          </div>
          <div class="field-group">
            <label>{{ isEn ? 'Supported Paths (comma separated, supports NOT)' : '匹配路径规则 (逗号分隔，支持 NOT 排除)' }}</label>
            <input v-model="paths" type="text" placeholder="/app/*, NOT /app/admin/*" class="text-input" />
          </div>
          <div class="field-group">
            <label>{{ isEn ? 'iOS App Store Fallback URL' : 'iOS App Store 未安装兜底跳转地址' }}</label>
            <input v-model="iosStore" type="text" class="text-input" />
          </div>
        </div>

        <!-- Android & Scheme Column -->
        <div class="platform-box">
          <div class="plat-title">🤖 Android App Links & Custom Scheme</div>
          <div class="field-group">
            <label>{{ isEn ? 'Android Package Name' : 'Android Application ID (包名)' }}</label>
            <input v-model="androidPkg" type="text" placeholder="com.company.app" class="text-input" />
          </div>
          <div class="field-group">
            <label>{{ isEn ? 'SHA-256 Signing Certificate Fingerprint' : 'SHA-256 签名证书指纹 (keytool -list -v 获取)' }}</label>
            <input v-model="sha256" type="text" class="text-input mono" />
          </div>
          <div class="field-group">
            <label>{{ isEn ? 'Custom URL Scheme (for fallback & test)' : '自定义 URL Scheme 唤醒协议地址' }}</label>
            <input v-model="schemeUrl" type="text" placeholder="myapp://path?id=1" class="text-input mono" />
          </div>
          <div class="field-group">
            <label>{{ isEn ? 'Universal / App Link HTTPS Test URL' : 'Universal Link / App Link HTTPS 测试地址' }}</label>
            <input v-model="universalUrl" type="text" placeholder="https://example.com/app/1" class="text-input mono" />
          </div>
        </div>
      </div>
    </div>

    <!-- Output Code & Live Device Trigger Card -->
    <div class="dl-card">
      <div class="tabs-bar">
        <div class="tab-buttons">
          <button
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === 'aasa' }"
            @click="activeTab = 'aasa'"
          >
            🍎 apple-app-site-association
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === 'assetlinks' }"
            @click="activeTab = 'assetlinks'"
          >
            🤖 assetlinks.json
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === 'h5' }"
            @click="activeTab = 'h5'"
          >
            ⚡ {{ isEn ? 'H5 Smart Fallback Script (.js)' : 'H5 跨端智能唤醒与兜底代码 (.js)' }}
          </button>
        </div>

        <div class="code-actions">
          <button type="button" class="action-btn" @click="copyCode">
            {{ copiedState ? (isEn ? '✓ Copied!' : '✓ 已复制！') : isEn ? '📋 Copy Code' : '📋 复制代码' }}
          </button>
          <button type="button" class="action-btn primary" @click="downloadConfigFile">
            {{ isEn ? '⬇ Download File' : '⬇ 下载配置文件' }}
          </button>
        </div>
      </div>

      <div class="deploy-hint">
        <span v-if="activeTab === 'aasa'">
          📌
          {{
            isEn
              ? 'Deploy path: https://your-domain/.well-known/apple-app-site-association (Must serve with Content-Type: application/json and valid HTTPS without redirects)'
              : '部署路径：https://你的域名/.well-known/apple-app-site-association（注意：文件名无 .json 后缀，且响应头必须为 Content-Type: application/json，不可有 301/302 重定向）'
          }}
        </span>
        <span v-else-if="activeTab === 'assetlinks'">
          📌
          {{
            isEn
              ? 'Deploy path: https://your-domain/.well-known/assetlinks.json (Must be publicly accessible over HTTPS)'
              : '部署路径：https://你的域名/.well-known/assetlinks.json（需保证 Google 服务器可通过 HTTPS 直接抓取）'
          }}
        </span>
        <span v-else>
          📌
          {{
            isEn
              ? 'Includes automatic WeChat WebView detection, iOS Universal Links priority, and Page Visibility API timeout fallback to App Store.'
              : '内置微信内置浏览器防屏蔽提示、iOS Universal Links 优先唤起以及 Page Visibility API 无感检测未安装自动跳应用商店兜底。'
          }}
        </span>
      </div>

      <pre class="code-preview"><code>{{ currentCode }}</code></pre>

      <!-- Live Mobile Device Wake-up Test Box -->
      <div class="live-tester-box">
        <div class="tester-info">
          <h3 class="tester-title">
            {{ isEn ? '🚀 Real-Device DeepLink Trigger Sandbox' : '🚀 真机浏览器一键唤醒实测沙盒' }}
          </h3>
          <p class="tester-desc">
            {{
              isEn
                ? 'Open this page on your iOS or Android test device and click the buttons on the right to test whether your app wakes up directly.'
                : '在手机浏览器或微信内打开本页，直接点击右侧按钮即可实测您的 App 能否被正常唤醒或触发兜底逻辑：'
            }}
          </p>
        </div>
        <div class="tester-buttons">
          <a :href="schemeUrl" class="trigger-btn scheme">
            ⚡ {{ isEn ? 'Trigger Custom Scheme' : '点击触发 URL Scheme 唤醒' }}
          </a>
          <a :href="universalUrl" target="_blank" rel="noopener noreferrer" class="trigger-btn universal">
            🔗 {{ isEn ? 'Trigger Universal / App Link' : '点击触发 Universal Link 唤醒' }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.dl-tool-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  max-width: 100%;
}

.dl-card {
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

.env-pill {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}

.valid-banner {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;

  &.ok {
    background-color: rgba(16, 185, 129, 0.1);
    color: #059669;
    border: 1px solid rgba(16, 185, 129, 0.28);
    font-weight: 600;
  }

  &.warn {
    background-color: rgba(245, 158, 11, 0.12);
    color: #d97706;
    border: 1px solid rgba(245, 158, 11, 0.35);

    .warn-title {
      font-weight: 700;
      margin-bottom: 4px;
    }

    ul {
      margin: 0;
      padding-left: 18px;
    }
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.platform-box {
  min-width: 0;
  padding: 16px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 640px) {
    padding: 12px;
  }
}

.plat-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-primary);
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--border-color);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
  }
}

.text-input {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;

  &.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
  }

  &:focus {
    border-color: var(--accent);
  }
}

.tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.tab-buttons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.tab-btn {
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &.active {
    background-color: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
}

.code-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  @media (max-width: 640px) {
    width: 100%;
  }
}

.action-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &.primary {
    background-color: var(--accent-soft);
    color: var(--accent);
    border-color: var(--accent-border);
  }

  @media (max-width: 640px) {
    flex: 1;
    text-align: center;
  }
}

.deploy-hint {
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-muted);
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  word-break: break-word;
}

.code-preview {
  margin: 0 0 18px;
  padding: 16px;
  border-radius: 12px;
  background-color: #0f172a;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  overflow-x: auto;
  max-height: 320px;
  max-width: 100%;
}

.live-tester-box {
  padding: 16px 18px;
  border-radius: 12px;
  background: var(--author-banner);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;

  @media (max-width: 640px) {
    padding: 14px;
  }
}

.tester-info {
  flex: 1 1 200px;
  min-width: 0;
}

.tester-title {
  margin: 0 0 4px;
  font-size: 14.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.tester-desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.tester-buttons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  @media (max-width: 640px) {
    width: 100%;
  }
}

.trigger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;

  &.scheme {
    background-color: var(--accent);
    color: #fff;
  }

  &.universal {
    background-color: var(--bg-surface);
    color: var(--accent);
    border: 1px solid var(--accent-border);
  }

  @media (max-width: 640px) {
    width: 100%;
  }
}
</style>
