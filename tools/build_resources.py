"""Copy the per-event student materials into files/resources/ for the Resources page.

Run from the repo root on a machine with the project files mounted:
    python3 tools/build_resources.py [/mnt/project-files]

For each event it publishes the student lesson guide, the journal (Field Journal,
Case File or Engineer's Logbook) and, where one exists, the practice test with the
coach-only answer key pages removed. Saturday builds get the logbook only, the same
as the student binders. Nothing named after a student is copied.
"""
import io, os, sys
import warnings
from pypdf import PdfReader, PdfWriter
from PIL import Image
from pypdf.generic import NameObject, NumberObject, StreamObject

warnings.filterwarnings("ignore")

SRC = sys.argv[1] if len(sys.argv) > 1 else "/mnt/project-files"
OUT = os.path.join(os.path.dirname(__file__), "..", "files", "resources")

# slug -> (lessons subfolder, journal path) ; packet=None means logbook only
EVENTS = {
    "geology-rocks":        ("field-a", "nature-journal/geology-rocks-field-journal.pdf"),
    "buzzworthy":           ("field-a", "nature-journal/buzzworthy-field-journal.pdf"),
    "codebusters":          ("field-a", "journals/codebusters-case-file.pdf"),
    "deep-blue-sea":        ("field-b", "nature-journal/deep-blue-sea-field-journal.pdf"),
    "roots-reptiles":       ("field-b", "nature-journal/roots-reptiles-field-journal.pdf"),
    "storm-chasers":        ("field-b", "nature-journal/storm-chasers-field-journal.pdf"),
    "describe-it-build-it": ("diagram-and-decode", "journals/describe-it-build-it-case-file.pdf"),
    "pump-it-up":           ("diagram-and-decode", "journals/pump-it-up-case-file.pdf"),
    "science-sketchers":    ("diagram-and-decode", "journals/science-sketchers-case-file.pdf"),
    "zap-lab":              ("diagram-and-decode", "journals/zap-lab-case-file.pdf"),
    "beam-me-up":           ("build-and-test", "journals/beam-me-up-engineer-logbook.pdf"),
    "just-plane-awesome":   ("build-and-test", "journals/just-plane-awesome-engineer-logbook.pdf"),
    "ship-shape":           ("build-and-test", "journals/ship-shape-engineer-logbook.pdf"),
    "bridge-a-roni":        (None, "journals/bridge-a-roni-engineer-logbook.pdf"),
    "egg-o-naut":           (None, "journals/egg-o-naut-engineer-logbook.pdf"),
}

MAX_PX = 1400      # longest side for embedded photos
JPEG_Q = 72


def is_answer_key(page):
    head = (page.extract_text() or "")[:400].lower()
    return "answer key" in head


def shrink(writer):
    """Re-encode oversized photos as JPEG and drop duplicate objects."""
    for obj in list(writer._objects):
        if not isinstance(obj, StreamObject) or obj.get("/Subtype") != "/Image":
            continue
        if len(obj._data) < 40_000 or "/SMask" in obj or "/Mask" in obj:
            continue
        if obj.get("/Filter") != "/DCTDecode":
            continue  # only photos; line art and PNGs stay lossless
        try:
            pil = Image.open(io.BytesIO(obj._data))
            pil.load()
        except Exception:
            continue
        if pil.mode not in ("RGB", "L"):
            if pil.mode in ("RGBA", "LA", "P"):
                continue  # keep transparency as is
            pil = pil.convert("RGB")
        w, h = pil.size
        if max(w, h) > MAX_PX:
            s = MAX_PX / max(w, h)
            pil = pil.resize((int(w * s), int(h * s)))
        buf = io.BytesIO()
        pil.save(buf, "JPEG", quality=JPEG_Q, optimize=True)
        if buf.tell() >= len(obj._data):
            continue
        obj._data = buf.getvalue()
        obj[NameObject("/Filter")] = NameObject("/DCTDecode")
        obj[NameObject("/Width")] = NumberObject(pil.size[0])
        obj[NameObject("/Height")] = NumberObject(pil.size[1])
        obj[NameObject("/BitsPerComponent")] = NumberObject(8)
        obj[NameObject("/ColorSpace")] = NameObject("/DeviceRGB" if pil.mode == "RGB" else "/DeviceGray")
        for k in ("/DecodeParms", "/Decode", "/Length"):
            obj.pop(k, None)
    for page in writer.pages:
        page.compress_content_streams()
    writer.compress_identical_objects(remove_identicals=True, remove_orphans=False)


def publish(src, dst, drop_keys=False):
    r = PdfReader(src)
    w = PdfWriter()
    kept = 0
    for p in r.pages:
        if drop_keys and is_answer_key(p):
            continue
        w.add_page(p)
        kept += 1
    shrink(w)
    buf = io.BytesIO()
    w.write(buf)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(buf.getvalue())
    print(f"{os.path.relpath(dst, OUT):45s} {len(r.pages):3d}->{kept:3d} pages "
          f"{os.path.getsize(src)/1e6:5.2f}MB -> {len(buf.getvalue())/1e6:5.2f}MB")


for slug, (folder, journal) in EVENTS.items():
    d = os.path.join(OUT, slug)
    if folder:
        publish(os.path.join(SRC, "lessons", folder, f"{slug}-student-packet.pdf"),
                os.path.join(d, "lesson-guide.pdf"))
        test = os.path.join(SRC, "lessons", folder, f"{slug}-practice-test.pdf")
        if os.path.exists(test):
            publish(test, os.path.join(d, "practice-test.pdf"), drop_keys=True)
    publish(os.path.join(SRC, journal), os.path.join(d, "journal.pdf"))
