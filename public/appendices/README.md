# Appendices PDF Files

This directory is for hosting PDF versions of the Quran appendices locally.

## File Naming Convention

Individual appendix files should be named:
- `appendix_01.pdf` for Appendix 1
- `appendix_02.pdf` for Appendix 2
- ... and so on (use zero-padded numbers)

Complete collection file:
- `appendices_complete.pdf` for all appendices in one PDF

## How to Add PDFs

1. Download or create PDF versions of the appendices
2. Name them according to the convention above
3. Place them in this directory (`/public/appendices/`)
4. The app will automatically detect and display download options

## Current Status

The appendices are currently linked to external websites (masjidtucson.org) as fallback.
When PDFs are added to this directory, users will be able to:
- View PDFs directly in the browser
- Download PDFs for offline reading
- Access content without external redirects

## Metadata

The `metadata.json` file (if present) contains information about available PDFs.