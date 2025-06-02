#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFont
import io

def create_purple_favicon(size):
    """Create a purple QC favicon at the specified size."""
    # Create a new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Define purple gradient colors
    purple_dark = (107, 70, 193)  # #6b46c1
    purple_mid = (124, 58, 237)   # #7c3aed
    purple_light = (139, 92, 246)  # #8b5cf6
    
    # Draw rounded rectangle background
    radius = int(size * 0.15)
    
    # Create a rounded rectangle
    draw.rounded_rectangle(
        [(0, 0), (size-1, size-1)],
        radius=radius,
        fill=purple_mid
    )
    
    # Draw text
    text = "QC"
    
    # Try to use a good font, fallback to default if not available
    font_size = int(size * 0.4)
    if size <= 32:
        font_size = int(size * 0.45)
    
    try:
        # Try to use a system font
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    # Get text bbox for centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]
    
    # Draw white text
    draw.text((x, y), text, fill=(255, 255, 255), font=font)
    
    return img

def generate_favicons():
    """Generate all required favicon sizes."""
    sizes = {
        'favicon-16x16.png': 16,
        'favicon-32x32.png': 32,
        'favicon-64x64.png': 64,
        'logo192.png': 192,
        'logo512.png': 512
    }
    
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
    
    for filename, size in sizes.items():
        img = create_purple_favicon(size)
        filepath = os.path.join(output_dir, filename)
        img.save(filepath, 'PNG')
        print(f"Created {filename} ({size}x{size})")
    
    # Create ICO file with multiple sizes
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    ico_images = []
    for size in ico_sizes:
        ico_images.append(create_purple_favicon(size[0]))
    
    ico_path = os.path.join(output_dir, 'favicon.ico')
    ico_images[0].save(ico_path, format='ICO', sizes=ico_sizes)
    print(f"Created favicon.ico with sizes: {ico_sizes}")

if __name__ == "__main__":
    try:
        generate_favicons()
        print("\nAll favicons generated successfully!")
    except Exception as e:
        print(f"Error generating favicons: {e}")
        print("\nTrying alternative method...")
        
        # Alternative method using basic shapes if PIL features are limited
        import numpy as np
        from PIL import Image
        
        def create_simple_favicon(size):
            # Create purple background
            img = Image.new('RGB', (size, size), (124, 58, 237))
            draw = ImageDraw.Draw(img)
            
            # Draw white "QC" text
            text = "QC"
            font_size = int(size * 0.35)
            
            # Use basic font
            font = ImageFont.load_default()
            
            # Estimate text position (centered)
            x = size // 4
            y = size // 3
            
            draw.text((x, y), text, fill=(255, 255, 255), font=font)
            
            return img
        
        # Generate basic versions
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
        
        # At least create the main favicon.ico
        img32 = create_simple_favicon(32)
        img32.save(os.path.join(output_dir, 'favicon.ico'), 'ICO')
        print("Created basic favicon.ico")
        
        # Create basic PNGs
        for name, size in [('logo192.png', 192), ('logo512.png', 512)]:
            img = create_simple_favicon(size)
            img.save(os.path.join(output_dir, name), 'PNG')
            print(f"Created basic {name}")