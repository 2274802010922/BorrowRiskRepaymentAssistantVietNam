"""Stage only the approved public video artifacts and preserve old local metadata."""
import json,shutil,zipfile,hashlib
from pathlib import Path
REPO=Path(__file__).resolve().parents[2]
OUT=REPO/'work/bilingual-demo/output';STAGE=REPO/'work/video-publication/new'
STAGE.mkdir(parents=True,exist_ok=True)
ARCHIVE=REPO/'docs/archive/video-2026-10-01';ARCHIVE.mkdir(parents=True,exist_ok=True)
for name in ['script.md','picachu-demo-vi.srt','timeline.json']:
    source=REPO/'docs/demo'/name;target=ARCHIVE/name
    assert source.resolve().is_relative_to(REPO) and target.resolve().is_relative_to(REPO)
    if source.exists() and not target.exists():shutil.move(source,target)
for locale,url in [('vi','https://www.youtube.com/watch?v=Dk57TInsyYM'),('en','https://www.youtube.com/watch?v=VzjOFclnBBg')]:
    prefix=f'picachu-demo-{locale}'
    mapping={'-script.md':f'script-{locale}.md','.srt':f'{prefix}.srt','-chapters.txt':f'chapters-{locale}.txt','-timeline.json':f'timeline-{locale}.json','-qa.json':f'qa-{locale}.json'}
    for suffix,name in mapping.items():shutil.copy2(OUT/(prefix+suffix),REPO/'docs/demo'/name)
    shutil.copy2(OUT/(prefix+'-poster.jpg'),REPO/f'docs/assets/video/demo-{locale}-poster.jpg')
    for suffix in ['.mp4','.srt','-poster.jpg','-script.md','-chapters.txt','-qa.json']:
        shutil.copy2(OUT/(prefix+suffix),STAGE/(prefix+suffix))
shutil.copy2(OUT/'picachu-demo-vi-poster.jpg',REPO/'docs/assets/video/demo-poster.jpg')
shutil.copy2(REPO/'work/bilingual-demo/script.json',REPO/'docs/demo/script.json')
manifest={'release':'v0.4.0-bilingual-demo','videos':[]}
for locale,video_id in [('vi','Dk57TInsyYM'),('en','VzjOFclnBBg')]:
    file=STAGE/f'picachu-demo-{locale}.mp4'
    qa=json.loads((OUT/f'picachu-demo-{locale}-qa.json').read_text(encoding='utf8'))
    manifest['videos'].append({'locale':locale,'youtube':'https://www.youtube.com/watch?v='+video_id,'file':file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'durationSeconds':qa['duration'],'bytes':file.stat().st_size})
(REPO/'docs/demo/video-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
(STAGE/'video-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
with zipfile.ZipFile(STAGE/'picachu-demo-materials.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
    for file in STAGE.iterdir():
        if file.suffix in ['.srt','.jpg','.md','.txt','.json']:z.write(file,file.name)
print('STAGED_PUBLIC_ASSETS',STAGE)
