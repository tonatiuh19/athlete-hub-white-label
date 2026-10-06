import AtleitaWordmark from "@/components/brand/AtleitaWordmark";

/** Centered Atleita mark above login form title */
export default function AuthFormBrandMark() {
  return (
    <div className="flex justify-center mb-6">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4">
        <AtleitaWordmark href="/" className="text-2xl sm:text-3xl" />
      </div>
    </div>
  );
}
