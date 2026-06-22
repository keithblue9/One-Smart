"""Curated static data for One Smart PWA."""
from datetime import datetime, timezone, timedelta

# ============ SCHOLARSHIPS ============
# age_max = maximum age accepted (None = no upper limit)
SCHOLARSHIPS = [
    {
        "id": "chevening",
        "name": "Chevening Scholarship",
        "country": "United Kingdom",
        "country_code": "GB",
        "degree": "S2",
        "deadline": "2026-10-07",
        "age_min": 21,
        "age_max": None,
        "benefits": [
            "Tuition fees fully covered",
            "Monthly living stipend (~£1,500)",
            "Return economy flights",
            "Visa application costs",
            "Arrival allowance and thesis grant",
        ],
        "requirements": [
            "Warga negara Indonesia (atau negara yang eligible)",
            "Minimal 2 tahun pengalaman kerja (2,800 jam)",
            "Gelar S1 setara dengan UK undergraduate 2:1",
            "Diterima di 3 universitas berbeda di UK",
            "Memenuhi syarat bahasa Inggris (IELTS 6.5)",
            "Tidak ada batasan usia maksimal",
        ],
        "url": "https://www.chevening.org",
        "image": "https://images.pexels.com/photos/31656148/pexels-photo-31656148.jpeg",
    },
    {
        "id": "australia-awards",
        "name": "Australia Awards Scholarship",
        "country": "Australia",
        "country_code": "AU",
        "degree": "S2",
        "deadline": "2027-04-30",
        "age_min": 18,
        "age_max": 42,
        "benefits": [
            "Full tuition fees",
            "Tiket pulang pergi",
            "Establishment allowance AUD 5,000",
            "Contribution to Living Expenses (CLE)",
            "Overseas Student Health Cover (OSHC)",
            "Pre-course English (PCE)",
        ],
        "requirements": [
            "Berusia minimal 18 tahun saat 1 Februari tahun keberangkatan",
            "Berusia maksimal 42 tahun untuk PNS/swasta",
            "WNI dan tidak menikah dengan WN Australia/NZ",
            "IELTS 6.5 (no band below 6.0) atau TOEFL iBT 84",
            "IPK minimum 2.9 (umum) atau 2.75 (focus area)",
        ],
        "url": "https://www.australiaawardsindonesia.org",
        "image": "https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?w=800",
    },
    {
        "id": "daad-epos",
        "name": "DAAD EPOS Scholarship",
        "country": "Germany",
        "country_code": "DE",
        "degree": "S2",
        "deadline": "2026-09-30",
        "age_min": 21,
        "age_max": None,
        "benefits": [
            "Monthly stipend €934",
            "Health, accident, personal liability insurance",
            "Travel allowance",
            "Study & research allowance",
            "Rent subsidy & family allowance jika ada",
        ],
        "requirements": [
            "Pengalaman kerja minimal 2 tahun (untuk negara berkembang)",
            "S1 dengan IPK baik (umumnya >3.0)",
            "Gelar S1 tidak boleh lebih dari 6 tahun",
            "IELTS 6.0+ atau bukti bahasa Jerman (program spesifik)",
            "Tidak ada batasan usia maksimal eksplisit",
        ],
        "url": "https://www.daad.de",
        "image": "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800",
    },
    {
        "id": "lpdp",
        "name": "LPDP Reguler (Luar Negeri)",
        "country": "Multi-country",
        "country_code": "ID",
        "degree": "S2",
        "deadline": "2026-08-15",
        "age_min": 18,
        "age_max": 42,
        "benefits": [
            "Tuition fees full",
            "Living allowance bulanan sesuai kota tujuan",
            "Settlement allowance & buku",
            "Asuransi kesehatan",
            "Tiket pesawat PP",
            "Visa & tunjangan keluarga (S3)",
        ],
        "requirements": [
            "WNI",
            "Usia maksimal 35 tahun (S2 reguler), 42 tahun (PNS/TNI/Polri)",
            "S1 dari PT terakreditasi, IPK min 3.0",
            "LoA Unconditional dari universitas tujuan",
            "Skor bahasa: IELTS 6.5 / TOEFL iBT 80",
            "Esai kontribusi & komitmen kembali ke Indonesia",
        ],
        "url": "https://lpdp.kemenkeu.go.id",
        "image": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800",
    },
    {
        "id": "erasmus-mundus",
        "name": "Erasmus Mundus Joint Masters",
        "country": "Europe (Multi)",
        "country_code": "EU",
        "degree": "S2",
        "deadline": "2026-10-15",
        "age_min": 21,
        "age_max": None,
        "benefits": [
            "Tuition fees full + participation costs",
            "Monthly allowance €1,400",
            "Travel & installation costs",
            "Insurance contribution",
            "Belajar di 2-3 universitas Eropa",
        ],
        "requirements": [
            "Gelar S1 setara EU bachelor",
            "Tidak ada batasan usia formal",
            "English proficiency (IELTS 6.5+)",
            "Komitmen mobility ke beberapa negara EU",
            "2 letter of recommendation",
        ],
        "url": "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en",
        "image": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800",
    },
    {
        "id": "fulbright",
        "name": "Fulbright Foreign Student Program",
        "country": "United States",
        "country_code": "US",
        "degree": "S2",
        "deadline": "2026-10-15",
        "age_min": 21,
        "age_max": None,
        "benefits": [
            "J-1 visa sponsorship",
            "Round-trip airfare",
            "Tuition & fees full",
            "Monthly living stipend",
            "Health & accident insurance",
            "Book & settling-in allowance",
        ],
        "requirements": [
            "WNI, tidak punya green card / kewarganegaraan US",
            "S1 dengan IPK minimum 3.0",
            "TOEFL iBT 80+ atau IELTS 6.5",
            "Tidak ada batasan usia",
            "Komitmen kembali ke Indonesia 2 tahun",
        ],
        "url": "https://www.aminef.or.id",
        "image": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800",
    },
    {
        "id": "mext",
        "name": "MEXT Japanese Government Scholarship",
        "country": "Japan",
        "country_code": "JP",
        "degree": "S2",
        "deadline": "2027-05-31",
        "age_min": 18,
        "age_max": 34,
        "benefits": [
            "Tuition fees full",
            "Monthly stipend ¥144,000–145,000",
            "Round-trip airfare",
            "Tidak ada ikatan dinas",
            "Pre-arrival Japanese training",
        ],
        "requirements": [
            "Lahir setelah 2 April 1991 (usia maks 34)",
            "S1 dengan IPK 3.2+ (atau setara 80/100)",
            "TOEFL/IELTS atau JLPT N2+",
            "Sehat jasmani dan rohani",
        ],
        "url": "https://www.id.emb-japan.go.jp",
        "image": "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800",
    },
    {
        "id": "swedish-institute",
        "name": "Swedish Institute Scholarships for Global Professionals",
        "country": "Sweden",
        "country_code": "SE",
        "degree": "S2",
        "deadline": "2026-11-14",
        "age_min": 21,
        "age_max": None,
        "benefits": [
            "Tuition fee full",
            "Living costs SEK 12,000/bulan",
            "Travel grant SEK 15,000",
            "Insurance",
            "SI Network for Future Global Leaders",
        ],
        "requirements": [
            "Pengalaman kerja min 3,000 jam",
            "Bukti pengalaman kepemimpinan",
            "Diterima di program master eligible",
            "Tidak ada batas usia",
            "Komitmen leadership di home country",
        ],
        "url": "https://si.se/en/apply/scholarships/",
        "image": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=800",
    },
]

