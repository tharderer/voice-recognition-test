from pathlib import Path
import base64,re,sys
root=Path(__file__).resolve().parents[3]
parts=root/'ab001-art'
out=Path(__file__).resolve().parents[1]/'art'/'atlas.avif'
chunks=[]
for i in range(1,14):
    p=parts/f'abram-avif-part{i:02d}.js'
    s=p.read_text(encoding='utf-8')
    m=re.search(r"push\('([^']+)'\)",s)
    if not m: raise SystemExit(f'No base64 chunk in {p}')
    chunks.append(m.group(1))
out.write_bytes(base64.b64decode(''.join(chunks)))
print(out)
