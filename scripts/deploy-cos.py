import os
import re
import sys
import time
import hashlib
import mimetypes
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from qcloud_cos import CosConfig, CosS3Client
from qcloud_cos.cos_exception import CosClientError, CosServiceError

BUCKET = os.environ.get("COS_BUCKET", "yunsin-top-1251451201")
REGION = os.environ.get("COS_REGION", "ap-chengdu")
DIST_DIR = Path("dist").resolve()

# 跨国网络（GitHub Actions 美国节点 -> 腾讯云成都节点）并发与重试配置
SMALL_FILE_WORKERS = int(os.environ.get("COS_MAX_WORKERS", "4"))
LARGE_FILE_THRESHOLD = 512 * 1024  # 512 KB 以上视为大文件，单线程独占带宽上传
MAX_RETRIES = 5
FORCE_UPLOAD = os.environ.get("COS_FORCE_UPLOAD") == "1"

# 30 天客户端强缓存（单位：秒，30 * 24 * 3600 = 2592000）
CACHE_IMMUTABLE_30D = "public, max-age=2592000"
# HTML 及固定名称文件：每次向服务器发起条件请求（If-None-Match / ETag），未变则返回 304 Not Modified
CACHE_REVALIDATE_304 = "no-cache"

# 补充常见静态资源的标准 MIME 类型
CUSTOM_MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".svg": "image/svg+xml",
    ".wasm": "application/wasm",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pf_meta": "application/octet-stream",
    ".pf_index": "application/octet-stream",
    ".pf_fragment": "application/octet-stream",
    ".pagefind": "application/wasm",
}


def is_hashed_static_asset(rel_key: str) -> bool:
    """
    判断文件是否为带内容 Hash 的静态资源（可启用 30 天客户端强缓存）：
    1. HTML 文件及根目录固定名称协议文件（CNAME, favicon.ico, rss.xml, sitemap*.xml, robots.txt）返回 False
    2. _astro/ 下的所有构建产物均带有内容 Hash，返回 True
    3. pagefind/ 下的索引分片（.pf_meta, .pf_index, .pf_fragment）均带有内容 Hash，返回 True；
       而 pagefind/ 下的固定入口文件（pagefind.js, pagefind-entry.json, wasm.*.pagefind 等）返回 False
    4. 其余经过 scripts/hash-static-assets.mjs 处理后带有 .<8位hex>.<ext> 的静态资源返回 True
    """
    if rel_key.endswith(".html") or rel_key.endswith(".xml") or rel_key.endswith(".txt"):
        return False
    if rel_key in {"CNAME", "favicon.ico", "site.webmanifest"}:
        return False
    if rel_key.startswith("_astro/"):
        return True
    if rel_key.startswith("pagefind/"):
        return rel_key.endswith((".pf_meta", ".pf_index", ".pf_fragment"))
    # 检查文件名是否包含 8 位十六进制内容 Hash（如 avatar.a1b2c3d4.jpeg）
    filename = rel_key.rsplit("/", 1)[-1]
    return bool(re.search(r"\.[0-9a-fA-F]{8}\.[a-zA-Z0-9]+$", filename))


def get_content_type(rel_key: str) -> str:
    ext = Path(rel_key).suffix.lower()
    if ext in CUSTOM_MIME_TYPES:
        return CUSTOM_MIME_TYPES[ext]
    guessed, _ = mimetypes.guess_type(rel_key)
    return guessed or "application/octet-stream"


def get_cache_control(rel_key: str) -> str:
    if is_hashed_static_asset(rel_key):
        return CACHE_IMMUTABLE_30D
    return CACHE_REVALIDATE_304


def md5_etag(file_path: Path) -> str:
    h = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest().lower()


def is_unchanged_on_cos(rel_key: str, file_path: Path, remote_objects: dict[str, str]) -> bool:
    if FORCE_UPLOAD or rel_key not in remote_objects:
        return False
    remote_etag = remote_objects[rel_key].strip('"').lower()
    if not remote_etag:
        return False
    # 若曾通过分块上传（ETag 含 '-'）且文件名自身已包含内容 Hash，则内容必然一致
    if "-" in remote_etag and is_hashed_static_asset(rel_key):
        return True
    return remote_etag == md5_etag(file_path)


def list_remote_objects(client: CosS3Client) -> dict[str, str]:
    remote = {}
    marker = ""
    while True:
        resp = client.list_objects(Bucket=BUCKET, Marker=marker, MaxKeys=1000)
        for item in resp.get("Contents", []):
            remote[item["Key"]] = item.get("ETag", "")
        if resp.get("IsTruncated") == "true":
            marker = resp.get("NextMarker") or resp["Contents"][-1]["Key"]
        else:
            break
    return remote


