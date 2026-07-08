import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tts } from '@/lib/api';

type Props = {
  resourceType: 'report' | 'announcement' | 'post' | 'resource';
  resourceUuid: string;
};

export function TtsButton({ resourceType, resourceUuid }: Props) {
  const { t, i18n } = useTranslation('app');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const toggle = async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    setLoading(true);
    try {
      let url = audioUrl;
      if (!url) {
        const res = await tts.resolve({
          resource_type: resourceType,
          resource_uuid: resourceUuid,
          target_language: i18n.resolvedLanguage ?? i18n.language ?? 'en',
        });
        url = res.data.audio_url;
        setAudioUrl(url);
      }
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
        audioRef.current.addEventListener('ended', () => setPlaying(false));
      } else if (audioRef.current.src !== new URL(url, window.location.origin).toString()) {
        audioRef.current.src = url;
      }
      await audioRef.current.play();
      setPlaying(true);
    } finally {
      setLoading(false);
    }
  };

  if (localStorage.getItem('ttsEnabled') === 'false') {
    return null;
  }

  return (
    <button className="btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: 11 }} onClick={() => void toggle()} disabled={loading}>
      {loading ? '…' : playing ? t('actions.pauseAudio') : t('actions.readAloud')}
    </button>
  );
}
