import { useState } from 'react';
import { Film, Users, ArrowRight, Play, MessageCircle, Zap } from 'lucide-react';
import './Landing.css';

const Landing = ({ onJoin }) => {
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState('create'); // 'create' or 'join'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userName.trim()) return;
    if (mode === 'join' && !roomId.trim()) return;

    const finalRoomId = mode === 'create'
      ? Math.random().toString(36).substring(2, 8).toUpperCase()
      : roomId.trim().toUpperCase();

    onJoin({ userName: userName.trim(), roomId: finalRoomId, isHost: mode === 'create' });
  };

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="nav-logo">
          <Film size={24} />
          <span>MoveShare</span>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge">
          <Zap size={14} /> Real-time synchronized playback
        </div>
        <h1>Watch Movies<br /><span className="gradient-text">Together</span></h1>
        <p className="hero-sub">
          Create a room, paste any video URL, invite your friends — everyone watches in perfect sync with live chat.
        </p>

        <div className="action-card glass">
          <div className="mode-tabs">
            <button
              className={`mode-tab ${mode === 'create' ? 'active' : ''}`}
              onClick={() => setMode('create')}
              type="button"
            >
              <Play size={16} /> Create Room
            </button>
            <button
              className={`mode-tab ${mode === 'join' ? 'active' : ''}`}
              onClick={() => setMode('join')}
              type="button"
            >
              <Users size={16} /> Join Room
            </button>
          </div>

          <form onSubmit={handleSubmit} className="action-form">
            <div className="field">
              <label>Your Name</label>
              <input
                className="input"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </div>
            {mode === 'join' && (
              <div className="field">
                <label>Room Code</label>
                <input
                  className="input"
                  placeholder="e.g. ABC123"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  required
                />
              </div>
            )}
            <button type="submit" className="btn btn-primary submit-btn">
              {mode === 'create' ? 'Create Room' : 'Join Room'} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </section>

      <section className="features">
        <div className="feature glass">
          <div className="feature-icon"><Play size={24} /></div>
          <h3>Any Video Source</h3>
          <p>YouTube, Vimeo, Twitch, direct MP4 links — paste any URL and start watching.</p>
        </div>
        <div className="feature glass">
          <div className="feature-icon"><Zap size={24} /></div>
          <h3>Perfect Sync</h3>
          <p>Play, pause, and seek in real-time. Everyone stays on the exact same frame.</p>
        </div>
        <div className="feature glass">
          <div className="feature-icon"><MessageCircle size={24} /></div>
          <h3>Live Chat</h3>
          <p>React to every scene together with built-in live messaging.</p>
        </div>
      </section>
    </div>
  );
};

export default Landing;
