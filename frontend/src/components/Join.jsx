import React, { useState } from 'react';
import { Video, Users, ArrowRight } from 'lucide-react';
import './Join.css';

const Join = ({ onJoin }) => {
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isHost, setIsHost] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userName.trim()) return;
    
    // If hosting, generate a random room ID if none provided
    const finalRoomId = isHost ? (roomId || Math.random().toString(36).substring(2, 8).toUpperCase()) : roomId;
    
    if (!isHost && !finalRoomId) return;

    onJoin({ userName, roomId: finalRoomId, isHost });
  };

  return (
    <div className="join-wrapper">
      <div className="join-container glass-panel">
        <div className="join-header">
          <div className="logo">
            <Video size={32} color="var(--accent)" />
            <h1>MoveShare</h1>
          </div>
          <p>Watch movies together, seamlessly.</p>
        </div>

        <div className="tab-switcher">
          <button 
            className={`tab ${isHost ? 'active' : ''}`}
            onClick={() => setIsHost(true)}
            type="button"
          >
            <Video size={18} /> Host a Room
          </button>
          <button 
            className={`tab ${!isHost ? 'active' : ''}`}
            onClick={() => setIsHost(false)}
            type="button"
          >
            <Users size={18} /> Join a Room
          </button>
        </div>

        <form onSubmit={handleSubmit} className="join-form">
          <div className="form-group">
            <label>Your Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>{isHost ? 'Room ID (Optional)' : 'Room ID'}</label>
            <input
              type="text"
              className="input-field"
              placeholder={isHost ? 'Leave blank to generate' : 'Enter room ID'}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              required={!isHost}
            />
          </div>

          <button type="submit" className="btn submit-btn">
            {isHost ? 'Start Hosting' : 'Join Room'} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Join;
