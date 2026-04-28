import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(path):
    document_text = []
    with zipfile.ZipFile(path) as docx:
        xml_content = docx.read('word/document.xml')
        tree = ET.XML(xml_content)
        # The text is inside <w:t> tags
        WORD_NAMESPACE = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
        PARA = WORD_NAMESPACE + 'p'
        TEXT = WORD_NAMESPACE + 't'
        for paragraph in tree.iter(PARA):
            texts = [node.text for node in paragraph.iter(TEXT) if node.text]
            if texts:
                document_text.append(''.join(texts))
    return '\n'.join(document_text)

if __name__ == '__main__':
    in_file = sys.argv[1]
    out_file = sys.argv[2]
    text = read_docx(in_file)
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(text)
