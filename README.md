# DoomBlocks — a simple, web-based Doom level editor

**► [Try it in your browser](https://madmonk13.github.io/DoomBlocks/index.html)**

DoomBlocks (`index.html`) is a single-file, browser-based level editor for classic Doom.
You build maps by clicking blocks on a 3D grid — terrain, walls, doors, liquids, monsters —
and export a playable WAD. No installation: open the link above or the file in any browser
(the 3D view loads Three.js from a CDN, so it needs internet on first load).

## Quick start

1. Open the editor. You start with an empty board — wall off a room, or just build in the open
   (the map boundary is itself a solid wall).
2. Pick tools from the right sidebar, click cells to build. Right-click removes
   (thing → structure → one step of terrain, in that order).
3. Place a **Player 1 Start** (Objects → Starts) — export requires one and will abort without it.
4. Navigation: drag to orbit, wheel to zoom, middle-drag / shift-drag / arrow keys / WASD to pan.
5. Export WAD, then play it: `gzdoom -file episode.wad`

The exported WAD has empty node lumps, so use a ZDoom-family port (GZDoom, Zandronum) which
builds nodes automatically. For vanilla ports, run the WAD through a node builder like zdbsp first.

## Units — how big is everything?

Everything is measured in Doom map units. The player is **56 tall** (eye level 41), **32 wide**,
and can automatically step up **24**. Each grid cell is **64×64** — roughly a meter and a half.

- **+16 slab** = a stair step, walked up freely.
- **+32 block** = thigh height, too tall to step up. Chain 16-steps to climb.
- Rooms need at least **56 units of headroom**. Cells with less are tinted **red** in the
  editor — the player cannot fit and will be stuck. Export also warns if any placed thing
  (especially a player start) sits on a cramped cell.

## Tools

- **Select object** — click any placed thing to inspect it (name, category, facing, footprint).
  The info box offers Rotate 45° and Delete. In this mode, drag a thing to move it to another cell.
- **Terrain** — Raise/Lower toggle, a step size adjustable from 16 to 128 in 16-unit increments,
  and a square brush (1×1 up to 6×6). The hover highlight shows the brush footprint.
  Terrain never bulldozes walls/doors/exits; erase those first.
- **Erase column** — resets a cell completely.
- **Wall** — solid block reaching the ceiling. **Door** — place in a gap between walls; it becomes
  a working door, usable from both sides. **Exit switch** — a wall the player "uses" to finish the
  level and move to the next one.
- **Floor paint / Fill** — 10 surfaces including grass, water (harmless), nukage/blood/lava
  (damaging), and the **Teleport pad**. Fill floods connected cells with the same texture and
  height, stopping at walls, doors, and steps.
- **Wall paint / Fill** — stone, wood, marble, metal, brick, computer, etc. Fill repaints a whole
  connected run of same-material wall blocks. Painting an open cell sets the texture of its
  raised terrain edges instead.
- **Murals** — the wall palette includes the nine **Icon of Sin** face pieces and other
  Doom II murals: goat face, hanging victims, impaled corpses, skin face, spine wall, the
  marble demon faces (the horned one is an image of the Icon of Sin itself), and the
  green-stone gargoyle/lion/satyr faces. Each label shows the texture size in 64-unit
  blocks as width×height — e.g. (4×2) spans four wall cells and fills a 128-tall wall.
  The Icon of Sin face is a 3×3 grid of (4×2) tiles, labeled by position (horns across the
  top, jaw across the bottom; the hole into the brain is in the forehead tile). A full row
  is 12 cells wide — paint the three tiles of one row side by side. If a piece looks
  misplaced in-game, swap it within its row; the original arrangement isn't documented.
- **Objects** — two dropdowns: category (Starts, Enemies, Weapons & Ammo, Pickups, Keys,
  Decorations, Hanging Gore, Boss & Special, Teleporters), then the item. Markers use recognizable shapes
  scaled to real size; big monsters show a translucent footprint disc (a Spiderdemon needs a
  4-cell-wide clearing). **Rotate thing** turns whatever you click by 45°; the marker's nose
  shows facing.

## Teleporters

Teleporters are placed as objects: **Objects → Teleporters**, numbered 1–4. Endpoints with
the same number form a network — stepping on any one sends the player to its **nearest
same-number partner**, so two make a two-way pair and three or more make a chain. Each
number is an independent network and maps to one of Doom's four stock pad textures
(GATE1–4) on export; the colored markers in the editor just distinguish the networks.
Rotate an endpoint (it's a normal thing — rotate, drag, select, delete all work) to set
which way the player faces when arriving there. You don't paint anything: the pad texture
and all teleport specials are generated automatically. Travel is one-hop only — arriving
on a pad never re-triggers it (Doom teleport lines only fire when crossed from outside).

(Advanced: pads and **Teleport Landing** things can still be placed separately with the floor
paint and Things palette; unpaired pads send the player to the nearest landing.)

## Multiple levels

**+ Level** adds another map; the level dropdown switches between them. Each level has its own
size, ceiling height, sky, boundary texture, and name. Exit switches chain the levels together
(MAP01 → MAP02 → …); the last exit ends the game. Export produces one `episode.wad` containing
every level.

## Toolbar settings

- **Ceiling** — global ceiling height for the current level (64–480).
- **Sky** — Indoors, or one of Doom II's three skies (brown city / grey city / red hell).
  Skies and level names are applied through a MAPINFO lump, which ZDoom-family ports read.
- **Border** — the texture of the outer boundary wall surrounding the whole map.
- **Level name** — shown on the automap in-game.
- **Map slot** — MAP01 (Doom II) or E1M1 (Doom 1); only for single-level projects.
  Note that some textures and monsters used by the editor are Doom II-only.

## Saving

Your project **autosaves to browser storage** on every edit and restores when you reopen the
page in the same browser. Use **Save Project** / **Open Project** for permanent `.json` files
you can back up or share. **Undo** is Cmd/Ctrl+Z (per level; cleared when switching levels
or resizing).

## Walk preview

The **Walk** button drops you into the map in first person, spawning at your Player 1 Start.
WASD + mouse to move and look (Shift to run), with Doom-accurate gravity, step height (24),
and headroom (56) — you'll get stuck exactly where the player would. Doors open with
Space/E and close behind you, teleporters whisk you to their partner (facing the arrival
direction you set), exit switches announce where the level would end, and the map is
enclosed by its border walls plus your ceiling or sky. It's a preview, not gameplay — no
monsters attack and nothing is picked up. Esc releases the mouse; Esc again returns to the
orbit view.

## Real graphics (optional)

Click **Load IWAD** and pick your own `doom2.wad` (or the free `freedoom2.wad`). The editor
reads the game's palette, floor flats, wall textures, and monster/item sprites directly from
the file — nothing is uploaded anywhere — and switches the 3D view to the real thing: painted
walls and murals render with their actual textures, floors show their flats, and things
appear as their in-game sprites (billboarded, like the engine draws them; Spectres are even
translucent). Anything the WAD doesn't contain falls back to the colored shapes. The WAD is
cached in your browser's local database, so it's restored automatically on your next visit;
loading a different WAD replaces the cached one.

## Limitations

- No room-over-room: vanilla Doom maps are 2D plans with one floor and one ceiling per spot.
  Use raised terrain, stairs, and teleporters for the feeling of elevation.
- Diagonals aren't supported — everything is axis-aligned blocks.
- Without an IWAD loaded, blocks show representative colors instead of texture art
  (see "Real graphics" above).
- One thing per cell.