# ============ TOP COMPANIES (jobs) ============
TOP_COMPANIES = [
    {"id": "google", "name": "Google", "industry": "Technology", "location": "Mountain View, USA", "remote": True, "roles": ["Software Engineer", "Product Manager", "UX Designer", "Data Scientist"], "salary_usd": "150,000 - 350,000", "logo": "https://logo.clearbit.com/google.com", "url": "https://careers.google.com"},
    {"id": "meta", "name": "Meta", "industry": "Social / AR/VR", "location": "Menlo Park, USA", "remote": True, "roles": ["Software Engineer", "Research Scientist", "Designer"], "salary_usd": "160,000 - 400,000", "logo": "https://logo.clearbit.com/meta.com", "url": "https://www.metacareers.com"},
    {"id": "microsoft", "name": "Microsoft", "industry": "Cloud / AI", "location": "Redmond, USA", "remote": True, "roles": ["SDE", "Cloud Architect", "Program Manager"], "salary_usd": "140,000 - 320,000", "logo": "https://logo.clearbit.com/microsoft.com", "url": "https://careers.microsoft.com"},
    {"id": "apple", "name": "Apple", "industry": "Hardware / Software", "location": "Cupertino, USA", "remote": False, "roles": ["Hardware Engineer", "iOS Developer", "Designer"], "salary_usd": "150,000 - 380,000", "logo": "https://logo.clearbit.com/apple.com", "url": "https://www.apple.com/careers"},
    {"id": "amazon", "name": "Amazon / AWS", "industry": "E-commerce / Cloud", "location": "Seattle, USA", "remote": True, "roles": ["SDE", "Solutions Architect", "Product Manager"], "salary_usd": "130,000 - 320,000", "logo": "https://logo.clearbit.com/amazon.com", "url": "https://www.amazon.jobs"},
    {"id": "netflix", "name": "Netflix", "industry": "Streaming", "location": "Los Gatos, USA", "remote": True, "roles": ["Senior Engineer", "Data Engineer", "Content Strategist"], "salary_usd": "200,000 - 500,000", "logo": "https://logo.clearbit.com/netflix.com", "url": "https://jobs.netflix.com"},
    {"id": "nvidia", "name": "NVIDIA", "industry": "GPU / AI", "location": "Santa Clara, USA", "remote": True, "roles": ["AI Researcher", "GPU Engineer", "Solutions Architect"], "salary_usd": "180,000 - 450,000", "logo": "https://logo.clearbit.com/nvidia.com", "url": "https://www.nvidia.com/en-us/about-nvidia/careers/"},
    {"id": "openai", "name": "OpenAI", "industry": "AI Research", "location": "San Francisco, USA", "remote": True, "roles": ["Research Engineer", "ML Engineer", "Policy"], "salary_usd": "250,000 - 700,000", "logo": "https://logo.clearbit.com/openai.com", "url": "https://openai.com/careers"},
    {"id": "anthropic", "name": "Anthropic", "industry": "AI Safety", "location": "San Francisco, USA", "remote": True, "roles": ["ML Researcher", "Software Engineer"], "salary_usd": "300,000 - 800,000", "logo": "https://logo.clearbit.com/anthropic.com", "url": "https://www.anthropic.com/careers"},
    {"id": "spotify", "name": "Spotify", "industry": "Music Streaming", "location": "Stockholm, Sweden", "remote": True, "roles": ["Engineer", "Data Scientist", "Designer"], "salary_usd": "100,000 - 220,000", "logo": "https://logo.clearbit.com/spotify.com", "url": "https://www.lifeatspotify.com"},
    {"id": "atlassian", "name": "Atlassian", "industry": "SaaS / Productivity", "location": "Sydney, Australia", "remote": True, "roles": ["Engineer", "PM", "Designer"], "salary_usd": "110,000 - 240,000", "logo": "https://logo.clearbit.com/atlassian.com", "url": "https://www.atlassian.com/company/careers"},
    {"id": "shopify", "name": "Shopify", "industry": "E-commerce", "location": "Ottawa, Canada", "remote": True, "roles": ["Developer", "Designer", "Support Engineer"], "salary_usd": "120,000 - 260,000", "logo": "https://logo.clearbit.com/shopify.com", "url": "https://www.shopify.com/careers"},
    {"id": "stripe", "name": "Stripe", "industry": "Fintech", "location": "San Francisco / Dublin", "remote": True, "roles": ["Engineer", "Designer", "Risk Analyst"], "salary_usd": "150,000 - 350,000", "logo": "https://logo.clearbit.com/stripe.com", "url": "https://stripe.com/jobs"},
    {"id": "tesla", "name": "Tesla", "industry": "EV / Energy", "location": "Austin, USA", "remote": False, "roles": ["Engineer", "Manufacturing", "Designer"], "salary_usd": "120,000 - 280,000", "logo": "https://logo.clearbit.com/tesla.com", "url": "https://www.tesla.com/careers"},
    {"id": "siemens", "name": "Siemens", "industry": "Industrial / Energy", "location": "Munich, Germany", "remote": False, "roles": ["Engineer", "Project Manager", "Consultant"], "salary_usd": "80,000 - 180,000", "logo": "https://logo.clearbit.com/siemens.com", "url": "https://jobs.siemens.com"},
    {"id": "sap", "name": "SAP", "industry": "Enterprise Software", "location": "Walldorf, Germany", "remote": True, "roles": ["Developer", "Consultant", "Product Manager"], "salary_usd": "90,000 - 200,000", "logo": "https://logo.clearbit.com/sap.com", "url": "https://jobs.sap.com"},
]

