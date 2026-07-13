import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BaseDialogOptions {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface PromptDialogOptions extends BaseDialogOptions {
  initialValue?: string;
  placeholder?: string;
  multiline?: boolean;
  validate?: (value: string) => string | undefined;
}

export type ConfirmDialogOptions = BaseDialogOptions;

interface DialogState {
  mode: 'confirm' | 'prompt';
  options: ConfirmDialogOptions | PromptDialogOptions;
  resolve: (value: boolean | string | undefined) => void;
}

export function useAppDialog() {
  const [state, setState] = useState<DialogState>();
  const stateRef = useRef<DialogState>();
  stateRef.current = state;

  useEffect(() => () => {
    const current = stateRef.current;
    if (current) current.resolve(current.mode === 'confirm' ? false : undefined);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => new Promise<boolean>((resolve) => {
    setState({ mode: 'confirm', options, resolve: (value) => resolve(value === true) });
  }), []);

  const prompt = useCallback((options: PromptDialogOptions) => new Promise<string | undefined>((resolve) => {
    setState({ mode: 'prompt', options, resolve: (value) => resolve(typeof value === 'string' ? value : undefined) });
  }), []);

  const close = useCallback((value?: boolean | string) => {
    const current = stateRef.current;
    if (!current) return;
    stateRef.current = undefined;
    setState(undefined);
    current.resolve(value ?? (current.mode === 'confirm' ? false : undefined));
  }, []);

  return {
    confirm,
    prompt,
    dialog: state ? <AppDialog mode={state.mode} options={state.options} onClose={close} /> : null,
  };
}

function AppDialog({
  mode,
  options,
  onClose,
}: {
  mode: 'confirm' | 'prompt';
  options: ConfirmDialogOptions | PromptDialogOptions;
  onClose: (value?: boolean | string) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const promptOptions = mode === 'prompt' ? options as PromptDialogOptions : undefined;
  const [value, setValue] = useState(promptOptions?.initialValue ?? '');
  const [error, setError] = useState<string>();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (typeof document === 'undefined') {
    return null;
  }

  const submit = () => {
    if (mode === 'confirm') {
      onClose(true);
      return;
    }
    const validationError = promptOptions?.validate?.(value);
    if (validationError) {
      setError(validationError);
      return;
    }
    onClose(value);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-describedby={options.description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
        role="dialog"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
          if (event.key === 'Enter' && !promptOptions?.multiline) {
            event.preventDefault();
            submit();
          }
        }}
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-950">{options.title}</h2>
        {options.description ? (
          <div id={descriptionId} className="mt-2 text-sm leading-6 text-gray-600">{options.description}</div>
        ) : null}
        {mode === 'prompt' ? (
          <div className="mt-4">
            {promptOptions?.multiline ? (
              <textarea
                autoFocus
                className="min-h-40 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder={promptOptions.placeholder}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError(undefined);
                }}
              />
            ) : (
              <input
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder={promptOptions?.placeholder}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError(undefined);
                }}
              />
            )}
            {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            type="button"
            onClick={() => onClose()}
          >
            {options.cancelText ?? '取消'}
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm text-white ${options.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-500 hover:bg-brand-600'}`}
            type="button"
            onClick={submit}
          >
            {options.confirmText ?? '确认'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
