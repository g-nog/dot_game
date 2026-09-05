# Triangle Duel v1 playtest and release findings

## Rule-model finding: incomplete turns

The v1 state machine implements and tests the specified `incomplete` safeguard. There is, however, a structural reason it may be unreachable on generated fields: generation rejects collinear triples, and any noncrossing straight-line graph on a fixed general-position point set can be extended to a triangulation. All such triangulations have the same edge count for that point set. Consequently, committing one legal line should reduce remaining capacity by exactly one rather than make a previously feasible remaining quota impossible.

Keep the defensive transition for saved/test fields and revisit the domain wording after real playtests. Do not infer from this that quotas should become maxima; exact quotas and forfeited turns remain authoritative for v1.

## External release evidence still required

- Complete Quick, Standard, and Extended matches on a real supported iPhone and a representative mid-range Android phone.
- Confirm Extended feasibility checks remain below 50 ms on those devices. The local development benchmark is useful evidence, but it is not a physical-device measurement.
- Connect GitHub and Cloudflare Pages, require the CI workflow on the production branch, verify preview/production deployment and headers, and exercise the documented provider rollback flow.

## Constellations and gallery

The separate constellation implementation, four-matchup traces, blocking/recovery examples, browser verification, generated art, and remaining human/device limitations are recorded in [Constellations verification](playtests/constellation-verification.md). Triangle Duel's findings and release requirements above remain specific to that game.
