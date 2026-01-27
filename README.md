# Gmail Auto-Responder

AI-powered Gmail email assistant that classifies incoming emails and sends notifications to Discord.

## Overview

This system:
1. Receives Gmail notifications via Google Pub/Sub push
2. Fetches and normalizes email content
3. Classifies emails using LLM (priority + category)
4. Sends notifications to Discord
5. (Future) Creates draft replies and tasks

### Design Principles

- **Fail-open for important emails**: When uncertain, escalate to High priority to minimize false negatives
- **LLM for judgment, rules for guardrails**: LLM provides classification, but rule-based overrides ensure critical emails aren't missed
- **Minimal permissions**: Gmail API uses read + draft scopes only (no send permission)

## Project Structure

```
/src
  /config        # Configuration loading and validation
  /errors        # Custom error classes and handling utilities
  /logger        # Structured logging with sensitive data redaction
  /gmail         # Gmail API fetcher and Pub/Sub webhook
  /normalizer    # Email content normalization
  /llm           # LLM classifier (priority, category, summary)
  /discord       # Discord webhook notifications
  /draft         # Draft reply generation (Phase 2)
  /tasks         # Task bot integration (Phase 3)
  /pipeline      # Main orchestrator
  /storage       # Idempotency store
/tests           # Unit tests
```

## Classification

### Priority Levels

- **High**: Client thread continuation, direct to-address, reply expected
- **Medium**: Addressed to user but not urgent
- **Low**: Everything else (newsletters, notifications, etc.)

### Categories

- `client` - Client communications
- `marketing` - Marketing emails
- `internal` - Internal team communications
- `sales` - Sales inquiries
- `other` - Unclassified

## Setup

### Prerequisites

- Node.js 20+
- pnpm
- Google Cloud Project with Gmail API and Pub/Sub enabled
- Discord webhook URL
- Anthropic API key

### Installation

```bash
pnpm install
```

### Configuration

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

See `.env.example` for all configuration options.

### Gmail API Setup

1. Create a Google Cloud Project
2. Enable Gmail API and Pub/Sub API
3. Create OAuth2 credentials (Web application)
4. Important: Request only these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.compose` (for drafts)
   - Do NOT request `gmail.send`
5. Set up Pub/Sub topic and push subscription pointing to your webhook endpoint

### Retry Policy

External API calls (Gmail, LLM, Discord) implement exponential backoff:
- Max 3 retries
- Delays: 1s, 2s, 4s
- Retryable: network errors, 429, 5xx responses

## Development

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run linter
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format code
pnpm format

# Type check
pnpm typecheck

# Build
pnpm build

# Run in development mode
pnpm dev
```

## Phases

### Phase 1: MVP (Current)
- Gmail Pub/Sub webhook receiver
- Gmail message fetcher
- Email normalizer
- LLM classifier
- Discord notifications
- Idempotency

### Phase 2: Draft Generation
- Automatic reply draft generation for High/Medium emails
- Gmail Draft API integration

### Phase 3: Task Integration
- Task bot adapter interface
- Automatic task creation for High priority emails

### Phase 4: Quality
- Rule-based priority overrides
- Evaluation harness for classification accuracy

## License

ISC
