"""
Build data/artworks.json and data/exhibitions.json from the curator's material.

    python scripts/prepare_gallery.py      (first: makes the web images/videos)
    python scripts/build_gallery_data.py

2025–2026: titles, scientific descriptions and lay summaries are read from
"2025-2026 gallery/The scientific and lay discription v3.docx"; the seven
collections come from the website writing document.
2024–2025: credits and descriptions transcribed from the PDF captions.
Internal "note:" lines in the document are not published.
"""
import datetime
import json
import pathlib
import re
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCX = ROOT / "2025-2026 gallery" / "The scientific and lay discription v3.docx"
manifest = json.loads((ROOT / "scripts" / "gallery-manifest.json").read_text())

# ---------- read the .docx as plain paragraphs ----------
xml = zipfile.ZipFile(DOCX).read("word/document.xml").decode("utf8")
paras = []
for p in re.findall(r"<w:p[ >].*?</w:p>", xml, re.S):
    t = "".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, re.S))
    t = t.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'").strip()
    if t:
        paras.append(t)

works, cur, field = {}, None, None
for line in paras:
    m = re.match(r"^(\d+)\.\s+(.+)$", line)
    if m:
        cur = works.setdefault(int(m.group(1)), {"name": m.group(2).strip(), "title": "", "scientific": [], "lay": []})
        field = None
        continue
    if cur is None:
        continue
    m = re.match(r"^(?:exhibition\s+)?title:\s*(.+)$", line, re.I)
    if m:
        cur["title"] = m.group(1).strip(); field = None; continue
    if re.match(r"^scientific description$", line, re.I):
        field = "scientific"; continue
    if re.match(r"^lay summary$", line, re.I):
        field = "lay"; continue
    if re.match(r"^note:", line, re.I):
        field = None; continue
    if field:
        cur[field].append(line)

# ---------- 2025–2026 collections (from the website writing document) ----------
collections = [
    ("01", "The Architecture of Life", "Exploring the hidden structures that sustain living systems.",
     "Discover the intricate organization of cells, organelles and molecular structures. Through advanced scientific imaging, this collection reveals the extraordinary architecture within cells and the interconnected systems that support life.",
     [1, 2, 4, 8, 15, 23]),
    ("02", "The Shape of Life", "Discovering the extraordinary diversity of biological forms.",
     "From delicate protein filaments resembling a hummingbird in flight to intricate cellular landscapes, this collection explores the relationship between biological structure, movement and artistic form. It reveals the unexpected beauty and diversity of shapes within the microscopic world.",
     [5, 6, 7, 9, 10, 25]),
    ("03", "The Energy Within", "Illuminating the microscopic machinery that powers life.",
     "Explore the fascinating world of mitochondria and the molecular structures that help sustain cellular activity. This collection reveals the intricate networks, dynamic transformations and biological processes associated with energy production.",
     [3, 14, 17, 24]),
    ("04", "Life Under Pressure", "Exploring the relationship between cellular function, stress and disease.",
     "Living systems continuously respond to changes in their surroundings. Through scientific imagery of oxidative stress, cellular disruption and viral infection, this collection offers a visual perspective on the vulnerability and complexity of biological systems.",
     [11, 12, 16]),
    ("05", "Beyond the Limits of Vision", "Expanding human perception through scientific innovation.",
     "Advanced imaging technologies allow us to observe biological structures that were once beyond the limits of human vision. This collection celebrates the power of super-resolution microscopy and three-dimensional visualization to reveal new dimensions of the living world.",
     [18, 22]),
    ("06", "Life in Motion", "Experiencing the dynamic nature of living systems.",
     "Life is never truly still. Through scientific videography, live-cell imaging and time-lapse microscopy, this collection captures the continuous movement, interaction and reorganization of cellular structures, revealing biological processes as dynamic visual experiences.",
     [13, 19, 26, 27]),
    ("07", "Echoes of Nature", "Discovering visual parallels between the microscopic and visible worlds.",
     "The patterns revealed through scientific microscopy often bear striking similarities to those found in our everyday surroundings. From the delicate trajectories of flying sparks to the overlapping colours of autumn leaves, this collection explores the shared visual language of science, nature and art.",
     [20, 21]),
]
collection_of = {n: c[0] for c in collections for n in c[4]}

