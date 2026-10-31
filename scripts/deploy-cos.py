import os
import re
import sys
import hashlib
import mimetypes
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from qcloud_cos import CosConfig, CosS3Client

BUCKET = os.environ.get("COS_BUCKET", "yunsin-top-1251451201")
REGION = os.environ.get("COS_REGION", "ap-chengdu")
DIST_DIR = Path("dist").resolve()

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
    return f'"{h.hexdigest()}"'


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

    config = CosConfig(Region=REGION, SecretId=secret_id, SecretKey=secret_key)
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
        with open(file_path, "rb") as fp:
            client.put_object(
                Bucket=BUCKET,
                Body=fp,
                Key=rel_key,
                CacheControl=cache_control,
                ContentType=content_type,
            )
        return f"{rel_key} [{cache_control}]"

    print(f"🚀 Uploading {len(hashed_keys)} content-hashed assets (Cache-Control: {CACHE_IMMUTABLE_30D})...")
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(upload_one, k) for k in hashed_keys]
        for fut in as_completed(futures):
            fut.result()

    print(f"🚀 Uploading {len(revalidate_keys)} HTML & fixed-name files (Cache-Control: {CACHE_REVALIDATE_304})...")
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(upload_one, k) for k in revalidate_keys]
        for fut in as_completed(futures):
            fut.result()

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
        f"✅ COS deployment complete! {len(hashed_keys)} hashed assets (30d cache), "
        f"{len(revalidate_keys)} HTML/fixed files (no-cache/304), {len(stale_keys)} old files cleaned."
    )


if __name__ == "__main__":
    main()