def main():
    secret_id = os.environ.get("SECRET_ID") or os.environ.get("TENCENT_CLOUD_SECRET_ID")
    secret_key = os.environ.get("SECRET_KEY") or os.environ.get("TENCENT_CLOUD_SECRET_KEY")
    if not secret_id or not secret_key:
        print("❌ Missing SECRET_ID or SECRET_KEY environment variables.", file=sys.stderr)
        sys.exit(1)

    if not DIST_DIR.exists():
        print(f"❌ Dist directory not found: {DIST_DIR}", file=sys.stderr)
        sys.exit(1)

    config = CosConfig(
        Region=REGION,
        SecretId=secret_id,
        SecretKey=secret_key,
        Timeout=120,
        Scheme="https",
    )
    client = CosS3Client(config)

    local_files: dict[str, Path] = {}
    for p in DIST_DIR.rglob("*"):
        if p.is_file():
            rel_key = p.relative_to(DIST_DIR).as_posix()
            local_files[rel_key] = p

    remote_objects = list_remote_objects(client)

    # 先上传带 Hash 的静态资源（30天缓存），再上传 HTML 与固定入口文件（no-cache 协商缓存）
    hashed_keys = [k for k in local_files if is_hashed_static_asset(k)]
    revalidate_keys = [k for k in local_files if not is_hashed_static_asset(k)]

    def upload_one(rel_key: str) -> str:
        file_path = local_files[rel_key]
        cache_control = get_cache_control(rel_key)
        content_type = get_content_type(rel_key)
        data = file_path.read_bytes()
        file_size = len(data)

        last_err: Exception | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                # 若大文件（>= 1MB）在跨国网络下普通 PUT 连续超时/过慢，自动切换为 1MB 分块上传
                if file_size >= 1024 * 1024 and attempt >= 3:
                    client.upload_file(
                        Bucket=BUCKET,
                        LocalFilePath=str(file_path),
                        Key=rel_key,
                        PartSize=1,
                        MAXThread=2,
                        EnableMD5=False,
                        CacheControl=cache_control,
                        ContentType=content_type,
                    )
                else:
                    client.put_object(
                        Bucket=BUCKET,
                        Body=data,
                        Key=rel_key,
                        CacheControl=cache_control,
                        ContentType=content_type,
                    )
                return f"{rel_key} [{cache_control}]"
            except (CosServiceError, CosClientError, Exception) as exc:
                last_err = exc
                if attempt == MAX_RETRIES:
                    break
                wait_sec = min(2 ** attempt, 16)
                print(
                    f"⚠️ Upload retry {attempt}/{MAX_RETRIES} for {rel_key} "
                    f"({file_size / 1024:.1f} KB) after error: {exc}. Retrying in {wait_sec}s...",
                    file=sys.stderr,
                )
                time.sleep(wait_sec)

        raise RuntimeError(f"Failed to upload {rel_key} after {MAX_RETRIES} attempts") from last_err

    def sync_group(keys: list[str], group_label: str) -> tuple[int, int]:
        to_upload = [k for k in keys if not is_unchanged_on_cos(k, local_files[k], remote_objects)]
        skipped = len(keys) - len(to_upload)

        if not to_upload:
            print(f"⏭️ {group_label}: all {skipped} files unchanged on COS, skipped.")
            return 0, skipped

        # 将大文件（>= 512 KB）与小文件分离：大文件单线程顺序上传避免跨国带宽争抢，小文件适度并发
        large_keys = [k for k in to_upload if local_files[k].stat().st_size >= LARGE_FILE_THRESHOLD]
        small_keys = [k for k in to_upload if local_files[k].stat().st_size < LARGE_FILE_THRESHOLD]

        print(
            f"🚀 {group_label}: uploading {len(to_upload)} changed files "
            f"({len(large_keys)} large >=512KB sequential, {len(small_keys)} small with {SMALL_FILE_WORKERS} workers), "
            f"skipped {skipped} unchanged..."
        )

        # 1. 顺序上传大文件（如 _astro/*.wasm），独占连接带宽防止 UserNetworkTooSlow
        for k in large_keys:
            size_kb = local_files[k].stat().st_size / 1024
            print(f"   📦 Uploading large asset: {k} ({size_kb:.1f} KB)...")
            upload_one(k)

        # 2. 并发上传小文件
        if small_keys:
            with ThreadPoolExecutor(max_workers=SMALL_FILE_WORKERS) as pool:
                futures = [pool.submit(upload_one, k) for k in small_keys]
                for fut in as_completed(futures):
                    fut.result()

        return len(to_upload), skipped

    uploaded_hashed, skipped_hashed = sync_group(
        hashed_keys, f"Content-hashed assets (Cache-Control: {CACHE_IMMUTABLE_30D})"
    )
    uploaded_reval, skipped_reval = sync_group(
        revalidate_keys, f"HTML & fixed-name files (Cache-Control: {CACHE_REVALIDATE_304})"
    )

    # 清理 COS 上已废弃的旧文件（在新版 HTML 上传完成后再删除，确保零停机平滑过渡）
    stale_keys = [k for k in remote_objects if k not in local_files]
    if stale_keys:
        print(f"🧹 Removing {len(stale_keys)} obsolete files from COS...")
        for i in range(0, len(stale_keys), 1000):
            batch = [{"Key": k} for k in stale_keys[i : i + 1000]]
            client.delete_objects(
                Bucket=BUCKET,
                Delete={"Object": batch, "Quiet": "true"},
            )

    print(
        f"✅ COS deployment complete! "
        f"Hashed assets: {uploaded_hashed} uploaded / {skipped_hashed} skipped (30d cache); "
        f"HTML & fixed files: {uploaded_reval} uploaded / {skipped_reval} skipped (no-cache/304); "
        f"{len(stale_keys)} obsolete files cleaned."
    )


if __name__ == "__main__":
    main()
