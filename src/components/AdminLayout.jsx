import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/AdminLayout.css';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/admin/settings', icon: '⚙️', label: '해커톤 설정' },
    { path: '/admin/teams', icon: '👥', label: '팀 관리' },
    { path: '/admin/topics', icon: '📝', label: '주제 관리' }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>🔐 관리자</h2>
          <p>SURE HACKERTON 2025</p>
        </div>

        <nav className="admin-nav">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link to="/monitor" className="admin-nav-item">
            <span className="admin-nav-icon">🖥️</span>
            <span className="admin-nav-label">대시보드 보기</span>
          </Link>
          <Link to="/" className="admin-nav-item">
            <span className="admin-nav-icon">🏠</span>
            <span className="admin-nav-label">홈으로</span>
          </Link>
          <button onClick={handleLogout} className="admin-nav-item admin-logout">
            <span className="admin-nav-icon">🚪</span>
            <span className="admin-nav-label">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
