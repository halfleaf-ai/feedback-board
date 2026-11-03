# Symora example workspace

`setup.ts` builds the example Organization for this repository on a Symora
deployment, using the same APIs a team admin uses:

| Resource | Contents |
| --- | --- |
| Organization | Feedback Board Team |
| Mates | Repo Analyst, Test Engineer, Release Writer, Project Steward |
| Knowledge | Feedback Board Handbook: triage rules, weekly digest, architecture decisions, release process |
| Memory | Team conventions (test-first fixes, Monday weeks, crediting customers) |
| Project | Feedback Board, linked to this repository, with items mirroring the open issues |
| Workflow | Weekly feedback digest: draft → human approval → publish |
| Automation | Runs the digest workflow every Sunday at 18:00 UTC |
| Sessions | Three completed sessions with share links (opt-in) |

All content lives in `content.ts`.

## Run it

```sh
npx tsx symora/setup.ts --base https://<symora-host>/api
```

The script prints a sign-in link; approve it in a browser where you are signed
in to that deployment. The signed-in person becomes the Organization's owner
and the approver in the digest workflow. Set `SYMORA_SESSION` to reuse a
session instead.

Running the script again only creates what is missing. Knowledge pages and
Memory cards are synced from `content.ts`.

### Sessions

```sh
npx tsx symora/setup.ts --base https://<symora-host>/api --run-sessions
```

`--run-sessions` starts each scenario in `SESSIONS` with its Mate, waits for the
run to finish and enables its share link. **It spends model and sandbox
budget.** Started sessions are recorded in `symora/.state.json` (git-ignored)
before the script waits, so a rerun never starts the same run twice. Delete an
entry there to run that scenario again.

## Limits

- Symora has no API that creates people, so the human side of the example team
  is whoever runs this script.
- Visitors never enter this Organization. They read the shared sessions'
  links; everything else is shown through captures.
