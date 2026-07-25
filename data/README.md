# Private trivia import artifacts

The WhatsApp source export and generated JSONL/report files belong in the
ignored `data/raw/`, `data/staging/`, and `data/reports/` directories. They are
source material for a local or approved database import and must not be
committed to the public repository.

Generate the reviewed artifact with:

```bash
npm run prepare:whatsapp -- /path/to/_chat.txt data/staging
```
