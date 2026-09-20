import email
import re

with open('Search results for lottery - MyDramaList.mhtml', 'rb') as f:
    msg = email.message_from_binary_file(f)

for part in msg.walk():
    if part.get_content_type() == 'text/html':
        payload = part.get_payload(decode=True).decode('utf-8', errors='ignore')
        
        # Find all boxes with id="mdl-\d+"
        items = re.findall(r'<div id="mdl-(\d+)" class="box">(.*?)</div>\s*</div>\s*</div>', payload, re.DOTALL)
        print(f"Found {len(items)} items with id=mdl-XXXX")
        
        for mdl_id, content in items[:5]:
            # Title & Link
            title_match = re.search(r'<h6 class="text-primary title"><a href="([^"]*)">([^<]*)</a>', content)
            href = title_match.group(1) if title_match else ''
            title = title_match.group(2) if title_match else ''
            
            # Subtitle / year / type
            muted_match = re.search(r'<span class="text-muted">([^<]*)</span>', content)
            muted = muted_match.group(1) if muted_match else ''
            
            print(f"ID: {mdl_id} | Title: {title} | Muted: {muted} | URL: {href}")
        break
