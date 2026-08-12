# Third-party notices

This project is MIT licensed (see [LICENSE](LICENSE)) and bundles the following
third-party software.

## pako 2.1.0

- Source: https://github.com/nodeca/pako
- License: MIT AND Zlib
- File: `pako.min.js`
- Used for gzip compression and decompression of slab payloads.

Vendored rather than fetched from a CDN so that `index.html` works offline and with no
network access at all.

---

## Attribution (no code included)

Neither of the projects below contributed code to this repository. They are credited
because they made the slab formats legible in the first place.

- [Bouncyrock/DumbSlabStats](https://github.com/Bouncyrock/DumbSlabStats) — reference
  documentation for the v2 (*Chimera*) slab format.
- [brcoding/TaleSpireHtmlSlabGeneration](https://github.com/brcoding/TaleSpireHtmlSlabGeneration)
  (MIT, © 2020 Barry Coding) — reference for the legacy v1 format.

TaleSpire is a product of Bouncyrock Entertainment. This project is not affiliated with,
endorsed by, or supported by them.
