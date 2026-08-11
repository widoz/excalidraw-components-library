# SDD ledger — plan: docs/superpowers/plans/2026-07-29-preset-cli.md
Branch: feat/style-presets (branched from main at 1eea9dc)
Task 1: complete (commits 1eea9dc..25088c4, review clean). dist diff verified 98/98 lines, colour values only. zinc[600] unreferenced by any semantic role, so only 4 of 6 hex values appear.
Task 2: fix round 1/5 (1 addressed — brief's own theme.ts code had inline "#ffffff"/"transparent",
  violating the no-inline-hex-outside-tokens constraint; moved to named TRANSPARENT/CANVAS
  constants in tokens.ts. Implementer flagged it; controller's brief was wrong. commits 08444b5..b9f3690)
Task 2: minor (deferred): tokens.ts now has both color.canvas/color.transparent AND CANVAS/TRANSPARENT
  for the same two literals. Resolves itself in Task 3, where color.* becomes symbolic role names —
  color.canvas will be the string "canvas", not a hex, so the duplication disappears.
Task 2: complete (commits 25088c4..b9f3690, review approved)
Task 3: complete (commits b9f3690..ea40ad5, review approved). dist byte-identical. All 58 builders
  take and forward the theme; paint() throws on unknown roles; edges override correctly limited to
  rect() (line()'s roundness type 2 is a curve setting, left alone).
Task 3: two authorised deviations, both verified necessary — scene.ts's toScene now takes a theme
  (color.canvas stopped being a hex, and hardcoding one would violate the no-inline-hex constraint);
  and the documented tokens->theme->tokens import cycle was real, so PALETTE_VALUES moved into
  theme.ts per the brief's fallback. Task 7 removes it.
Task 3: minor (deferred): tests/style.test.ts's arc quadrant test changed new Factory(`a${endDeg}`)
  to new Factory(`a`, theme), collapsing four distinct per-iteration seeds into one. Assertions are
  purely geometric so it passes, but it weakens the sweep and was an unrequested change inside what
  should have been a mechanical edit. One-token fix.
Task 4: complete (commits ea40ad5..e616454, review approved). dist byte-identical. Implementer found
  two literals the brief's grep missed (sheet.ts's style.strokeWidth, toggle-group's MARK_STROKE=2),
  both caught by weight()'s throw-on-unknown-rung guard and correctly mapped.
Task 4: FOR FINAL FIX WAVE — style.strokeWidth and style.roughness in tokens.ts are now dead in src/
  but still exported and still look canonical. A future component reaching for style.strokeWidth
  would silently pin a 4 across every preset, defeating the whole feature. Delete them (keeping
  style.shadowOffset, which is still used) or mark deprecated.
Task 5: implementer caught a REAL controller error — DEFAULT_PRESET.font was "comic-shanns" (body
  id 7) but the library's actual body face is Excalifont (id 1). Verified independently: today's dist
  is 150 elements at fontFamily 1 and 95 at 7. Left as written it would have silently restyled every
  body label. Fixed to "excalifont"; spec and plan corrected (commit cf7b9ea).
Task 5: fix round 1/5 (1 addressed — Factory.text() resolved font roles without throwing on an
  unknown one, unlike paint()/weight(); extracted a face() resolver matching their shape, plus three
  throw tests covering all three resolvers. commits cf7b9ea..09fb8c0)
Task 5: complete (commits e616454..09fb8c0, review clean)
Task 6: implementer correctly STOPPED and escalated rather than committing an 818-line geometry
  change across 55/58 components. CONTROLLER RULING: neither 0.55 nor 0.5 was ever measured — 0.55
  was a batch-1 approximation, 0.5 was a spec approximation. But the whole library was generated at
  0.55 and visually verified in real Excalidraw, so that value has evidence the other lacks.
  fontAdvance anchored at excalifont: 0.55, with comic-shanns: 0.58 and nunito: 0.5 relative to it.
  dist returns byte-identical. Spec updated with the rationale so nobody "corrects" it back.
  Note: the 7 containment tests that failed under 0.5 were doing their job — they are pinned to the
  visually-verified layout and correctly resisted an unmeasured change.
Task 6: minor (deferred): commit 53f18b2 swept in a docs edit authored by the controller in a
  concurrent session. Content correct, but it blurs authorship.
Task 6: complete (commits 09fb8c0..53f18b2, review approved)
Task 7: complete (commits 53f18b2..b3eeb6f, review approved, zero issues). Palette check now
  per-theme and tested in BOTH directions (mauve hex rejected under zinc, accepted under mauve).
  Three new checks each proven to fire against perturbed input. Temporary PALETTE_VALUES export
  removed from theme.ts — the Task 3 import-cycle workaround is fully unwound.
Task 7: authorised deviation — buildAll still resolved DEFAULT_PRESET internally (Task 3 only
  threaded the per-component builders). Implementer widened buildAll(theme, outDir) and updated all
  callers. Reviewer confirmed against Task 8's own plan text that this is exactly what Task 8
  presumes, so Task 8's scope is undiminished.
Task 8: fix round 1/5 (3 addressed, 0 open — reserved preset names now rejected in resolveTheme so
  NO route can reach buildAll with a colliding name (a preset called "components" would have made
  rmSync delete all 58 committed default scenes); loadPreset now distinguishes missing from
  malformed JSON; --preset with no value throws directly. commits aaf1014..6e1a2b1)
Task 8: complete (commits b3eeb6f..6e1a2b1, review clean)
Task 9: fix round 1/5 (1 addressed — the interactive prompt path, the headline `npm run preset`
  usage, crashed on piped stdin. Controller reproduced it. Root cause was deeper than the
  top-level-await wrapper the controller diagnosed: readline emits buffered 'line' events
  synchronously for non-TTY input, and an await-resumed question() re-attaches its listener a
  microtask too late, so subsequent lines fire with no listener and are dropped. Fixed by
  callback-chaining on node:readline (still zero deps) plus an async main() with a .catch that
  prints readable validation errors instead of stack traces. Reviewer independently confirmed the
  Node mechanism is real and that the wrapper alone was insufficient. commits ecf07d6..850748a)
Task 9: minor (deferred): truncated stdin (name then EOF) exits 0 silently — no message, no file.
  readline's 'close' on EOF is unhandled so the pending question() never settles, and nothing keeps
  the loop alive. Same would happen on Ctrl-D at a real TTY. Should report an abort and exit non-zero.
Task 9: complete (commits 6e1a2b1..850748a, review clean)
Task 10: complete (commits 850748a..2bf4772, review approved). Reviewer walked all 8 distinct
  assertions and confirmed EVERY ONE can fail — no repeat of the batch-2 tautological containment
  test. Baselines are independently built (separate mkdtemp + buildAll), not derived from the
  elements under test. Implementer empirically proved the width-growth check fires by injecting a
  wrong nunito advance (0.5->0.9), watching breadcrumb trip at 1.43 vs the 1.35 threshold, then
  reverting cleanly.
Task 10: FOR FINAL FIX WAVE — tests/presets.test.ts leaks one temp dir per run: the module-level
  `baseline` mkdtemp has no top-level afterAll cleanup. One-line fix.
Task 10: minor (deferred): the 1.35 growth threshold's sensitivity floor is uncharacterized — the
  only data point is a deliberately large 80% advance error. Whether it catches subtler drift is
  asserted, not measured. tokens.ts frames the guard as catching "badly wrong" estimates, so this
  is consistent, but worth knowing.
Task 11: complete (commits 2bf4772..8c01d06, review approved).
FINAL WHOLE-BRANCH REVIEW + FIX WAVE (commits 68fe4b6, aa14ff0, 9d651bc): 14 findings, all fixed.
  CRITICAL: a preset name containing ".." made buildAll rmSync the REPOSITORY ROOT. outDirFor was
  join(DEFAULT_OUT, theme.name) with name taken verbatim from hand-edited JSON, and buildAll opens
  with a recursive forced delete. The Task 8 reserved-name guard was the right instinct at the wrong
  scope — it blocked two literal strings, not the traversal class. Fixed in two layers: a charset
  check in resolveTheme, and a relative()-based containment assertion in outDirFor. Controller
  verified independently: "..", "../..", "../escaped", "a/b", "/etc" all rejected; "ok-name" works.
  IMPORTANT: `--all` deleted the output it just produced (listPresets is sorted, so blueprint built
  then default rmSync'd all of dist/). Implementer narrowed the rmSync rather than reordering, with
  better reasoning than the review's suggestion: reordering only fixes --all, while a plain default
  build would still wipe dist/<preset>/ since default's outDir IS dist/. Verified: --all now leaves
  dist/blueprint (58) and dist/components (58) both present.
  Also fixed: prompt exiting 0 on truncated stdin; leaked temp dir; dead style.strokeWidth/roughness
  (a component reaching for them would pin 4 across every preset); estimateTextWidth's default
  advance (same trap one layer down); the cross-preset suite never building a WIDER font so the
  one-sided grow<1.35 guard passed vacuously; no CLI route to validate a non-default preset;
  two more true-by-construction tests; prototype keys slipping past the resolver guards via bare
  indexing (Object.hasOwn); parseArgs swallowing a following flag as a value.
CONTROLLER VISUAL VERIFICATION: blueprint preset (thin/architect/sharp/nunito/mist) loaded into real
  Excalidraw — clean architect lines, square corners, thin strokes, Nunito body with Comic Shanns
  headings still contrasting. Colour histograms match default EXACTLY in count (504/34/33/27/27/25)
  with mist values instead of zinc: same elements, same roles, different palette. All rectangles
  square under edges:sharp; only line elements keep roundness (the linear-curve setting).
BRANCH COMPLETE. 402 tests.
PRESET OUTPUT CONSISTENCY FINAL FIX WAVE: `RESERVED_NAMES` (Task 8's `["components", "ui"]`
  guard in `resolveTheme`) has been removed. It existed only because those two names collided with
  the default preset's flat `dist/` output and `dist/components`; since this branch made every
  preset — including `default` — build to its own `dist/<name>/`, no preset name can collide with
  anything any more, so `components` and `ui` are legal preset names today. The traversal
  concern the guard was never meant to cover (a name like `..`) is unaffected: that is `NAME_PATTERN`'s
  charset restriction and `assertInsideDist`'s containment check, neither of which is a list of names
  and neither of which changed. A list of forbidden names was never what made a traversal
  inexpressible; a restricted charset is.
