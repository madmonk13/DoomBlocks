// Regression suite for DoomBlocks (index.html).
// Runs the editor headlessly in jsdom, builds a test map through the real editing
// functions, and verifies the compiler output and exported WAD bytes.
//
// Usage:  npm install jsdom   (once)
//         node verify-blocks.js
//
// Exits 0 when all checks pass; writes blocks-test.wad as a playable artifact.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  beforeParse(w) {
    const p = new Proxy({}, { get: () => () => {}, set: () => true });
    w.HTMLCanvasElement.prototype.getContext = () => p;
    w.confirm = () => true;
    w.URL.createObjectURL = () => 'x'; w.URL.revokeObjectURL = () => {};
  }
});
const w = dom.window;
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + '  ' + m); if (!c) fail++; };

// New projects start empty — build the test map: an 11x11 walled room with a door
// at (15,10) and a player start at (15,15), plus a platform, water, and an exit switch.
w.eval(`
  const wall = (x,y) => { grid[gi(x,y)].wall = true; };
  for (let x=10;x<=20;x++){ wall(x,10); wall(x,20); }
  for (let y=10;y<=20;y++){ wall(10,y); wall(20,y); }
  grid[gi(15,10)].wall = false; grid[gi(15,10)].door = true;
  grid[gi(15,15)].thing = 1;
  grid[gi(12,12)].h = 2; grid[gi(12,13)].h = 2;   // platform, +32
  grid[gi(17,17)].surf = 5;                        // water
  grid[gi(20,15)].wall = false; grid[gi(20,15)].exit = true;
  window.__m = compile();
`);
const m = w.__m;

ok(m.sectors.length === 5, 'region merging: 5 sectors (outdoors, room, platform, water, door): ' + m.sectors.length);
const outdoors = m.sectors.filter(s => s.floorh === 0 && s.floort === 'FLOOR4_8');
ok(outdoors.length === 2, 'room and outdoors are separate same-property regions');
ok(m.sectors.some(s => s.floorh === 32), 'platform sector at height 32');
ok(m.sectors.some(s => s.floort === 'FWATER1'), 'water sector has FWATER1');
const doorSec = m.sectors.filter(s => s.floorh === s.ceilh);
ok(doorSec.length === 1, 'door sector closed (ceil == floor)');

const doorLines = m.linedefs.filter(l => l.special === 1);
ok(doorLines.length === 2, 'door: 2 crossing lines with DR special: ' + doorLines.length);
ok(doorLines.every(l => l.back >= 0 && l.flags === 4 &&
   m.sidedefs[l.front].upper === 'BIGDOOR2' && m.sidedefs[l.back].upper === 'BIGDOOR2'),
   'door lines two-sided with BIGDOOR2 uppers');
// DR doors open the sector on the line's BACK side — both crossing lines must have the
// closed door sector behind them, and an open (walkable) sector in front
ok(doorLines.every(l => {
  const back = m.sectors[m.sidedefs[l.back].sector], front = m.sectors[m.sidedefs[l.front].sector];
  return back.floorh === back.ceilh && front.ceilh > front.floorh;
}), 'door sector is on the BACK of both use-lines (openable from both sides)');
// flipped lines must still have the front sector on their right side geometrically
ok(doorLines.every(l => {
  const a = m.vertices[l.v1], b = m.vertices[l.v2];
  const nx = (b.y - a.y), ny = -(b.x - a.x);            // right normal (y-up)
  const px = (a.x + b.x)/2 + nx*0.01, py = (a.y + b.y)/2 + ny*0.01;
  const cx = Math.floor(px/64), cy = Math.floor(py/64); // cell on the right of the line
  const g = w.eval('grid[gi(' + cx + ',' + cy + ')]');
  return !g.door && !g.wall;                             // right side = walkable room, not the door
}), 'door lines geometrically face the rooms');
const trak = m.linedefs.filter(l => l.back < 0 && m.sidedefs[l.front].middle === 'DOORTRAK');
ok(trak.length === 2, 'door sides against walls use DOORTRAK: ' + trak.length);

const exitLines = m.linedefs.filter(l => l.special === 11);
ok(exitLines.length === 2, 'exit switch: 2 usable faces: ' + exitLines.length);
ok(exitLines.every(l => l.back < 0 && m.sidedefs[l.front].middle === 'SW1COMP'), 'exit faces one-sided SW1COMP');

