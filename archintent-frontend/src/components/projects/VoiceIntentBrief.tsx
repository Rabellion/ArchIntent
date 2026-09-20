import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader, Sparkles, AlertCircle } from 'lucide-react';
import axiosInstance from '../../api/axios';

/**
 * The project-brief textarea, plus:
 *   - a microphone button that records voice, transcribes it via the
 *     backend -> NLP service -> OpenAI Whisper, and drops the result
 *     into the textarea (editable -- transcription is a starting point,
 *     not a black box the client cannot correct), and
 *   - a debounced "we understood: ..." chip row, populated by the
 *     backend -> NLP service -> spaCy keyword-extraction pipeline.
 *
 * Self-contained: owns recording/upload/preview state so CreateProject
 * only has to pass value/onChange, the same shape a plain <textarea>
 * would need.
 */

interface Intent {
  style: string[];
  room_type: string[];
  material: string[];
  feature: string[];
}

interface VoiceIntentBriefProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  minLength: number;
  error?: string;
  className: string;
  errorClassName: string;
}

const EMPTY_INTENT: Intent = { style: [], room_type: [], material: [], feature: [] };

// spaCy needs enough text to say anything useful; the backend validator
// also rejects shorter than this, so match it here to avoid a request
// that always 422s.
const PREVIEW_MIN_LENGTH = 20;
const PREVIEW_DEBOUNCE_MS = 700;

const CHIP_STYLES: Record<keyof Intent, string> = {
  style: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  room_type: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  material: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  feature: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

export default function VoiceIntentBrief({
  id,
  value,
  onChange,
  placeholder,
  rows = 8,
  minLength,
  error,
  className,
  errorClassName,
}: VoiceIntentBriefProps) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const [intent, setIntent] = useState<Intent>(EMPTY_INTENT);
  const [previewLoading, setPreviewLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- live intent preview, debounced on every value change ----
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < PREVIEW_MIN_LENGTH) {
      setIntent(EMPTY_INTENT);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await axiosInstance.post('/projects/preview-intent', {
          brief_text: value,
        });
        setIntent(res.data?.data ?? EMPTY_INTENT);
      } catch {
        // Silent: this is a nice-to-have preview, not a blocking
        // validation -- a failed preview should never stop the client
        // from writing and submitting their brief.
        setIntent(EMPTY_INTENT);
      } finally {
        setPreviewLoading(false);
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // ---- cleanup: release the microphone if the component unmounts
  // mid-recording (e.g. client navigates away) ----
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const pickMimeType = (): string | undefined => {
    // Safari does not support audio/webm via MediaRecorder; letting it
    // fall through to the browser default (no mimeType passed) avoids
    // an immediate NotSupportedError there, at the cost of the exact
    // container varying by browser -- transcriber.py only uses the
    // filename to help Whisper infer format, so this is fine either way.
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    for (const type of candidates) {
      if (window.MediaRecorder?.isTypeSupported?.(type)) return type;
    }
    return undefined;
  };

  const startRecording = useCallback(async () => {
    setVoiceError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setVoiceError('Voice recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        void uploadRecording(new Blob(chunksRef.current, { type: recorder.mimeType }));
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setVoiceError('Microphone access was denied or is unavailable.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const uploadRecording = async (blob: Blob) => {
    if (blob.size === 0) {
      setVoiceError('No audio was captured. Please try again.');
      return;
    }

    setTranscribing(true);
    setVoiceError('');
    try {
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
      const form = new FormData();
      form.append('audio', blob, `brief.${ext}`);

      const res = await axiosInstance.post('/projects/transcribe', form);
      const transcript: string = res.data?.transcript ?? '';

      if (!transcript) {
        setVoiceError('Could not make out any speech in that recording.');
        return;
      }

      // Append rather than overwrite: a client may record a second
      // clip to add detail to what they already typed/said.
      onChange(value.trim() ? `${value.trim()} ${transcript}` : transcript);
    } catch (e: any) {
      // 429 means the transcription key pool is momentarily saturated, not
      // that the recording failed. Telling the client how long to wait is
      // far more useful than a flat error, and the audio is still in the
      // textarea-adjacent state so nothing is lost by retrying.
      if (e.response?.status === 429) {
        const retryAfter =
          e.response?.data?.retry_after ?? Number(e.response?.headers?.['retry-after']);
        setVoiceError(
          Number.isFinite(retryAfter) && retryAfter > 0
            ? `Transcription is busy. Try again in about ${Math.ceil(retryAfter)}s, or type your brief.`
            : 'Transcription is busy right now. Try again shortly, or type your brief.'
        );
        return;
      }
      setVoiceError(e.response?.data?.message || 'Could not transcribe the recording.');
    } finally {
      setTranscribing(false);
    }
  };

  const hasIntent =
    intent.style.length + intent.room_type.length + intent.material.length + intent.feature.length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={className}
          aria-describedby={`${id}_char_hint`}
        />

        <div
          id={`${id}_char_hint`}
          className="absolute bottom-4 right-4 bg-slate-950/90 border border-slate-700 px-2 py-1 rounded-lg text-[9px] font-black text-slate-400"
        >
          {value.length} / {minLength} MIN
        </div>

        {/* Mic button: idle -> recording (pulsing, red) -> transcribing (spinner). */}
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={transcribing}
          className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
            recording
              ? 'bg-rose-600 hover:bg-rose-500 animate-pulse'
              : 'bg-slate-700 hover:bg-indigo-600'
          }`}
          title={recording ? 'Stop recording' : 'Describe your project by voice'}
          aria-pressed={recording}
        >
          {transcribing ? (
            <Loader className="w-4 h-4 text-white animate-spin" />
          ) : recording ? (
            <Square className="w-4 h-4 text-white" fill="currentColor" />
          ) : (
            <Mic className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {recording && (
        <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          Recording — tap the square to stop and transcribe
        </p>
      )}
      {transcribing && (
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Transcribing your recording...
        </p>
      )}
      {voiceError && (
        <p className="text-[10px] font-bold text-rose-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {voiceError}
        </p>
      )}

      {error && <p className={errorClassName}>{error}</p>}

      {/* "We understood: ..." confirmation -- the visible proof of the
          intent-decoding pipeline described in the FYP methodology. */}
      {(hasIntent || previewLoading) && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            {previewLoading ? 'Analysing your brief...' : 'We understood'}
          </p>
          {hasIntent && (
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(intent) as (keyof Intent)[]).flatMap((bucket) =>
                intent[bucket].map((term) => (
                  <span
                    key={`${bucket}-${term}`}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold capitalize ${CHIP_STYLES[bucket]}`}
                  >
                    {term}
                  </span>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
