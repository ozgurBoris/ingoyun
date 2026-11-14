import pypdf
import re
import json
import os

reader = pypdf.PdfReader('C:/Users/ozgurbaris/Desktop/60gun.pdf')

def clean_text(t):
    if not t:
        return ""
    # normalize spaces
    t = re.sub(r'\s+', ' ', t).strip()
    return t

days_data = []

for day in range(1, 55):
    start_p = 9 + (day - 1) * 7 - 1
    
    # 1. First get the 20 words from the overview table on first page of the day
    first_p_txt = reader.pages[start_p].extract_text()
    
    # Extract entries from the 4 pages of definitions
    day_entries = []
    
    # Combine the 4 pages
    combined_pages = []
    for p in range(start_p, start_p + 4):
        combined_pages.append(reader.pages[p].extract_text())
    
    full_day_text = '\n'.join(combined_pages)
    
    # Let's split into lines and find all lines with 'Türkçe Karşılığı'
    lines = full_day_text.split('\n')
    
    found_indices = []
    for idx, line in enumerate(lines):
        if re.search(r'\d*\s*Türkçe Karşılığı\s*:', line, re.IGNORECASE):
            found_indices.append(idx)
            
    for i, idx in enumerate(found_indices):
        line = lines[idx]
        m_tr = re.search(r'\d*\s*Türkçe Karşılığı\s*:\s*(.+)', line, re.IGNORECASE)
        meaning = clean_text(m_tr.group(1)) if m_tr else ""
        
        # Look backwards for the word line
        prev_line = ""
        k = idx - 1
        while k >= 0:
            cand = lines[k].strip()
            if cand and not any(ign in cand for ign in ['iremyayincilik', 'SUAT GÜRCAN', '60 GÜNDE YDS']):
                prev_line = cand
                break
            k -= 1
            
        m_wp = re.search(r'^([^\(]+?)(?:\s*\((.+)\))?$', prev_line)
        raw_word = prev_line
        pos = ""
        if m_wp:
            raw_word = m_wp.group(1).strip()
            pos = m_wp.group(2).strip() if m_wp.group(2) else ""
            
        # Clean word and determine clean letters for the grid
        # E.g. "INDIFFERENT to" -> main: "INDIFFERENT", prep: "to"
        # "TAKE sth.INTO ACCOUNT" -> main: "TAKE INTO ACCOUNT"
        # "RANGE from…to" -> main: "RANGE", prep: "from…to"
        
        # Remove "sth." or "sb."
        display_word = re.sub(r'\bsth\.?\b|\bsb\.?\b', '', raw_word, flags=re.IGNORECASE).strip()
        display_word = re.sub(r'\s+', ' ', display_word)
        
        # Check if there is a lowercase preposition/particles at end
        m_prep = re.search(r'^([A-Z\s\-\’\']+?)\s+([a-z\/\.\…\’\s]+)$', display_word)
        if m_prep and len(m_prep.group(1).strip()) >= 3:
            main_part = m_prep.group(1).strip()
            prep_part = m_prep.group(2).strip()
            display_word = f"{main_part} ({prep_part})"
            clean_word = re.sub(r'[^A-Z]', '', main_part.upper())
        else:
            clean_word = re.sub(r'[^A-Z]', '', display_word.upper())
            
        # Extract example, translation, synonyms, antonyms from text between this and next entry
        end_idx = found_indices[i + 1] if i + 1 < len(found_indices) else len(lines)
        block_text = '\n'.join(lines[idx:end_idx])
        
        example_en = ""
        example_tr = ""
        synonyms = ""
        antonyms = ""
        
        m_ex = re.search(r'Örnek Cümle(?:\s*\d+)?\s*:\s*(.+?)(?=(?:Çevirisi|Örnek Cümle|Eş ya da|Zıt Anlamlılar|Diğer Halleri|$))', block_text, re.DOTALL | re.IGNORECASE)
        if m_ex:
            example_en = clean_text(m_ex.group(1))
            
        m_ex_tr = re.search(r'Çevirisi\s*:\s*(.+?)(?=(?:Örnek Cümle|Eş ya da|Zıt Anlamlılar|Diğer Halleri|$))', block_text, re.DOTALL | re.IGNORECASE)
        if m_ex_tr:
            example_tr = clean_text(m_ex_tr.group(1))
            
        m_syn = re.search(r'Eş ya da Yakın Anlamlılar\s*:\s*(.+?)(?=(?:Zıt Anlamlılar|Diğer Halleri|$))', block_text, re.DOTALL | re.IGNORECASE)
        if m_syn:
            synonyms = clean_text(m_syn.group(1))
            
        m_ant = re.search(r'Zıt Anlamlılar\s*:\s*(.+?)(?=(?:Diğer Halleri|$))', block_text, re.DOTALL | re.IGNORECASE)
        if m_ant:
            antonyms = clean_text(m_ant.group(1))
            
        day_entries.append({
            "id": f"{day}_{len(day_entries)+1}",
            "rawWord": raw_word,
            "displayWord": display_word,
            "cleanWord": clean_word,
            "pos": pos,
            "meaning": meaning,
            "example": example_en,
            "exampleTr": example_tr,
            "synonyms": synonyms,
            "antonyms": antonyms
        })
        
    days_data.append({
        "day": day,
        "title": f"{day}. Gün",
        "wordCount": len(day_entries),
        "words": day_entries
    })

out_path = 'C:/Users/ozgurbaris/Desktop/ingoyun/words.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(days_data, f, ensure_ascii=False, indent=2)

print(f"Exported {len(days_data)} days to {out_path}")
total_words = sum(d["wordCount"] for d in days_data)
print(f"Total words: {total_words}")
for d in days_data[:3]:
    print(f"Day {d['day']}: {len(d['words'])} words")
    for w in d['words'][:3]:
        print(f"   {w['displayWord']} [{w['cleanWord']}] ({w['pos']}) : {w['meaning']}")