// collinear merging: west wall interior face = ONE northward line spanning y 704..1280 at x=704
const westFace = m.linedefs.filter(l => {
  const a = m.vertices[l.v1], b = m.vertices[l.v2];
  return a.x === 704 && b.x === 704 && l.back < 0 && Math.min(a.y,b.y) >= 700 && Math.max(a.y,b.y) <= 1284;
});
ok(westFace.length === 1 && m.vertices[westFace[0].v1].y < m.vertices[westFace[0].v2].y,
   'west interior wall merged into one northward line (room on right)');
// east interior face at x=1280 must run southward (room on right)
const eastFace = m.linedefs.filter(l => {
  const a = m.vertices[l.v1], b = m.vertices[l.v2];
  return a.x === 1280 && b.x === 1280 && l.back < 0 && Math.min(a.y,b.y) >= 700 && Math.max(a.y,b.y) <= 1284;
});
ok(eastFace.length >= 1 && eastFace.every(l => m.vertices[l.v1].y > m.vertices[l.v2].y),
   'east interior wall lines run southward (room on right)');

// all index references valid
const refsOk = m.linedefs.every(l =>
  m.vertices[l.v1] && m.vertices[l.v2] && m.sidedefs[l.front] &&
  (l.back < 0 || m.sidedefs[l.back]) ) &&
  m.sidedefs.every(s => m.sectors[s.sector]);
ok(refsOk, 'all vertex/sidedef/sector references valid');
ok(m.things.length === 1 && m.things[0].type === 1 && m.things[0].x === 992 && m.things[0].angle === 90,
   'player start compiled at cell center');
console.log('        map size: ' + m.sectors.length + ' sectors, ' + m.linedefs.length + ' lines, ' +
  m.vertices.length + ' verts (from ' + (32*32) + ' cells)');

// ---- wall painting ----
w.eval(`
  grid[gi(20,12)].wmat = 4;                          // marble on one east wall block
  grid[gi(12,12)].wmat = 3; grid[gi(12,13)].wmat = 3; // wood on the platform columns
  window.__m2 = compile();
`);
const m2 = w.__m2;
// painted wall block: exactly one interior face segment (y 768..832 at x=1280) with MARBLE1
const marble = m2.linedefs.filter(l => l.back < 0 && m2.sidedefs[l.front].middle === 'MARBLE1');
ok(marble.length >= 1, 'painted wall block emits MARBLE1 faces: ' + marble.length);
const mSpan = marble.map(l => {
  const a = m2.vertices[l.v1], b = m2.vertices[l.v2];
  return [a.x, Math.min(a.y,b.y), Math.max(a.y,b.y)].join(',');
});
ok(mSpan.includes('1280,768,832'), 'marble face is exactly the painted cell span (run split correctly)');
// unpainted wall on same face still STARTAN2, adjacent to the marble segment
const east2 = m2.linedefs.filter(l => {
  const a = m2.vertices[l.v1], b = m2.vertices[l.v2];
  return a.x === 1280 && b.x === 1280 && l.back < 0;
});
ok(east2.some(l => m2.sidedefs[l.front].middle === 'STARTAN2'), 'rest of east wall still STARTAN2');
// platform painted wood: its raised edges are two-sided with WOOD5 upper+lower
const wood = m2.linedefs.filter(l => l.back >= 0 && m2.sidedefs[l.front].lower === 'WOOD5');
ok(wood.length === 4 && wood.every(l => m2.sidedefs[l.front].upper === 'WOOD5'),
   'platform step edges use painted WOOD5: ' + wood.length);
// door textures unaffected by painting
ok(m2.linedefs.filter(l => l.special === 1)
     .every(l => m2.sidedefs[l.front].upper === 'BIGDOOR2'), 'door faces still BIGDOOR2');