# ============ FREELANCER SITES ============
FREELANCE_SITES = [
    {"id": "toptal", "name": "Toptal", "category": "Premium Talent", "rating": 4.7, "description": "Top 3% freelancer global. Very selective, high paying ($60-200/hour).", "url": "https://www.toptal.com", "logo": "https://logo.clearbit.com/toptal.com", "scam_risk": "Very Low"},
    {"id": "upwork", "name": "Upwork", "category": "General Marketplace", "rating": 4.3, "description": "Marketplace freelance global terbesar, semua skill level.", "url": "https://www.upwork.com", "logo": "https://logo.clearbit.com/upwork.com", "scam_risk": "Low"},
    {"id": "fiverr", "name": "Fiverr", "category": "Gig-based", "rating": 4.2, "description": "Sistem gig — Anda buat layanan, klien membeli. Cocok untuk creative & micro service.", "url": "https://www.fiverr.com", "logo": "https://logo.clearbit.com/fiverr.com", "scam_risk": "Low"},
    {"id": "freelancer", "name": "Freelancer.com", "category": "General Marketplace", "rating": 3.9, "description": "Bidding system. Banyak project tapi kompetisi tinggi.", "url": "https://www.freelancer.com", "logo": "https://logo.clearbit.com/freelancer.com", "scam_risk": "Medium"},
    {"id": "contra", "name": "Contra", "category": "Commission-free", "rating": 4.5, "description": "Independent platform — 0% commission. Cocok untuk designer & strategist.", "url": "https://contra.com", "logo": "https://logo.clearbit.com/contra.com", "scam_risk": "Very Low"},
    {"id": "99designs", "name": "99designs", "category": "Design", "rating": 4.4, "description": "Khusus designer (logo, branding, web). Contest & 1-on-1 project.", "url": "https://99designs.com", "logo": "https://logo.clearbit.com/99designs.com", "scam_risk": "Very Low"},
    {"id": "arc", "name": "Arc.dev", "category": "Developer-only", "rating": 4.6, "description": "Khusus developer remote, focus full-time & long-term.", "url": "https://arc.dev", "logo": "https://logo.clearbit.com/arc.dev", "scam_risk": "Very Low"},
    {"id": "we-work-remotely", "name": "We Work Remotely", "category": "Remote Jobs Board", "rating": 4.5, "description": "Job board untuk pekerjaan remote full-time & contract.", "url": "https://weworkremotely.com", "logo": "https://logo.clearbit.com/weworkremotely.com", "scam_risk": "Very Low"},
    {"id": "remoteok", "name": "Remote OK", "category": "Remote Jobs Board", "rating": 4.4, "description": "Salah satu job board remote terbesar dan paling aktif.", "url": "https://remoteok.com", "logo": "https://logo.clearbit.com/remoteok.com", "scam_risk": "Very Low"},
    {"id": "dribbble", "name": "Dribbble", "category": "Design", "rating": 4.5, "description": "Portfolio + freelance untuk designer kelas dunia.", "url": "https://dribbble.com", "logo": "https://logo.clearbit.com/dribbble.com", "scam_risk": "Very Low"},
]

