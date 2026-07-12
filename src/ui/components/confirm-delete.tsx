"use client";

import { useState } from "react";
import { Modal, fieldInput, btnGhost } from "./ui";

/**
 * Potvrzení nevratného smazání — vyžaduje napsat SMAZAT (double-check proti překliku).
 * Použití: <ConfirmDeleteModal name="klienta Beroun" onConfirm={…} onClose={…} busy={…} />
 */
export function ConfirmDeleteModal({ name, detail, onConfirm, onClose, busy }: {
  name: string; detail?: string; onConfirm: () => void; onClose: () => void; busy?: boolean;
}) {
  const [txt, setTxt] = useState("");
  const ok = txt.trim().toUpperCase() === "SMAZAT";
  return (
    <Modal title="Opravdu smazat?" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted">Chystáš se nenávratně smazat <span className="font-medium text-ink">{name}</span>.{detail ? ` ${detail}` : ""} Tuto akci nelze vzít zpět.</p>
        <div>
          <label className="mb-1.5 block text-xs text-faint">Pro potvrzení napiš <span className="font-semibold text-red-300">SMAZAT</span></label>
          <input className={fieldInput} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="SMAZAT" autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && ok) onConfirm(); }} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
          <button type="button" disabled={!ok || busy}
            className="rounded-xl bg-red-400/90 px-4 py-2.5 text-sm font-semibold text-[#1a0b0b] transition-all hover:brightness-110 disabled:opacity-40"
            onClick={onConfirm}>{busy ? "Mažu…" : "Smazat natrvalo"}</button>
        </div>
      </div>
    </Modal>
  );
}
