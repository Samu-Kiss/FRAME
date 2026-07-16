import { SmpteBar, Logo } from "@/components/ui"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-deep">
      <SmpteBar h={5} />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex justify-center">
            <Logo size="lg" />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
