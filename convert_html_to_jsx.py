import re

html_path = r'D:\Downloads\CLADE DIRECTORY\inkforge-landing.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract body contents
body_match = re.search(r'<body>(.*?)<script>', content, re.DOTALL)
if body_match:
    body = body_match.group(1)
    
    # Simple regex replacements
    body = body.replace('class="', 'className="')
    body = body.replace('for="', 'htmlFor="')
    body = body.replace('<br>', '<br/>')
    body = body.replace('stroke-width', 'strokeWidth')
    
    # Handle simple inline styles roughly
    # style="opacity:0;animation:fadeIn 0.6s ease 0.8s forwards, floatBook 6s ease-in-out 1.4s infinite"
    def style_replacer(match):
        style_str = match.group(1)
        # simplistic approach: return as is, we will manually fix the rest if needed, 
        # but let's try to convert basic ones
        pairs = [p.strip() for p in style_str.split(';') if p.strip()]
        react_style = []
        for pair in pairs:
            if ':' in pair:
                key, val = pair.split(':', 1)
                key = key.strip()
                val = val.strip()
                # camelCase keys if they have hyphens, EXCEPT for CSS variables
                if key.startswith('--'):
                    camel_key = f"'{key}'"
                else:
                    parts = key.split('-')
                    camel_key = parts[0] + ''.join(p.title() for p in parts[1:])
                react_style.append(f"{camel_key}: '{val}'")
        return 'style={{' + ', '.join(react_style) + '}}'
        
    body = re.sub(r'style="(.*?)"', style_replacer, body)
    
    with open('temp_jsx.txt', 'w', encoding='utf-8') as f:
        f.write(body.strip())
    print("JSX extracted.")
else:
    print("No body found.")
