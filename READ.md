“SplitRight” — a web-based intelligent expense splitter that:
* Lets you scan/upload bills and auto-detect line items (OCR + NLP).
* Allows group member tagging per item (checkboxes beside each line).
* Handles:
   * Tax allocation per category 
   * Coupons/discounts splitting logic (flat vs. percentage vs. category-based)
   * Tip/service charge fairness
* Lets users track over time (e.g., weekly trip costs, flatmate bills).
* Exportable PDF summary + UPI links + QR codes to settle.
⚙️ Core Features (MVP):
* OCR-based bill itemization (Tesseract + Python/JS backend)
* Smart category-based tax split
* UI for selecting who shared what
* Real-time share preview (charts, values)
* History tracking + export options