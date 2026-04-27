import sys
import os
import json
from Vision import VNRecognizeTextRequest, VNImageRequestHandler
from Cocoa import NSImage, NSURL
from Foundation import NSArray

def recognize_text(image_path):
    url = NSURL.fileURLWithPath_(image_path)
    image = NSImage.alloc().initWithContentsOfURL_(url)
    if not image:
        print(f"Could not load image {image_path}")
        return ""
    
    # Create request
    request = VNRecognizeTextRequest.alloc().init()
    request.setRecognitionLevel_(0) # 0 is accurate, 1 is fast
    request.setRecognitionLanguages_(["tr-TR", "en-US"])
    request.setUsesLanguageCorrection_(True)
    
    # Create handler
    handler = VNImageRequestHandler.alloc().initWithContentsOfURL_options_(url, None)
    
    error = None
    success = handler.performRequests_error_([request], error)
    if not success:
        print(f"Request failed: {error}")
        return ""
    
    results = request.results()
    text = ""
    for result in results:
        # Get top candidate
        candidates = result.topCandidates_(1)
        if candidates.count() > 0:
            text += candidates[0].string() + "\n"
            
    return text

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python apple_ocr.py <image_path>")
        sys.exit(1)
    
    print(recognize_text(sys.argv[1]))
