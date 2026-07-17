# anhelm-ai

NestJS 11 monorepo.

## Projects

- `apps/api` — primary HTTP API, port `3000`
- `apps/worker` — secondary application, port `3001`
- `libs/common` — shared NestJS library, imported through `@app/common`
- `data/brands` — file-backed business context and guardrail configuration

## Setup

```bash
npm install
Copy-Item .env.example .env
```

Set `OPENAI_API_KEY` in `.env` or in your shell environment. The default model
is `gpt-5-mini` and can be changed with `OPENAI_MODEL`.

Create the local SQLite database:

```bash
npm run db:setup
```

## Development

```bash
npm run start:api:dev
npm run start:worker:dev
```

## Brand assistant API

List configured brands:

```http
GET /brands
```

Ask TRI Consulting Services a question:

```http
POST /brands/tri-consulting-services/chat
Content-Type: application/json

{
  "message": "What coaching services do you offer?"
}
```

## Persistent conversations

Create a conversation. Save the returned `visitorId` in the browser when you do
not provide one:

```http
POST /brands/tri-consulting-services/conversations
Content-Type: application/json

{
  "visitorId": "a-browser-generated-visitor-id"
}
```

Send a message:

```http
POST /conversations/:conversationId/messages
Content-Type: application/json

{
  "visitorId": "a-browser-generated-visitor-id",
  "message": "What coaching services do you offer?"
}
```

Load the conversation list and message history:

```http
GET /brands/tri-consulting-services/conversations?visitorId=...
GET /conversations/:conversationId/messages?visitorId=...
```

The frontend should create one `visitorId` with `crypto.randomUUID()` and keep
it in local storage. This is anonymous browser separation, not authentication.
Add real user authentication before storing sensitive or private conversations.

SQLite stores conversations and messages. Verified brand knowledge remains in
`data/brands`.

The assistant uses only the approved files in the selected brand directory.
Obvious unrelated requests are rejected before OpenAI is called. OpenAI must
also classify mixed, unrelated, and unsupported requests as refused or
insufficient.

Add another business by creating `data/brands/<brand-id>/brand.json` and one or
more `.md` or `.txt` knowledge files. See `data/brands/README.md`.

## Quality checks

```bash
npm run build
npm test
npm run test:e2e
npm run lint
```

## Generate projects

```bash
npx nest generate app <name>
npx nest generate library <name>
```
