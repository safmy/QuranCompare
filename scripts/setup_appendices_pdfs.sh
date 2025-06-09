#!/bin/bash

# Script to set up appendices PDFs when they become available

APPENDICES_DIR="../public/appendices"

echo "Appendices PDF Setup Script"
echo "=========================="
echo ""
echo "This script helps you set up PDF files for the appendices."
echo ""
echo "To use this script:"
echo "1. Place your appendices PDF file(s) in the current directory"
echo "2. Run this script"
echo ""
echo "Expected file names:"
echo "  - appendices_complete.pdf (for the complete collection)"
echo "  - appendix_01.pdf, appendix_02.pdf, etc. (for individual appendices)"
echo ""

# Create appendices directory if it doesn't exist
mkdir -p "$APPENDICES_DIR"

# Check for complete appendices PDF
if [ -f "appendices_complete.pdf" ]; then
    echo "Found appendices_complete.pdf"
    cp "appendices_complete.pdf" "$APPENDICES_DIR/"
    echo "✓ Copied to $APPENDICES_DIR/appendices_complete.pdf"
else
    echo "✗ appendices_complete.pdf not found"
fi

# Check for individual appendix PDFs
for i in {01..38}; do
    if [ -f "appendix_$i.pdf" ]; then
        echo "Found appendix_$i.pdf"
        cp "appendix_$i.pdf" "$APPENDICES_DIR/"
        echo "✓ Copied to $APPENDICES_DIR/appendix_$i.pdf"
    fi
done

echo ""
echo "Setup complete!"
echo ""
echo "PDFs are now available in: $APPENDICES_DIR"
echo "The app will automatically detect and use these PDFs."