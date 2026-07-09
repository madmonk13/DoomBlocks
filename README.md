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

Most placement tools (Terrain, Ceiling, Wall, Door, Exit switch, Floor/Wall/Ceiling paint, Erase)
support **drag-to-paint**: hold the left mouse button and drag to apply the tool to every cell
the cursor crosses, instead of clicking one at a time. The whole stroke is a single Undo step.
Right-drag still orbits the camera as usual, so building and navigating never conflict.

- **Select/Move** (or press **Space** to jump to it from any other tool) — click any placed
  thing to inspect it (name, category, facing, footprint).
  The info box offers Rotate 45° and Delete. In this mode, drag a thing to move it to another
  cell — the marker itself lifts up and follows the cursor, landing on whichever cell the
  yellow footprint highlights, and snaps back in place if you drop it somewhere invalid. It's
  also the one tool where dragging the empty canvas still orbits the camera, since every other
  tool now drags-to-paint instead.
- **Terrain** — Raise/Lower toggle, a step size adjustable from 16 to 128 in 16-unit increments,
  and a square brush (1×1 up to 6×6, or **¼×¼** — see below). The hover highlight shows the
  brush footprint. Terrain never bulldozes walls/doors/exits; erase those first.
- **Ceiling** — Raise/Lower a cell's ceiling independently of the level's global ceiling height,
  using its own step size and brush (also including ¼×¼), separate from Terrain's. Used on a
  door, it lowers the door's open neighbor cells instead of the door itself (a door has no
  ceiling of its own — it always opens to match its neighbors), capping how high the door opens
  and leaving ordinary wall above it, just like doors in the original games — the ¼×¼ brush
  falls back to this same whole-cell neighbor behavior on a door, since a door has no single
  quarter of its own. Orbit view never draws ceilings at all (so you can see into rooms from
  above), so a lowered cell shows instead as a translucent preview of the real cap and collar
  there (or a faint blue tint on a Sky level, where there's no real ceiling material to
  preview) — for a ¼×¼-sculpted ceiling this preview conservatively shows the lowest quarter's
  height for the whole cell; switch to Walk to see the real, per-quarter shape. **Ceiling
  paint / Fill** — 6 flats. Sky levels always override painted (and default) ceilings with the
  sky, since Sky is a whole-level setting — painting still affects the compiled map's sectors,
  but the flat itself won't be visible on a Sky level. Lowering the ceiling is blocked on Sky
  levels too (with a status warning) — Doom renders sky ceilings at effectively infinite
  height, so a lowered ceiling would have no visible cap or collar wall in-game; set Sky to
  Indoors first.
- **¼×¼ brush** — Terrain and Ceiling both offer a quarter-cell brush option (16×16 units,
  a quarter of a cell's 64×64 footprint) alongside the whole-cell N×N sizes, for finer
  sculpting than the ordinary block grid — a stair corner, a partial step, an angled-feeling
  ledge, etc. It targets whichever quarter of the clicked cell the cursor is over; the hover
  highlight shrinks to match. A cell only tracks per-quarter heights once you actually sculpt
  it that way, and snaps back to an ordinary whole cell automatically if all four quarters end
  up at the same height again. This is purely a floor/ceiling height feature — walls, doors,
  paint, and objects are unaffected and stay on the regular 64-unit grid; a wall or ceiling
  step still appears anywhere a real height difference exists, now down to 16-unit precision,
  and the exported WAD reflects it exactly.
- **Erase column** — resets a cell completely.
- **Wall** — solid block reaching the ceiling. **Door** — place in a gap between walls; it becomes
  a working door, usable from both sides. Pick a lock (None/Blue/Yellow/Red) below the tool before
  placing, or re-click an existing door to change its lock. A locked door's entire face uses the
  matching colored door skin (DOORBLU/DOORYEL/DOORRED — real Doom II textures) instead of the
  plain BIGDOOR2 look, in both editor views and the exported WAD. It's the same single-line door
  mechanism as an ordinary door, just a different texture, so it's dead center in view from any
  approach and renders exactly as reliably as a plain door.
  **Keys** (Objects → Keys) are placed as ordinary pickups — the editor doesn't check whether a
  key exists on the map before you lock a door with it, so place the matching key somewhere
  reachable. Walk mode has no inventory, so using a locked door there just reports which key it
  needs rather than opening it.
  **Exit switch** — a wall the player "uses" to finish the level and move to the next one.
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
- **Stamp** — copy a rectangular area and paste it elsewhere, including onto another level (the
  copied buffer isn't tied to the level you copied it from). **Copy**: drag a rectangle over the
  area to duplicate, or click for a quick grab — a plain click copies a block of the size set by
  the **Width**/**Height** steppers (1×1 by default), centered on the cursor, so you can copy a
  large area precisely without needing a careful drag; the hover highlight always previews the
  exact footprint a click will grab. Dragging still defines a custom rectangle regardless of the
  stepper values. **Paste**: click anywhere to stamp the copied area, centered on the cursor — the
  hover highlight previews exactly where it'll land. Paste as many times as you like; the buffer
  stays until you copy something else. Everything about the copied cells comes along — walls,
  doors and their locks, paint, ¼×¼ terrain/ceiling sculpting, and placed things. If the stamp
  contains a Player 1 Start, pasting it moves the level's start there and clears any other one (a
  level can only have one). Pastes (and copies) that overhang the map edge are simply clipped to
  fit.

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
- **Border** — the texture of the outer boundary wall surrounding the whole map. Orbit view shows
  a translucent preview ring in this texture around the map edge for context (Walk mode renders
  it solid, for real).
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
Space/E (E always works; Space only doubles as "use" while walking normally — see Fly/Noclip
below) and close behind you, teleporters whisk you to their partner (facing the arrival
direction you set), exit switches announce where the level would end, and the map is
enclosed by its border walls plus your ceiling or sky. It's a preview, not gameplay — no
monsters attack and nothing is picked up. Esc releases the mouse; Esc again returns to the
orbit view.

**Fly** (`F`) and **Noclip** (`N`) turn off gravity and add free vertical movement — hold
Space to rise, `C` to descend (Shift still runs faster in both directions). Fly still respects
walls and closed doors, so it's for floating above rooms to check the layout or reaching a
ledge without building stairs first; Noclip ignores all collision entirely, so you can pass
through walls, doors, and floors to inspect unreachable or broken geometry. Both reset off
each time you enter Walk, and either can be toggled independently at any point.

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
