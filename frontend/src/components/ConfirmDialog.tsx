import { AppModal } from "./ui/AppModal";

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: { open: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <AppModal isOpen={open} onClose={onCancel} size="sm" panelClassName="soc-panel-strong p-6">
      <div>
        <h2 className="text-xl font-black text-cyber-text">{title}</h2><p className="mt-3 text-cyber-muted">{description}</p>
        <div className="mt-6 flex justify-end gap-3"><button onClick={onCancel} className="soc-button-ghost">Cancel</button><button onClick={onConfirm} className="inline-flex items-center justify-center rounded-2xl bg-cyber-red px-4 py-2.5 text-sm font-black text-cyber-bg transition hover:bg-red-400">Confirm</button></div>
      </div>
    </AppModal>
  );
}
