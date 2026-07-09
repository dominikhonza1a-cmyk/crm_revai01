"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, SectionTitle, Badge, Modal, fieldInput, fieldLabel, btnPrimary, btnGhost, formatError } from "./ui";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Sales" },
  { value: "pm", label: "Projektový manažer" },
  { value: "dev", label: "Vývojář" },
  { value: "support", label: "Support" },
] as const;

/** Správa uživatelů (Nastavení, jen admin): pozvání kolegy, změna role, deaktivace. */
export function UsersSection() {
  const utils = trpc.useUtils();
  const me = trpc.me.useQuery();
  const users = trpc.security.listUsers.useQuery();
  const [modal, setModal] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleKey, setRoleKey] = useState<(typeof ROLES)[number]["value"]>("pm");
  const [info, setInfo] = useState<string | null>(null);

  const invalidate = () => utils.security.listUsers.invalidate();
  const invite = trpc.security.inviteUser.useMutation({
    onSuccess: async (res) => {
      setModal(false); setEmail(""); setFullName("");
      setInfo(res.inviteSent
        ? "Pozvánka odeslána e-mailem — kolega se přihlásí přes odkaz v ní. ✅"
        : "Účet vytvořen, ale pozvánkový e-mail se nepodařilo odeslat — pozvi ho v Supabase → Authentication → Users → Invite.");
      await invalidate();
    },
  });
  const setRole = trpc.security.setRole.useMutation({ onSuccess: invalidate });
  const deactivate = trpc.security.deactivateUser.useMutation({ onSuccess: invalidate });

  return (
    <Card>
      <SectionTitle right={
        <button className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent"
          onClick={() => setModal(true)}>+ Pozvat uživatele</button>
      }>Uživatelé a role</SectionTitle>

      {users.isLoading ? <p className="text-sm text-faint">Načítám…</p> : (
        <ul className="divide-y divide-line">
          {users.data?.map((u) => {
            const isMe = u.id === me.data?.userId;
            return (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 text-sm">
                  <span className="text-ink">{u.fullName}</span>
                  {isMe && <Badge tone="blue">ty</Badge>}
                  <span className="ml-2 text-faint">{u.email}</span>
                  {u.status === "invited" && <Badge tone="amber">pozvaný</Badge>}
                  {u.status === "deactivated" && <Badge tone="red">deaktivovaný</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs text-ink outline-none focus:border-accent disabled:opacity-50"
                    value={u.roles[0] ?? "pm"}
                    disabled={setRole.isPending || u.status === "deactivated"}
                    onChange={(e) => setRole.mutate({ userId: u.id, roleKey: e.target.value as never })}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  {!isMe && u.status !== "deactivated" && (
                    <button className="text-xs text-red-300 hover:underline" disabled={deactivate.isPending}
                      onClick={() => deactivate.mutate({ userId: u.id })}>Deaktivovat</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {info && <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{info}</p>}
      {(setRole.error || deactivate.error) && <p className="mt-3 rounded-xl bg-red-400/10 px-3 py-2 text-sm text-red-300">{formatError((setRole.error ?? deactivate.error)?.message)}</p>}

      {modal && (
        <Modal title="Pozvat uživatele" onClose={() => setModal(false)}>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); invite.mutate({ email, fullName, roleKey }); }}>
            <div><label className={fieldLabel}>Jméno *</label><input className={fieldInput} value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus /></div>
            <div><label className={fieldLabel}>E-mail *</label><input className={fieldInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><label className={fieldLabel}>Role</label>
              <select className={fieldInput} value={roleKey} onChange={(e) => setRoleKey(e.target.value as never)}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-faint">Kolegovi přijde pozvánkový e-mail — přihlásí se přes odkaz a v Nastavení si může zapnout MFA.</p>
            {invite.error && <p className="text-sm text-red-300">{formatError(invite.error.message)}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setModal(false)}>Zrušit</button>
              <button type="submit" className={btnPrimary} disabled={invite.isPending}>{invite.isPending ? "Zvu…" : "Pozvat"}</button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
