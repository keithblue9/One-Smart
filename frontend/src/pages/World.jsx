import { useEffect, useState } from "react";
import { Newspaper, Buildings, DeviceMobile, Airplane, MapPin, ChartBar,
         Globe, Lightning, Tree, Cpu } from "@phosphor-icons/react";
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import AIInsightButton from "@/components/AIInsightButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const catColor = {
  Geopolitics:"bg-red-50 text-red-700", Economy:"bg-amber-50 text-amber-700",
  Politics:"bg-slate-100 text-slate-600", Tech:"bg-blue-50 text-blue-700",
  Ekonomi:"bg-amber-50 text-amber-700", Teknologi:"bg-blue-50 text-blue-700",
  Geopolitik:"bg-red-50 text-red-700", Bisnis:"bg-emerald-50 text-emerald-700",
  Kesehatan:"bg-pink-50 text-pink-700", Lingkungan:"bg-green-50 text-green-700",
  Info:"bg-slate-100 text-slate-600", Pasar:"bg-violet-50 text-violet-700",
  Indonesia:"bg-red-50 text-red-700",
  "Sepak Bola":"bg-green-50 text-green-700",
  Olahraga:"bg-green-50 text-green-700",
};

// ── OWID data with richer context ────────────────────────────────────────────
const OWID_RICH = [
  {
    icon: Lightning, color:"#f59e0b", bg:"bg-amber-50",
    topic:"Energi Terbarukan", current:"33% listrik global (2024)",
    projection:"45% pada 2030 (IEA)",
    insight:"Solar photovoltaic mengalami penurunan biaya 90% dalam 15 tahun terakhir. Pada 2024, solar & wind menjadi sumber pembangkit listrik termurah di 2/3 negara dunia. Indonesia menargetkan 23% EBT pada 2025 namun baru mencapai ~13%. Gap ini menciptakan peluang besar di sektor energi hijau.",
    dataBar:[{y:"2018",v:22},{y:"2020",v:28},{y:"2022",v:30},{y:"2024",v:33},{y:"2029*",v:45}],
    source:"ourworldindata.org/renewable-energy",
  },
  {
    icon: Cpu, color:"#a78bfa", bg:"bg-violet-50",
    topic:"AI Compute Growth", current:"10²⁵ FLOPs model frontier (2024)",
    projection:"10²⁸ FLOPs pada 2029",
    insight:"Compute yang dipakai untuk melatih model AI terbesar meningkat ~4× per tahun. GPT-4 butuh ~10²⁴ FLOPs; model frontier 2026 sudah mencapai 10²⁵. Implikasi: kebutuhan energi data center meledak, chip NVIDIA jadi komoditas strategis setara minyak, dan peran Indonesia dalam rantai nikel untuk baterai AI server makin krusial.",
    dataBar:[{y:"2018",v:10},{y:"2020",v:40},{y:"2022",v:100},{y:"2024",v:400},{y:"2026",v:1200}],
    source:"ourworldindata.org/artificial-intelligence",
  },
  {
    icon: Globe, color:"#60a5fa", bg:"bg-blue-50",
    topic:"Pengguna Internet Global", current:"5.5 miliar (2024)",
    projection:"6.5 miliar pada 2029",
    insight:"~2.5 miliar manusia masih belum terhubung internet, sebagian besar di Afrika sub-Sahara, Asia Selatan, dan sebagian Asia Tenggara. Starlink + LEO satellite mempercepat konektivitas daerah terpencil. Indonesia sendiri masih punya ~20 juta warga tanpa akses broadband, terutama di Papua dan Maluku.",
    dataBar:[{y:"2015",v:3200},{y:"2018",v:3900},{y:"2021",v:4900},{y:"2024",v:5500},{y:"2029*",v:6500}],
    source:"ourworldindata.org/internet",
  },
  {
    icon: Tree, color:"#10b981", bg:"bg-emerald-50",
    topic:"Emisi CO₂ Global", current:"37.4 GtCO₂ (2024)",
    projection:"Peak ~37 Gt, target net-zero 2050",
    insight:"Emisi global stagnan di sekitar 37 Gt CO₂ sejak 2022 — sinyal positif namun belum cukup. IPCC mensyaratkan penurunan 43% dari level 2019 untuk membatasi pemanasan 1.5°C. Harga karbon EU €60–70/ton menciptakan tekanan kompetitif bagi industri. Indonesia sebagai emitter ke-8 dunia punya tanggung jawab dan peluang di pasar karbon ASEAN.",
    dataBar:[{y:"2000",v:25},{y:"2005",v:30},{y:"2010",v:33},{y:"2015",v:36},{y:"2020",v:34},{y:"2024",v:37}],
    source:"ourworldindata.org/co2-emissions",
  },
  {
    icon: Buildings, color:"#f472b6", bg:"bg-pink-50",
    topic:"Angka Harapan Hidup Global", current:"73.4 tahun (2024)",
    projection:"74.8 tahun pada 2029",
    insight:"Harapan hidup global naik 9 tahun sejak 1990, sebagian besar karena penurunan kematian bayi dan pemberantasan penyakit menular. Indonesia: 72 tahun (2024) → proyeksi 74 tahun (2030). Penyebab kematian bergeser ke penyakit tidak menular (diabetes, jantung, kanker) — membuka peluang besar di healthtech & asuransi kesehatan.",
    dataBar:[{y:"1990",v:64},{y:"2000",v:67},{y:"2010",v:70},{y:"2020",v:72},{y:"2024",v:73.4},{y:"2029*",v:74.8}],
    source:"ourworldindata.org/life-expectancy",
  },
  {
    icon: Lightning, color:"#fb923c", bg:"bg-orange-50",
    topic:"Penjualan EV Global", current:"22% dari mobil baru (2024)",
    projection:"45% pada 2029 (IEA)",
    insight:"China mendominasi 60% pasar EV global; BYD melampaui Tesla dalam volume pada 2023. Indonesia baru ~1% tapi punya posisi strategis: cadangan nikel terbesar dunia (24% global) yang kritis untuk baterai EV. Kebijakan hilirisasi nikel Prabowo bisa menjadikan RI hub baterai EV Asia, namun butuh investasi smelter & kemitraan teknologi.",
    dataBar:[{y:"2018",v:2.2},{y:"2020",v:4.2},{y:"2022",v:14},{y:"2024",v:22},{y:"2029*",v:45}],
    source:"ourworldindata.org/electric-car-sales",
  },
];