now = datetime.datetime.now(datetime.timezone.utc).isoformat()
artworks = []
for num in sorted(works):
    w = works[num]
    media = manifest["2025"].get(str(num))
    artworks.append({
        "id": f"lc25-{num:02d}",
        "year": 2025,
        "number": num,
        "title": w["title"] or w["name"],
        "name": w["name"],
        "collection": collection_of.get(num, ""),
        "type": media["type"] if media else "video",
        "image": media["image"] if media else "",
        "videoUrl": media.get("video", "") if media else "",
        "artists": "", "lab": "", "department": "",
        "scientific": "\n\n".join(w["scientific"]),
        "description": "\n\n".join(w["lay"]),
        "award": "",
        "order": num,
        "draft": media is None,  # text is ready but the media file hasn't been supplied yet
        "createdAt": now,
    })

# ---------- 2024–2025 (from the PDF captions) ----------
pdf_works = [
    ("Batman", "Dr. Shenghui Liang", "Dr. Timothy Kieffer", "Department of Cellular & Physiological Sciences",
     "Induction of definitive endoderm cells with specified soluble factors is the first step for stem cell differentiation toward beta cells. Partial activation of the canonical Wnt/β-catenin signaling pathway triggers accumulation of β-catenin (magenta) in the cytoplasm of a subset cell population."),
    ("Super-resolution image of endocytic structures responsible for degrading intercellular junctions during sperm release in the testis",
     "Samuel Tretjakov", "Dr. A. Wayne Vogl", "Department of Cellular & Physiological Sciences",
     "Cryo-section of rat testis with actin filaments (red) and actin networks stained around tubular endocytic structures along the concave surfaces of the cells. Also labelled are proteins (ORP9-blue; Myosin VI-green) associated with the ends of the structures."),
    ("Brainstorm", "Annika Lea Schulz", "Dr. François Jean", "Department of Microbiology & Immunology",
     "Organoid-Based COVID-19 Research: presented is the neuro-serine protease inhibitor (neuroserpin) Spn4A (cyan; discovered in the Jean lab) expressed in a human induced pluripotent stem cell-derived dorsal forebrain organoid. SARS-CoV-2 cell entry factors furin (red) and TMPRSS2 (green) are shown."),
    ("Neural Abstract Expressionism", "Annika Lea Schulz", "Dr. François Jean", "Department of Microbiology & Immunology",
     "Organoid-Based COVID-19 Research: Identifying Therapeutic Agents Using Lab-Grown Mini Brains. Presented here is the neuro-serine protease inhibitor (neuroserpin) Spn4A (cyan) discovered in the Jean lab. Human coronavirus cell entry factors, human aminopeptidase N (violet), and TMPRSS2 (green) are also shown."),
    ("New nasal spray treats Delta variant infection", "Dr. Guang Gao",
     "Drs. François Jean and Ivan R. Nabi, and the Life Sciences Institute Imaging Facility",
     "Departments of Microbiology & Immunology, Cellular & Physiological Sciences, and Life Sciences Institute",
     "SARS-CoV-2 B.1.617.2 (Delta Variant of Concern) infection induces a striking spheroid-like phenotype in Calu-3 cells (a non-small-cell lung cancer cell line). Host cell markers are nuclei (blue) and actin (cyan), while viral markers are dsRNA (red) and nucleocapsid (yellow)."),
    ("The peripheral nerve of Drosophila larva", "Duo Cheng", "Dr. Vanessa Auld", "Department of Zoology",
     "This single optical section shows the extracellular matrix (green) in close association with the peripheral perineurial glia (grey). The perineurial glia in turn enwrap the entire peripheral nerve with axonal tracts in the center (magenta)."),
    ("Dream of Hydrangea", "Drs. Jia Zhao and Shenghui Liang", "Dr. Timothy Kieffer", "Department of Cellular & Physiological Sciences",
     "Stem cell-derived insulin-producing islets offer an unlimited cell source for therapeutic applications and unique opportunities for modeling diabetes in a dish. These manufactured stem cell-islets contain multiple islet cell types closely resembling native human islets and express important beta cell maturation markers."),
    ("Mish Mash", "Dr. Darius Camp", "Dr. Guy Tanentzapf", "Department of Cellular & Physiological Sciences",
     "Disorganised embryonic muscles shown by the chaotic arrangement of actin filaments (white) in a Drosophila mutant affecting cell-extracellular matrix adhesion (Integrin in magenta)."),
    ("Synapses in bloom at the neuromuscular junction", "Leila Abtahi and Dr. Robin Vuilleumier", "Dr. Douglas Allan", "Department of Cellular & Physiological Sciences",
     "Larval neuromuscular junction in Drosophila melanogaster. The boutons constitute synapses between neurons and muscles. Anti-Futsch staining in green. Futsch is a microtubule binding protein involved in the formation of synapses in flies. Neuronal membranes are labeled by anti-HRP (magenta)."),
    ("Primary mouse embryonic fibroblast", "Wenjun Deng", "Dr. Guy Tanentzapf", "Department of Cellular & Physiological Sciences",
     "Primary mouse embryonic fibroblast with Talin1 ABS3 mutations. The cell is stained for the actin cytoskeleton (fire LUT). The image was taken with a spinning disk confocal microscope and reveals a round cell shape with a chiral swirling actin organization pattern."),
]
for i, (title, artists, lab, dept, text) in enumerate(pdf_works, start=1):
    artworks.append({
        "id": f"lc24-{i:02d}", "year": 2024, "number": i,
        "title": title, "name": "", "collection": "",
        "type": "image", "image": manifest["2024"][str(i)]["image"], "videoUrl": "",
        "artists": artists, "lab": f"Lab: {lab}" if not lab.startswith("Drs.") else f"Labs: {lab}", "department": dept,
        "scientific": "", "description": text,
        "award": "", "order": i, "draft": False, "createdAt": now,
    })

