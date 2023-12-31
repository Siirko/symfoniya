/* eslint-disable @typescript-eslint/no-misused-promises */
import { useKBar } from "kbar"
import { Home, ListMusic, Mic2, Music2, Search } from "lucide-react"
import Router from "next/router"
import { useContext } from "react"

import { AppContext } from "@/components/AppContext"
import { AddMusic } from "@/components/modals/AddMusic"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { CreatePlaylist } from "./modals/CreatePlaylist"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function create_button(name: string, shortcut: string, icon: any, onClick: () => void) {
  return (
    <Button
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={onClick}
      variant="ghost"
      className="w-full justify-start"
    >
      {icon}
      {name}
      {shortcut && (
        <span className="ml-auto text-xs font-semibold bg-secondary/90 rounded-lg p-2">
          {shortcut}
        </span>
      )}
    </Button>
  )
}

export function Sidebar({ className: className }: { className?: string }) {
  const { setAudioList } = useContext(AppContext)
  const { query } = useKBar()
  const buttons = [
    {
      label: "Home",
      component: <Home className="mr-2 h-4 w-4" />,
      onClick: () => Router.push("/"),
    },
    {
      label: "Search",
      shortcut: "Ctrl + k",
      component: <Search className="mr-2 h-4 w-4" />,
      onClick: () => {
        query.toggle()
      },
    },
    {
      label: "Music",
      component: <Music2 className="mr-2 h-4 w-4" />,
      onClick: () =>
        Router.push({
          pathname: "/playlist",
          query: { playlist: "all" },
        }),
    },
    {
      label: "Artists",
      component: <Mic2 className="mr-2 h-4 w-4" />,
      onClick: () => Router.push("/"),
    },
  ]
  const { playlists } = useContext(AppContext)
  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <AddMusic setter={setAudioList} />
        </div>
        <div className="px-3 py-2">
          <div className="space-y-1">
            {buttons.map((button) =>
              create_button(
                button.label,
                button.shortcut ?? "",
                button.component,
                button.onClick,
              ),
            )}
          </div>
        </div>
        <div className="py-2">
          <h2 className="relative px-7 text-lg font-semibold tracking-tight">
            Playlists
          </h2>
          <div className="px-3 py-2">
            <CreatePlaylist />
          </div>
          <ScrollArea className="h-[450px] px-1">
            <div className="space-y-1 p-2">
              {playlists.map((playlist, i) => (
                <Button
                  key={`${playlist.name}-${i}`}
                  variant="ghost"
                  onClick={() => {
                    console.log("playlist", playlist)
                    void Router.push({
                      pathname: "/playlist",
                      query: { playlist: playlist.name },
                    })
                  }}
                  className="w-full justify-start font-normal"
                >
                  <ListMusic className="mr-2 h-4 w-4" />
                  {playlist.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