// ── City data enriched ────────────────────────────────────────────────────────
const CITIES_DETAIL = [
  { city:"Vienna", country:"Austria 🇦🇹", score:99.1, img:"https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800",
    why:"Kota terbaik dunia versi Mercer 14 kali berturut-turut. Sistem kesehatan universal, transportasi publik terintegrasi, dan budaya kafe legendaris.",
    visa:"Austria Red-White-Red Card untuk skilled workers. EU Blue Card juga berlaku. Proses 3–6 bulan.",
    cost:"Sewa apartemen 1BR pusat kota: €1,200–1,800/bulan. Makan siang: €10–15. Transport bulanan: €51 (Jahreskarte tahunan).",
    work:"Hub keuangan Eropa Timur, sektor farmasi (Boehringer, Sandoz), dan startup tech. Bahasa Jerman dominan.",
    salary_usd:60000, flight:"USD 800–1,500", avg_salary_usd:60000,
    highlights:["Kualitas hidup #1 global (Mercer)","Transportasi publik kelas dunia","Universitas Vienna & TU Wien top 200","Kuliner: Wiener Schnitzel, Sachertorte, Kaiserschmarrn"],
  },
  { city:"Tokyo", country:"Japan 🇯🇵", score:96.5, img:"https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
    why:"Kota terbesar dunia yang aman, efisien, dan penuh inovasi. Transportasi tepat detik, kuliner Michelin terbanyak di dunia, dan budaya kerja yang unik.",
    visa:"Japan Highly Skilled Professional Visa (70+ poin): izin kerja 5 tahun, jalur PR dipercepat. Juga ada Working Holiday untuk 18-30 tahun.",
    cost:"Sewa apartemen 1BR pusat: ¥150,000–250,000/bulan (~Rp 15–25 juta). Makan siang: ¥800–1,200 di warung. Commuter pass bulanan: ¥10,000–20,000.",
    work:"Hub teknologi (Sony, Toyota, SoftBank), game industry (Nintendo, Sega), dan fintech berkembang. English makin diterima di perusahaan multinasional.",
    salary_usd:55000, flight:"USD 500–900", avg_salary_usd:55000,
    highlights:["Keamanan #1 dunia","Kuliner: 230+ restoran Michelin","Transportasi 99.9% tepat waktu","Ekspat Indonesia: ~17,000 orang"],
  },
  { city:"Singapore", country:"Singapore 🇸🇬", score:95.9, img:"https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800",
    why:"Gateway Asia, 2 jam dari Jakarta. English-first, pajak rendah, ekosistem startup terbaik di Asia Tenggara. Pilihan paling realistis untuk profesional Indonesia.",
    visa:"Employment Pass (EP): gaji min SGD 5,000/bulan. S Pass: SGD 3,150/bulan. Tech.Pass untuk founders & tech experts. PR bisa diajukan setelah 2 tahun.",
    cost:"Sewa 1BR: SGD 3,000–5,000/bulan (mahal). Makan di hawker centre: SGD 4–8. MRT bulanan: SGD 100–150.",
    work:"Finance (DBS, OCBC, UOB), Tech (Google, Meta, ByteDance regional HQ), Startup (Grab, Sea Limited, Carousell).",
    salary_usd:70000, flight:"USD 150–400", avg_salary_usd:70000,
    highlights:["2 jam dari Jakarta","English-first environment","Pajak personal max 22% (vs Indonesia 35%)","250,000+ WNI tinggal di Singapura"],
  },
  { city:"Lisbon", country:"Portugal 🇵🇹", score:91.8, img:"https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800",
    why:"Destinasi digital nomad #1 Eropa. Cuaca mediterania, biaya hidup rendah untuk standar EU, komunitas expat besar, dan Portugal Digital Nomad Visa.",
    visa:"D8 Digital Nomad Visa: income min €3,480/bulan (4× upah minimum Portugal). Atau NHR tax regime dengan pajak flat 20% untuk 10 tahun.",
    cost:"Sewa 1BR pusat kota: €1,200–1,800/bulan (naik signifikan). Makan siang: €8–12. Transport: €40/bulan.",
    work:"Growing startup scene (Farfetch, Feedzai), tech hubs di Beato, dan NHR regime menarik remote workers dari seluruh dunia. Web Summit berbasis di sini.",
    salary_usd:35000, flight:"USD 900–1,700", avg_salary_usd:35000,
    highlights:["Digital Nomad Visa EU","NHR tax: flat 20% untuk 10 tahun","Cuaca: 300+ hari cerah/tahun","Kuliner: Pastel de Nata, Bacalhau, Porto Wine"],
  },
  { city:"Melbourne", country:"Australia 🇦🇺", score:94.7, img:"https://images.unsplash.com/photo-1545044846-351ba102b6d5?w=800",
    why:"Kota paling layak huni di Australia, dengan universitas top dunia, coffee culture kelas dunia, dan komunitas Indonesia yang besar.",
    visa:"Skilled Independent Visa (189): points-based, tidak butuh sponsor. Skilled Nominated (190): perlu sponsorship negara bagian. Student + Post-study work visa: 2–4 tahun.",
    cost:"Sewa 1BR: AUD 2,000–3,000/bulan. Makan di café: AUD 15–25. Myki transport bulanan: AUD 100–150.",
    work:"Finance, healthcare, education, mining & resources, dan growing tech scene. Komunitas Indonesia: diaspora terbesar kedua di Australia (~100K orang).",
    salary_usd:65000, flight:"USD 600–1,200", avg_salary_usd:65000,
    highlights:["Universitas top 50 dunia (UniMelb, Monash)","Komunitas Indonesia: ~100K orang","Coffee culture terbaik dunia","Gaji minimum AUD 23.23/jam"],
  },
  { city:"Amsterdam", country:"Netherlands 🇳🇱", score:93.2, img:"https://images.unsplash.com/photo-1534351590666-13e3e96c5017?w=800",
    why:"Hub startup Eropa, 30% tax ruling untuk expat (gaji tinggi tidak kena pajak), bilingual EN-NL, dan ekosistem tech yang matang.",
    visa:"Highly Skilled Migrant Visa (kennismigrant): proses cepat ~2 minggu jika perusahaan terdaftar sebagai sponsor. Gaji minimum sekitar €5,008/bulan (2024).",
    cost:"Sewa 1BR: €1,800–2,500/bulan (pasar ketat). Makan siang: €12–18. GVB transport: €100/bulan.",
    work:"Booking.com, ASML, Philips, Adyen, TomTom. Ekosistem startup aktif. English diterima hampir di mana-mana.",
    salary_usd:65000, flight:"USD 800–1,500", avg_salary_usd:65000,
    highlights:["30% Tax Ruling untuk expat","English accepted everywhere","Hub tech & startup Eropa","Booking.com, Adyen, ASML HQ"],
  },
];

