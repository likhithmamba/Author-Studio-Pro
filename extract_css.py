import re

html_path = r'D:\Downloads\CLADE DIRECTORY\inkforge-landing.html'
css_dest = r'src\components\LandingPage.css'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

css_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
if css_match:
    css = css_match.group(1)
    css = css.replace('group: true;', '')
    with open(css_dest, 'w', encoding='utf-8') as f:
        f.write(css.strip())
    print("CSS extracted successfully.")
else:
    print("No CSS found.")
