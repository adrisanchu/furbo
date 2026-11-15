export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h1 className="pt-2 text-[26px] font-bold tracking-[-0.02em]">{title}</h1>
      <p className="rounded-2xl border border-dashed bg-card p-[18px] text-sm leading-normal text-muted-foreground">
        {body}
      </p>
    </>
  );
}