# ============ STOCKS (Indonesia & Global) — curated picks for educational purpose ============
STOCKS_ID = [
    {"ticker": "BBCA", "name": "Bank Central Asia", "sector": "Banking", "price_idr": 10100, "change_pct": 0.5, "rec": "BUY", "rationale": "Bank swasta dengan ROE tertinggi di Indonesia, NPL rendah, ekspansi digital banking solid."},
    {"ticker": "BBRI", "name": "Bank Rakyat Indonesia", "sector": "Banking", "price_idr": 4480, "change_pct": -0.3, "rec": "BUY", "rationale": "Penetrasi UMKM tertinggi, dividend yield ~6%, valuasi P/E menarik."},
    {"ticker": "TLKM", "name": "Telkom Indonesia", "sector": "Telco", "price_idr": 2850, "change_pct": 0.2, "rec": "HOLD", "rationale": "Defensive stock, data center growth promising, tapi growth telco utama melambat."},
    {"ticker": "ASII", "name": "Astra International", "sector": "Conglomerate", "price_idr": 5025, "change_pct": 1.1, "rec": "BUY", "rationale": "Diversifikasi otomotif, perkebunan, infrastruktur. Cyclical play."},
    {"ticker": "GOTO", "name": "GoTo Gojek Tokopedia", "sector": "Tech", "price_idr": 86, "change_pct": -1.2, "rec": "SPECULATIVE BUY", "rationale": "Path to profitability mulai jelas, fintech tumbuh. Volatile, sizing matters."},
    {"ticker": "ANTM", "name": "Aneka Tambang", "sector": "Mining (Gold/Nickel)", "price_idr": 1635, "change_pct": 2.0, "rec": "BUY", "rationale": "Beneficiary nikel + emas. Harga emas global support."},
    {"ticker": "UNVR", "name": "Unilever Indonesia", "sector": "Consumer", "price_idr": 1810, "change_pct": -0.5, "rec": "HOLD", "rationale": "Brand kuat, dividend yield tinggi, tapi growth melambat."},
    {"ticker": "ICBP", "name": "Indofood CBP", "sector": "Consumer Staples", "price_idr": 11400, "change_pct": 0.7, "rec": "BUY", "rationale": "Defensive + ekspansi global Indomie. EM consumer play yang stabil."},
]

