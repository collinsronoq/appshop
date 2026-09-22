# AppShop redesign asset sources

## Generated artwork

The following project-local PNG files were generated for this redesign with OpenAI's built-in image generation tool on 2026-09-21. They contain no third-party branding or remote dependencies:

- `apps/mobile/assets/images/welcome-groceries.png`
- `apps/mobile/assets/images/product-bread.png`
- `apps/mobile/assets/images/product-milk.png`
- `apps/mobile/assets/images/product-tomatoes.png`
- `apps/mobile/assets/images/product-eggs.png`
- `apps/mobile/assets/images/product-detergent.png`
- `apps/mobile/assets/images/category-household.png`

Product images use a neutral warm-cream studio backdrop. The welcome artwork has a transparent background. Source files were resized and stripped of metadata for mobile delivery. The UI concept used for implementation comparison is `docs/redesign/appshop-concept.png`; it is documentation, not an application background.

Image fallback order is implemented in `apps/mobile/src/products/product-images.tsx`: uploaded image, confidently matched local product image, household-category artwork, then a neutral package placeholder. Whole-word matching and ambiguity exclusions prevent images such as a milk bottle from being shown for milk chocolate.

## Fonts

AppShop bundles DejaVu Sans, DejaVu Sans Bold, and DejaVu Serif Bold from the DejaVu font project. The project distributes them under the Bitstream Vera terms; the required notice is included at `apps/mobile/assets/fonts/DEJAVU-LICENSE.txt`.

The app uses DejaVu Serif Bold for expressive headings and DejaVu Sans for readable interface copy. React Native's platform sans-serif remains the runtime fallback while fonts are loading or if an asset cannot load.