// ---- door with a wall above it (Ceiling tool applied directly to the door) ----
w.eval(`
  tool = 'ceil'; terraDir = 'lower'; terraStep = 32; brushN = 1;
  applyTool(15, 10);   // the door cell itself, not a neighbor
  window.__m3 = compile();
`);
ok((w.eval('grid[gi(15,10)].ch') || 0) === 0, 'ceiling tool leaves the door cell\'s own ch at 0');
ok(w.eval('grid[gi(15,11)].ch') === 2, 'ceiling tool instead lowers the open neighbor south of the door (32/16 units)');
ok(w.eval('grid[gi(15,9)].ch') === 2, 'ceiling tool also lowers the open neighbor north of the door');
const m3 = w.__m3;
const isClosedDoorSector = s => s.floorh === s.ceilh;
const vestibules = m3.sectors.filter(s => s.ceilh === 96 && s.floorh === 0);
ok(vestibules.length === 2, 'both capped cells beside the door form their own low-ceiling sectors: ' +
   m3.sectors.map(s => s.ceilh).join(','));
// the border between a capped vestibule and the rest of the (taller) room/outdoors —
// NOT the door's own frame line — must show the ordinary wall texture
const aboveDoor = m3.linedefs.filter(l => {
  if (l.back < 0) return false;
  const sa = m3.sectors[m3.sidedefs[l.front].sector], sb = m3.sectors[m3.sidedefs[l.back].sector];
  if (isClosedDoorSector(sa) || isClosedDoorSector(sb)) return false;
  return (sa.ceilh === 96) !== (sb.ceilh === 96);
});
// each 1-cell vestibule is boxed in by the room/outdoors on 3 sides (its 4th neighbor
// is the door itself), so this is 3 boundary segments per vestibule, 6 in total
ok(aboveDoor.length === 6 && aboveDoor.every(l =>
   m3.sidedefs[l.front].upper === 'STARTAN2' && m3.sidedefs[l.back].upper === 'STARTAN2'),
   'wall above the door uses the normal wall texture, not the door texture: ' + aboveDoor.length);
// the door's own frame line is untouched — still BIGDOOR2
ok(m3.linedefs.filter(l => l.special === 1).every(l => m3.sidedefs[l.front].upper === 'BIGDOOR2'),
   'door face itself is still BIGDOOR2 — only the corridor ceiling beside it steps down');

// ---- ceiling paint ----
w.eval(`
  tool = 'cpaint'; paintCeil = 2;   // 'Tech light' -> TLITE6_4
  applyTool(13, 17);
  window.__m4 = compile();
`);
ok(w.eval('grid[gi(13,17)].cmat') === 2, 'ceiling paint tool sets cmat on the clicked cell');
const m4 = w.__m4;
const paintedCeil = m4.sectors.filter(s => s.ceilt === 'TLITE6_4');
ok(paintedCeil.length === 1 && paintedCeil[0].floorh === 0,
   'painted ceiling cell becomes its own sector using the new flat');
ok(m4.sectors.some(s => s.ceilt === 'CEIL3_5'), 'rest of the room keeps the default ceiling flat');

// fill ceiling: pre-match a neighbor by hand, then flood-fill should absorb it
w.eval(`
  grid[gi(13,18)].cmat = 2;   // already matches (13,17), so the fill should spread onto it
  paintCeil = 3; tool = 'fillceil';
  applyTool(13, 17);
  window.__m5 = compile();
`);
ok(w.eval('grid[gi(13,17)].cmat') === 3 && w.eval('grid[gi(13,18)].cmat') === 3,
   'fill ceiling spreads to the connected, matching-ceiling neighbor');

// sky always overrides painted ceilings (level-wide setting, matching the real F_SKY1 hack)
w.eval("$('sky').value = 'SKY1'; window.__m6 = compile(); $('sky').value = '';");
const m6 = w.__m6;
ok(m6.sectors.every(s => (s.floorh === s.ceilh) ? s.ceilt === 'FLAT1' : s.ceilt === 'F_SKY1'),
   'sky overrides ceiling paint on every non-door sector');

// ---- locked door (re-place the same door at (15,10) through the tool, with a key set) ----
// A locked door's entire face uses the matching colored door skin (DOORBLU/DOORYEL/DOORRED)
// instead of BIGDOOR2 — the same single crossing-line mechanism as a plain door, just a
// different texture name, so it's guaranteed to render as reliably as any ordinary door.
w.eval(`
  tool = 'door'; doorLock = 1;   // Blue
  applyTool(15, 10);
  window.__m7 = compile();
`);
ok(w.eval('grid[gi(15,10)].lock') === 1, 'door tool sets the lock on the (re-)placed door');
const m7 = w.__m7;
const lockedLines = m7.linedefs.filter(l => l.special === 26);
ok(lockedLines.length === 2, 'locked door compiles with the Blue DR special (26): ' + lockedLines.length);
ok(m7.linedefs.filter(l => l.special === 1).length === 0, 'no lines left with the plain (unlocked) DR special');
ok(lockedLines.every(l => m7.sidedefs[l.front].upper === 'DOORBLU' && m7.sidedefs[l.back].upper === 'DOORBLU'),
   'locked door faces use the full-size Blue door texture (DOORBLU), not BIGDOOR2');
