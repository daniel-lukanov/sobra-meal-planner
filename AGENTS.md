<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Sobra's app data lives in `src/data/*.ts` and app state in one zustand store (`src/lib/store.ts`, persisted to localStorage, rehydrated in the Shell after mount); only the customer-discovery experiment uses Lovable Cloud.
- Experiment sessions live in `src/lib/experiment.ts` (zustand + localStorage) and sync to `experiment_sessions` only through server functions in `src/lib/experiment.functions.ts`; the table has RLS with no policies so browsers can never read other testers' answers.
- `/insights` data comes only from `getInsights`, which checks the `INSIGHTS_PASSCODE` secret server-side, so responses never ship to visitors without the passcode.
- Routing uses TanStack Router file routes (the brief's "React Router" is mapped onto it); the sticky top navbar and mobile tab bar live in `src/components/sobra/Shell.tsx`.
- Colours are tokens in `src/styles.css` and the app is light-only (no dark palette), so never add dark-mode rules or hardcoded colours.
