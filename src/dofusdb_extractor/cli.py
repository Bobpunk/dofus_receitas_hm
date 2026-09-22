"""Interface de linha de comando para extrair dados da API do DofusDB."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse

from .client import DEFAULT_BASE_URL, DEFAULT_PAGE_SIZE, DofusDBClient, DofusDBError, KNOWN_ENDPOINTS


def _parse_query(raw: str | None) -> dict[str, str]:
    """Converte uma query string (ex.: 'level[$gt]=100&lang=fr') em dicionário."""
    if not raw:
        return {}
    parsed = urllib.parse.parse_qs(raw, keep_blank_values=True)
    return {key: vals[0] for key, vals in parsed.items()}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="dofusdb-extractor",
        description="Extrai coleções da API pública do DofusDB (https://api.dofusdb.fr).",
    )
    parser.add_argument("-e", "--endpoint", help="Coleção a extrair (ex.: items, spells, monsters).")
    parser.add_argument("-o", "--out", help="Arquivo de saída. Padrão: <endpoint>.jsonl na pasta atual.")
    parser.add_argument(
        "-f",
        "--format",
        choices=("jsonl", "json"),
        default="jsonl",
        help="Formato de saída (padrão: jsonl, um registro por linha).",
    )
    parser.add_argument("-l", "--limit", type=int, default=None, help="Limita o número de registros extraídos.")
    parser.add_argument(
        "-q",
        "--query",
        help="Query string bruta de filtros (ex.: 'level[$gt]=100&lang=fr'). Usa sintaxe estilo MongoDB.",
    )
    parser.add_argument("--lang", help="Atalho para definir o idioma (equivale a ?lang=<valor>).")
    parser.add_argument("--page-size", type=int, default=DEFAULT_PAGE_SIZE, help=f"Tamanho da página (padrão: {DEFAULT_PAGE_SIZE}).")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="URL base da API.")
    parser.add_argument("--list-endpoints", action="store_true", help="Lista as coleções conhecidas e sai.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.list_endpoints:
        for endpoint in KNOWN_ENDPOINTS:
            print(endpoint)
        return 0

    if not args.endpoint:
        parser.error("informe --endpoint (ou use --list-endpoints para ver opções)")

    extra_params = _parse_query(args.query)
    if args.lang:
        extra_params["lang"] = args.lang

    client = DofusDBClient(base_url=args.base_url, page_size=args.page_size)

    out_path = args.out or f"{args.endpoint}.{args.format}"
    total = client.count(args.endpoint, extra_params=extra_params)
    effective_total = min(total, args.limit) if args.limit is not None else total
    print(f"Extraindo '{args.endpoint}' (total estimado: {total}) -> {out_path}", file=sys.stderr)

    collected: list[dict] = []
    written = 0
    try:
        with open(out_path, "w", encoding="utf-8") as handle:
            for record in client.iter_collection(args.endpoint, extra_params=extra_params, limit=args.limit):
                if args.format == "jsonl":
                    handle.write(json.dumps(record, ensure_ascii=False) + "\n")
                else:
                    collected.append(record)
                written += 1
                if written % 500 == 0:
                    print(f"  {written}/{effective_total if effective_total else '?'} registros...", file=sys.stderr)
        if args.format == "json":
            with open(out_path, "w", encoding="utf-8") as handle:
                json.dump(collected, handle, ensure_ascii=False, indent=2)
    except DofusDBError as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 1

    print(f"Concluído: {written} registros salvos em {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