STOCKS_GLOBAL = [
    {"ticker": "NVDA", "name": "NVIDIA", "sector": "Semiconductor / AI", "price_usd": 138.0, "change_pct": 1.5, "rec": "BUY", "rationale": "AI infra leader. Data center demand structural. Watch valuation."},
    {"ticker": "MSFT", "name": "Microsoft", "sector": "Cloud / AI", "price_usd": 425.0, "change_pct": 0.4, "rec": "BUY", "rationale": "Azure + Copilot monetization on track. Quality compounder."},
    {"ticker": "GOOGL", "name": "Alphabet", "sector": "Search / Cloud", "price_usd": 192.0, "change_pct": 0.6, "rec": "BUY", "rationale": "Search resilient, YouTube + Cloud growth, Gemini momentum."},
    {"ticker": "AAPL", "name": "Apple", "sector": "Hardware / Services", "price_usd": 232.0, "change_pct": -0.3, "rec": "HOLD", "rationale": "Service revenue stable, iPhone cycle matters. Premium valuation."},
    {"ticker": "TSLA", "name": "Tesla", "sector": "EV / Energy", "price_usd": 380.0, "change_pct": 2.5, "rec": "HOLD", "rationale": "FSD progress + Energy growth, tapi volatile dan valuasi tinggi."},
    {"ticker": "BRK.B", "name": "Berkshire Hathaway", "sector": "Conglomerate", "price_usd": 470.0, "change_pct": 0.1, "rec": "BUY", "rationale": "Cash pile + Buffett discipline. Defensive quality."},
    {"ticker": "TSM", "name": "Taiwan Semiconductor", "sector": "Foundry", "price_usd": 195.0, "change_pct": 1.0, "rec": "BUY", "rationale": "Monopoly leading edge. Geopolitical risk dipertimbangkan."},
    {"ticker": "AMZN", "name": "Amazon", "sector": "E-commerce / AWS", "price_usd": 220.0, "change_pct": 0.5, "rec": "BUY", "rationale": "AWS recovery + ads growth. Margin expansion thesis."},
]

ALT_INVESTMENTS = [
    {"horizon": "Short Term (< 1 thn)", "options": [
        {"name": "Reksadana Pasar Uang", "yield": "5–6% p.a.", "risk": "Sangat Rendah", "note": "Likuid harian, cocok dana darurat & parking."},
        {"name": "Deposito BPR (LPS-protected)", "yield": "5.5–7% p.a.", "risk": "Rendah", "note": "Cek limit LPS (Rp 2 M / bank)."},
        {"name": "SBN Ritel (SBR/ST)", "yield": "6–7%", "risk": "Rendah", "note": "Floating rate, dijamin negara."},
    ]},
    {"horizon": "Mid Term (1–5 thn)", "options": [
        {"name": "Reksadana Pendapatan Tetap", "yield": "6–8% p.a.", "risk": "Sedang", "note": "Mix obligasi pemerintah & korporasi."},
        {"name": "ORI / Sukuk Ritel", "yield": "6.25–6.75%", "risk": "Rendah", "note": "Fixed coupon, dijual periodik."},
        {"name": "Emas Fisik / Digital", "yield": "Variable", "risk": "Sedang", "note": "Hedge inflasi & USD/IDR volatility."},
    ]},
    {"horizon": "Long Term (> 5 thn)", "options": [
        {"name": "Saham Blue Chip + DCA", "yield": "10–15% p.a. historis", "risk": "Tinggi", "note": "Beli rutin (Dollar Cost Avg) BBCA, BBRI, ASII."},
        {"name": "Reksadana Indeks (IDX30/LQ45)", "yield": "8–12% p.a.", "risk": "Tinggi", "note": "Murah, diversifikasi otomatis."},
        {"name": "ETF Global (VOO/VWRA)", "yield": "8–10% USD p.a.", "risk": "Tinggi", "note": "Akses pasar S&P500 / dunia."},
        {"name": "Properti (Lokasi Strategis)", "yield": "5–8% sewa + capital gain", "risk": "Sedang–Tinggi", "note": "Illiquid, butuh modal besar."},
    ]},
]