// ── Travel data enriched ──────────────────────────────────────────────────────
const TRAVEL_RICH = [
  { name:"Labuan Bajo & Komodo", region:"NTT", type:"Nature / Diving", img:"https://images.unsplash.com/photo-1604999333679-b86d54738315?w=800",
    desc:"Labuan Bajo adalah gateway ke Taman Nasional Komodo — salah satu dari 7 keajaiban alam dunia. Pink Beach-nya unik karena campuran koral merah. Snorkeling & diving di sini adalah salah satu terbaik di dunia.",
    best_time:"April–Oktober (musim kemarau, laut tenang)", budget:"Rp 3–8 juta/orang (termasuk boat trip 2 hari)", tips:"Hindari Juli–Agustus karena penuh & mahal. Sewa liveaboard 3 hari untuk pengalaman terbaik.", getting_there:"Penerbangan Jakarta → Labuan Bajo (LBJ) ~2.5 jam direct." },
  { name:"Raja Ampat", region:"Papua Barat Daya", type:"Diving / Eco", img:"https://images.unsplash.com/photo-1583468982228-19f19164aee2?w=800",
    desc:"Raja Ampat menyimpan 75% spesies koral dunia dan ribuan spesies ikan. Wayag Island adalah foto terseksi Indonesia. Masyarakat lokal mengelola konservasi laut dengan sangat baik — ini eco-tourism terbaik Indonesia.",
    best_time:"Oktober–April (musim tenang)", budget:"Rp 8–20 juta/orang (mahal karena terpencil), homestay mulai Rp 400K/malam", tips:"Beli entry permit Rp 1 juta/orang, bantu konservasi. Dive season terbaik: November–Februari.", getting_there:"Jakarta → Sorong (SOQ) → speedboat ke Waisai 2 jam." },
  { name:"Bromo–Ijen–Tumpak Sewu", region:"Jawa Timur", type:"Adventure / Nature", img:"https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800",
    desc:"Trio epik yang bisa dilakukan dalam 4 hari. Bromo: lautan pasir & kaldera aktif yang mistis. Ijen: blue fire satu-satunya di dunia yang bisa dilihat dengan mata. Tumpak Sewu: air terjun 'selimut' yang Instagrammable.",
    best_time:"April–Oktober", budget:"Rp 1.5–3 juta/orang (budget backpacker), Rp 3–6 juta (moderate)", tips:"Bromo sunrise harus sebelum jam 4 pagi. Ijen blue fire hanya terlihat jam 2–4 pagi. Bawa masker gas untuk Ijen.", getting_there:"Surabaya atau Malang sebagai base, sewa jeep/motor." },
  { name:"Raja Ampat vs Komodo", region:"Perbandingan", type:"Guide", img:"https://images.unsplash.com/photo-1573919077090-ac3140d1d4cb?w=800",
    desc:"Pilih Raja Ampat jika: kamu diver serius, mau eco-tourism otentik, & budget fleksibel. Pilih Komodo jika: mau kombinasi dive + darat (Komodo dragon), akses lebih mudah dari Bali, & ada family/non-diver.",
    best_time:"Raja Ampat: Nov–Feb. Komodo: Apr–Okt", budget:"Komodo lebih affordable (Rp 3–8 juta vs Raja Ampat Rp 8–20 juta)", tips:"Keduanya butuh konservasi fee. Raja Ampat juga punya Misool yang lebih privat.", getting_there:"Komodo: dari Bali (1.5 jam). Raja Ampat: dari Jakarta via Sorong (3+ jam)." },
  { name:"Yogyakarta — Beyond Borobudur", region:"DI Yogyakarta", type:"Culture / Culinary", img:"https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=800",
    desc:"Yogya bukan cuma Borobudur. Kota ini adalah pusat budaya Jawa: batik Malioboro, keraton Kasultanan, lukisan Affandi, kuliner legendaris. Cafe & nightlife di area Prawirotaman juga makin menggila.",
    best_time:"Sepanjang tahun, hindari liburan sekolah", budget:"Rp 500K–1.5 juta/hari (very budget-friendly)", tips:"Sewa motor Rp 70K/hari, makan di warung Gudeg Yu Djum (antre!), kunjungi Prambanan saat sunset.", getting_there:"Penerbangan 1 jam dari Jakarta, atau kereta Argo Dwipangga 8 jam dari Gambir." },
  { name:"Sumba — Hidden Paradise", region:"NTT", type:"Hidden Gem", img:"https://images.unsplash.com/photo-1571406384350-3cf7d09c5b25?w=800",
    desc:"Sumba adalah Bali 20 tahun lalu — belum overcrowded, masih otentik. Bukit savana mirip Afrika, pantai yang sepi (Nihiwatu, Weekuri Lagoon), budaya megalitik unik, dan festival Pasola yang spektakuler.",
    best_time:"Mei–Oktober (musim kemarau, festival Pasola: Februari–Maret)", budget:"Rp 500K–1.5 juta/malam resort. Backpacker: Rp 150–300K/malam.", tips:"Sewa motor atau mobil wajib (jalan terbatas). Nihiwatu resort adalah salah satu #1 dunia tapi mahal ($2K/malam).", getting_there:"Jakarta → Tambolaka (TMC) atau Waingapu (WGP), 2–3 jam + transit." },
];

