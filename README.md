<p align="center">
  <img src="docs/readme/01-hero.png" alt="FRAME — Production Management. From concept to final cut. A production management web app built for filmmakers who demand precision at every stage: pre-production, shoot day, and post. 12 modules, 35+ data types, 3 plan tiers." width="960" />
</p>

<p align="center">
  <img src="docs/readme/02-problem.png" alt="The problem: productions shouldn't live in spreadsheets. Production scattered across tools, changes break everything downstream, hours lost rebuilding the same documents." width="960" />
</p>

<p align="center">
  <img src="docs/readme/03-modules.png" alt="What's included: every module your production needs. Project, Script, Shot List, Persons, Locations, Styling, Props, Equipment, Production Day, Moodboard, Slate Generator, Exports." width="960" />
</p>

<p align="center">
  <img src="docs/readme/04-roles.png" alt="For every role: built for everyone on the production. Director/Producer, 1st AD, Director of Photography, Art/Stylist." width="960" />
</p>

<p align="center">
  <img src="docs/readme/05-pricing.png" alt="Pricing: Free for a single production, Pro at $24/month for working professionals, Team at $69/month for production companies." width="960" />
</p>

<p align="center">
  <img src="docs/readme/06-design.png" alt="Design language: SMPTE color bars, reinterpreted. The seven SMPTE broadcast colors become a semantic system. Every color means something, nothing is decorative." width="960" />
</p>

<p align="center">
  <img src="docs/readme/07-footer.png" alt="FRAME — Production Management" width="960" />
</p>

---

## Run it

```bash
pnpm install
npx supabase start          # local Postgres + Auth + Storage (Docker)
# fill the .env files from the printed keys (see docs/DEVELOPMENT.md)
pnpm db:migrate && pnpm db:seed
pnpm dev                    # web :4000 · api :4001
```

**Demo login:** `demo@frame.app` / `frame-demo-1234` — a fully populated commercial
production with shotlist, people & tasks, locations, props, equipment and a
production day ready to export as a call sheet.

## Docs

- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** — stack, local setup, architecture notes, cloud deploy.
- **[TECHNICAL DOC.md](TECHNICAL%20DOC.md)** — full product & architecture spec (§0: implementation resolutions).
