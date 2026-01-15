import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold">Restoe</h1>
          <p className="mt-2 text-muted-foreground">Sign in to your account</p>
        </div>
        <div className="space-y-4">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
