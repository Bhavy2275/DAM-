
import os
import sys
import shutil

def cleanup_v3(target_path):
    if not os.path.exists(target_path):
        print(f"Error: File not found: {target_path}")
        sys.exit(1)

    # 1. Create a safe backup
    backup_path = target_path + ".bak"
    try:
        shutil.copy2(target_path, backup_path)
        print(f"Backup created: {backup_path}")
    except Exception as e:
        print(f"Backup failed: {e}")
        return

    # 2. Read lines with safer decoding
    try:
        with open(target_path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
        
        if any('\ufffd' in line for line in lines):
            print("Warning: Unicode replacement character detected. Some bytes were not decodable.")
    except Exception as e:
        print(f"Read error: {e}")
        return

    new_lines = []
    for line in lines:
        # Replacement rules
        if 'Ã¢Å“Â' in line:
            line = line.replace('Ã¢Å“Â  ATTRS', '✎ ATTRS')
        if 'Ã¢Å¡Â Ã¯¸' in line:
            line = line.replace("icon: 'Ã¢Å¡Â Ã¯¸ '", "icon: '⚠️'")
        if 'Ã°Å¸â€œÂ' in line:
            line = line.replace("'Ã°Å¸â€œÂ  Polar'", "'📍 Polar'")
        if 'Ã¢â€ â€™' in line:
            line = line.replace('Ã¢â€ â€™', '→')
        if 'â‚¹' in line:
            line = line.replace('â‚¹', '₹')
        if 'Ã¢â€šÂ¹' in line:
            line = line.replace('Ã¢â€šÂ¹', '₹')
        if 'Ã¢â‚¬â€' in line:
            line = line.replace('Ã¢â‚¬â€', '—')
        if 'Ã‚Â°' in line:
            line = line.replace('Ã‚Â°', '°')
        if 'Ã¢â€â‚¬' in line:
            line = line.replace('Ã¢â€â‚¬', '──')
        
        # General cleanup of corrupted comment banners
        if line.strip().startswith('// Ã¢â€'):
            line = '    // ─────────────────────────────────────────────────────────────────────────────\n'
        
        new_lines.append(line)

    # 3. Atomic write with temporary file
    temp_path = target_path + ".tmp"
    try:
        with open(temp_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
            f.flush()
            os.fsync(f.fileno())
        
        os.replace(temp_path, target_path)
        print(f"Surgical cleanup (v3) complete for {target_path}")
    except Exception as e:
        print(f"Write failed: {e}. Original file preserved.")
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python nuclear_cleanup_v3.py <target_file_path>")
        sys.exit(1)
    
    target = sys.argv[1]
    cleanup_v3(target)
