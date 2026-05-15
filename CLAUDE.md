## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: tailwindcss, sveltekit-adapter, mdsvex

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

This repository is pre-implementation. There are no commits, no source code, no build setup, and no tests yet. The only artifact is a static design mockup at `desginexport/variant-b.html` (note: the directory name is misspelled — "desgin" instead of "design"). That file is a self-contained HTML page with inline CSS and one `<script>` block — it has no build pipeline.

When asked to "run", "build", or "test" anything, confirm with the user first: there is nothing to run, and any tooling choice (bundler, framework, package manager) is still open.

## What the mockup tells you about the planned product

`opengtb` is positioned as "la boîte à outils des intégrateurs GTB & IoT" — a browser-based toolbox for French-speaking building-automation (GTB = Gestion Technique du Bâtiment) and IoT integrators. The mockup commits to a few product constraints that should shape implementation decisions:

- **Local-first, no install, no sign-up.** Tools run in the browser. A paid tier ("enregistrer des projets, brancher une API ou héberger une instance dédiée") is mentioned but is explicitly out of scope for the free tools — treat any backend dependency as a deliberate choice, not a default.
- **French UI**, mono/terminal aesthetic (JetBrains Mono + IBM Plex Sans, `$ gtb <cmd>`-style affordances). Theme is dark by default with a light variant; CSS custom properties under `:root` and `[data-theme="light"]` are the source of truth for tokens.
- **12 tools across 5 sectors**, as enumerated in `variant-b.html` around lines 575–685:
  - **01 · Briques techniques (4):** `decode` (BACnet/IP, Modbus RTU/TCP, LoRaWAN Cayenne LPP payload decoder), `modbus` (register tables, types, scales, CRC-16), `conv` (HVAC unit converter — energy, pressure, flow, temperature, power), `pcap` (BACnet/Modbus PCAP analyzer).
  - **02 · Réglementaire (2):** `bacs` (external link to ConformBACS), `dju` (degree-days).
  - **03 · Dimensionnement (5):** `v3v`, `loi-eau` (heating curve), `air-hyg`, `pdc` (heat pump), `compteur-th` (thermal meter).
  - **04 · Référentiels (1):** `svg`.
  - **05 · Commissioning (1):** `trends` (Niagara-style trend-export validator).

  The `conv` tool is partially wired in the mockup (tabs, inputs, presets) — when implementing the real version, check what behavior the mockup already implies before redesigning the UX.

## Conventions worth preserving from the mockup

- Monospace surfaces (nav links, CTAs, tool names, code/command labels) vs. sans-serif narrative copy is a deliberate split — see the `.mono` / class list at the top of the stylesheet. Don't collapse them.
- Brand mark: `open<span class="slash">/</span><span class="b">gtb</span>` — the slash is dimmed, "gtb" is accented.
- Section numbering uses `§ 01`, `§ 02`, … as part of the visual identity.
- `data-comment-anchor="..."` attributes on sections suggest a planned commenting/annotation overlay — keep the anchors if you migrate the markup.

## Permissions

`.claude/settings.local.json` already grants broad allow rules (Bash/Read/Write/Edit `*`, WebSearch, WebFetch on github.com and bac0.readthedocs.io — the latter is the Python BACnet library, a likely reference for the `decode`/`pcap`/`modbus` tools).
