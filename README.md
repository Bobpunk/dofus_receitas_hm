# Extrator DofusDB

Script para extrair os dados da API pública do [DofusDB](https://dofusdb.fr)
(`https://api.dofusdb.fr`) para arquivos JSON na raiz do projeto.

## Uso

```bash
python3 extract_dofusdb.py            # extrai todos os endpoints
python3 extract_dofusdb.py items monsters  # extrai apenas os informados
```

Os dados são salvos como `<endpoint>.json` na raiz do projeto.

## Atribuição (obrigatória — Licença LPNC-IA 1.0)

> Données issues de DofusDB. Utilisation soumise à la LPNC-IA 1.0.

> Data sourced from DofusDB. Use subject to NCPUL-AI 1.0.

Licença: https://api.dofusdb.fr/  (LPNC-IA 1.0 / NCPUL-AI 1.0 — 2026)

Uso estritamente não comercial. A licença proíbe o uso dos dados para
treinar ou alimentar sistemas de IA; execute este script você mesmo
(humano), não via pipeline automatizado de IA.
