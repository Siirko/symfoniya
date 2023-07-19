import { Progress } from "@/components/ui/progress"
import { Audio } from "@/components/scene/Music"
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle } from "lucide-react"
import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/tauri"
import { Button } from "./ui/button"


type AudioStatus = {
    status: string
    current_time: number
    duration: number
}

function format_duration(duration: number) {
    let minutes: any = Math.floor(duration / 60)
    if (minutes < 10) {
        minutes = `0${minutes}`
    }
    let seconds: any = Math.floor(duration % 60)
    if (seconds < 10) {
        seconds = `0${seconds}`
    }
    return `${minutes}:${seconds}`
}

export function Player(props: { currentAudio: Audio, setter: Function }) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const play = async () => {
        await invoke("play_from_id", { id: props.currentAudio.id })
        setIsPlaying(true)
    }
    const pause = async () => {
        await invoke("pause")
        setIsPlaying(false)
    }

    const poll_status = async () => {
        const tmp: any = await invoke("current_audio_status");
        const status: AudioStatus = {
            status: tmp[0],
            current_time: tmp[1],
            duration: tmp[2]
        }
        setCurrentTime(status.current_time);
        console.log(status);
    }

    let intervalid: any
    useEffect(() => {
        if (!isPlaying) {
            return
        }
        const timeoutFunction = setInterval(poll_status, 1000)
        return () => clearInterval(timeoutFunction)
    }, [poll_status, currentTime])

    return (
        <div>
            <Progress value={currentTime} max={props.currentAudio.duration} />
            <div className="flex items-center justify-center w-full h-full">
                <Button variant="ghost" size="icon">
                    <SkipBack />
                </Button>
                {
                    isPlaying ?
                        <Button variant="ghost" size="icon" onClick={pause}>
                            <Pause />
                        </Button> :
                        <Button variant="ghost" size="icon" onClick={play}>
                            <Play />
                        </Button>
                }
                <Button variant="ghost" size="icon">
                    <SkipForward />
                </Button>
                <h1>{props.currentAudio.title}</h1>
                <h2>{props.currentAudio.artist}</h2>
                <p>{format_duration(currentTime)}</p>
                <p>{format_duration(props.currentAudio.duration)}</p>

                {/*  
            <div className="flex items-center justify-center w-full">
                <Volume2 className="w-8 h-8" />
            </div>
            <div className="flex items-center justify-center w-full">
                <Repeat className="w-8 h-8" />
                <Shuffle className="w-8 h-8" />
            </div>
            */}
            </div>
        </div>
    )
}