import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-2">
            Life & Legacy Journal
          </p>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            Begin your journey
          </h1>
          <p className="text-secondary mt-2 text-sm">
            Create a private space for growth and the life you are building
          </p>
        </div>

        <div className="card-elevated p-2">
          <SignUp
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "border border-[var(--border)] hover:bg-[var(--border-subtle)]",
                formButtonPrimary:
                  "bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white",
                footerActionLink: "text-primary hover:text-[var(--primary-dark)]",
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}