export default function World() {
  const { lang } = useAuth();
  const [news, setNews] = useState([]);
  const [cities, setCities] = useState(CITIES_DETAIL);
  const [travel, setTravel] = useState(TRAVEL_RICH);
  const [owid] = useState(OWID_RICH);
  const [newsLoading, setNewsLoading] = useState(true);
  const [jakarta, setJakarta] = useState([]);
  const [jakLoading, setJakLoading] = useState(false);
  const [citiesRefresh, setCitiesRefresh] = useState(0);
  const [travelRefresh, setTravelRefresh] = useState(0);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [travelLoading, setTravelLoading] = useState(false);

  const fetchJakarta = () => {
    setJakLoading(true);
    api.get("/world/jakarta-live")
      .then(r => setJakarta(r.data.items || []))
      .catch(() => setJakarta([]))
      .finally(() => setJakLoading(false));
  };

  const fetchCities = (refresh) => {
    setCitiesLoading(true);
    api.get(`/world/cities-dynamic?refresh=${refresh}`)
      .then(r => { if (r.data.items?.length) setCities(r.data.items); })
      .catch(() => {})
      .finally(() => setCitiesLoading(false));
  };

  const fetchTravel = (refresh) => {
    setTravelLoading(true);
    api.get(`/world/travel-dynamic?refresh=${refresh}`)
      .then(r => { if (r.data.items?.length) setTravel(r.data.items); })
      .catch(() => {})
      .finally(() => setTravelLoading(false));
  };

  useEffect(() => {
    setNewsLoading(true);
    api.get("/world/news")
      .then(r => { setNews(r.data.items || []); setNewsLoading(false); })
      .catch(() => setNewsLoading(false));
  }, []);

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{t(lang,"world")}</p>
        <h1 className="text-3xl font-bold text-slate-800 mt-1">{lang==="id"?"Dunia Hari Ini":"World Today"}</h1>
        <p className="text-sm text-slate-500 mt-1">{lang==="id"?"Berita aktual, data global, destinasi & insight dunia":"Live news, global data, destinations & world insights"}</p>
      </div>

      <Tabs defaultValue="news">
        <TabsList className="bg-slate-100 flex flex-wrap h-auto gap-1 p-1 rounded-xl">
          <TabsTrigger value="news" className="rounded-lg text-xs">{lang==="id"?"🌍 Berita Global":"🌍 World News"}</TabsTrigger>
          <TabsTrigger value="owid" className="rounded-lg text-xs">{lang==="id"?"📊 Tren Dunia":"📊 Global Trends"}</TabsTrigger>
          <TabsTrigger value="cities" className="rounded-lg text-xs">{lang==="id"?"🏙️ Kota Terbaik":"🏙️ Best Cities"}</TabsTrigger>
          <TabsTrigger value="travel" className="rounded-lg text-xs">{lang==="id"?"✈️ Travel Indonesia":"✈️ Indonesia Travel"}</TabsTrigger>
          <TabsTrigger value="jakarta" className="rounded-lg text-xs" onClick={fetchJakarta}>{lang==="id"?"🏙️ Hari Ini di Jakarta":"🏙️ Today in Jakarta"}</TabsTrigger>
        </TabsList>

        {/* NEWS */}
        <TabsContent value="news" className="mt-5">
          {newsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1,2,3,4].map(i=><div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse"/>)}
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Globe size={40} className="mx-auto mb-3 text-slate-300"/>
              <p>{lang==="id"?"Gagal memuat berita. Coba refresh.":"Failed to load news. Try refreshing."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {news.map((n,i)=>(
                <article key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${catColor[n.category]||"bg-slate-100 text-slate-600"}`}>{n.category}</span>
                  <h3 className="font-bold text-slate-800 mt-3 leading-snug">{n.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{n.summary}</p>
                  <div className="mt-4">
                    <AIInsightButton topic="general" context={{headline:n.title, summary:n.summary, ask:"Analisa mendalam: dampak ke investor Indonesia, peluang & risiko yang perlu diwaspadai."}} testId={`ai-news-${i}`}/>
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        {/* OWID */}
        <TabsContent value="owid" className="mt-5">
          <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700 font-medium">📊 {lang==="id"?"Data dari Our World in Data — platform data global terpercaya berbasis riset peer-reviewed. Tiap topik dilengkapi konteks & implikasi untuk Indonesia.":"Data from Our World in Data — trusted global data platform based on peer-reviewed research. Each topic includes context & implications for Indonesia."}</p>
          </div>
          <div className="space-y-4">
            {owid.map((o,i)=>(
              <article key={i} className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm`}>
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${o.bg}`}>
                    <o.icon size={24} weight="duotone" style={{color:o.color}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <h3 className="font-bold text-slate-800">{o.topic}</h3>
                      <a href={`https://${o.source}`} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:underline flex-shrink-0">ourworldindata.org ↗</a>
                    </div>
                    <div className="flex gap-4 mt-1 flex-wrap">
                      <span className="text-xs text-slate-500">Saat ini: <strong className="text-slate-700">{o.current}</strong></span>
                      <span className="text-xs text-slate-500">Proyeksi: <strong style={{color:o.color}}>{o.projection}</strong></span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{o.insight}</p>
                    <div className="mt-3 h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={o.dataBar} margin={{top:0,right:0,left:-20,bottom:0}}>
                          <XAxis dataKey="y" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                          <Tooltip contentStyle={{fontSize:10,borderRadius:6}}/>
                          <Bar dataKey="v" fill={o.color} radius={[3,3,0,0]} isAnimationActive/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3">
                      <AIInsightButton topic="general"
                        context={{topic:o.topic, current:o.current, projection:o.projection, ask:"Apa implikasi tren ini untuk Indonesia dan peluang investasi/karier yang relevan?"}}
                        label={lang==="id"?"AI Analisa Dampak Indonesia":"AI Impact Analysis"}
                        testId={`ai-owid-${i}`}/>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        {/* CITIES */}
        <TabsContent value="cities" className="mt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex-1 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs text-emerald-700 font-medium">🏙️ {lang==="id"?"Panduan pindah & karier di kota-kota terbaik dunia — visa, biaya hidup, peluang kerja, dan tips praktis untuk WNI.":"Guide to moving & working in the world's best cities — visas, cost of living, job opportunities, and practical tips for Indonesians."}</p>
            </div>
            <button onClick={()=>{const n=citiesRefresh+1;setCitiesRefresh(n);fetchCities(n);}} disabled={citiesLoading}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs text-emerald-700 border border-emerald-200 bg-white px-3 py-2.5 rounded-xl hover:bg-emerald-50 disabled:opacity-50 transition-all">
              <ChartBar size={13} className={citiesLoading?"animate-pulse":""}/> {lang==="id"?"Kota Lain":"Other Cities"}
            </button>
          </div>
          {citiesLoading && <div className="space-y-4 mb-4">{[1,2].map(i=><div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse"/>)}</div>}
          <div className="space-y-6">
            {cities.map(c=>(
              <article key={c.city} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 lg:grid-cols-3">
                  <div className="relative h-48 lg:h-auto min-h-[140px] bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center">
                    {c.img ? (
                      <img src={c.img} alt={c.city} className="w-full h-full object-cover absolute inset-0"/>
                    ) : (
                      <div className="text-5xl">🏙️</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent lg:hidden"/>
                    <div className="absolute bottom-3 left-3 lg:hidden">
                      <div className="text-white font-bold text-lg">{c.city}</div>
                      <div className="text-white/80 text-sm">{c.country}</div>
                    </div>
                  </div>
                  <div className="lg:col-span-2 p-5">
                    <div className="hidden lg:flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-slate-800 text-xl">{c.city}, {c.country}</h3>
                      </div>
                      <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                        <span className="text-sm font-bold">★ {c.score}</span>
                        <span className="text-xs">/ 100</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{c.why}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-xl p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">🛂 VISA & RESIDENCY</div>
                        <p className="text-xs text-slate-700 leading-relaxed">{c.visa}</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">💰 BIAYA HIDUP</div>
                        <p className="text-xs text-slate-700 leading-relaxed">{c.cost}</p>
                      </div>
                      <div className="bg-violet-50 rounded-xl p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-1">💼 PELUANG KERJA</div>
                        <p className="text-xs text-slate-700 leading-relaxed">{c.work}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">✈️ DARI JAKARTA</div>
                        <p className="text-xs text-slate-700">{c.flight}</p>
                        {c.avg_salary_usd && <p className="text-xs text-slate-500 mt-1">Gaji rata-rata: <strong>${Number(c.avg_salary_usd).toLocaleString()}/tahun</strong></p>}
                      </div>
                    </div>
                    <div className="mt-4">
                      <AIInsightButton topic="city_insight" context={c} testId={`ai-city-${c.city}`}/>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        {/* TRAVEL */}
        <TabsContent value="travel" className="mt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex-1 p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-xs text-orange-700 font-medium">✈️ {lang==="id"?"Panduan lengkap destinasi Indonesia — waktu terbaik, estimasi budget, tips praktis, dan cara ke sana.":"Complete Indonesia destination guides — best time, budget estimates, practical tips, and how to get there."}</p>
            </div>
            <button onClick={()=>{const n=travelRefresh+1;setTravelRefresh(n);fetchTravel(n);}} disabled={travelLoading}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs text-orange-700 border border-orange-200 bg-white px-3 py-2.5 rounded-xl hover:bg-orange-50 disabled:opacity-50 transition-all">
              <Airplane size={13} className={travelLoading?"animate-pulse":""}/> {lang==="id"?"Destinasi Lain":"Other Places"}
            </button>
          </div>
          {travelLoading && <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">{[1,2].map(i=><div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse"/>)}</div>}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {travel.map((d,i)=>(
              <article key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-48 bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
                  {d.img ? (
                    <img src={d.img} alt={d.name} className="w-full h-full object-cover absolute inset-0" onError={e=>{e.target.style.display="none"}}/>
                  ) : (
                    <div className="text-5xl">🏝️</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent"/>
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-[11px] bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">{d.type}</span>
                    <div className="text-white font-bold text-lg mt-1">{d.name}</div>
                    <div className="text-white/80 text-xs flex items-center gap-1"><MapPin size={10}/> {d.region}</div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed">{d.desc}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50 rounded-lg p-2.5">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1">📅 Waktu Terbaik</div>
                      <p className="text-xs text-slate-700">{d.best_time}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2.5">
                      <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">💰 Estimasi Budget</div>
                      <p className="text-xs text-slate-700">{d.budget}</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2.5">
                    <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">✈️ Cara Ke Sana</div>
                    <p className="text-xs text-slate-700">{d.getting_there}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">💡 Tips Pro</div>
                    <p className="text-xs text-slate-700">{d.tips}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>
        {/* JAKARTA */}
        <TabsContent value="jakarta" className="mt-5">
          <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs text-red-700 font-medium">🏙️ {lang==="id"?"Informasi Jakarta hari ini — event, agenda, transportasi, dan update kota — dihasilkan AI dengan data terkini.":"Jakarta today — events, agenda, transport, and city updates — AI-generated with live data."}</p>
          </div>
          {jakLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i=><div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse"/>)}</div>
          ) : jakarta.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🏙️</div>
              <p className="text-slate-600 font-medium mb-2">{lang==="id"?"Tap untuk memuat info Jakarta hari ini":"Tap to load today's Jakarta info"}</p>
              <p className="text-xs text-slate-400 mb-4">{lang==="id"?"AI akan mencari event, agenda, transportasi & info terkini":"AI will search for events, agenda, transport & latest info"}</p>
              <button onClick={fetchJakarta} className="px-5 py-2.5 bg-[#2c4a3b] text-white rounded-xl text-sm font-medium hover:bg-[#1e3328] transition-colors">
                {lang==="id"?"🔍 Muat Info Jakarta":"🔍 Load Jakarta Info"}
              </button>
            </div>
          ) : (
            <div>
              <div className="space-y-3">
                {jakarta.map((j,i)=>(
                  <article key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">{j.emoji || "📌"}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-800">{j.title}</h3>
                          {j.category && <span className={`text-[11px] px-2 py-0.5 rounded-full ${catColor[j.category]||"bg-slate-100 text-slate-500"}`}>{j.category}</span>}
                        </div>
                        {j.date && <div className="text-xs text-slate-400 mt-0.5">📅 {j.date} {j.location && `· 📍 ${j.location}`}</div>}
                        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{j.summary || j.description}</p>
                        {j.tip && <div className="mt-2 text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg">💡 {j.tip}</div>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <button onClick={fetchJakarta} className="mt-4 w-full py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">
                🔄 {lang==="id"?"Refresh Info Jakarta":"Refresh Jakarta Info"}
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
