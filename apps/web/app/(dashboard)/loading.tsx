export default function DashboardLoading() {
  return (
    <div className="relative min-h-screen bg-[#0a0505] overflow-hidden">
      {/* Ambiance blobs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/8 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="h-3 w-56 rounded-full bg-white/5 mb-5" />

        {/* Title skeleton */}
        <div className="flex items-center gap-4 mb-10">
          <div className="h-12 w-12 rounded-xl bg-white/5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-7 w-64 rounded-lg bg-white/5" />
            <div className="h-4 w-96 rounded-lg bg-white/5" />
          </div>
        </div>

        {/* Divider skeleton */}
        <div className="h-px bg-white/5 mb-8" />

        {/* Card skeletons */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/[0.03] ring-1 ring-white/8 p-5 flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-white/5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded-md bg-white/5" />
                <div className="h-3 w-72 rounded-md bg-white/5" />
              </div>
              <div className="h-8 w-20 rounded-xl bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
