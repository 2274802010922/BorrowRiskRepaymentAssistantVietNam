"""Generate new male narration and provider word timings; no wallet or product secrets."""
import asyncio,json,subprocess,hashlib
from pathlib import Path
import edge_tts

ROOT=Path(__file__).resolve().parents[2]/'work'/'bilingual-demo'
SCRIPT=json.loads((ROOT/'script.json').read_text(encoding='utf8'))
sem=asyncio.Semaphore(2)
def duration(path):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(path)]))
async def make(locale,scene):
    folder=ROOT/'audio'/locale;folder.mkdir(parents=True,exist_ok=True)
    path=folder/(scene['id']+'.mp3');timing=folder/(scene['id']+'.json')
    fingerprint=hashlib.sha256(json.dumps([scene[locale],SCRIPT['voices'][locale],SCRIPT['rate']],ensure_ascii=False).encode()).hexdigest()
    if path.exists() and timing.exists() and json.loads(timing.read_text(encoding='utf8')).get('fingerprint')==fingerprint:return
    async with sem:
        for attempt in range(3):
            words=[]
            try:
                with path.open('wb') as file:
                    async for chunk in edge_tts.Communicate(scene[locale],SCRIPT['voices'][locale],rate=SCRIPT['rate'],boundary='WordBoundary').stream():
                        if chunk['type']=='audio':file.write(chunk['data'])
                        elif chunk['type']=='WordBoundary':words.append({'start':chunk['offset']/1e7,'end':(chunk['offset']+chunk['duration'])/1e7,'text':chunk['text']})
                if not words:raise RuntimeError('No provider timing')
                timing.write_text(json.dumps({'fingerprint':fingerprint,'voice':SCRIPT['voices'][locale],'rate':SCRIPT['rate'],'duration':duration(path),'words':words},ensure_ascii=False,indent=2),encoding='utf8')
                print('VOICE',locale,scene['id'],round(duration(path),2),flush=True)
                return
            except Exception:
                if attempt==2:raise
                await asyncio.sleep(2*(attempt+1))
async def main():
    await asyncio.gather(*(make(locale,scene) for locale in ['vi','en'] for scene in SCRIPT['scenes']))
    totals={locale:sum(duration(ROOT/'audio'/locale/(s['id']+'.mp3'))+0.25 for s in SCRIPT['scenes']) for locale in ['vi','en']}
    (ROOT/'audio'/'totals.json').write_text(json.dumps(totals,indent=2),encoding='utf8')
    print('TOTAL_SECONDS',json.dumps(totals),flush=True)
asyncio.run(main())
