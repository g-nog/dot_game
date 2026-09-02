# Use exact logical coordinates for game geometry

Triangle Duel uses integer coordinates in a fixed logical coordinate space as the authoritative representation of dots and lines. This keeps orientation, intersection, containment, and scoring decisions exact and reproducible; the responsive SVG board only scales that geometry for display, so resizing cannot change game legality. Persisted matches store logical coordinates rather than screen positions, accepting a fixed coordinate range in exchange for avoiding floating-point tolerance bugs and device-dependent outcomes.
