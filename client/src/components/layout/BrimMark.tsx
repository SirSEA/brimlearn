export function BrimMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#d8f36a] text-[#133d2f] shadow-[0_6px_0_#0c3428]">
        <span className="font-display text-xl font-bold tracking-[-0.08em]">b°</span>
      </div>
      <div>
        <div className="font-display text-[19px] font-semibold leading-none tracking-[-0.04em] text-[#eef6dc]">BrimLearn</div>
        <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#82a79a]">learn · practise · grow</div>
      </div>
    </div>
  );
}