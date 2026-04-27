import sys
from Quartz import PDFDocument
from Cocoa import NSURL

def extract_text(pdf_path):
    url = NSURL.fileURLWithPath_(pdf_path)
    doc = PDFDocument.alloc().initWithURL_(url)
    if not doc:
        print(f"Could not open {pdf_path}")
        return
    
    full_text = ""
    for i in range(doc.pageCount()):
        page = doc.pageAtIndex_(i)
        text = page.string()
        if text:
            full_text += text + "\n"
    print(full_text)

if __name__ == "__main__":
    extract_text(sys.argv[1])
