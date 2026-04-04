import React, { useState, useRef, useCallback } from 'react';
import { printPhotos } from '../../utils/print/portfolio';
import { toIndic } from '../../utils/printUtils';
import MI from '../../components/shared/MI';
import { showSuccess, showError } from '../../components/shared/Toast';

interface PhotoToolProps {
  onClose: () => void;
}

type LayoutType = 1 | 2 | 3 | 4 | 6;

const LAYOUTS: { value: LayoutType; label: string; ascii: string }[] = [
  { value: 1, label: '\u0661 \u0635\u0648\u0631\u0629', ascii: '[ \u25A0 ]' },
  { value: 2, label: '\u0662 \u0635\u0648\u0631', ascii: '[\u25A0]\n[\u25A0]' },
  { value: 3, label: '\u0663 \u0635\u0648\u0631', ascii: '[\u25A0\u25A0]\n[ \u25A0 ]' },
  { value: 4, label: '\u0664 \u0635\u0648\u0631', ascii: '[\u25A0\u25A0]\n[\u25A0\u25A0]' },
  { value: 6, label: '\u0666 \u0635\u0648\u0631', ascii: '[\u25A0\u25A0]\n[\u25A0\u25A0]\n[\u25A0\u25A0]' },
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
};

const PhotoTool: React.FC<PhotoToolProps> = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [layout, setLayout] = useState<LayoutType | null>(null);
  const [printing, setPrinting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dropHover, setDropHover] = useState(false);

  const handleFiles = useCallback((selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const newFiles = Array.from(selected);
    setFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(f => {
      const url = URL.createObjectURL(f);
      setPreviews(prev => [...prev, url]);
    });
  }, []);

  const removePhoto = useCallback((idx: number) => {
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handlePrint = async () => {
    if (!title.trim()) { showError('\u0623\u062f\u062e\u0644 \u0627\u0644\u0639\u0646\u0648\u0627\u0646'); return; }
    if (files.length === 0) { showError('\u0627\u062e\u062a\u0631 \u0635\u0648\u0631\u0629 \u0648\u0627\u062d\u062f\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644'); return; }
    if (!layout) { showError('\u0627\u062e\u062a\u0631 \u062a\u062e\u0637\u064a\u0637 \u0627\u0644\u0635\u0641\u062d\u0629'); return; }
    try {
      setPrinting(true);
      await printPhotos(title, files, layout);
      showSuccess('\u062a\u0645\u062a \u0627\u0644\u0637\u0628\u0627\u0639\u0629');
    } catch (err: any) {
      showError(err?.message || '\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0637\u0628\u0627\u0639\u0629');
    } finally {
      setPrinting(false);
    }
  };

  const needsExtra = layout && files.length > layout;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 600, maxHeight: '90vh', overflowY: 'auto',
          background: '#fff', borderRadius: 12, padding: 24, position: 'relative',
          direction: 'rtl',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1B3A6B' }}>
            <MI n="photo_library" s={20} c="#1B3A6B" />{' '}
            \u0623\u062f\u0627\u0629 \u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0635\u0648\u0631
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}
          >
            <MI n="close" s={22} />
          </button>
        </div>

        {/* Step 1: Title */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>
            \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0639\u0627\u0645
          </label>
          <input
            style={inputStyle}
            placeholder="\u0645\u062b\u0644\u0627\u064b: \u062d\u0641\u0644 \u062a\u0643\u0631\u064a\u0645 \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0645\u062a\u0645\u064a\u0632\u064a\u0646"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Step 2: Photo selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>
            \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0635\u0648\u0631
          </label>
          <div
            style={{
              border: `2px dashed ${dropHover ? '#1B3A6B' : '#C5CFE0'}`,
              borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer',
              transition: 'border-color 0.2s',
              background: dropHover ? '#f8fafd' : 'transparent',
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDropHover(true); }}
            onDragLeave={() => setDropHover(false)}
            onDrop={e => { e.preventDefault(); setDropHover(false); handleFiles(e.dataTransfer.files); }}
          >
            <MI n="add_photo_alternate" s={40} c="#94a3b8" />
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>
              \u0627\u0636\u063a\u0637 \u0644\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0635\u0648\u0631
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
          </div>

          {/* Thumbnails */}
          {files.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: '#1B3A6B', fontWeight: 600, marginBottom: 8 }}>
                \u062a\u0645 \u0627\u062e\u062a\u064a\u0627\u0631 {toIndic(files.length)} \u0635\u0648\u0631
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={src}
                      alt=""
                      style={{
                        width: 80, height: 80, borderRadius: 8, objectFit: 'cover',
                        border: '2px solid transparent',
                      }}
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      style={{
                        position: 'absolute', top: -6, left: -6,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#ef4444', color: '#fff', border: 'none',
                        cursor: 'pointer', fontSize: 12, lineHeight: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      <MI n="close" s={14} c="#fff" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Layout selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>
            \u062a\u062e\u0637\u064a\u0637 \u0627\u0644\u0635\u0641\u062d\u0629
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {LAYOUTS.map(l => (
              <div
                key={l.value}
                onClick={() => setLayout(l.value)}
                style={{
                  width: 100, height: 80,
                  border: `2px solid ${layout === l.value ? '#1B3A6B' : '#e5e7eb'}`,
                  borderRadius: 8, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: layout === l.value ? '#f0f4fb' : '#fff',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.3 }}>
                  {l.ascii}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1B3A6B', marginTop: 4 }}>
                  {l.label}
                </div>
              </div>
            ))}
          </div>
          {needsExtra && (
            <div style={{ fontSize: 12, color: '#d97706', marginTop: 8 }}>
              <MI n="info" s={14} c="#d97706" />{' '}
              \u0633\u064a\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0635\u0641\u062d\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629
            </div>
          )}
        </div>

        {/* Step 4: Print */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10 }}>
          <button
            onClick={handlePrint}
            disabled={printing || !title.trim() || files.length === 0 || !layout}
            style={{
              padding: '10px 28px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: '#1B3A6B', color: '#fff', fontSize: 14,
              opacity: (printing || !title.trim() || files.length === 0 || !layout) ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <MI n="print" s={18} c="#fff" />
            \u0637\u0628\u0627\u0639\u0629
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
              border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 14,
            }}
          >
            \u0625\u0644\u063a\u0627\u0621
          </button>
        </div>

        {/* Printing spinner overlay */}
        {printing && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            borderRadius: 12, zIndex: 10,
          }}>
            <div style={{
              width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#1B3A6B',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{ marginTop: 12, fontSize: 14, color: '#1B3A6B', fontWeight: 600 }}>
              \u062c\u0627\u0631\u064a \u062a\u062c\u0647\u064a\u0632 \u0627\u0644\u0635\u0648\u0631 \u0644\u0644\u0637\u0628\u0627\u0639\u0629...
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoTool;
