#!/usr/bin/env python3
"""
Generate all required iOS app icon sizes from the SVG
Requires: pip install pillow cairosvg
"""

import os
import subprocess
from pathlib import Path

# Icon sizes needed for iOS
icon_sizes = [
    (20, 1), (20, 2), (20, 3),     # Notification icons
    (29, 1), (29, 2), (29, 3),     # Settings icons
    (40, 1), (40, 2), (40, 3),     # Spotlight icons
    (60, 2), (60, 3),              # App icons (iPhone)
    (76, 1), (76, 2),              # App icons (iPad)
    (83.5, 2),                      # iPad Pro
    (1024, 1),                      # App Store
]

def generate_icons():
    # Create output directory
    output_dir = Path("ios/App/App/Assets.xcassets/AppIcon.appiconset")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Check if we have the required tools
    try:
        # Try using rsvg-convert first (better quality)
        subprocess.run(["rsvg-convert", "--version"], check=True, capture_output=True)
        use_rsvg = True
        print("Using rsvg-convert for high-quality conversion")
    except:
        use_rsvg = False
        print("rsvg-convert not found. Install with: brew install librsvg")
        print("Falling back to Python libraries")
    
    for size, scale in icon_sizes:
        actual_size = int(size * scale)
        if scale == 1:
            filename = f"Icon-{int(size)}.png"
        else:
            filename = f"Icon-{int(size)}@{scale}x.png"
        
        output_path = output_dir / filename
        
        if use_rsvg:
            # Use rsvg-convert for better quality
            cmd = [
                "rsvg-convert",
                "-w", str(actual_size),
                "-h", str(actual_size),
                "AppIcon.svg",
                "-o", str(output_path)
            ]
            subprocess.run(cmd, check=True)
            print(f"Generated {filename} ({actual_size}x{actual_size})")
        else:
            # Fallback using Python
            try:
                import cairosvg
                from PIL import Image
                import io
                
                # Convert SVG to PNG using cairosvg
                png_data = cairosvg.svg2png(
                    url="AppIcon.svg",
                    output_width=actual_size,
                    output_height=actual_size
                )
                
                # Save the PNG
                with open(output_path, 'wb') as f:
                    f.write(png_data)
                
                print(f"Generated {filename} ({actual_size}x{actual_size})")
            except ImportError:
                print("Please install required libraries:")
                print("pip install cairosvg pillow")
                return

if __name__ == "__main__":
    generate_icons()
    print("\nAll icons generated successfully!")
    print("The icons are in: ios/App/App/Assets.xcassets/AppIcon.appiconset/")