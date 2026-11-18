import { useEffect, useRef, useState } from 'react';
import { Headphones } from 'lucide-react';
import type { Word } from '../../../packages/shared/content';
import { api } from '../../shared/api';
import { useResource } from '../../shared/resource';

type Accent = 'en-US' | 'en-GB';

export function Speak({word}: {word: Word}) {
  const [message, setMessage] = useState('');
  const [phonetics, setPhonetics] = useState<Partial<Record<Accent,string>>>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const nativeRef = useRef<SpeechSynthesisUtterance>(null);
  const settings = useResource<{accent:Accent;rate:number;localVoice:boolean}>('/settings');
  const defaultAccent = settings.data?.accent ?? 'en-US';
  useEffect(()=>()=>{
    const audio=audioRef.current;
    audioRef.current=null;
    audio?.pause();
    if (nativeRef.current) window.speechSynthesis.cancel();
  },[]);

  async function speak(accent:Accent) {
    const assetId = word.pronunciations.find(p=>p.accent===accent && p.assetId)?.assetId;
    const localAudio = '/api/vocab/'+encodeURIComponent(word.id)+'/pronunciation/'+accent;
    const audio = new Audio(assetId ? '/media/'+assetId : localAudio);
    audioRef.current?.pause();
    if (nativeRef.current) {
      window.speechSynthesis.cancel();
      nativeRef.current=null;
    }
    audioRef.current = audio;
    audio.playbackRate = settings.data?.rate ?? 1;
    setMessage('Đang chuẩn bị phát âm · '+accent);
    try {
      try { await audio.play(); }
      catch (error) {
        if (!assetId) throw error;
        if (audioRef.current!==audio) return;
        audio.src=localAudio;
        await audio.play();
      }
      if (audioRef.current!==audio) return;
      if (assetId && audio.src.endsWith('/media/'+assetId)) {
        setMessage('Đang phát tệp đã lưu · '+accent);
        void api<{synthetic:boolean}>('/media-info/'+assetId).then(asset=>{
          if (audioRef.current===audio) setMessage(asset.synthetic ? 'Đang phát giọng máy đã lưu · '+accent : 'Đang phát bản thu · '+accent);
        }).catch(()=>{});
      } else {
        setMessage('Đang phát giọng máy cục bộ · '+accent);
        void fetch(localAudio,{method:'HEAD'}).then(result=>{
          const value=result.headers.get('X-Bloom-IPA');
          if (value && audioRef.current===audio) setPhonetics(current=>({...current,[accent]:decodeURIComponent(value)}));
        }).catch(()=>{});
      }
    } catch {
      if (audioRef.current!==audio) return;
      const voice = settings.data?.localVoice && window.speechSynthesis?.getVoices()
        .find(v=>v.localService && v.lang.replace('_','-').toLowerCase()===accent.toLowerCase());
      if (!voice) { setMessage('Không phát được âm thanh · '+accent); return; }
      const utterance = new SpeechSynthesisUtterance(word.lemma);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = settings.data?.rate ?? 1;
      nativeRef.current=utterance;
      window.speechSynthesis.speak(utterance);
      setMessage('Giọng máy của thiết bị · '+voice.name);
    }
  }
  return <div className="pronunciation">
    <div className="inline">
      <button className="iconbtn" type="button" onClick={()=>void speak(defaultAccent)} aria-label={'Phát âm ' + word.lemma}><Headphones size={17} /></button>
      <button className="btn" type="button" onClick={()=>void speak('en-US')} aria-label={'Phát âm US ' + word.lemma}>US</button>
      <button className="btn" type="button" onClick={()=>void speak('en-GB')} aria-label={'Phát âm UK ' + word.lemma}>UK</button>
      {word.pronunciations.filter(x=>x.ipa).map((p,i)=><small key={i}>{p.accent === 'unspecified' ? '' : p.accent.slice(-2)} {p.ipa}</small>)}
    </div>
    {Object.entries(phonetics).map(([accent,ipa])=><small className="source-line" key={accent}>IPA giọng máy {accent.slice(-2)} /{ipa}/</small>)}
    {message && <small role="status">{message}</small>}
  </div>;
}
