import re
import json

def fix_file():
    with open('src/scripts/coworkingnewseed.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    data_str = content
    data_str = re.sub(r'export const newCoworkingSpaces\s*=\s*', '', data_str)
    data_str = re.sub(r'const newCoworkingSpaces\s*=\s*', '', data_str)
    data_str = re.sub(r'Batch \d+ \(\d+ spaces\)', '', data_str)
    
    # Replace anything like ], [ or ] , [ or ]\n[ or ]\n\n[ with ,
    data_str = re.sub(r'\]\s*,?\s*\[', ',', data_str)
    data_str = data_str.replace(';', '')

    objects = []
    depth = 0
    current_obj = ""
    in_string = False
    escape = False
    for char in data_str:
        if escape:
            escape = False
            if depth > 0: current_obj += char
            continue
            
        if char == '"':
            in_string = not in_string
            
        if char == '\\':
            escape = True
            
        if not in_string:
            if char == '{':
                if depth == 0:
                    current_obj = ""
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    current_obj += '}'
                    try:
                        objects.append(json.loads(current_obj))
                    except Exception:
                        pass
                    continue
        
        if depth > 0:
            current_obj += char

    print(f"Fallback parser found {len(objects)} items")
    data = objects

    with open('src/scripts/coworkingnewseed.ts', 'w', encoding='utf-8') as f:
        f.write('export const newCoworkingSpaces = [\n')
        for i, obj in enumerate(data):
            f.write(json.dumps(obj, indent=2))
            if i < len(data) - 1:
                f.write(',\n')
        f.write('\n];\n')
        
if __name__ == '__main__':
    fix_file()
