export function BrimMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#FFC857] text-[#1A1512] shadow-[0_6px_0_#2A1D16]">
        <span className="font-display text-xl font-bold tracking-[-0.08em]">b°</span>
      </div>
      <div>
        <div className="font-display text-[19px] font-semibold leading-none tracking-[-0.04em] text-[#FFF8EE]">BrimLearn</div>
        <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A08A75]">learn · practise · grow</div>
      </div>
    </div>
  );
}