# ============ JOB TRENDS ============
JOB_TRENDS = {
    "current_year": [
        {"role": "AI/ML Engineer", "growth": "+38%", "median_salary_usd": "180,000", "demand": "Very High"},
        {"role": "Cybersecurity Specialist", "growth": "+32%", "median_salary_usd": "130,000", "demand": "Very High"},
        {"role": "Data Engineer", "growth": "+28%", "median_salary_usd": "140,000", "demand": "High"},
        {"role": "Cloud Architect", "growth": "+25%", "median_salary_usd": "165,000", "demand": "High"},
        {"role": "Renewable Energy Engineer", "growth": "+22%", "median_salary_usd": "110,000", "demand": "High"},
        {"role": "UX Researcher", "growth": "+18%", "median_salary_usd": "120,000", "demand": "Medium"},
        {"role": "Healthcare Data Analyst", "growth": "+20%", "median_salary_usd": "95,000", "demand": "High"},
    ],
    "five_year": [
        {"role": "AI Prompt Engineer / AI Trainer", "outlook": "Very Strong", "note": "Specialist yang menjembatani LLM dan industri vertical."},
        {"role": "Robotics & Automation", "outlook": "Strong", "note": "Robot humanoid scale-up, automasi pabrik & logistik."},
        {"role": "Climate Tech & Carbon Engineer", "outlook": "Strong", "note": "Net-zero pledges menciptakan demand massive."},
        {"role": "Quantum Computing Researcher", "outlook": "Emerging", "note": "Niche tapi gaji premium ekstrem."},
        {"role": "Biotech / Genetic Engineer", "outlook": "Strong", "note": "Personalized medicine & longevity."},
        {"role": "Synthetic Media / Content Creator AI", "outlook": "Strong", "note": "Industri kreatif berbasis AI tools."},
    ],
}

