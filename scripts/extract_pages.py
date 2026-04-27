import sys
import os
from Quartz import PDFDocument
from Cocoa import NSURL, NSSize, NSData, NSImage, NSBitmapImageRep, NSPNGFileType

def pdf_to_images(pdf_path, output_dir):
    url = NSURL.fileURLWithPath_(pdf_path)
    doc = PDFDocument.alloc().initWithURL_(url)
    if not doc:
        print(f"Could not open {pdf_path}")
        return
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    for i in range(doc.pageCount()):
        page = doc.pageAtIndex_(i)
        page_rect = page.boundsForBox_(0) # 0 is kPDFDisplayBoxMediaBox
        
        # Create image from page
        image = page.thumbnailOfSize_forBox_(NSSize(page_rect.size.width * 4, page_rect.size.height * 4), 0)
        
        # Save image
        tiff_data = image.TIFFRepresentation()
        
        output_path = os.path.join(output_dir, f"page_{i+1}.png")
        
        # Actually, let's use a more direct way in Python
        image_rep = NSBitmapImageRep.imageRepWithData_(tiff_data)
        png_data = image_rep.representationUsingType_properties_(NSPNGFileType, None)
        png_data.writeToFile_atomically_(output_path, True)
        print(f"Saved {output_path}")

if __name__ == "__main__":
    pdf_to_images(sys.argv[1], sys.argv[2])
