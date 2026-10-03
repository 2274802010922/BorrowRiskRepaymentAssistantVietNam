"""Build independent narrated masters from fresh localized captures and timed words."""
import json,re,subprocess,sys,textwrap,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/'work'/'bilingual-demo'
SCRIPT=json.loads((ROOT/'script.json').read_text(encoding='utf8'))
OUT=ROOT/'output';OUT.mkdir(exist_ok=True)
locale=sys.argv[1] if len(sys.argv)>1 else 'vi'
capture=json.loads((ROOT/'raw'/locale/'capture.json').read_text(encoding='utf8'))
assert len(capture['events'])==10,'Incomplete capture; do not render a partial story'
def run(args):
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*map(str,args)],cwd=ROOT,check=True)
def clock(seconds,srt=False):
    ms=round(seconds*(1000 if srt else 100));unit=1000 if srt else 100
    h,ms=divmod(ms,3600*unit);m,ms=divmod(ms,60*unit);s,sub=divmod(ms,unit)
    return f'{h:02}:{m:02}:{s:02},{sub:03}' if srt else f'{h}:{m:02}:{s:02}.{sub:02}'
def words_with_punctuation(scene,timing):
    source=scene[locale].split();words=timing['words']
    assert len(source)==len(words),(scene['id'],'word alignment differs')
    aligned=[]
    for token,word in zip(source,words):
        assert re.sub(r'[^\w]','',token).lower()==re.sub(r'[^\w]','',word['text']).lower(),(token,word)
        aligned.append({**word,'text':token})
    # USDC is pronounced letter by letter but should be read as one token.
    result=[];i=0
    while i<len(aligned):
        if i+3<len(aligned) and [re.sub(r'\W','',w['text']) for w in aligned[i:i+4]]==['U','S','D','C']:
            result.append({'start':aligned[i]['start'],'end':aligned[i+3]['end'],'text':'USDC'+re.sub(r'^C','',aligned[i+3]['text'])});i+=4
        else:result.append(aligned[i]);i+=1
    return result
def cues_for(words,offset,duration):
    groups=[];group=[]
    for i,word in enumerate(words):
        candidate=' '.join(w['text'] for w in group+[word])
        if group and (len(candidate)>106 or word['end']-group[0]['start']>6.0):
            groups.append(group);group=[]
        group.append(word)
        next_start=words[i+1]['start'] if i+1<len(words) else duration
        if len(' '.join(w['text'] for w in group))>=38 and (word['text'].endswith(('.','?','!',';')) or next_start-word['end']>0.35):
            groups.append(group);group=[]
    if group:groups.append(group)
    # Avoid a one-word flash at the end of a sentence/scene.
    for i in range(len(groups)-1,0,-1):
        if groups[i][-1]['end']-groups[i][0]['start']<0.9 and len(' '.join(w['text'] for w in groups[i-1]+groups[i]))<=112:
            groups[i-1]+=groups.pop(i)
    result=[]
    for i,group in enumerate(groups):
        text=' '.join(w['text'] for w in group).replace('Picachu','picachu')
        lines=textwrap.wrap(text,width=56,break_long_words=False,break_on_hyphens=False)
        assert len(lines)<=2,(locale,text,lines)
        start=max(0,group[0]['start']-0.06)
        next_start=groups[i+1][0]['start']-0.06 if i+1<len(groups) else duration
        end=min(next_start,max(group[-1]['end']+0.18,start+1.0),duration)
        assert end>start
        result.append({'start':offset+start,'end':offset+end,'text':'\n'.join(lines)})
    return result

header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,32,&H00FFFFFF,&H00FFFFFF,&H00122537,&H00122537,0,0,0,0,100,100,0,0,1,0,0,2,190,190,16,1
Style: Title,Arial,30,&H00FFFFFF,&H00FFFFFF,&H00122537,&H00122537,-1,0,0,0,100,100,0,0,1,0,0,7,160,160,7,1
Style: Source,Arial,21,&H00DFCCC0,&H00DFCCC0,&H00122537,&H00122537,0,0,0,0,100,100,0,0,1,0,0,7,160,160,43,1
Style: Index,Arial,23,&H00DFCCC0,&H00DFCCC0,&H00122537,&H00122537,0,0,0,0,100,100,0,0,1,0,0,9,160,160,18,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
offset=0;chapters=[];cues=[];ass=[header];clips=[];audio=[];timelines=[]
def event(style,start,end,text):
    safe=text.replace('{','(').replace('}',')').replace('\n',r'\N')
    return f'Dialogue: 0,{clock(start)},{clock(end)},{style},,0,0,0,,{safe}\n'