# ============ CITIES (Best to live) ============
BEST_CITIES = [
    {"city": "Vienna", "country": "Austria", "score": 99.1, "highlights": ["Kualitas hidup #1 (Mercer)", "Transportasi publik kelas dunia", "Universitas kuat", "Kuliner: Wiener Schnitzel, Sachertorte"], "avg_salary_usd": 60000, "flight_from_jkt": "USD 800–1,500", "image": "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800"},
    {"city": "Zurich", "country": "Switzerland", "score": 98.5, "highlights": ["Bersih & aman", "Lapangan kerja finance & tech", "Kuliner: Fondue, Rösti"], "avg_salary_usd": 95000, "flight_from_jkt": "USD 900–1,800", "image": "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=800"},
    {"city": "Copenhagen", "country": "Denmark", "score": 97.8, "highlights": ["Sepeda lifestyle", "Hygge culture", "Pendidikan gratis untuk EU", "Kuliner: Smørrebrød"], "avg_salary_usd": 70000, "flight_from_jkt": "USD 850–1,600", "image": "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800"},
    {"city": "Tokyo", "country": "Japan", "score": 96.5, "highlights": ["Transportasi efisien", "Aman", "Kuliner #1 dunia (Sushi, Ramen, Wagyu)"], "avg_salary_usd": 55000, "flight_from_jkt": "USD 500–900", "image": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800"},
    {"city": "Singapore", "country": "Singapore", "score": 95.9, "highlights": ["English friendly", "Asia hub", "Kuliner hawker centre", "Pajak rendah"], "avg_salary_usd": 70000, "flight_from_jkt": "USD 150–400", "image": "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800"},
    {"city": "Melbourne", "country": "Australia", "score": 94.7, "highlights": ["Coffee culture", "Universitas top dunia", "Multicultural"], "avg_salary_usd": 65000, "flight_from_jkt": "USD 600–1,200", "image": "https://images.unsplash.com/photo-1545044846-351ba102b6d5?w=800"},
    {"city": "Amsterdam", "country": "Netherlands", "score": 93.2, "highlights": ["Bilingual EN-NL", "Bike friendly", "Hub startup Eropa"], "avg_salary_usd": 65000, "flight_from_jkt": "USD 800–1,500", "image": "https://images.unsplash.com/photo-1534351590666-13e3e96c5017?w=800"},
    {"city": "Lisbon", "country": "Portugal", "score": 91.8, "highlights": ["Cuaca hangat", "Cost of living rendah", "Digital nomad visa", "Kuliner: Pastel de Nata, Bacalhau"], "avg_salary_usd": 35000, "flight_from_jkt": "USD 900–1,700", "image": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800"},
]

# ============ TECH & GADGETS ============
TECH_GADGETS = [
    {"name": "Apple Vision Pro 2", "category": "AR/VR", "year": 2025, "price_usd": 2999, "highlight": "Spatial computing premium dengan eye-tracking, foveated rendering, integrasi macOS."},
    {"name": "Nvidia DGX Spark", "category": "AI Workstation", "year": 2025, "price_usd": 3999, "highlight": "AI supercomputer mini untuk dev — 1 PetaFLOP di desktop kecil."},
    {"name": "Meta Ray-Ban Smart Glasses Gen 3", "category": "Wearable", "year": 2025, "price_usd": 379, "highlight": "Kamera 12MP, live AI translate, audio open-ear, look natural."},
    {"name": "Samsung Galaxy S26 Ultra", "category": "Smartphone", "year": 2026, "price_usd": 1399, "highlight": "AI-first, kamera 200MP, satellite messaging, Galaxy AI on-device."},
    {"name": "Tesla Optimus Gen 3", "category": "Robotics", "year": 2026, "price_usd": 25000, "highlight": "Humanoid robot untuk consumer-grade tasks, mass production phase."},
    {"name": "Sony XR Cinema Glasses", "category": "Display", "year": 2025, "price_usd": 1199, "highlight": "Micro-OLED 4K per mata, kompak, IMAX-like personal screen."},
    {"name": "DJI Avata 3", "category": "Drone", "year": 2025, "price_usd": 999, "highlight": "FPV cinematic, obstacle avoidance, 8K log video."},
    {"name": "Framework Laptop 16 (Ryzen AI 9)", "category": "Laptop", "year": 2025, "price_usd": 1899, "highlight": "Modular fully repairable, NPU 50 TOPS, sustainability."},
    {"name": "Apple iPhone 17 Pro", "category": "Smartphone", "year": 2025, "price_usd": 1199, "highlight": "Titanium body, A19 chip, telephoto 5x periscope, on-device Apple Intelligence."},
    {"name": "Boston Dynamics Spot Mini", "category": "Robotics", "year": 2025, "price_usd": 74500, "highlight": "Quadruped robot untuk inspeksi industri & riset."},
]

# ============ TRAVELLING INDONESIA ============
TRAVEL_ID = [
    {"name": "Labuan Bajo & Komodo", "type": "Hidden Gem / Nature", "region": "NTT", "highlight": "Pink beach, Padar Island, Komodo dragon. Best snorkeling Indonesia.", "image": "https://images.unsplash.com/photo-1604999333679-b86d54738315?w=800"},
    {"name": "Raja Ampat", "type": "Nature / Diving", "region": "Papua Barat", "highlight": "Biodiversitas laut #1 dunia. Wayag, Misool, Piaynemo viewpoint.", "image": "https://images.unsplash.com/photo-1583468982228-19f19164aee2?w=800"},
    {"name": "Belitung", "type": "Hidden Gem / Beach", "region": "Bangka Belitung", "highlight": "Pantai granit unik, Lengkuas Island, Mie Belitung & gangan ikan.", "image": "https://images.unsplash.com/photo-1573919077090-ac3140d1d4cb?w=800"},
    {"name": "Bromo–Ijen–Tumpak Sewu", "type": "Nature / Adventure", "region": "Jawa Timur", "highlight": "Trio epik: sunrise Bromo, blue fire Ijen, air terjun Tumpak Sewu.", "image": "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"},
    {"name": "Sumba", "type": "Hidden Gem", "region": "NTT", "highlight": "Pasola, bukit savana, Weekuri lagoon, kuliner kabuto & ayam pedas.", "image": "https://images.unsplash.com/photo-1571406384350-3cf7d09c5b25?w=800"},
    {"name": "Yogyakarta Kuliner", "type": "Culinary", "region": "DI Yogyakarta", "highlight": "Gudeg Yu Djum, Sate Klathak Pak Pong, Mangut Lele Mbah Marto, Bakmi Mbah Mo.", "image": "https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=800"},
    {"name": "Padang–Bukittinggi", "type": "Culinary / Nature", "region": "Sumatera Barat", "highlight": "Rendang asli, Sate Mak Syukur, Ngarai Sianok, Danau Maninjau.", "image": "https://images.unsplash.com/photo-1604999333679-b86d54738315?w=800"},
    {"name": "Derawan & Maratua", "type": "Hidden Gem / Diving", "region": "Kalimantan Timur", "highlight": "Jellyfish lake, manta point, penyu hijau. Sepi & otentik.", "image": "https://images.unsplash.com/photo-1582637974316-d0db8de1c2e7?w=800"},
]

# ============ JAKARTA TODAY (curated agenda — will be augmented by AI) ============
JAKARTA_AGENDA = [
    {"title": "Jakarta International Marathon 2026", "date": "2026-03-15", "location": "Monas – Sudirman", "category": "Sports", "source": "@jakartamarathon"},
    {"title": "Java Jazz Festival", "date": "2026-05-29 to 2026-05-31", "location": "JIExpo Kemayoran", "category": "Music", "source": "@javajazzfest"},
    {"title": "Jakarta Fair (PRJ)", "date": "2026-06-12 to 2026-07-14", "location": "JIExpo Kemayoran", "category": "Festival", "source": "@jakartafair_official"},
    {"title": "Coldplay Music of the Spheres (Encore)", "date": "2026-04-22", "location": "GBK Senayan", "category": "Concert", "source": "@coldplay"},
    {"title": "Pameran Lukisan Affandi Retrospective", "date": "Ongoing – Maret 2026", "location": "Museum Nasional", "category": "Art", "source": "@museumnasionalindonesia"},
    {"title": "Indonesia International Auto Show (IIMS)", "date": "2026-02-20 to 2026-03-02", "location": "JIExpo Kemayoran", "category": "Exhibition", "source": "@iims_id"},
    {"title": "Hari ini di Jakarta: Cek MRT/LRT update", "date": "today", "location": "Seluruh Jakarta", "category": "Info", "source": "@mrtjakarta @lrtjakarta"},
]

# ============ OUR WORLD INSIGHTS (Curated from Our World in Data themes) ============
OWID_INSIGHTS = [
    {"topic": "Global Life Expectancy", "current": "73.4 tahun (2024)", "five_year_projection": "74.8 tahun (2029)", "insight": "Negara berkembang menutup gap. Indonesia: 72 → 74 tahun.", "source": "ourworldindata.org/life-expectancy"},
    {"topic": "Renewable Energy Share", "current": "30% listrik global", "five_year_projection": "42% (2030 IEA estimate)", "insight": "Solar PV tumbuh eksponensial; harga turun 90% sejak 2010.", "source": "ourworldindata.org/renewable-energy"},
    {"topic": "AI Compute Growth", "current": "10^25 FLOPs frontier model (2024)", "five_year_projection": "10^28 FLOPs (2029)", "insight": "Compute training meningkat ~4x/tahun. Bottleneck: energy & GPU supply.", "source": "ourworldindata.org/artificial-intelligence"},
    {"topic": "Global Internet Users", "current": "5.5 miliar (2024)", "five_year_projection": "6.5 miliar (2029)", "insight": "Penetrasi terus naik di Afrika & Asia Selatan.", "source": "ourworldindata.org/internet"},
    {"topic": "Extreme Poverty Rate", "current": "8.5% populasi global", "five_year_projection": "6.5% (2029)", "insight": "Tren turun walau melambat post-COVID. Sub-Sahara Africa fokus.", "source": "ourworldindata.org/extreme-poverty"},
    {"topic": "Global CO₂ Emissions", "current": "37.4 GtCO₂ (2024)", "five_year_projection": "Plateau ~37 Gt (2029)", "insight": "Peak diharapkan akhir 2020s. Tergantung kebijakan & EV adoption.", "source": "ourworldindata.org/co2-emissions"},
    {"topic": "Median Age Population", "current": "30.9 tahun (global)", "five_year_projection": "32.2 tahun (2029)", "insight": "Aging society — peluang silver economy & healthcare.", "source": "ourworldindata.org/age-structure"},
    {"topic": "Electric Vehicle Sales Share", "current": "18% new car sales (2024)", "five_year_projection": "45% (2029)", "insight": "China memimpin. Indonesia EV adoption growing dari basis rendah.", "source": "ourworldindata.org/electric-car-sales"},
]

# ============ FREELANCE TIPS (static seed; AI can elaborate) ============
PORTFOLIO_TIPS = {
    "scholarship": [
        "Bangun narasi 'why you' yang spesifik dan otentik — jangan generik.",
        "Tunjukkan impact terukur (angka, KPI) di tiap project sebelumnya.",
        "Tiga pilar wajib: Leadership, Community Impact, Academic/Professional Excellence.",
        "Mintakan rekomendasi dari supervisor yang kenal Anda mendalam, bukan hanya jabatannya tinggi.",
        "Latihan IELTS minimal 6 bulan sebelum deadline — target di atas requirement.",
    ],
    "job": [
        "Sesuaikan CV ke setiap perusahaan — gunakan kata kunci dari job description.",
        "Buat 'STAR stories' (Situation–Task–Action–Result) untuk top 8 prestasi Anda.",
        "Bangun online presence: LinkedIn rapi, portfolio website, kontribusi open source jika tech.",
        "Network: 70% lowongan terbaik tidak pernah di-publish. Reach out alumni & employees.",
        "Latihan mock interview dengan teman atau platform seperti Pramp / interviewing.io.",
    ],
    "freelance": [
        "Spesialisasi > generalist. Pilih 1 niche yang Anda kuasai dan brand di sana.",
        "Pricing tier: starter, standard, premium — jangan jual murah di awal, malah jangka panjang merugikan.",
        "Bangun case study lengkap (problem → process → result) di portfolio website pribadi.",
        "Testimoni & social proof: minta review setiap selesai project.",
        "Investasi waktu di 1 platform dulu (misal Upwork), kuasai algoritma & rating-nya.",
    ],
}
