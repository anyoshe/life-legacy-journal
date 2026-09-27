import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-2">
            Life & Legacy Journal
          </p>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            Welcome back
          </h1>
          <p className="text-secondary mt-2 text-sm">
            Continue building the life you want
          </p>
        </div>

        <div className="card-elevated p-2">
          <SignIn
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