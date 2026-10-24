# Virtual Strips Specification (1D)

Status: draft, pending approval. Covers 1D strips only. 2D matrix spanning is
tabled for a future iteration.

---

## 1. Goal

Let multiple WLED instances behave as one continuous unit in Studio, so a
pattern travels across controllers instead of playing in lockstep on each.
Virtual strips are first class automation and timeline citizens, and they
degrade honestly when hardware or the dashboard goes away.

Non goals: 2D matrices, sample exact cross device phase lock, WLED native
DDP chaining management (out of scope; the dashboard is the composer).

## 2. Concepts And Data Model

* A virtual strip is an ordered 1D coordinate space mapped onto member
  segments: `[{ device_id, offset, length, reverse }]`, where offset is
  the member low LED on its own controller and reverse flips travel
  direction through the member.
* New `virtual_strips` table: `id`, `name`, `members` (JSON, ordered),
  `total_leds` (derived, validated), `fallback` (JSON: built-in effect id
  and colors per member), `auto_resume` (0/1), timestamps. Idempotent
  migration, no changes to existing tables.
* Runtime player state lives in memory; `auto_resume` strips restart on
  server boot.

## 3. Limits (First Iteration)

* 1,500 total LEDs per strip.
* 8 member devices per strip.
* 30 frames per second player tick.
* Rationale: DDP over UDP carries roughly 490 LEDs per packet at standard
  MTU, so a full strip costs a few packets per member per frame, well
  within LAN comfort. The Guides section will call these limits out, and
  they will be revisited once real world usage data exists.

## 4. Pattern Engine

* Headless server side renderer producing one RGB frame per tick across
  virtual coordinates. This is new code; the Studio sim math is canvas
  bound and stays as the preview layer.
* Initial pattern set: Solid, Chase, Wipe, Rainbow, Gradient, Theater
  Chase. Params: primary/secondary color, speed, direction.
* Frames slice per member by the strip map and fan out over DDP (UDP
  4048), reusing the existing DDP service.

## 5. Player Lifecycle

* Transport: play (strip, pattern, params), stop, pattern swap without
  stopping.
* Tick loop renders, slices, and sends. A member that errors is skipped
  for that tick and retried each tick; on return it rejoins
  mid pattern with no strip wide pause.
* Stop restores each member to its captured pre play snapshot, matching
  the existing Studio sandbox semantics.

## 6. Fallback Protocol (Dashboard Down)

* Before streaming starts, each member gets a built-in fallback state
  written as its current state (effect approximating the pattern, e.g.
  Chase for Chase). WLED reverts to current state on DDP timeout, so a
  dead dashboard yields living strips, never frozen frames.
* Prior member state is captured first and restored on clean stop, so
  fallback writes never destroy user setups.

## 7. Offline And Continuity Notes

* Dashboard restart auto resumes strips flagged `auto_resume`.
* Cross device sync is same millisecond approximate (fire and forget
  UDP). Correct for traveling patterns and chases; not for exact phase
  lock. The Guides section will say so plainly.
* Long virtual runs must respect power realities: the Guides section
  will carry the standard power injection and common ground guidance.

## 8. API Endpoints

* `GET/POST /api/virtual-strips`, `GET/PATCH/DELETE
  /api/virtual-strips/:id` (CRUD with member validation).
* `POST /api/virtual-strips/:id/play` (pattern plus params),
  `POST /api/virtual-strips/:id/stop`, `GET
  /api/virtual-strips/:id/status` (playing, pattern, fps, per member
  health).

## 9. Automations Integration

* New routine step and schedule action type `virtual_strip` with
  strip, pattern, params, and duration or stop. Reuses the existing
  action runner and validation patterns.

## 10. Timelines Integration

* Keyframes gain an optional virtual target shape: `{ strip_id,
  pattern, params }` alongside the existing device fields. Timeline
  playback to hardware does not exist yet, so this ships as data shape
  plus a documented player hook point, not live playback.

## 11. UI

* Dedicated Virtual Strips sidebar page (`/strips`): ordered member
  builder with hard bookended Start/End ranges, per member reverse
  direction swap, pattern picker with params, transport controls,
  per member health. One device per strip max (ban stays; the player
  keys health and snapshots by device id).
* Studio keeps a slim Strips tab with play/stop per strip (replaying
  each strip's last performance) plus a link to the full page.
* Preview reuses the strip simulator with downsampling to its fixed
  width; the page states that hardware is the source of truth.

## 12. Guides And Docs

* New guide section covering setup, the Section 3 limits, the sync
  approximation, fallback behavior, and power injection with common
  ground.

## 13. Verification Plan

* API tests with mock DDP capture: frame slicing across members,
  per member skip and resync, fallback write and restore, auto resume
  flag handling, endpoint validation.
* Headless checks: builder CRUD, transport state, automation action
  presence, timeline keyframe shape.
* Full suites plus production build before any release commit.

## 14. Migration And Rollout

* Single idempotent migration adding `virtual_strips`. No backfill.
* Ships behind no flag; inert until a strip is created. Bundled into
  the next minor release with changelog, screenshots, and README
  gallery updates per standing protocol.
