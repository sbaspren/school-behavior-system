import React, { useState, useEffect } from 'react';
import { templatesApi } from '../../api/templates';
import { showSuccess, showError } from './Toast';

export type SendChannel = 'whatsapp' | 'sms';

export interface SendMessageModalProps {
  /** اسم الطالب */
  studentName: string;
  /** رقم جوال ولي الأمر */
  mobile?: string;
  /** الرسالة الافتراضية */
  defaultMessage: string;
  /** نوع القالب للحفظ/التحميل من API (مثل: 'تأخر', 'استئذان', 'مخالفة', 'ملاحظة', 'غياب') */
  templateType?: string;
  /** Placeholders لاستبدالها في القالب المحفوظ: { '{اسم_الطالب}': 'أحمد' } */
  templatePlaceholders?: Record<string, string>;
  /** callback عند الإرسال — يستقبل نص الرسالة والقناة */
  onSend: (message: string, channel: SendChannel) => void;
  /** callback عند إغلاق المودال */
  onClose: () => void;
  /** هل الإرسال جاري؟ */
  sending?: boolean;
  /** محتوى إضافي يُعرض بين الهيدر والتيكستايريا (مثل toggle رابط العذر في الغياب) */
  extraContent?: React.ReactNode;
  /** هل نفعّل خيار SMS؟ (افتراضي: true) */
  enableSms?: boolean;
  /** Controlled mode: الرسالة الحالية (إذا تم توفيرها، يكون المودال controlled) */
  message?: string;
  /** Controlled mode: callback عند تغيير الرسالة */
  onMessageChange?: (message: string) => void;
  /** وضع المعاينة الجماعية — يعرض القالب مع placeholders للتأكيد قبل الإرسال */
  isBulkPreview?: boolean;
  /** عدد المستلمين في الإرسال الجماعي */
  bulkCount?: number;
}

