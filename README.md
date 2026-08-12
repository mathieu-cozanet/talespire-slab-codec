# TaleSpire Slab Codec

Encode and decode **TaleSpire slab codes** — the base64 blobs you copy out of the game with
`Ctrl+C` and paste back in with `Ctrl+V`.

Supports both wire formats:

| Format | Magic | Status | What this repo does |
|---|---|---|---|
| **v1** (legacy) | `0xD1CEFACE` | float-based, pre-*Chimera* | encode + decode, round-trip tested |
| **v2** (*Chimera*) | same magic, `version = 2` | current | decode, validated against a real in-game slab |

The v2 format is **not documented publicly**. The layout below was reverse-engineered by
decoding real slabs and validating the result field by field. If you are building anything
that talks to TaleSpire, this spec is probably the most useful part of the repo.

---

## The v2 (*Chimera*) format

A slab code is `gzip`-compressed, then base64-encoded, and usually wrapped in triple
backticks by the game. After stripping the backticks and inflating:

### Header — 10 bytes

| Offset | Size | Type | Field |
|---|---|---|---|
| 0 | 4 | bytes | magic |
| 4 | 1 | `uint8` | version (`2`) |
| 5 | 1 | — | padding |
| 6 | 4 | `uint32` LE | number of **unique** assets |

### Asset table — 20 bytes per unique asset

Each entry is a GUID plus an instance count. The GUID is stored in **mixed endianness** —
the first three groups are little-endian, the last two are big-endian:

| Offset | Size | Endian | GUID group |
|---|---|---|---|
| 0 | 4 | LE | `xxxxxxxx` |
| 4 | 2 | LE | `xxxx` |
| 6 | 2 | LE | `xxxx` |
| 8 | 2 | **BE** | `xxxx` |
| 10 | 6 | **BE** | `xxxxxxxxxxxx` |
| 16 | 4 | LE | instance count |

### Instance table — 8 bytes per placed asset

Every instance is a single little-endian `uint64` with four bit-packed fields:

| Bits | Width | Field |
|---|---|---|
| 0–15 | 16 | `x` |
| 18–33 | 16 | `z` |
| 36–51 | 16 | `y` |
| 54+ | 10 | rotation |

**Coordinates are in hundredths of a tile** — `100` = one grid square. `x`/`y` form the
horizontal plane and `z` is height. Rotation is an index: multiply by `15` for degrees.

Note the 2-bit gaps between the position fields (16 used out of every 18). Those gaps are
what makes the format easy to get subtly wrong — read the fields as contiguous 16-bit
values and everything drifts after the first instance.

---

## The v1 (legacy) format

Float-based and much fatter. Kept here because older slabs still circulate.

- **Header (8 bytes):** magic `uint32` LE, version `uint16` LE, layout count `uint16` LE
- **Layout (20 bytes each):** 16-byte mixed-endian GUID, `uint16` count, 2 bytes padding
- **Asset (28 bytes each):** center `x,y,z` as `float32` LE, extents `x,y,z` as `float32` LE,
  rotation `uint8` + 3 bytes padding
- **Footer:** overall bounds — center `x,y,z` and extents `x,y,z` as `float32` LE

---

## Usage

### Browser tool

Open `index.html` — no build step, no network access, `pako` is vendored locally.

Paste a slab code to inspect it, or generate one from a room definition. To discover an
asset GUID without touching the game files: copy a single tile in TaleSpire (`Ctrl+C`),
paste it into the decoder, and read the GUID off the asset table.

### Node scripts

```bash
npm install

# decode a v2 slab
node scripts/decode-v2.js my-slab.txt

# encode a v1 slab and decode it back (round-trip assertion)
node scripts/roundtrip-v1.js
```

`decode-v2.js` prints the magic, version, asset table, the first few positions, the
coordinate bounds and the set of rotations present — enough to sanity-check that a decode
actually worked rather than merely not crashing.

---

## Credits

The v1 format was first documented by
[brcoding/TaleSpireHtmlSlabGeneration](https://github.com/brcoding/TaleSpireHtmlSlabGeneration)
(MIT, © 2020 Barry Coding). This repo shares no code with it — the v1 encoder here is an
independent implementation — but that project is what made the v1 layout legible in the
first place, and it deserves the credit.

Bundles [pako](https://github.com/nodeca/pako) 2.1.0 (MIT AND Zlib) for gzip.

**Not affiliated with Bouncyrock Entertainment.** TaleSpire is their product; please do not
file bugs about this tool with them.

## License

MIT — see [LICENSE](LICENSE).
