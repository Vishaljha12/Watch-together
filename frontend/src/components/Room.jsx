import { useState, useEffect, useRef, useCallback } from 'react';
import ReactPlayer from 'react-player';
import io from 'socket.io-client';
import { Send, LogOut, Copy, Link, Play, Pause, Volume2, VolumeX, Users, Maximize } from 'lucide-react';
import './Room.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const formatTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
};

const Room = ({ roomData, onLeave }) => {
  const { userName, roomId, isHost } = roomData;
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);

  const playerRef = useRef(null);
  const chatEndRef = useRef(null);
  const remoteAction = useRef(false);
  const containerRef = useRef(null);

  // Connect socket
  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on('connect', () => {
      s.emit('join-room', { roomId, userName, isHost });
    });

    s.on('room-state', (state) => {
      if (state.videoUrl) setVideoUrl(state.videoUrl);
      setMembers(state.members || []);
      if (state.isPlaying) {
        const elapsed = (Date.now() - state.lastUpdate) / 1000;
        const pos = state.position + elapsed;
        setTimeout(() => {
          if (playerRef.current) playerRef.current.seekTo(pos, 'seconds');
          setPlaying(true);
        }, 500);
      } else if (state.videoUrl) {
        setTimeout(() => {
          if (playerRef.current) playerRef.current.seekTo(state.position, 'seconds');
        }, 500);
      }
    });

    s.on('video-change', (url) => {
      remoteAction.current = true;
      setVideoUrl(url);
      setPlaying(false);
      setProgress(0);
      setTimeout(() => remoteAction.current = false, 300);
    });

    s.on('video-play', (pos) => {
      remoteAction.current = true;
      if (playerRef.current) playerRef.current.seekTo(pos, 'seconds');
      setPlaying(true);
      setTimeout(() => remoteAction.current = false, 300);
    });

    s.on('video-pause', (pos) => {
      remoteAction.current = true;
      if (playerRef.current) playerRef.current.seekTo(pos, 'seconds');
      setPlaying(false);
      setTimeout(() => remoteAction.current = false, 300);
    });

    s.on('video-seek', (pos) => {
      remoteAction.current = true;
      if (playerRef.current) playerRef.current.seekTo(pos, 'seconds');
      setTimeout(() => remoteAction.current = false, 300);
    });

    s.on('chat-message', (msg) => setMessages(prev => [...prev, msg]));
    s.on('members-update', (m) => setMembers(m));

    return () => s.disconnect();
  }, [roomId, userName, isHost]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePlayPause = () => {
    if (!isHost || remoteAction.current) return;
    const pos = playerRef.current?.getCurrentTime() || 0;
    if (playing) {
      socket.emit('video-pause', pos);
      setPlaying(false);
    } else {
      socket.emit('video-play', pos);
      setPlaying(true);
    }
  };

  const handleSeek = (e) => {
    if (!isHost) return;
    const newPos = parseFloat(e.target.value);
    playerRef.current?.seekTo(newPos, 'seconds');
    socket.emit('video-seek', newPos);
    setProgress(newPos);
  };

  const handleLoadUrl = (e) => {
    e.preventDefault();
    if (!urlInput.trim() || !socket) return;
    socket.emit('video-change', urlInput.trim());
    setVideoUrl(urlInput.trim());
    setUrlInput('');
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('chat-message', { text: chatInput });
    setChatInput('');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) document.exitFullscreen();
      else containerRef.current.requestFullscreen();
    }
  };

  return (
    <div className="room">
      {/* Top Bar */}
      <header className="topbar glass">
        <div className="topbar-left">
          <h2 className="room-title">Room <span>{roomId}</span></h2>
          <button className="btn btn-ghost btn-sm" onClick={copyCode}>
            <Copy size={14} /> {copied ? 'Copied!' : 'Copy Code'}
          </button>
          <span className="member-count"><Users size={14} /> {members.length}</span>
        </div>
        <div className="topbar-right">
          <span className="user-badge">{userName} {isHost && <em>(Host)</em>}</span>
          <button className="btn btn-danger btn-sm" onClick={onLeave}>
            <LogOut size={14} /> Leave
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="room-body">
        {/* Video Section */}
        <div className="video-col">
          {/* URL Input for Host */}
          {isHost && (
            <form className="url-bar glass" onSubmit={handleLoadUrl}>
              <Link size={16} className="url-icon" />
              <input
                className="input url-input"
                placeholder="Paste a YouTube, Vimeo, or direct video URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">Load</button>
            </form>
          )}

          {/* Video Player */}
          <div className="player-wrap glass" ref={containerRef}>
            {!videoUrl ? (
              <div className="player-empty">
                <Play size={56} strokeWidth={1.5} />
                <h3>{isHost ? 'Paste a video URL above to start' : 'Waiting for host to load a video...'}</h3>
                <p>Supports YouTube, Vimeo, Twitch, direct MP4 links & more</p>
              </div>
            ) : (
              <ReactPlayer
                ref={playerRef}
                url={videoUrl}
                playing={playing}
                volume={volume}
                muted={muted}
                width="100%"
                height="100%"
                style={{ position: 'absolute', top: 0, left: 0 }}
                onProgress={({ playedSeconds }) => setProgress(playedSeconds)}
                onDuration={(d) => setDuration(d)}
                onPlay={() => {
                  if (!remoteAction.current && isHost && !playing) {
                    const pos = playerRef.current?.getCurrentTime() || 0;
                    socket?.emit('video-play', pos);
                    setPlaying(true);
                  }
                }}
                onPause={() => {
                  if (!remoteAction.current && isHost && playing) {
                    const pos = playerRef.current?.getCurrentTime() || 0;
                    socket?.emit('video-pause', pos);
                    setPlaying(false);
                  }
                }}
                config={{
                  youtube: { playerVars: { modestbranding: 1, rel: 0 } }
                }}
              />
            )}
          </div>

          {/* Custom Controls */}
          {videoUrl && (
            <div className="controls glass">
              <button className="ctrl-btn" onClick={handlePlayPause} disabled={!isHost} title={isHost ? '' : 'Only host can control'}>
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>

              <span className="time">{formatTime(progress)}</span>

              <input
                type="range"
                className="seek-bar"
                min={0}
                max={duration || 0}
                step={0.1}
                value={progress}
                onChange={handleSeek}
                disabled={!isHost}
              />

              <span className="time">{formatTime(duration)}</span>

              <button className="ctrl-btn" onClick={() => setMuted(!muted)}>
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <input
                type="range"
                className="vol-bar"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
              />

              <button className="ctrl-btn" onClick={toggleFullscreen}>
                <Maximize size={18} />
              </button>
            </div>
          )}

          {!isHost && videoUrl && (
            <p className="host-note">Host controls playback · You control your own volume</p>
          )}
        </div>

        {/* Chat Section */}
        <div className="chat-col glass">
          <div className="chat-head">
            <h3>Live Chat</h3>
            <span className="online-dot"></span>
          </div>

          {/* Members */}
          <div className="members-strip">
            {members.map((m) => (
              <span key={m.id} className={`member-tag ${m.isHost ? 'host' : ''}`}>
                {m.name} {m.isHost && '★'}
              </span>
            ))}
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`msg ${msg.system ? 'msg-system' : ''} ${msg.senderId === socket?.id ? 'msg-own' : ''}`}>
                {msg.system ? (
                  <span className="msg-sys-text">{msg.text}</span>
                ) : (
                  <>
                    <span className="msg-name">{msg.senderName}</span>
                    <div className="msg-bubble">{msg.text}</div>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form className="chat-form" onSubmit={sendChat}>
            <input
              className="input"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Room;