const SendMessageModal: React.FC<SendMessageModalProps> = ({
  studentName, mobile, defaultMessage, templateType, templatePlaceholders,
  onSend, onClose, sending = false, extraContent, enableSms = true,
  message: controlledMessage, onMessageChange,
  isBulkPreview = false, bulkCount = 0,
}) => {
  const isControlled = controlledMessage !== undefined;
  const [internalMessage, setInternalMessage] = useState(defaultMessage);
  const message = isControlled ? controlledMessage : internalMessage;
  const setMessage = isControlled ? (onMessageChange || (() => {})) : setInternalMessage;
  const [channel, setChannel] = useState<SendChannel>('whatsapp');
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // تحميل القالب المحفوظ عند الفتح (لا يعمل في وضع المعاينة)
  useEffect(() => {
    if (!templateType || isBulkPreview) return;
    templatesApi.getByType(templateType).then(res => {
      const saved = res.data?.data?.template;
      if (saved && templatePlaceholders) {
        let filled = saved;
        for (const [key, val] of Object.entries(templatePlaceholders)) {
          filled = filled.split(key).join(val);
        }
        setMessage(filled);
        setTemplateLoaded(true);
      }
    }).catch(() => {});
  }, []);

  const handleSaveTemplate = async () => {
    if (!templateType) return;
    // تحويل الرسالة الحالية لقالب بإعادة الـ placeholders
    let tmpl = message;
    if (templatePlaceholders) {
      // ترتيب تنازلي حسب الطول لتجنب الاستبدال الجزئي
      const entries = Object.entries(templatePlaceholders).sort((a, b) => b[1].length - a[1].length);
      for (const [key, val] of entries) {
        if (val.trim()) tmpl = tmpl.split(val).join(key);
      }
    }
    try {
      await templatesApi.save(templateType, tmpl);
      setTemplateSaved(true);
      showSuccess('تم حفظ القالب');
    } catch { showError('فشل حفظ القالب'); }
  };

  const handleResetTemplate = async () => {
    if (!templateType) return;
    try {
      await templatesApi.delete(templateType);
      setMessage(defaultMessage);
      setTemplateLoaded(false);
      setTemplateSaved(false);
      showSuccess('تم استعادة القالب الافتراضي');
    } catch { showError('فشل'); }
  };

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message, channel);
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>
                {isBulkPreview ? 'groups' : (channel === 'sms' ? 'sms' : 'smartphone')}
              </span>
              {isBulkPreview ? 'معاينة الإرسال الجماعي' : `إرسال رسالة ${channel === 'sms' ? 'SMS' : 'واتساب'}`}
            </h3>
            {isBulkPreview
              ? <span style={{ fontSize: 13, color: '#4b5563' }}>{studentName}</span>
              : <span style={{ fontSize: 13, color: '#4b5563' }}>{studentName} - {mobile || 'لا يوجد رقم'}</span>
            }
          </div>
          <button onClick={onClose} style={closeBtnStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Bulk count bar */}
        {isBulkPreview && bulkCount > 0 && (
          <div style={{ padding: '10px 24px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#2563eb' }}>send</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>سيتم الإرسال لـ {bulkCount} ولي أمر</span>
          </div>
        )}

        {/* Channel Selector */}
        {enableSms && (
          <div style={channelBarStyle}>
            <button
              onClick={() => setChannel('whatsapp')}
              style={channel === 'whatsapp' ? channelBtnActiveWA : channelBtnInactive}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>smartphone</span> واتساب
            </button>
            <button
              onClick={() => setChannel('sms')}
              style={channel === 'sms' ? channelBtnActiveSMS : channelBtnInactive}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>sms</span> SMS
            </button>
          </div>
        )}

        {/* Extra content slot (e.g. absence link toggle) */}
        {extraContent}

        {/* Message Body */}
        <div style={{ padding: '16px 24px' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#4b5563', marginBottom: 8 }}>نص الرسالة</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            readOnly={isBulkPreview}
            rows={8}
            style={{ ...textareaStyle, ...(isBulkPreview ? { background: '#f9fafb', color: '#374151' } : {}) }}
          />

          {/* Template buttons — hidden in bulk preview */}
          {templateType && !isBulkPreview && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={handleSaveTemplate} style={templateBtnStyle}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>bookmark</span> حفظ كقالب
              </button>
              <button onClick={handleResetTemplate} style={resetBtnStyle}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>refresh</span> استعادة
              </button>
              {(templateLoaded || templateSaved) && (
                <span style={{ fontSize: 11, color: '#059669' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>check</span>
                  {templateSaved ? 'تم حفظ القالب' : 'قالب محفوظ'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle}>إلغاء</button>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            style={{
              ...sendBtnStyle,
              background: channel === 'sms' ? '#2563eb' : '#25d366',
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: (sending || !message.trim()) ? 0.6 : 1,
            }}
          >
            {sending ? 'جاري الإرسال...' : isBulkPreview ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>send</span>
                {' '}تأكيد الإرسال ({bulkCount})
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>
                  {channel === 'sms' ? 'sms' : 'smartphone'}
                </span>
                {' '}إرسال
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Styles ─────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)',
  zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};

const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
  width: '100%', maxWidth: 520, overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '16px 24px', background: 'linear-gradient(to left, #dcfce7, #f0fdf4)',
  borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};

const closeBtnStyle: React.CSSProperties = {
  padding: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af',
};

const channelBarStyle: React.CSSProperties = {
  display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb',
};

const channelBtnBase: React.CSSProperties = {
  flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  transition: 'all 0.15s',
};

const channelBtnActiveWA: React.CSSProperties = {
  ...channelBtnBase, background: '#f0fdf4', color: '#16a34a', borderBottom: '3px solid #25d366',
};

const channelBtnActiveSMS: React.CSSProperties = {
  ...channelBtnBase, background: '#eff6ff', color: '#2563eb', borderBottom: '3px solid #2563eb',
};

const channelBtnInactive: React.CSSProperties = {
  ...channelBtnBase, background: '#f9fafb', color: '#9ca3af', borderBottom: '3px solid transparent',
};

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: 12, border: '2px solid #d1d5db', borderRadius: 12,
  fontSize: 14, lineHeight: 1.8, resize: 'vertical', boxSizing: 'border-box', direction: 'rtl',
  fontFamily: 'inherit',
};

const templateBtnStyle: React.CSSProperties = {
  padding: '4px 12px', background: '#eef2ff', color: '#4f46e5', borderRadius: 6,
  border: '1px solid #c7d2fe', cursor: 'pointer', fontSize: 12, fontWeight: 600,
};

const resetBtnStyle: React.CSSProperties = {
  padding: '4px 12px', background: '#f3f4f6', borderRadius: 6,
  border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280',
};

const footerStyle: React.CSSProperties = {
  padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb',
  display: 'flex', justifyContent: 'flex-end', gap: 12,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600,
};

const sendBtnStyle: React.CSSProperties = {
  padding: '8px 24px', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none',
};

export default SendMessageModal;