ok(!('lock' in m7.sectors.find(s => s.floorh === s.ceilh)), 'lock field does not leak into the exported sector');
// the jamb walls stay plain DOORTRAK — the color lives on the door face itself now
const trakLocked = m7.linedefs.filter(l => l.back < 0 && m7.sidedefs[l.front].middle === 'DOORTRAK');
ok(trakLocked.length === 2, 'door sides against walls still use plain DOORTRAK when locked: ' + trakLocked.length);
// clear the lock back off so it doesn't affect anything reusing this grid afterward
w.eval("tool = 'door'; doorLock = 0; applyTool(15, 10);");

// ---- ¼×¼ (16-unit) Terrain/Ceiling sub-cell brush ----
// Sculpt the NW quarter of an open cell inside the room (13,13), leaving the other three
// quarters flat, and confirm it compiles into real sub-cell-resolution sector geometry.
w.eval(`
  terraStep = 16; terraDir = 'raise'; tool = 'terrain'; terraSub = true;
  applyTool(13, 13, 0, 0);
  applyTool(13, 13, 0, 0);   // two 16-unit steps = 32 units total
  window.__m8 = compile();
`);
const c8 = w.eval('grid[gi(13,13)]');
ok(Array.isArray(c8.sh) && c8.sh.length === 16 && c8.sh[0] === 2 && c8.sh.slice(1).every(v => v === 0),
   '¼×¼ terrain brush raises only the targeted quarter, others stay 0: ' + JSON.stringify(c8.sh));
const m8 = w.__m8;
ok(m8.sectors.some(s => s.floorh === 32), 'sculpted quarter compiles to its own sector at floor height 32');
const subVerts = m8.vertices.filter(v => v.x === 13*64+16 && v.y >= 13*64 && v.y <= 13*64+16);
ok(subVerts.length > 0, 'compiled geometry has a vertex at the 16-unit sub-cell boundary, not just 64-unit cell edges');
// flattening all 16 quarters back to the same height collapses `sh` back to a plain scalar
w.eval(`
  for (let syi=0; syi<4; syi++) for (let sxi=0; sxi<4; sxi++) {
    if (sxi===0 && syi===0) continue;
    applyTool(13, 13, sxi, syi); applyTool(13, 13, sxi, syi);
  }
`);
const c8b = w.eval('grid[gi(13,13)]');
ok(c8b.sh === null && c8b.h === 2, 'once every quarter matches, the cell collapses back to a uniform cell: sh=' +
   JSON.stringify(c8b.sh) + ' h=' + c8b.h);
w.eval(`grid[gi(13,13)] = newCol();`);   // reset for a clean grid before the ceiling sub-test

// ¼×¼ ceiling brush: lower one quarter's ceiling, leave the rest at the room's default
w.eval(`
  ceilStep = 16; ceilDir = 'lower'; tool = 'ceil'; ceilSub = true;
  applyTool(13, 13, 3, 3);
  window.__m9 = compile();
`);
const c9 = w.eval('grid[gi(13,13)]');
ok(Array.isArray(c9.sch) && c9.sch[15] === 1 && c9.sch.slice(0,15).every(v => v === 0),
   '¼×¼ ceiling brush lowers only the targeted quarter: ' + JSON.stringify(c9.sch));
const m9 = w.__m9;
ok(m9.sectors.some(s => s.floorh === 0 && s.ceilh === 112), 'sculpted quarter compiles with a dropped ceiling (128-16=112)');
w.eval(`grid[gi(13,13)] = newCol(); doorLock = 0;`);

