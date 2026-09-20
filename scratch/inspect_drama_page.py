import email
import re

with open('Lottery Trio (2008) - MyDramaList.mhtml', 'rb') as f:
    msg = email.message_from_binary_file(f)

for part in msg.walk():
    if part.get_content_type() == 'text/html':
        payload = part.get_payload(decode=True).decode('utf-8', errors='ignore')
        print("HTML length:", len(payload))
        
        # Check canonical URL or og:url
        canonical = re.search(r'<link rel="canonical" href="([^"]*)"', payload)
        og_url = re.search(r'<meta property="og:url" content="([^"]*)"', payload)
        og_title = re.search(r'<meta property="og:title" content="([^"]*)"', payload)
        
        print("Canonical:", canonical.group(1) if canonical else "None")
        print("OG URL:", og_url.group(1) if og_url else "None")
        print("OG Title:", og_title.group(1) if og_title else "None")
        
        # Look for title and details in page body
        title_h1 = re.search(r'<h1 class="film-title[^"]*">(.*?)</h1>', payload, re.DOTALL)
        if title_h1:
            print("H1 title:", re.sub(r'<[^>]+>', ' ', title_h1.group(1)).strip())
        break
