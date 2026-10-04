# STL Game

Small local React/Vite wrapper for the STL prototype game in [`stl_game.jsx`](./stl_game.jsx).

## Requirements

- Node.js
- npm

## Start the game

From this folder, run:

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

Example:

```text
http://localhost:5174/
```

This project is pinned to port `5174`. If that port is already in use, Vite will stop with an error instead of switching ports.

## Stop the game

Press `Ctrl+C` in the terminal where `npm run dev` is running.

## Optional

Create a production build with:

```bash
npm run build
```

## Hosting on eelkedevries.com

The game is published at <https://eelkedevries.com/STL/>. The website's deploy
workflow checks out `main` of this repository, builds it with

```bash
npm run build -- --base=/STL/
```

and copies `dist/` into the site's `/STL/` directory. Nothing here needs to know
the hosting path; the site supplies it at build time.

A push to `main` (other than Markdown or the outline) runs
`.github/workflows/notify-site.yml`, which asks the website to rebuild so the
hosted copy follows this repository. It needs one repository secret:

| Secret | Meaning |
| --- | --- |
| `SITE_DISPATCH_TOKEN` | Fine-grained token, owner `eelkedevries`, repository access `eelkedevries.com`, permission Contents: Read and write |

Without it the workflow only warns, and the hosted game updates on the next
website deploy instead.
