# Task 02: Update package.json

## Objective

Add `generate:scenes-manifest` npm script and integrate it into the build pipeline.

## Implementation Details

### Changes to package.json

1. **Add new script** in `scripts` section:

   ```json
   "generate:scenes-manifest": "tsx misc/scripts/generateManifest.ts"
   ```

2. **Update `build` script** to run manifest generation before TypeScript:
   - Current: `"build": "tsc"`
   - New: `"build": "npm run generate:scenes-manifest && tsc"`

### Rationale

- Manifest must exist before app runs (consumed by src/main.ts)
- Running it before `tsc` ensures `.js` files in `scripts/` are generated with manifest already in place
- Pattern mirrors existing `validate:scenes` script

## Definition of Done

- `npm run generate:scenes-manifest` runs the manifest script successfully
- `npm run build` runs manifest generation before TypeScript compilation
- `npm run dev` works (which calls `npm run build` internally)
- Script is listed alongside `validate:scenes` for discoverability
