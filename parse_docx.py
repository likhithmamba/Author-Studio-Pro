import zipfile
import xml.etree.ElementTree as ET
import sys

def main():
    try:
        with zipfile.ZipFile(r'D:\Downloads\CLADE DIRECTORY\Author_Studio_Pro_Final_Report.docx') as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.XML(xml_content)
            
            with open('extracted_report.txt', 'w', encoding='utf-8') as f:
                for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                    # get all texts recursively inside this paragraph
                    texts = []
                    for t in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                        if t.text:
                            texts.append(t.text)
                    if texts:
                        f.write("".join(texts) + "\n")
        print("Success")
    except Exception as e:
        print("Error:", repr(e))

if __name__ == '__main__':
    main()
