export default function SettingsFormSkeleton() {
  return (
    <div className="bg-[#222327] border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl animate-pulse">
      <div className="space-y-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-32 bg-white/10 rounded" />
            <div className="h-12 w-full bg-white/5 rounded-xl" />
          </div>
        ))}
        <div className="h-12 w-40 bg-[#5865F2]/20 rounded-xl mt-10" />
      </div>
    </div>
  );
}