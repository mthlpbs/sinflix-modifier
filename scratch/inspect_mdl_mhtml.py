import email
import re

def inspect(file_path):
    print("=== Inspecting:", file_path)
    with open(file_path, 'rb') as f:
        msg = email.message_from_binary_file(f)

    for part in msg.walk():
        if part.get_content_type() == 'text/html':
            payload = part.get_payload(decode=True).decode('utf-8', errors='ignore')
            print("HTML length:", len(payload))
            
            # Find item blocks
            # Check for <div class="box"> or <div class="box-body"> or media items
            boxes = re.findall(r'<div[^>]*class="[^"]*box[^"]*"[^>]*>(.*?)</div>\s*</div>', payload, re.DOTALL)
            print("Boxes count:", len(boxes))
            
            # Look for titles
            titles = re.findall(r'<h6[^>]*>(.*?)</h6>', payload, re.DOTALL)
            print("Titles found:", len(titles))
            for t in titles[:10]:
                clean_t = re.sub(r'<[^>]+>', ' ', t).strip()
                print("  Title:", clean_t)
                
            # Look for links
            links = re.findall(r'<a\s+href="([^"]*)"[^>]*>(.*?)</a>', payload, re.DOTALL)
            print("Total links:", len(links))
            drama_links = []
            for href, text in links:
                if re.search(r'/\d+-[^"]+', href):
                    clean_txt = re.sub(r'<[^>]+>', ' ', text).strip()
                    if clean_txt and not clean_txt.startswith('<img'):
                        drama_links.append((href, clean_txt))
            print("Drama links found:", len(drama_links))
            for href, text in drama_links[:10]:
                print(f"  {href} -> {text}")
                
            # Let's inspect the snippet around the first result
            if drama_links:
                first_href = drama_links[0][0]
                idx = payload.find(first_href)
                if idx != -1:
                    snippet = payload[max(0, idx-200):idx+800]
                    print("\n--- Snippet around first result ---")
                    print(snippet)
            break

inspect("Search results for lottery - MyDramaList.mhtml")
inspect("Lottery Trio (2008) - MyDramaList.mhtml")
