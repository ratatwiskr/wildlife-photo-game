# Task 01: Create generateManifest.ts Script

## Objective

Implement a TypeScript script that scans `assets/scenes/` directory, extracts scene metadata, and generates `scenes-manifest.json` at build time.

## Implementation Details

### File to Create

`misc/scripts/generateManifest.ts`

### Script Behavior

1. **Scan** `assets/scenes/` for all `.json` files (excluding `_mask.png`, `scenes-manifest.json`, and `template/` directory)
2. **Parse** each scene file and extract:
   - `name` field (must exist, non-empty string)
   - `sceneType` field (must exist, value must be `"photo"` or `"wimmelbild"`)
3. **Validate**: Fail hard with descriptive error if any scene file is missing these fields or has invalid values
4. **Output** sorted array to `assets/scenes/scenes-manifest.json`:
   ```json
   [
     { "name": "jungle_adventure", "sceneType": "photo" },
     { "name": "wimmelbild_jungle_adventure", "sceneType": "wimmelbild" }
   ]
   ```
5. **Console output**: Use `chalk` for colored success/error messages (follow `misc/scripts/validateScenes.ts` style)

### Error Handling

- Print scene name, file path, and validation error
- Process stops on first error (exit code 1)
- Example: `Error: Scene "jungle_adventure" (assets/scenes/jungle_adventure.json) missing required field: sceneType`

### Reference Implementation

Model after [misc/scripts/validateScenes.ts](misc/scripts/validateScenes.ts) for:

- File I/O patterns (`readdirSync`, `readFileSync`, `writeFileSync`)
- Error reporting with `chalk.red()`
- Success reporting with `chalk.green()`

## Definition of Done

- Script runs without errors when all scenes are valid
- Script exits with code 1 and prints error message when validation fails
- Manifest is written to correct location with correct format
- Script can be run via `tsx misc/scripts/generateManifest.ts`