for index,scene in enumerate(SCRIPT['scenes']):
    shot=next(s for s in capture['events'] if s['id']==scene['id'])
    timing=json.loads((ROOT/'audio'/locale/(scene['id']+'.json')).read_text(encoding='utf8'))
    frames=math.ceil((timing['duration']+0.4)*30);duration=frames/30
    chapters.append({'start':offset,'end':offset+duration,'title':scene['title'][locale]})
    scene_cues=cues_for(words_with_punctuation(scene,timing),offset,duration)
    cues.extend(scene_cues)
    ass.append(event('Title',offset,offset+duration,scene['title'][locale]))
    ass.append(event('Source',offset,offset+duration,scene['label'][locale]))
    ass.append(event('Index',offset,offset+duration,f'{index+1:02} / 10 · {locale.upper()}'))
    for cue in scene_cues:ass.append(event('Caption',cue['start'],cue['end'],cue['text']))
    clip=OUT/f'{locale}-{index:02}.mp4';clips.append(clip)
    # Raw overrun (for example a slow API response) is compressed only in the visual track.
    speed=max(scene['speed'],(shot['end']-shot['start'])/duration)
    run(['-ss',shot['start'],'-i',ROOT/'raw'/locale/'master.webm','-t',(shot['end']-shot['start']),'-an','-vf',f'setpts=PTS/{speed:.8f},fps=30,tpad=stop_mode=clone:stop_duration=1','-frames:v',frames,'-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',clip])
    timelines.append({'id':scene['id'],'start':offset,'end':offset+duration,'rawStart':shot['start'],'rawEnd':shot['end'],'visualSpeed':speed,'voice':timing['voice'],'rate':timing['rate']})
    audio.append((ROOT/'audio'/locale/(scene['id']+'.mp3'),duration));offset+=duration
    print('CLIP',locale,scene['id'],round(duration,2),flush=True)
assert all(cues[i]['end']<=cues[i+1]['start']+0.002 for i in range(len(cues)-1))
ass_path=OUT/f'picachu-demo-{locale}.ass';ass_path.write_text(''.join(ass),encoding='utf8')
srt_path=OUT/f'picachu-demo-{locale}.srt';srt_path.write_text('\n\n'.join(f'{i+1}\n{clock(c["start"],True)} --> {clock(c["end"],True)}\n{c["text"]}' for i,c in enumerate(cues))+'\n',encoding='utf8')
concat=OUT/f'{locale}-concat.txt';concat.write_text('\n'.join("file '"+c.name+"'" for c in clips),encoding='utf8')
metadata=OUT/f'{locale}-metadata.txt'
metadata.write_text(';FFMETADATA1\n'+f'title=picachu — {"Demo tiếng Việt" if locale=="vi" else "English demo"}\ncomment=Fresh localized UI; synthetic example and separate historical Devnet API receipt are labeled.\n'+''.join(f'[CHAPTER]\nTIMEBASE=1/1000\nSTART={round(c["start"]*1000)}\nEND={round(c["end"]*1000)}\ntitle={c["title"]}\n' for c in chapters),encoding='utf8')
inputs=['-f','concat','-safe','0','-i',concat]
for file,d in audio:inputs+=['-i',file]
inputs+=['-f','ffmetadata','-i',metadata]
filters=';'.join(f'[{i+1}:a]apad,atrim=duration={d:.9f},asetpts=PTS-STARTPTS[a{i}]' for i,(f,d) in enumerate(audio))
filters+=';'+''.join(f'[a{i}]' for i in range(len(audio)))+f'concat=n={len(audio)}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000[narration]'
filters+=f';[0:v]scale=1600:900:flags=lanczos,pad=1920:1080:160:80:color=0x122537,ass=output/{ass_path.name}[picture]'
final=OUT/f'picachu-demo-{locale}.mp4'
run([*inputs,'-filter_complex',filters,'-map','[picture]','-map','[narration]','-map_metadata',len(audio)+1,'-map_chapters',len(audio)+1,'-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-metadata:s:a:0','language='+('vie' if locale=='vi' else 'eng'),'-t',offset,'-movflags','+faststart',final])
run(['-ss',4,'-i',final,'-frames:v','1',OUT/f'picachu-demo-{locale}-poster.jpg'])
(OUT/f'picachu-demo-{locale}-timeline.json').write_text(json.dumps({'duration':offset,'scenes':timelines,'chapters':chapters,'cues':cues},ensure_ascii=False,indent=2),encoding='utf8')
(OUT/f'picachu-demo-{locale}-script.md').write_text('# picachu — '+('Lời thuyết minh tiếng Việt' if locale=='vi' else 'English narration')+'\n\n'+ '\n\n'.join(f'## {s["title"][locale]}\n\n{s[locale]}' for s in SCRIPT['scenes'])+'\n',encoding='utf8')
(OUT/f'picachu-demo-{locale}-chapters.txt').write_text('\n'.join(f'{int(c["start"]//60):02}:{int(c["start"]%60):02} {c["title"]}' for c in chapters)+'\n',encoding='utf8')
print('FINAL',locale,round(offset,2),final,flush=True)
