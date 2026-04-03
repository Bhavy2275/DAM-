
import os
import sys
import shutil

def fix_symbols(target_path):
    if not os.path.exists(target_path):
        print(f"Error: {target_path} is not a valid path.")
        return

    # 1. Create a safe backup
    backup_path = target_path + ".bak"
    try:
        shutil.copy2(target_path, backup_path)
        print(f"Backup created: {backup_path}")
    except Exception as e:
        print(f"Backup failed: {e}")
        return

    # 2. Open file with replace errors
    with open(target_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # 3. Apply text-level replacements
    replacements = [
        ("Ã¢Å“Â  ATTRS", "✎ ATTRS"),
        ("Ã¢â€ â€™ Edit", "→ Edit"),
        ("Ã¢Å¡Â Ã¯¸ '", "⚠️'"),
        ("Ã°Å¸â€œÂ  Polar", "📍 Polar"),
        ("Ã¢â€â‚¬", "──"),
        ("â‚¹", "₹"),
        ("Ã¢â€šÂ¹", "₹"),
    ]

    for bad, good in replacements:
        if bad in content:
            content = content.replace(bad, good)

    # 4. Save with atomic write (implied by simple overwrite if errors were caught)
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(content)
        print(f"Fixed symbols in {target_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fix_symbols.py <target_file_path>")
        sys.exit(1)
    
    target = sys.argv[1]
    fix_symbols(target)
