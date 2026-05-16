import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Send, LogOut, Copy, Link as LinkIcon, Play, Pause } from 'lucide-react';
import './Room.css';

const SOCKET_URL = 'http://localhost:5000'; 

const Room = ({ roomData, onLeave }) => {
  const { userName, roomId, isHost } = roomData;
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const isUpdatingFromSocket = useRef(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-room', roomId, userName);
    });

    newSocket.on('room-state', (state) => {
      if (state.videoUrl) setVideoUrl(state.videoUrl);
      if (videoRef.current && state.videoUrl) {
        // Calculate where the video should be if it was playing
        let currentPos = state.position;
        if (state.isPlaying) {
          const timePassed = (Date.now() - state.lastUpdate) / 1000;
          currentPos += timePassed;
        }
        videoRef.current.currentTime = currentPos;
        if (state.isPlaying) {
          videoRef.current.play().catch(e => console.log(e));
        }
      }
    });

    newSocket.on('user-connected', ({ userName: newUserName }) => {
      setMessages(prev => [...prev, { system: true, text: `${newUserName} joined the room.` }]);
    });

    newSocket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // --- SYNC EVENTS ---
    newSocket.on('video-change', (url) => {
      setVideoUrl(url);
    });

    newSocket.on('video-play', (position) => {
      if (videoRef.current) {
        isUpdatingFromSocket.current = true;
        videoRef.current.currentTime = position;
        videoRef.current.play().catch(e => console.log(e));
        setTimeout(() => isUpdatingFromSocket.current = false, 100);
      }
    });

    newSocket.on('video-pause', (position) => {
      if (videoRef.current) {
        isUpdatingFromSocket.current = true;
        videoRef.current.currentTime = position;
        videoRef.current.pause();
        setTimeout(() => isUpdatingFromSocket.current = false, 100);
      }
    });

    newSocket.on('video-seek', (position) => {
      if (videoRef.current) {
        isUpdatingFromSocket.current = true;
        videoRef.current.currentTime = position;
        setTimeout(() => isUpdatingFromSocket.current = false, 100);
      }
    });

    return () => newSocket.disconnect();
  }, [roomId, userName]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Host Actions
  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (!urlInput) return;
    setVideoUrl(urlInput);
    socket.emit('video-change', urlInput);
  };

  const handlePlay = () => {
    if (!isHost || isUpdatingFromSocket.current) return;
    socket.emit('video-play', videoRef.current.currentTime);
  };

  const handlePause = () => {
    if (!isHost || isUpdatingFromSocket.current) return;
    socket.emit('video-pause', videoRef.current.currentTime);
  };

  const handleSeek = () => {
    if (!isHost || isUpdatingFromSocket.current) return;
    socket.emit('video-seek', videoRef.current.currentTime);
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('chat-message', { text: chatInput, timestamp: Date.now() });
    setChatInput('');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied to clipboard!');
  };

  // Build the correct video source based on if they typed a URL or a local filename
  const getStreamUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Assuming they just typed the filename that was placed in the public folder
    return `/${url}`;
  };

  return (
    <div className="room-wrapper">
      <div className="top-bar glass-panel">
        <div className="room-info">
          <h2>Room: <span>{roomId}</span></h2>
          <button className="icon-btn" onClick={copyRoomId} title="Copy Room ID">
            <Copy size={16} />
          </button>
        </div>
        <div className="user-info">
          <span>{userName} {isHost ? '(Host)' : ''}</span>
          <button className="btn btn-secondary leave-btn" onClick={onLeave}>
            <LogOut size={16} /> Leave
          </button>
        </div>
      </div>

      <div className="room-main">
        <div className="video-section">
          <div className="video-container glass-panel">
            {isHost && !videoUrl && (
              <div className="upload-overlay">
                <LinkIcon size={48} className="upload-icon" />
                <h3>Host a Movie</h3>
                <p>Paste a video URL (or put a movie file in the `frontend/public` folder and type its name, e.g. `movie.mp4`)</p>
                <form onSubmit={handleUrlSubmit} className="flex gap-2 mt-4">
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. movie.mp4 or https://..." 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                  <button type="submit" className="btn">Load Movie</button>
                </form>
              </div>
            )}
            
            {!isHost && !videoUrl && (
              <div className="waiting-overlay">
                <div className="spinner"></div>
                <h3>Waiting for host...</h3>
                <p>The host is getting the movie ready.</p>
              </div>
            )}

            <video 
              ref={videoRef} 
              className={`main-video ${!videoUrl ? 'hidden' : ''}`}
              controls={isHost} // Only host gets controls to prevent viewers from desyncing themselves
              src={getStreamUrl(videoUrl)}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={handleSeek}
            />
          </div>
        </div>

        <div className="chat-section glass-panel">
          <div className="chat-header">
            <h3>Live Chat</h3>
          </div>
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.system ? 'system' : ''} ${msg.senderId === socket?.id ? 'own' : ''}`}>
                {!msg.system && <span className="sender">{msg.senderName}</span>}
                <div className="bubble">{msg.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form className="chat-input-area" onSubmit={sendChat}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Type a message..." 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="btn send-btn">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Room;
