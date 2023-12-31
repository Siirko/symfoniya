/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { invoke } from "@tauri-apps/api/tauri"
import { Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react"
import { useRouter } from "next/router"
import Router from "next/router"
import { useEffect, useState } from "react"
import { useContext } from "react"

import { AppContext, appContext } from "@/components/AppContext"
import { Audio, AudioStatus } from "@/components/types/audio"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { format_duration, isObjectEmpty } from "@/lib/utils"

import { Button } from "../ui/button"
import VolumeButton from "./Volume"

async function play_from_id_or_skip(
  id: number,
  context: appContext,
  fromMusicPage = false,
) {
  const page = Router.query.path
  const { toast } = context
  const { audioList, oldAudioList } = context
  console.log(page)
  try {
    const result: boolean = await invoke("play_from_id", {
      id: id,
      path: fromMusicPage ? audioList[id].path : oldAudioList[id].path,
    })
    if (!result) {
      toast({
        title: "Audio",
        description: `${audioList[id].title} is deleted, skipping to next audio`,
        variant: "destructive",
      })
      return false
    }
    return true
  } catch (error) {
    console.error(error)
    toast({
      title: "Audio",
      description: `Error playing audio`,
      variant: "destructive",
    })
    return false
  }
}

export async function update_after_play(
  context: appContext,
  name?: string,
  fromMusicPage = false,
) {
  const { currentPlaylistListening, setOldAudioList } = context
  const playlist = isObjectEmpty(currentPlaylistListening as unknown as object)
    ? name
    : !fromMusicPage
    ? currentPlaylistListening
    : name
  console.log(playlist)
  await invoke("update_player", {
    playlist: playlist,
  })
  const res = await invoke<Audio[]>("get_audio_playlist", {
    playlist: playlist,
  })
  setOldAudioList(res)
}

async function next(context: appContext) {
  const { setAudioById, setIsPlaying } = context
  await update_after_play(context)
  const id: number = await invoke("goto_next")
  const result = await play_from_id_or_skip(id, context)
  if (result) {
    setAudioById(id)
    setIsPlaying(true)
  } else {
    await next(context)
  }
}

export async function play(context: appContext, toPlay: Audio, fromMusicPage = false) {
  const { isPlaying, setIsPlaying, setAudioPlayer } = context
  const result = await play_from_id_or_skip(toPlay.id, context, fromMusicPage)
  if (result && !isPlaying) {
    setIsPlaying(true)
    setAudioPlayer(toPlay)
  } else if (result && isPlaying) {
    setAudioPlayer(toPlay)
  } else {
    await next(context)
  }
}

async function pause(context: appContext) {
  const { setIsPlaying } = context
  await invoke("pause")
  setIsPlaying(false)
}

async function previous(context: appContext) {
  const { setAudioById, setIsPlaying } = context
  await update_after_play(context)
  const id: number = await invoke("goto_previous")
  const result = await play_from_id_or_skip(id, context)
  if (result) {
    setAudioById(id)
    setIsPlaying(true)
    //await invoke("update_history")
  } else {
    await previous(context)
  }
}

export async function shuffle(
  name: string,
  context: appContext,
  fromMusicPage = false,
) {
  const {
    setAudioList,
    setOldAudioList,
    setCurrentPlaylistListening,
    currentPlaylistListening,
  } = context
  const { audio, setAudioPlayer, setIsPlaying } = context
  const audios: Audio[] = await invoke("shuffle", {
    playlist: fromMusicPage ? name : currentPlaylistListening,
  })

  if (fromMusicPage) {
    setAudioList(audios)
    setOldAudioList(audios)
  } else if (name === currentPlaylistListening) {
    setAudioList(audios)
  } else {
    setOldAudioList(audios)
  }
  await update_after_play(context, fromMusicPage ? name : undefined, fromMusicPage)
  const result = await play_from_id_or_skip(audios[0].id, context, fromMusicPage)
  if (result) {
    if (audios[0] === audio) {
      return
    }
    setAudioPlayer(audios[0])
    if (fromMusicPage) {
      setCurrentPlaylistListening(name)
    }
    setIsPlaying(true)
    //await invoke("update_history")
  } else {
    await shuffle(name, context, fromMusicPage)
  }
}

export function Player() {
  const router = useRouter()
  const context = useContext(AppContext)
  const { isPlaying, setIsPlaying } = useContext(AppContext)
  const [status, updateStatus] = useState<AudioStatus>({
    current: 0,
    total: 0,
    status: "stopped",
  } as AudioStatus)
  const { audio } = useContext(AppContext)
  const wupdate_status = () => {
    void invoke("current_audio_status")
      .then((response) => {
        console.log(response)
        updateStatus(response as AudioStatus)
      })
      .catch((error) => {
        console.error(error)
        updateStatus({ current: 0, total: 0, status: "stopped" } as AudioStatus)
      })
  }

  useEffect(() => {
    const timeoutFunction = setInterval(() => {
      if (!isPlaying) {
        return
      }
      wupdate_status()
      if (audio.duration === status.current) {
        status.current = 0
        setIsPlaying(false)
        next(context)
      }
    }, 1000)
    return () => {
      clearInterval(timeoutFunction)
    }
  }, [wupdate_status, status])

  useEffect(() => {
    ;(() => {
      if (!isObjectEmpty(audio)) {
        invoke("update_history")
          .then(() => {
            console.log("history updated")
          })
          .catch((err) => {
            console.log("history error", err)
          })
      }
    })()
  }, [audio])

  return (
    <div
      className={cn(
        "sticky bottom-0 w-full bg-slate-50 dark:bg-slate-900 transition-all duration-300 ease-out",
        isObjectEmpty(audio) ? "translate-y-full" : "",
      )}
    >
      <Progress
        className="w-full"
        defaultValue={[0]}
        max={status.total}
        step={1}
        value={[status.current]}
        onValueChange={(value) => {
          console.log(value)
          void invoke("seek_to", { position: value[0] })
        }}
      />
      <div className="px-8 py-4">
        <div className="flex justify-start items-center w-full h-full">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => previous(context)}>
              <SkipBack />
            </Button>
            {isPlaying ? (
              <Button variant="ghost" size="icon" onClick={() => pause(context)}>
                <Pause className="w-8 h-8" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => play(context, audio)}>
                <Play className="w-8 h-8" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => next(context)}>
              <SkipForward />
            </Button>
            <div className="text-sm text-muted-foreground ml-2 flex gap-1">
              <p className="w-12 text-right">{format_duration(status.current)}</p> /{" "}
              <p className="w-12 text-left">{format_duration(status.total)}</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center flex-1">
            <p className="font-semibold leading-tight">{audio.title}</p>
            <p className="text-sm text-muted-foreground">{audio.artist}</p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <VolumeButton />
            <Button variant="ghost" size="icon">
              <Repeat />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => shuffle(router.query.playlist as string, context)}
            >
              <Shuffle />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
