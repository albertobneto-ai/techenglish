# TechEnglish

IT English conversation simulator — interview, stakeholder meetings, and technical team discussions.

## Stack
- Node.js + Express
- PostgreSQL (Heroku Postgres)
- Anthropic Claude API
- Vanilla JS frontend (no build step)

## Local setup

```bash
cp .env.example .env
# Fill in your values in .env

npm install
npm run dev
```

## Heroku deploy

```bash
# First time
heroku create your-app-name
heroku addons:create heroku-postgresql:essential-0

# Set config vars
heroku config:set ANTHROPIC_API_KEY=your_key
heroku config:set SESSION_SECRET=random_long_string_here
heroku config:set APP_PASSWORD=your_password
heroku config:set NODE_ENV=production

# Deploy
git init
git add .
git commit -m "initial commit"
heroku git:remote -a your-app-name
git push heroku main
```

## Config vars required on Heroku

| Var | Description |
|-----|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `DATABASE_URL` | Auto-set by Heroku Postgres addon |
| `SESSION_SECRET` | Any long random string |
| `APP_PASSWORD` | Your login password |
| `NODE_ENV` | Set to `production` |

## Scenarios

- **Technical Interview** — Senior Salesforce Architect interview simulation
- **Stakeholder Meeting** — Presenting architecture to a VP of Sales Operations
- **Tech Team Meeting** — Sprint refinement with a senior Salesforce developer

Type `feedback` at any time or click "End & Get Feedback" to receive structured feedback on your session.
