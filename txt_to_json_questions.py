import json
import os

txt_file = "questions.txt"
json_file = "questions.json"

questions = []

if os.path.exists(txt_file):
    with open(txt_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and "|" in line:
                q_type, template = line.split("|", 1)
                questions.append({
                    "type": q_type.strip(),
                    "template": template.strip()
                })

    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=4, ensure_ascii=False)

    print(f"{len(questions)} questions copied to {json_file} (TXT file remains untouched).")
else:
    print(f"File {txt_file} not found.")
