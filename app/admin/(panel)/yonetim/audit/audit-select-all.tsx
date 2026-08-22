'use client';

import { useEffect, useRef, useState } from 'react';

export function AuditSelectAll({ formId, total }: { formId: string; total: number }) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const selector = `input[type="checkbox"][form="${formId}"][name="ids"]`;
    const getBoxes = () => [...document.querySelectorAll<HTMLInputElement>(selector)];
    const sync = () => setSelected(getBoxes().filter((checkbox) => checkbox.checked).length);
    const handleChange = (event: Event) => {
      if (event.target instanceof HTMLInputElement && event.target.matches(selector)) sync();
    };
    const handleSuccess = (event: Event) => {
      const detail = (event as CustomEvent<{ formId?: string }>).detail;
      if (detail?.formId !== formId) return;
      getBoxes().forEach((checkbox) => { checkbox.checked = false; });
      setSelected(0);
    };
    document.addEventListener('change', handleChange);
    window.addEventListener('toast-action-success', handleSuccess);
    sync();
    return () => {
      document.removeEventListener('change', handleChange);
      window.removeEventListener('toast-action-success', handleSuccess);
    };
  }, [formId, total]);

  const allSelected = total > 0 && selected === total;
  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = selected > 0 && !allSelected;
  }, [allSelected, selected]);

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={allSelected}
        className="h-4 w-4 rounded border-slate-300 accent-sky-500"
        onChange={(event) => {
          const boxes = [...document.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][form="${formId}"][name="ids"]`)];
          boxes.forEach((checkbox) => { checkbox.checked = event.target.checked; });
          setSelected(event.target.checked ? boxes.length : 0);
        }}
      />
      {selected > 0 ? `${selected} kayıt seçildi` : 'Sayfadakilerin tümünü seç'}
    </label>
  );
}
