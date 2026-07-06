# DoomBlocks — a Lego-style Doom level editor

DoomBlocks (`doom-blocks.html`) is a single-file, browser-based level editor for classic Doom.
You build maps by clicking blocks on a 3D grid — terrain, walls, doors, liquids, monsters —
and export a playable WAD. No installation: open the file in any browser (the 3D view loads
Three.js from a CDN, so the first open needs internet).

A companion freeform 2D editor (`doom-editor.html`) is also included for traditional
vertex/linedef editing with a first-person preview; this README focuses on DoomBlocks.

## Quick start

1. Open `doom-blocks.html`. You get a starter room with a door and a player start.
2. Pick tools from the right sidebar, click cells to build. Right-click removes
   (thing → structure → one step of terrain, in that order).
3. Navigation: drag to orbit, wheel to zoom, middle-drag / shift-drag / arrow keys / WASD to pan.
4. Export WAD, then play it: `gzdoom -file episode.wad`

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
- **Murals** — the wall palette includes the nine **Icon of Sin** face pieces (assemble them
  across adjacent wall blocks; piece 5 is the brain hole) and other Doom II murals (goat face,
  hanging victims, impaled corpses, skin face, spine wall). Mural textures are wider than one
  block, so they spread across consecutive cells — experiment with the piece order.
- **Things** — two dropdowns: category (Starts, Enemies, Weapons & Ammo, Pickups, Keys,
  Decorations, Hanging Gore, Boss & Special), then the item. Markers use recognizable shapes
  scaled to real size; big monsters show a translucent footprint disc (a Spiderdemon needs a
  4-cell-wide clearing). **Rotate thing** turns whatever you click by 45°; the marker's nose
  shows facing.

## Teleporters

Paint a **Teleport** floor to make a pad. Stepping on it sends the player to the nearest
**Teleport Landing** thing (in the Starts category). Place the landing somewhere off the pad,
and rotate it to set which way the player faces on arrival.

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

## Limitations

- No room-over-room: vanilla Doom maps are 2D plans with one floor and one ceiling per spot.
  Use raised terrain, stairs, and teleporters for the feeling of elevation.
- Diagonals aren't supported — everything is axis-aligned blocks.
- Texture art isn't rendered in the editor; blocks show representative colors. The real
  textures appear in-game.
- One thing per cell.
