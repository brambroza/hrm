import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { uploadEmployeePhoto, deleteEmployeePhoto } from '@/services/employeePhotos';
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, validateImageFile } from '@/utils/image';

/**
 * Circular photo picker for an employee.
 *
 * A photo can arrive three ways, because HR staff work differently: clicking
 * the avatar opens the file dialog, an image can be dropped onto it from the
 * desktop, and one can be pasted straight from the clipboard after a screenshot
 * or a copy out of Line.
 *
 * The picked file is cropped, shrunk and uploaded immediately, so the caller
 * only ever deals with a finished URL. That replaces the previous approach of
 * asking the user to paste a photo URL, which assumed they had already hosted
 * the image somewhere.
 *
 * @param {string} value           current photo URL, or empty
 * @param {(url: string|null) => void} onChange  called with the new URL
 * @param {string} [fallbackText]  initials shown when there is no photo
 * @param {boolean} [disabled]
 */
const AvatarUpload = ({ value, onChange, fallbackText = '', disabled = false }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { organizationId } = useAuth();

  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  // Remembered so removing a photo also deletes the object that was just
  // uploaded, instead of leaving it orphaned in the bucket.
  const uploadedPathRef = useRef(null);

  const handleFile = useCallback(
    async (file) => {
      if (disabled) return;

      const problem = validateImageFile(file);
      if (problem === 'type') {
        toast({ variant: 'destructive', title: t('photo.invalidType') });
        return;
      }
      if (problem === 'size') {
        toast({
          variant: 'destructive',
          title: t('photo.tooLarge', { size: Math.round(MAX_UPLOAD_BYTES / 1024 / 1024) }),
        });
        return;
      }

      setUploading(true);
      const { url, path, error } = await uploadEmployeePhoto(file, organizationId);
      setUploading(false);

      if (error) {
        toast({
          variant: 'destructive',
          title: t('photo.uploadFailed'),
          // An account with no organization cannot produce a valid storage
          // path, and "missing-organization" means nothing to an HR clerk.
          description:
            error.message === 'missing-organization'
              ? t('photo.noOrganization')
              : error.message,
        });
        return;
      }

      // A replacement makes the previous upload unreachable; drop it now.
      if (uploadedPathRef.current) {
        deleteEmployeePhoto(uploadedPathRef.current);
      }
      uploadedPathRef.current = path;
      onChange(url);
    },
    [disabled, onChange, organizationId, t, toast],
  );

  // Paste support is only wired while the widget is mounted, so it cannot
  // hijack pasting into the text fields of the surrounding form.
  useEffect(() => {
    const onPaste = (event) => {
      const item = Array.from(event.clipboardData?.items || []).find((entry) =>
        entry.type.startsWith('image/'),
      );
      if (!item) return;

      const file = item.getAsFile();
      if (file) {
        event.preventDefault();
        handleFile(file);
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleFile]);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    if (uploadedPathRef.current) {
      deleteEmployeePhoto(uploadedPathRef.current);
      uploadedPathRef.current = null;
    }
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const openPicker = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div
        role="button"
        tabIndex={0}
        aria-label={t('photo.choosePhoto')}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`group relative rounded-full transition-all outline-none ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${
          dragging
            ? 'ring-4 ring-emerald-500/40'
            : 'ring-2 ring-slate-200 dark:ring-slate-700 focus-visible:ring-emerald-500'
        }`}
      >
        <Avatar className="h-24 w-24">
          <AvatarImage src={value || undefined} alt="" className="object-cover" />
          <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-2xl font-semibold text-slate-400">
            {fallbackText ? fallbackText.charAt(0) : <Camera className="w-7 h-7" />}
          </AvatarFallback>
        </Avatar>

        {/* Hover and busy states share one overlay so the avatar never jumps. */}
        <div
          className={`absolute inset-0 rounded-full bg-slate-900/60 flex items-center justify-center transition-opacity ${
            uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </div>

      <div className="text-center sm:text-left">
        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled || uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {value ? t('photo.changePhoto') : t('photo.choosePhoto')}
          </button>

          {value && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('photo.removePhoto')}
            </button>
          )}
        </div>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
          {t('photo.hint')}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
};

export default AvatarUpload;
