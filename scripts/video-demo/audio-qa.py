"""Decode narration and obtain independent ASR transcripts for content review."""
import concurrent.futures,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/'work'/'bilingual-demo'
sys.path.insert(0,str(ROOT/'python-libs'))
import speech_recognition as sr
SCRIPT=json.loads((ROOT/'script.json').read_text(encoding='utf8'))
def check(item):
    locale,scene=item;audio=ROOT/'audio'/locale/(scene['id']+'.mp3');wav=audio.with_suffix('.wav')
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(audio),'-ar','16000','-ac','1',str(wav)],check=True)
    recognizer=sr.Recognizer();recognizer.operation_timeout=25
    try:
        with sr.AudioFile(str(wav)) as source:data=recognizer.record(source)
        transcript=recognizer.recognize_google(data,language='vi-VN' if locale=='vi' else 'en-US')
        result={'locale':locale,'scene':scene['id'],'source':scene[locale],'asr':transcript,'decoded':True}
    except Exception as error:
        result={'locale':locale,'scene':scene['id'],'decoded':True,'asrError':type(error).__name__+': '+str(error)}
    print('QA',locale,scene['id'],'ASR' if 'asr' in result else result['asrError'],flush=True)
    return result
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    results=list(pool.map(check,[(locale,scene) for locale in ['vi','en'] for scene in SCRIPT['scenes']]))
(ROOT/'audio'/'asr-review.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
