# 🧠 AI SmartQuizzer – Adaptive AI-Based Quiz Generator  

![Python](https://img.shields.io/badge/Python-3.11-blue)
![Flask](https://img.shields.io/badge/Flask-Framework-green)
![License](https://img.shields.io/badge/License-MIT-orange)
![Database](https://img.shields.io/badge/SQLite-Database-lightgrey)
![Status](https://img.shields.io/badge/Status-Active-success)

---
## 📘 Overview  
**AI SmartQuizzer** is an intelligent, adaptive quiz generation web application that personalizes learning experiences using AI.  
It dynamically generates questions from educational content (PDFs, URLs, or text) and adjusts quiz difficulty based on the learner’s performance.  

This project bridges the gap between **static quizzes** and **adaptive, AI-driven learning**, making self-assessment smarter and more engaging.

---

## 🚀 Features  

✅ **Dynamic Question Generation** – Automatically creates diverse question types (MCQs, True/False, Fill-in-the-Blank).  
✅ **Adaptive Learning Engine** – Adjusts difficulty and question types based on user performance.  
✅ **Content Upload Support** – Upload PDFs, paste text, or fetch online content for question generation.  
✅ **AI-Powered Question Logic** – Uses **Groq API** for intelligent question generation.  
✅ **Web Scraping Support** – Extracts clean text from web pages using BeautifulSoup4.  
✅ **User Profiles & Performance Tracking** – Tracks accuracy and progress using SQLite.  
✅ **Responsive Interface** – Built using HTML, CSS, and JavaScript for a clean user experience.  

---


## 🛠️ Tech Stack  

| Category | Technologies Used |
|-----------|------------------|
| **Frontend** | HTML5, CSS3, JavaScript |
| **Backend** | Flask, Werkzeug |
| **Database** | SQLite (via Flask-SQLAlchemy) |
| **AI & NLP** | Groq API |
| **File Handling** | PyMuPDF (fitz) |
| **Web Scraping** | BeautifulSoup4, Requests |
| **Configuration** | python-dotenv |
| **Deployment** | Docker-ready Flask app |

---

## ⚙️ Modules Implemented  

### 1️⃣ User & Profile Management  
- Registration and login functionality.  
- Stores user preferences such as subject, difficulty level, and performance history.  

### 2️⃣ Content Extraction & Parsing  
- Upload PDF or provide URLs for content input.  
- Uses **PyMuPDF** for PDF parsing and **BeautifulSoup4** for web content extraction.  

### 3️⃣ Question Generator Engine  
- Utilizes **Groq API** to create question sets based on extracted content.  
- Supports multiple question formats like MCQs, True/False, and fill-in-the-blank.  

### 4️⃣ Adaptive Learning Engine  
- Tracks performance (accuracy, response time).  
- Dynamically adjusts future question difficulty.  

### 5️⃣ Quiz Interface  
- Clean and responsive web UI built using HTML, CSS, and JavaScript.  
- Displays adaptive questions, progress, and live scoring.  

### 6️⃣ Admin Dashboard (Optional)  
- Manage users, questions, and feedback.  
- Monitor system usage and flagged questions.  

---

## ⚙️ Installation & Setup  

1️⃣ Clone the Repository  
git clone https://github.com/<your-username>/AI-SmartQuizzer.git  
cd AI-SmartQuizzer  
2️⃣ Create a Virtual Environment    
python -m venv venv  
3️⃣ Activate the Virtual Environment    
Linux / macOS  
source venv/bin/activate  

Windows (PowerShell)  
venv\Scripts\Activate.ps1  

Windows (CMD)  
venv\Scripts\activate  

4️⃣ Install Dependencies  
pip install -r requirements.txt  

5️⃣ Set Up Environment Variables  

Create a .env file in your project root and add:  

GROQ_API_KEY=your_groq_api_key_here  
FLASK_ENV=development  
DATABASE_URL=sqlite:///quizzer.db   

Note: Replace your_groq_api_key_here with your actual API key from Groq  
For production deployment, change FLASK_ENV=production.  

### 6️⃣ Run the Application  
flask run  

Visit the app at:  
👉 http://127.0.0.1:5000  

## 📊 Results & Achievements  

✅ Successfully generates adaptive quizzes from text, PDF, and web content.  
✅ Tracks learner performance and adjusts future questions automatically.  
✅ Provides a clean, responsive, and user-friendly web interface.  
✅ Designed with a modular Flask + SQLite architecture for scalability.  

## 🔮 Future Enhancements  

🌐 Integration with OpenAI / Gemini APIs for enhanced NLP and content generation.  
🗣️ Multilingual support for quizzes in multiple languages.  
🎮 Gamified learning – badges, streaks, and leaderboards.  
📈 Analytics dashboard – visualize progress and quiz statistics.  
🧩 Image-based question extraction using OCR techniques.  

## 👩‍💻 Contributors  

## 🪪 License  

This project is open-source and available under the MIT License.  
