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
