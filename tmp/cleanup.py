
import os
import sys
import shutil

def cleanup(target_path):
    if not os.path.isfile(target_path):
        print(f"Error: {target_path} is not a valid file.")
        return

    # 1. Create a safe backup
    backup_path = target_path + ".bak"
    try:
        shutil.copy2(target_path, backup_path)
        print(f"Backup created: {backup_path}")
    except Exception as e:
        print(f"Backup failed: {e}")
        return

    # 2. Read raw bytes
    with open(target_path, 'rb') as f:
        content = f.read()

    # 3. Apply byte-level replacements BEFORE decoding
    replacements = [
        (b'\xc3\x83\xc2\xa2\xc3\xa2\xe2\x82\xac\xc5\xa1\xc3\x82\xc2\xb9', b'\xe2\x82\xb9'), # â‚¹ -> ₹
        (b'\xc3\xa2\xe2\x80\x9a\xc2\xb9', b'\xe2\x82\xb9'), # â‚¹ -> ₹
    ]
    for old, new in replacements:
        content = content.replace(old, new)

    # 4. Decode with replace errors
    try:
        content_str = content.decode('utf-8', errors='replace')
        if '\ufffd' in content_str:
            print("Warning: Undecodable bytes were preserved as replacement characters (\ufffd).")
    except Exception as e:
        print(f"Error decoding file: {e}")
        return

    # 5. Apply text-level replacements
    text_replacements = [
        ("Ã°Å¸â€œÂ ", "📍"),
        ("Ã°Å¸â€“Â¼", "🖼️"),
        ("Ã°Å¸â€œâ€ž", "📄"),
        ("Ã¢â€â‚¬", "──"),
        ("â‚¹", "₹"),
        ("Ã¢â€šÂ¹", "₹"),
    ]
    for bad, good in text_replacements:
        if bad in content_str:
            content_str = content_str.replace(bad, good)

    # 6. Atomic save with temporary file
    temp_path = target_path + ".tmp"
    try:
        with open(temp_path, 'w', encoding='utf-8') as f:
            f.write(content_str)
            f.flush()
            os.fsync(f.fileno())
        
        # Use atomic replace
        os.replace(temp_path, target_path)
        print(f"Surgical cleanup complete for {target_path}")
    except Exception as e:
        print(f"Write failed: {e}. Original file remains at {target_path}.")
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python cleanup.py <target_file_path>")
        sys.exit(1)
    
    target = sys.argv[1]
    cleanup(target)
