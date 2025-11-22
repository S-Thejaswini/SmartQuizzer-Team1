import json
import os
import time
import tempfile

CACHE_FILE = os.getenv("LEADERBOARD_CACHE_FILE", "leaderboard_cache.json")
CACHE_TTL = int(os.getenv('LEADERBOARD_CACHE_TTL', 300))  # seconds (5 min default)

USE_REDIS = False
r = None
try:
    import redis  # optional dependency
    r = redis.Redis(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        db=int(os.getenv('REDIS_DB', 0)),
        socket_connect_timeout=2,
        socket_timeout=2,
    )
    r.ping()
    USE_REDIS = True
    print("[INFO] Cache connected to Redis.")
except Exception as e:
    USE_REDIS = False
    print(f"[WARN] Redis not available ({e}), falling back to file cache.")


def _atomic_write(path: str, data: str) -> None:
    """Write data atomically to path using a temp file + rename."""
    dirpath = os.path.dirname(os.path.abspath(path)) or "."
    fd, tmp_path = tempfile.mkstemp(dir=dirpath, prefix=".tmp_cache_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)  # atomic on most platforms
    except Exception:
        # cleanup tmp if rename fails
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        raise


def cache_set(key: str, value, ttl: int = None):
    """
    Store value under `key`. Value will be stored as JSON together with a timestamp.
    If Redis is available, set with Redis TTL. For file cache we store a dict {key: {time, value}}.
    """
    try:
        payload = {"time": time.time(), "value": value}
        data_text = json.dumps(payload, ensure_ascii=False)
        if USE_REDIS and r is not None:
            # store string; set expires if ttl provided else use CACHE_TTL
            ex = int(ttl) if ttl is not None else CACHE_TTL
            r.set(key, data_text, ex=ex)
        else:
            # file-based: load existing map, update key, write back atomically
            cache_map = {}
            if os.path.exists(CACHE_FILE):
                try:
                    with open(CACHE_FILE, "r", encoding="utf-8") as f:
                        cache_map = json.load(f) or {}
                except Exception:
                    # if corrupted, overwrite
                    cache_map = {}

            cache_map[key] = payload
            _atomic_write(CACHE_FILE, json.dumps(cache_map, ensure_ascii=False))
    except Exception as e:
        print(f"[ERROR] cache_set failed for key={key}: {e}")


def cache_get(key: str, ttl: int = None):
    """
    Return the stored value for `key` if present and not expired; otherwise None.
    When using Redis we rely on Redis TTL but also double-check stored timestamp (defensive).
    For file cache we check the stored timestamp and compare to TTL (default CACHE_TTL).
    """
    try:
        now = time.time()
        effective_ttl = int(ttl) if ttl is not None else CACHE_TTL

        if USE_REDIS and r is not None:
            raw = r.get(key)
            if raw is None:
                return None
            try:
                # raw may be bytes
                if isinstance(raw, (bytes, bytearray)):
                    raw = raw.decode('utf-8')
                data = json.loads(raw)
            except Exception:
                # corrupted value: remove key
                try:
                    r.delete(key)
                except Exception:
                    pass
                return None

            # Redis enforces TTL but double-check timestamp for safety
            stored_time = float(data.get("time", 0))
            if effective_ttl > 0 and (now - stored_time) > effective_ttl:
                # expired
                try:
                    r.delete(key)
                except Exception:
                    pass
                return None
            return data.get("value")
        else:
            if not os.path.exists(CACHE_FILE):
                return None

            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    cache_map = json.load(f) or {}
            except Exception:
                # corrupted file - remove it and return None
                try:
                    os.remove(CACHE_FILE)
                except Exception:
                    pass
                return None

            entry = cache_map.get(key)
            if not entry:
                return None

            stored_time = float(entry.get("time", 0))
            if effective_ttl > 0 and (now - stored_time) > effective_ttl:
                # expired: delete key and rewrite file (best-effort)
                try:
                    del cache_map[key]
                    _atomic_write(CACHE_FILE, json.dumps(cache_map, ensure_ascii=False))
                except Exception:
                    pass
                return None

            return entry.get("value")

    except Exception as e:
        print(f"[ERROR] cache_get failed for key={key}: {e}")
        return None
