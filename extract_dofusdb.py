import json
import os
import sys
import time
import urllib.parse
import urllib.request

BASE_URL = "https://api.dofusdb.fr"
LANG = "fr"
PAGE_SIZE = 50
REQUEST_TIMEOUT = 30
SLEEP_BETWEEN_PAGES = 0.2
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

ENDPOINTS = [
    "items",
    "monsters",
    "spells",
    "recipes",
    "mounts",
    "areas",
    "breeds",
    "achievements",
    "almanax",
    "jobs",
    "quests",
    "npcs",
    "idols",
    "titles",
    "ornaments",
]


def fetch_page(endpoint, skip):
    params = {
        "lang": LANG,
        "$limit": PAGE_SIZE,
        "$skip": skip,
    }
    url = f"{BASE_URL}/{endpoint}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "dofusdb-extractor/1.0"})
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def extract_endpoint(endpoint):
    all_data = []
    skip = 0
    total = None
    page_num = 0
    while True:
        page = fetch_page(endpoint, skip)
        if total is None:
            total = page.get("total")
            if total is None:
                print(f"  ! ignorado (sem dados / não é coleção): {endpoint}")
                return None
        data = page.get("data", [])
        if not data:
            break
        all_data.extend(data)
        skip += len(data)
        page_num += 1
        progress = f"  {endpoint}: {len(all_data)}/{total} (página {page_num})"
        print(progress, end="\r", flush=True)
        if total is not None and skip >= total:
            break
        if len(data) < PAGE_SIZE:
            break
        time.sleep(SLEEP_BETWEEN_PAGES)
    print(f"  {endpoint}: {len(all_data)}/{total} (página {page_num})")
    return all_data


def main():
    only = sys.argv[1:] if len(sys.argv) > 1 else ENDPOINTS
    print(f"DofusDB extractor -> {BASE_URL} (lang={LANG})")
    for endpoint in only:
        if endpoint not in ENDPOINTS:
            print(f"  ? endpoint desconhecido: {endpoint}")
            continue
        print(f"=== {endpoint} ===")
        try:
            data = extract_endpoint(endpoint)
        except Exception as e:
            print(f"ERRO: {e}")
            continue
        if data is None:
            continue
        out_path = os.path.join(OUTPUT_DIR, f"{endpoint}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        print(f"{len(data)} registros -> {os.path.basename(out_path)}")


if __name__ == "__main__":
    main()
