# Vehicle Manufacturer Logos

This folder contains SVG logos for vehicle manufacturers.

## Naming Convention

All logo files must be named in lowercase:
- `toyota.svg`
- `volkswagen.svg`
- `bmw.svg`
- `mercedes-benz.svg`
- `ford.svg`

## Logo Guidelines

- **Format**: SVG (vector format for scalability)
- **Recommended size**: 32x32px (will be scaled as needed)
- **Style**: Monochrome or works well in both light/dark modes
- **Optimization**: Keep file sizes small for fast loading

## Usage

Logos are automatically matched to vehicle makes using case-insensitive matching. For example:
- User types "Toyota" → displays `toyota.svg`
- User types "toyota" → displays `toyota.svg`
- User types "TOYOTA" → displays `toyota.svg`

If no logo is found for a make, the application falls back to a generic car icon.