// ---- drag-to-paint: one undo checkpoint per stroke, not per cell ----
// mirrors what the mousemove handler does while dragging: checkpoint() once, then every
// newly-entered cell calls applyTool(..., true) to skip its own internal checkpoint.
const undoDepth0 = w.eval('undoStack.length');
w.eval(`
  tool = 'wall';
  checkpoint();
  for (let x = 24; x <= 27; x++) applyTool(x, 24, undefined, undefined, true);
`);
const strokeWalls = w.eval('[24,25,26,27].every(x => grid[gi(x,24)].wall)');
ok(strokeWalls, 'drag-paint stroke placed walls in every cell it crossed');
ok(w.eval('undoStack.length') === undoDepth0 + 1, 'a 4-cell drag-paint stroke added exactly one undo checkpoint');
w.eval('undo();');
ok(w.eval('[24,25,26,27].some(x => grid[gi(x,24)].wall)') === false, 'undo reverts the whole stroke in one step');

// ---- stamp: copy a rectangular region, paste it elsewhere (deep-cloned, not shared refs) ----
w.eval(`
  const wall2 = (x,y) => { grid[gi(x,y)].wall = true; };
  for (let x=24;x<=26;x++){ wall2(x,24); wall2(x,26); }
  for (let y=24;y<=26;y++){ wall2(24,y); wall2(26,y); }
  grid[gi(25,25)].surf = 6;                 // nukage in the middle
  stampCopy(24, 24, 26, 26);
  window.__stampBuf = { w: stampBuffer.w, h: stampBuffer.h, n: stampBuffer.cells.length };
  stampPaste(1, 24);                        // paste elsewhere on the same map
`);
const sb = w.__stampBuf;
ok(sb.w === 3 && sb.h === 3 && sb.n === 9, 'stamp copy captured a 3×3 region: ' + JSON.stringify(sb));
const pastedRingOk = w.eval(`
  [[1,24],[2,24],[3,24],[1,26],[2,26],[3,26],[1,25],[3,25]].every(([x,y]) => grid[gi(x,y)].wall) &&
  grid[gi(2,25)].surf === 6
`);
ok(pastedRingOk, 'stamp paste reproduced the wall ring and painted floor at the destination');
w.eval(`grid[gi(2,25)].surf = 0;`);
ok(w.eval('grid[gi(25,25)].surf') === 6, 'editing a pasted cell does not mutate the original source cell (deep clone)');

// player-start dedup on paste: a stamp carrying a start displaces any other start on the map
w.eval(`
  grid[gi(5,5)].thing = 1;
  grid[gi(25,25)].thing = 1;
  stampCopy(24, 24, 26, 26);
  stampPaste(1, 24);
`);
ok(w.eval('grid.filter(c => c.thing === 1).length') === 1, 'pasting a stamp with a Player 1 Start clears any other start');
ok(w.eval('grid[gi(2,25)].thing') === 1, 'the surviving start is the one the paste brought in');
// clean up this scratch area so it doesn't affect anything reusing this grid afterward
w.eval(`
  for (let y=24;y<=26;y++) for (let x=0;x<=27;x++) grid[gi(x,y)] = newCol();
  window.__m = compile();
`);

// WAD bytes
const buf = w.eval('wadBytes(window.__m, "MAP01")');
const dv = new w.DataView(buf), u8 = new w.Uint8Array(buf);
const str = (o,n) => String.fromCharCode(...u8.slice(o,o+n)).replace(/\0+$/,'');
ok(str(0,4) === 'PWAD' && dv.getInt32(4,true) === 11, 'WAD header valid, 11 lumps');
const dirOfs = dv.getInt32(8,true);
let sum = 0, names = [];
for (let i=0;i<11;i++) { sum += dv.getInt32(dirOfs+i*16+4,true); names.push(str(dirOfs+i*16+8,8)); }
ok(buf.byteLength === 12 + sum + 11*16, 'WAD file size consistent');
ok(names.join(',') === 'MAP01,THINGS,LINEDEFS,SIDEDEFS,VERTEXES,SEGS,SSECTORS,NODES,SECTORS,REJECT,BLOCKMAP',
   'lump order correct');
fs.writeFileSync(__dirname + '/blocks-test.wad', Buffer.from(new Uint8Array(buf)));
console.log(fail ? '\n' + fail + ' FAILURES' : '\nALL CHECKS PASSED — wrote blocks-test.wad');
process.exit(fail ? 1 : 0);
