# Brand data store

Each business has one directory:

```text
data/brands/<brand-id>/
├── brand.json
├── company-fact-sheet.md
└── additional-approved-context.txt
```

`brand.json` controls identity, refusal messages, and the deterministic relevance
terms used before Gemini is called. All `.md` and `.txt` files under the brand
directory are loaded as approved context.

Only place verified business information in these files. Explicitly document
unknown facts and prohibited claims.
