# 🧾 SplitRight – Intelligent Bill Splitting App

> Scan it. Split it. Settle it.  
> A mobile-based, AI-enhanced expense splitter that makes shared billing effortless.

---

## 🚀 Overview

**SplitRight** is a modern bill-splitting app designed to eliminate the awkward math, confusion, and unfairness of shared expenses. Whether it's a weekly groceries run, a dinner with friends, or a long group trip — SplitRight helps users scan bills, assign items, split taxes and discounts fairly, and settle up, fast.

---

## ✨ Key Features

### 📸 OCR + NLP Powered
- **Bill Scanning:** Upload or take a photo of the bill.
- **AI Detection:** Automatically extracts line items, prices, and structure using OCR + NLP.

### 👥 Item-Level Group Tagging
- **Checkbox interface:** Tag friends to each item based on who ordered what.
- **Smart preview:** Real-time calculation of individual shares, including tax/tips.

### 🧾 Advanced Expense Handling
- **Tax Handling:** Split taxes fairly by category (food vs. drinks, etc.).
- **Discount Logic:** Choose flat, percentage, or category-specific discount application.
- **Service Charges:** Tip/charge apportioning based on share value or evenly.

### 📊 Visual & Exportable
- **Real-time Charts:** Visual breakdown of who owes what.
- **Export Options:** Generate shareable PDFs, UPI payment links, and QR codes for fast settlement.

### 🕰️ Tracking & History
- **Auto-Save Bills:** Track expenses across flatmates, travel groups, or office teams.
- **Group View:** Filter bills by group, category, or date range.

---

## ⚙️ MVP Architecture

| Layer      | Tech Stack             | Purpose                                      |
|------------|------------------------|----------------------------------------------|
| Frontend   | React Native + Expo    | Mobile/web UI with OCR camera integration    |
| OCR Engine | Google Cloud Vision API   | Extracts text from scanned receipts  |
| Backend    | Node.js  | Text parsing, NLP tagging, logic processing |
| Storage    | Firebase      | Stores bills, users, split metadata          |
| Export     | HTML → PDF generator + QR/UPI Generator | Shareable reports                     |

---

## 🧠 Core MVP Functionality

- ✅ **OCR Bill Parsing**  
  Extract line items, prices, tax, and discounts from scanned or uploaded images.

- ✅ **Group Share Assignment**  
  Users can select who's paying for what via checkboxes beside each line item.

- ✅ **Discount Engine**  
  Choose between flat, percentage, or custom discount and tax splits.

- ✅ **Fair Charges Split**  
  Tip/service charge and taxes can be split evenly or proportionally to each person’s share.

- ✅ **History & Export**  
  Save and revisit past bills. Export as PDF with per-person breakdown, UPI links, and QR codes.

---

## 🧠 Limitations

1. **Single Payer Support**  
   - Only one person can be marked as the payer per bill. Multi-payer handling is not yet implemented.

2. **Single Bill per Group**  
   - Each group currently supports only one active bill. Additional or recurring bills per group are on the roadmap.

3. **OCR Sensitivity**  
   - OCR parsing works best with high-quality images and a clear "Item Name – Item Amount" structure. Poor lighting, blurry images, or misaligned text can lead to inaccurate item detection.

> These limitations will be addressed in future updates (if i get the time).

---

## 🛠️ How to Run Locally

> Prerequisites: Node.js, npm, Google Cloud Vision API key

```bash
# 1. Clone the repo
git clone https://github.com/Dhar15/SplitRight.git
cd SplitRight

# 2. Install dependencies
npm install

# 3. Set up API key
echo "GOOGLE_API_KEY=your_api_key_here" > .env

# 4. Start Expo
npx expo start
