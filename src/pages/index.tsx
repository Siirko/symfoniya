/* eslint-disable @next/next/no-img-element */
import "keen-slider/keen-slider.min.css"

import type { NextPage } from "next"
import Router from "next/router"
import { useContext } from "react"

import { AppContext } from "@/components/AppContext"
import { useGlobalShortcut } from "@/hooks/tauri/shortcuts"
import { byteToImage } from "@/lib/utils"

const Home: NextPage = () => {
  const { playlists } = useContext(AppContext)
  useGlobalShortcut("CommandOrControl+P", () => {
    console.log("Ctrl+P was pressed!")
  })

  return (
    <div className="h-full flex flex-col gap-6">
      <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl container">
        Hello !
      </h1>
      <div className="flex flex-row container mx-auto px-16">
        {playlists.map((value, index) => {
          return (
            <div
              key={index}
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onClick={() => {
                void Router.push({
                  pathname: "/playlist",
                  query: { playlist: value.name },
                })
              }}
              id={`playlist-${value.name}`}
              className="shrink-0
                hover:cursor-pointer hover:bg-gray-50 duration-150
                delay-90 dark:hover:bg-gray-900 p-6 rounded-lg transition ease-in-out  items-center space-y-4"
            >
              <img
                src={byteToImage(value.cover)}
                className="h-52 w-52 rounded-lg"
                alt={value.name}
              />
              <div>
                <h2 className="text-left text-sm font-medium truncate">{value.name}</h2>
                <p className="text-left text-xs truncate text-slate-600 dark:text-slate-400">
                  {value.count} songs
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Home
