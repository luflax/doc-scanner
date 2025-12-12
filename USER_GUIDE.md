# Document Scanner PWA - User Guide

Welcome to Document Scanner, a powerful Progressive Web App that transforms your smartphone into a professional document scanner with OCR capabilities.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Scanning Documents](#scanning-documents)
3. [Editing and Enhancing](#editing-and-enhancing)
4. [Extracting Text (OCR)](#extracting-text-ocr)
5. [Managing Documents](#managing-documents)
6. [Exporting and Sharing](#exporting-and-sharing)
7. [Offline Usage](#offline-usage)
8. [Troubleshooting](#troubleshooting)
9. [Tips and Best Practices](#tips-and-best-practices)

---

## Getting Started

### Installation

1. **Open in Browser**: Visit the app URL in your mobile browser (Chrome, Safari, or Firefox)
2. **Install as App**:
   - **iOS**: Tap the Share button → "Add to Home Screen"
   - **Android**: Tap the menu (⋮) → "Add to Home Screen" or "Install App"
3. **Grant Permissions**: Allow camera access when prompted

### First Launch

When you first open the app, you'll see the camera view. The app will automatically:
- Request camera permissions
- Detect your device capabilities
- Load necessary libraries

---

## Scanning Documents

### Basic Scanning

1. **Point Camera**: Aim your camera at the document
2. **Auto-Detection**: The app will automatically detect document edges (shown in green)
3. **Capture**: Tap the blue capture button when the document is properly framed

### Camera Tips

- **Lighting**: Ensure good lighting for best results
- **Angle**: Hold your phone parallel to the document
- **Distance**: Keep the entire document visible in the frame
- **Stability**: Hold steady or use a surface for support

### Manual vs Auto Mode

- **Auto Detection**: The app automatically finds document edges
- **Manual Adjustment**: After capture, you can drag corner handles to adjust the crop area

---

## Editing and Enhancing

### Adjusting Crop Area

1. After capturing, you'll see the **Crop View**
2. Drag the **corner handles** to adjust the document boundaries
3. The app will automatically correct perspective distortion
4. Tap **Continue** when satisfied

### Applying Filters

The app provides 9 enhancement filters optimized for different document types:

1. **Original** - No processing
2. **Document** - High contrast black & white (best for text documents)
3. **Grayscale** - Standard grayscale with sharpening
4. **Magic** - Auto-enhanced color (best for photos of documents)
5. **Whiteboard** - Optimized for whiteboard captures
6. **Book** - Optimized for book pages
7. **Receipt** - Enhanced for receipts and faded text
8. **Photo** - Color preservation mode
9. **Blueprint** - Inverted colors for special documents

### Manual Adjustments

Fine-tune your document with these controls:

- **Brightness**: Lighten or darken the image
- **Contrast**: Increase or decrease difference between light and dark areas
- **Saturation**: Adjust color intensity (color filters only)
- **Gamma**: Adjust mid-tone brightness

---

## Extracting Text (OCR)

### Performing OCR

1. After enhancing your document, tap **Extract Text**
2. Select your document's language (10 languages supported)
3. Wait for processing (typically 3-10 seconds)
4. Review and edit the extracted text

### Supported Languages

- English (eng)
- Spanish (spa)
- French (fra)
- German (deu)
- Portuguese (por)
- Italian (ita)
- Dutch (nld)
- Russian (rus)
- Chinese Simplified (chi_sim)
- Japanese (jpn)

### OCR Tips

- Use **Document** or **Grayscale** filter for best OCR accuracy
- Ensure text is horizontal and readable
- Higher resolution images produce better results
- The confidence score indicates text recognition quality

### Editing Extracted Text

- Edit text directly in the text box
- Formatting is preserved when exporting
- Use **Copy** to copy all text to clipboard
- Use **Share** to send text to other apps

---

## Managing Documents

### Saving Documents

1. After enhancement or OCR, tap **Save to Documents**
2. Enter a document name
3. Add optional tags for organization
4. Your document is saved locally on your device

### Viewing Documents

1. Tap **Documents** in the bottom navigation
2. View all saved documents in a grid
3. See thumbnails, names, dates, and page counts

### Multi-Page Documents

1. Open a saved document
2. Tap **Add Page** to scan additional pages
3. Drag pages to reorder them
4. Delete unwanted pages with the trash icon

### Searching Documents

- Use the search bar to find documents by:
  - Document name
  - Tags
  - Extracted text (OCR content)

### Document Tags

- Add tags for easy categorization (e.g., "Receipt", "Work", "Personal")
- Filter documents by tags
- Multiple tags per document supported

---

## Exporting and Sharing

### Export Formats

Choose from multiple export formats:

1. **PDF** - Single or multi-page PDF documents
2. **PNG** - Lossless image format
3. **JPEG** - Compressed image format
4. **Text** - Plain text or Markdown (from OCR)

### PDF Options

- **Page Size**: A4, Letter, Legal, or Original
- **Quality**: Low, Medium, High, or Original
- **OCR Layer**: Include searchable text layer (requires OCR)
- **Compression**: Enable to reduce file size

### Image Options

- **Format**: PNG (lossless) or JPEG (smaller size)
- **Quality**: Adjust JPEG quality (1-100%)
- **Max Dimension**: Limit maximum width/height

### Export Presets

Quick export configurations for common scenarios:

- **Email** - Medium quality, A4 PDF
- **Print** - High quality, Letter PDF
- **Archive** - Original quality, searchable PDF
- **Mobile** - Low quality, compressed for mobile sharing
- **Design** - Original PNG for editing
- **Notes** - Markdown text with metadata

### Sharing Methods

- **Web Share API**: Share directly to other apps (if supported)
- **Download**: Save to your device's downloads folder
- **Copy**: Copy text to clipboard (text exports only)

---

## Offline Usage

### Offline Capabilities

The app works fully offline after initial load:

- ✅ Camera capture
- ✅ Edge detection
- ✅ Crop and enhance
- ✅ OCR (with cached languages)
- ✅ Document management
- ✅ Export to PDF/Image

### Offline Limitations

- ❌ Loading new OCR language packs (requires internet)
- ❌ Initial app installation
- ❌ Library updates

### Offline Indicator

When offline, you'll see a yellow banner at the top:
"You're offline. Some features may not be available."

---

## Troubleshooting

### Camera Issues

**Problem**: Camera permission denied
- **Solution**: Check browser settings and allow camera access
- Go to browser settings → Site permissions → Camera

**Problem**: Camera not found
- **Solution**: Ensure your device has a camera and it's not being used by another app

**Problem**: Camera preview is black
- **Solution**: Refresh the page, or close other apps using the camera

### Storage Issues

**Problem**: "Storage quota exceeded" error
- **Solution**: Delete old documents or export them to free space
- Check storage usage in the Documents view

**Problem**: Documents not saving
- **Solution**: Check browser storage permissions
- Clear browser cache and try again

### Processing Issues

**Problem**: Edge detection not working
- **Solution**: Ensure good lighting and document is fully visible
- Try manual corner adjustment in crop view

**Problem**: OCR producing poor results
- **Solution**: Use Document or Grayscale filter before OCR
- Ensure text is clear and horizontal
- Try a higher resolution scan

**Problem**: App is slow or laggy
- **Solution**: Close other browser tabs
- Restart the app
- Your device may be low on memory

### General Issues

**Problem**: App won't load
- **Solution**: Clear browser cache and reload
- Ensure you have a stable internet connection for first load
- Try a different browser

**Problem**: Features not working after update
- **Solution**: Refresh the page (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
- Clear app data and reinstall

---

## Tips and Best Practices

### For Best Scan Quality

1. **Lighting**: Natural daylight or bright white light works best
2. **Background**: Use a contrasting background (dark surface for white paper)
3. **Flatness**: Flatten documents to avoid shadows and distortion
4. **Resolution**: Get as close as possible while keeping entire document in frame
5. **Stability**: Use a tripod or steady surface if available

### For Best OCR Results

1. **Filter**: Use Document or Grayscale filter
2. **Text Size**: Ensure text is at least 10pt in the captured image
3. **Orientation**: Keep text horizontal
4. **Quality**: Use higher resolution for small text
5. **Language**: Select the correct language before processing

### For Efficient Document Management

1. **Naming**: Use descriptive names with dates (e.g., "Invoice_2024-01-15")
2. **Tags**: Consistently tag documents for easy searching
3. **Multi-page**: Combine related pages into one document
4. **Regular Exports**: Export and backup important documents regularly
5. **Storage**: Monitor storage usage and clean up old documents

### Performance Tips

1. **Memory**: Close the app after processing large batches
2. **Battery**: Camera and processing are battery-intensive
3. **Updates**: Keep your browser updated for best performance
4. **Cache**: Clear browser cache if app becomes sluggish

---

## Keyboard Shortcuts

- **Space**: Capture photo (camera view)
- **Enter**: Continue/Confirm
- **Esc**: Go back/Cancel
- **Arrow Keys**: Navigate between pages (document detail view)
- **Delete**: Delete selected page/document (with confirmation)

---

## Privacy and Security

- **Local Storage**: All documents are stored locally on your device
- **No Cloud**: No data is sent to external servers
- **Camera**: Camera access is only used for capturing documents
- **Offline**: App works completely offline after initial load
- **HTTPS**: App requires secure HTTPS connection

---

## Support and Feedback

For issues, questions, or feature requests:
- Check this guide first
- Review the troubleshooting section
- Report issues on the project's GitHub page

---

**Version**: 1.0
**Last Updated**: December 2024

Thank you for using Document Scanner! 📄📸
