import searchIcon from "~/assets/icons/search.svg";

export function SearchBar(props: {
  tone?: "onDark" | "onLight";
  placeholder?: string;
  autofocus?: boolean;
  onSubmit?: (query: string) => void;
}) {
  const dark = props.tone !== "onLight";
  let inputRef: HTMLInputElement | undefined;

  return (
    <form
      role="search"
      class={`flex min-h-[44px] w-full items-center gap-2 rounded-pill px-[18px] py-2 ${
        dark ? "bg-white/30" : "bg-surface-pink"
      }`}
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit?.(inputRef?.value ?? "");
      }}
    >
      <img src={searchIcon} alt="" class="size-6 shrink-0" />
      <input
        ref={inputRef}
        type="search"
        name="q"
        autofocus={props.autofocus}
        placeholder={props.placeholder ?? "ค้นหาสินค้า หรือหมวดหมู่"}
        aria-label="ค้นหาสินค้า หรือหมวดหมู่"
        class={
          dark
            ? "min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white"
            : "min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-placeholder"
        }
      />
    </form>
  );
}
