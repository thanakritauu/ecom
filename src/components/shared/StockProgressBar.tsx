export function StockProgressBar(props: { stockLeft: number; stockTotal: number; /** Smaller label for tight spots (list-view product card). */ compact?: boolean }) {
  const percent = () => Math.max(4, Math.min(100, (props.stockLeft / props.stockTotal) * 100));
  return (
    <div class="flex w-full flex-col" classList={{ "gap-2": !props.compact, "gap-1": props.compact }}>
      <div
        class="h-1.5 w-full overflow-hidden rounded-pill bg-surface-gray"
        role="progressbar"
        aria-valuenow={props.stockLeft}
        aria-valuemin={0}
        aria-valuemax={props.stockTotal}
        aria-label={`เหลือสินค้า ${props.stockLeft} จาก ${props.stockTotal} ชิ้น`}
      >
        <div
          class="h-full rounded-pill bg-brand-yellow transition-[width] duration-500 ease-out"
          style={{ width: `${percent()}%` }}
        />
      </div>
      <p class="text-system-red" classList={{ "text-base": !props.compact, "text-xs font-medium": props.compact }}>
        เหลืออีก {props.stockLeft} ชิ้น
      </p>
    </div>
  );
}
