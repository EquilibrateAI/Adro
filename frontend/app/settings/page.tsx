import { BrainCircuit } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { NavTabs } from "@/components/nav-tabs/nav-tabs"
import ModelsCard from "@/components/settings/model-card"
import ConfigCard from "@/components/settings/config-card"

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">

      {/* Header - Full width at top */}

      <header className="h-16 flex-shrink-0 border-b border-gray-200 bg-white px-6 flex items-center">
        <div className="flex w-full items-center justify-between">

          <div className="flex items-center gap-4">

            <BrainCircuit className="h-6 w-6 text-primary" />

            <Separator orientation="vertical" className="h-8" />

            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Settings
              </h1>

              <p className="text-sm text-muted-foreground">
                Manage your profile, organization, and usage
              </p>
            </div>

          </div>

          <NavTabs />

        </div>
      </header>


      {/* Settings Content */}

      <div className="flex flex-col items-center gap-8 p-8">

        <ModelsCard />

        <ConfigCard />

      </div>

    </div>
  )
}