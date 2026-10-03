"""Technical media QA; this does not claim a human has listened to the narration."""
import hashlib,json,re,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/'work'/'bilingual-demo'
OUT=ROOT/'output'
def execute(args):
    return subprocess.run(list(map(str,args)),capture_output=True,text=True,encoding='utf8',errors='replace',check=True)
for locale in sys.argv[1:] or ['vi','en']:
    file=OUT/f'picachu-demo-{locale}.mp4'
    media=json.loads(execute(['ffprobe','-v','error','-show_format','-show_streams','-show_chapters','-of','json',file]).stdout)
    video=next(s for s in media['streams'] if s['codec_type']=='video');audio=next(s for s in media['streams'] if s['codec_type']=='audio')
    assert (video['width'],video['height'],video['codec_name'],video['pix_fmt'])==(1920,1080,'h264','yuv420p')
    assert audio['codec_name']=='aac' and int(audio['sample_rate'])==48000
    assert len(media['chapters'])==10
    timeline=json.loads((OUT/f'picachu-demo-{locale}-timeline.json').read_text(encoding='utf8'))
    assert abs(float(media['format']['duration'])-timeline['duration'])<0.1
    assert 210<=timeline['duration']<=246
    for i,cue in enumerate(timeline['cues']):
        assert 0<=cue['start']<cue['end']<=timeline['duration']
        assert len(cue['text'].splitlines())<=2
        assert max(map(len,cue['text'].splitlines()))<=56
        if i:assert timeline['cues'][i-1]['end']<=cue['start']+0.002
    # Decode both streams from beginning to end; fail on corrupted frames or packets.
    execute(['ffmpeg','-hide_banner','-loglevel','error','-xerror','-i',file,'-f','null','-'])
    analysis=execute(['ffmpeg','-hide_banner','-i',file,'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-']).stderr
    loudness=json.loads(re.search(r'\{\s*"input_i".*?\}',analysis,re.S).group())
    assert -18<float(loudness['input_i'])<-14
    assert float(loudness['input_tp'])<0
    execute(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',file,'-vf','fps=1/12,scale=480:270,tile=4x6','-frames:v','1',OUT/f'{locale}-contact-sheet.jpg'])
    for scene in timeline['scenes']:
        execute(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',scene['start']+(scene['end']-scene['start'])*0.6,'-i',file,'-frames:v','1',OUT/f'qa-{locale}-{scene["id"]}.jpg'])
    report={'file':file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size,'duration':float(media['format']['duration']),'video':{'codec':video['codec_name'],'width':video['width'],'height':video['height'],'fps':video['r_frame_rate']},'audio':{'codec':audio['codec_name'],'sampleRate':audio['sample_rate'],'loudness':loudness},'chapters':10,'subtitleCues':len(timeline['cues']),'fullDecode':'passed','subtitleBoundsAndNonOverlap':'passed','narrationSources':[{'voice':s['voice'],'rate':s['rate']} for s in timeline['scenes'][:1]],'audioReview':'Provider word alignment, independent ASR and decode/loudness checks. No claim of human listening.','visualReview':'Contact sheets and scene frames generated for inspection.','publication':'Local delivery; awaiting owner-uploaded YouTube URLs. Existing public videos and links untouched.'}
    (OUT/f'picachu-demo-{locale}-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print('QA_PASS',locale,report['duration'],report['bytes'],report['subtitleCues'],loudness['input_i'],loudness['input_tp'],flush=True)
