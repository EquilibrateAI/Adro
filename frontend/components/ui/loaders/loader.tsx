type ClassicLoaderProps = {
  fullscreen?: boolean;
  text?: string;
};

export default function ClassicLoader({
  fullscreen = false,
  text = "Loading...",
}: ClassicLoaderProps) {
  const spinner = (
    <div className="border-primary h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
        {spinner}
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      </div>
    );
  }

  return spinner;
}