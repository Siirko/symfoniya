#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[cfg(debug_assertions)]
const LOG_TARGETS: [LogTarget; 2] = [LogTarget::Stdout, LogTarget::Webview];

#[cfg(not(debug_assertions))]
const LOG_TARGETS: [LogTarget; 2] = [LogTarget::Stdout, LogTarget::LogDir];

use std::sync::Arc;
mod db;
mod music;
use crate::{api::*, music::player::Player};
use db::{database, state::DbState};
use log::info;
use music::{
    async_process::{async_process_model, AsyncProcInputTx},
    player::MusicPlayer,
};

use rodio::OutputStream;
use tauri::{CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use tauri::{Manager, State};
use tauri_plugin_log::{fern::colors::ColoredLevelConfig, LogTarget};
use tokio::sync::mpsc;
mod api;

fn main() {
    let (_stream, _stream_handle) = OutputStream::try_default().unwrap();
    // leak the stream to keep it alive, otherwise it will be dropped and no more audio !!!!
    // this is not a good thing but I think it is a good workaround for now ...
    let _str = Box::leak(Box::new(_stream));
    let arc_player = Arc::new(std::sync::Mutex::new(MusicPlayer::new(_stream_handle)));

    let (async_process_input_tx, async_process_input_rx) = mpsc::channel(1);
    let (async_process_output_tx, mut async_process_output_rx) = mpsc::channel(1);

    tauri::Builder::default()
        .system_tray(
            SystemTray::new().with_menu(
                SystemTrayMenu::new()
                    .add_item(CustomMenuItem::new("open".to_string(), "Open Symfoniya"))
                    .add_native_item(SystemTrayMenuItem::Separator)
                    .add_item(CustomMenuItem::new("quit".to_string(), "Quit")),
            ),
        )
        .on_system_tray_event(|app, event| {
            if let SystemTrayEvent::MenuItemClick { id, .. } = event {
                match id.as_str() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "open" => {
                        let window = app.get_window("main").unwrap();
                        window.show().unwrap();
                    }
                    _ => {}
                }
            }
        })
        .manage(arc_player)
        .manage(DbState {
            db: Default::default(),
        })
        .manage(AsyncProcInputTx {
            inner: tokio::sync::Mutex::new(async_process_input_tx),
        })
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets(LOG_TARGETS)
                .with_colors(ColoredLevelConfig::default())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            player::import_from_folders,
            player::play_from_id,
            player::pause,
            player::update_player,
            player::seek_to,
            audio::updated_current_playlist,
            audio::retrieve_audios,
            audio::current_audio_status,
            audio::set_volume,
            audio::get_volume,
            audio::goto_next,
            audio::goto_previous,
            audio::shuffle,
            audio::startup_audios_init,
            audio::update_history,
            audio::get_audios_history,
            audio::speed_up,
            audio::import_audios_history,
            playlist::create_playlist,
            playlist::add_audio_to_playlist,
            playlist::get_audio_playlist,
            playlist::get_playlists,
            playlist::is_in_playlist,
            music::ytdlp_wrapper::download_audio_from_links,
        ])
        .setup(|app| {
            // init database
            let handle = app.handle();
            let app_state: State<DbState> = handle.state();
            let db =
                database::initialize_database(&handle).expect("Database initialize should succeed");
            *app_state.db.lock().unwrap() = Some(db);

            // check if ytdlp is installed
            match music::ytdlp_wrapper::check_ytdl_bin() {
                Ok(_) => {}
                Err(_) => {
                    let app_dir = handle
                        .path_resolver()
                        .app_data_dir()
                        .expect("The app data directory should exist.");
                    info!(
                        "yt-dlp not found, downloading it at {:?}",
                        app_dir.as_os_str()
                    );
                    tauri::async_runtime::spawn(async move {
                        let path = youtube_dl::download_yt_dlp(app_dir.as_os_str())
                            .await
                            .unwrap();
                        assert!(path.is_file(), "downloaded file should exist");
                    });
                }
            }

            tauri::async_runtime::spawn(async move {
                async_process_model(async_process_input_rx, async_process_output_tx).await
            });

            tauri::async_runtime::spawn(async move {
                loop {
                    if let Some(outputs) = async_process_output_rx.recv().await {
                        handle.emit_all("result_from_download", outputs).unwrap();
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event.event() {
                event.window().hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