exhibitions = [
    {
        "year": 2025, "label": "2025–2026",
        "title": "Life Beyond the Visible",
        "subtitle": "",
        "cover": "/uploads/2025/04-hidden-layers.jpg",
        "intro": ["The exhibition is organized into seven curated collections, each exploring a different aspect of the living world through scientific imagery, artistic expression and visual storytelling."],
        "collections": [
            {"number": c[0], "title": c[1], "subtitle": c[2], "text": c[3], "works": ", ".join(str(n) for n in c[4])}
            for c in collections
        ],
        "venue": {"name": "", "address": "", "mapUrl": ""}, "dates": "", "hours": "",
        "essayTitle": "", "essay": [],
    },
    {
        "year": 2024, "label": "2024–2025",
        "title": "", "subtitle": "",
        "cover": "/uploads/2024/05.jpg",
        "intro": [], "collections": [],
        "venue": {"name": "", "address": "", "mapUrl": ""}, "dates": "", "hours": "",
        "essayTitle": "", "essay": [],
    },
]

(ROOT / "data" / "artworks.json").write_text(json.dumps(artworks, ensure_ascii=False, indent=2), encoding="utf8")
(ROOT / "data" / "exhibitions.json").write_text(json.dumps(exhibitions, ensure_ascii=False, indent=2), encoding="utf8")
print(f"{len(artworks)} artworks ({sum(a['draft'] for a in artworks)} drafts waiting for media), {len(exhibitions)} exhibitions")
for a in artworks:
    if a["year"] == 2025:
        print(f"  {a['number']:2d} [{a['collection'] or '--'}] {a['type']:5s} {'DRAFT ' if a['draft'] else ''}{a['title']}  ·  sci {len(a['scientific'])} / lay {len(a['description'])} chars")
