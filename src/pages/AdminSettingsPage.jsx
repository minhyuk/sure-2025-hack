import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getHackathonSettings, updateHackathonSettings, getAnnouncements, createAnnouncement, deleteAnnouncement } from '../services/api';
import '../styles/AdminLayout.css';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    status: 'preparing',
    start_time: '',
    end_time: '',
    monitor_enabled: 'true'
  });
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const settingsData = await getHackathonSettings();
      setSettings(settingsData);

      try {
        const announcementsData = await getAnnouncements();
        setAnnouncements(announcementsData);
      } catch (err) {
        console.log('Announcements not available yet');
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      alert('설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateHackathonSettings(settings);
      alert('설정이 저장되었습니다!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      await createAnnouncement(newAnnouncement);
      setNewAnnouncement({ title: '', content: '', priority: 'normal' });
      loadData();
      alert('공지사항이 추가되었습니다!');
    } catch (error) {
      console.error('Failed to create announcement:', error);
      alert('공지사항 추가에 실패했습니다.');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;

    try {
      await deleteAnnouncement(id);
      loadData();
      alert('공지사항이 삭제되었습니다!');
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      alert('공지사항 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
          로딩 중...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <h1 className="admin-page-title">⚙️ 해커톤 설정</h1>
        <p className="admin-page-subtitle">해커톤 운영에 필요한 전반적인 설정을 관리합니다</p>
      </div>

      {/* Hackathon Status */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">🎬 해커톤 상태</h2>
          <p className="admin-card-description">현재 해커톤의 진행 상태를 설정합니다</p>
        </div>

        <div className="admin-form-group">
          <label className="admin-form-label">해커톤 상태</label>
          <div className="admin-radio-group">
            <label className="admin-radio-label">
              <input
                type="radio"
                name="status"
                value="preparing"
                checked={settings.status === 'preparing'}
                onChange={(e) => setSettings({ ...settings, status: e.target.value })}
              />
              <span>준비 중 (Preparing)</span>
            </label>
            <label className="admin-radio-label">
              <input
                type="radio"
                name="status"
                value="active"
                checked={settings.status === 'active'}
                onChange={(e) => setSettings({ ...settings, status: e.target.value })}
              />
              <span>진행 중 (Active)</span>
            </label>
            <label className="admin-radio-label">
              <input
                type="radio"
                name="status"
                value="ended"
                checked={settings.status === 'ended'}
                onChange={(e) => setSettings({ ...settings, status: e.target.value })}
              />
              <span>종료 (Ended)</span>
            </label>
          </div>
          <span className="admin-form-description">
            • 준비 중: start_time까지 D-day 카운터 표시<br/>
            • 진행 중: end_time까지 남은 시간 타이머 표시<br/>
            • 종료: 해커톤 종료 메시지 표시
          </span>
        </div>

        <div className="admin-form-group">
          <label className="admin-form-label">시작 시간</label>
          <input
            type="datetime-local"
            className="admin-input"
            value={settings.start_time}
            onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
          />
          <span className="admin-form-description">해커톤 공식 시작 시간</span>
        </div>

        <div className="admin-form-group">
          <label className="admin-form-label">종료 시간</label>
          <input
            type="datetime-local"
            className="admin-input"
            value={settings.end_time}
            onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
          />
          <span className="admin-form-description">해커톤 공식 종료 시간</span>
        </div>
      </div>

      {/* Dashboard Settings */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">🖥️ 대시보드 설정</h2>
          <p className="admin-card-description">모니터 화면 표시 옵션</p>
        </div>

        <div className="admin-form-group">
          <label className="admin-checkbox-label">
            <input
              type="checkbox"
              checked={settings.monitor_enabled === 'true'}
              onChange={(e) => setSettings({ ...settings, monitor_enabled: e.target.checked ? 'true' : 'false' })}
            />
            <span>모니터 대시보드 활성화</span>
          </label>
          <span className="admin-form-description">비활성화 시 대시보드가 표시되지 않습니다</span>
        </div>
      </div>

      <div className="admin-btn-group">
        <button onClick={handleSaveSettings} disabled={saving} className="admin-btn admin-btn-primary">
          {saving ? '저장 중...' : '💾 설정 저장하기'}
        </button>
      </div>

      {/* Announcements Section */}
      <div className="admin-card" style={{ marginTop: '32px' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">📢 공지사항 관리</h2>
          <p className="admin-card-description">해커톤 운영 중 참가자들에게 전달할 공지사항을 관리합니다</p>
        </div>

        {/* Add New Announcement */}
        <form onSubmit={handleAddAnnouncement}>
          <div className="admin-form-group">
            <label className="admin-form-label">제목</label>
            <input
              type="text"
              className="admin-input"
              placeholder="공지사항 제목"
              value={newAnnouncement.title}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">내용</label>
            <textarea
              className="admin-textarea"
              placeholder="공지사항 내용을 입력하세요..."
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">우선순위</label>
            <select
              className="admin-select"
              value={newAnnouncement.priority}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value })}
            >
              <option value="normal">일반</option>
              <option value="important">중요</option>
              <option value="urgent">긴급</option>
            </select>
          </div>

          <button type="submit" className="admin-btn admin-btn-primary">
            ➕ 공지사항 추가
          </button>
        </form>

        {/* Announcements List */}
        {announcements.length > 0 ? (
          <table className="admin-table" style={{ marginTop: '24px' }}>
            <thead>
              <tr>
                <th>우선순위</th>
                <th>제목</th>
                <th>내용</th>
                <th>등록일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map(announcement => (
                <tr key={announcement.id}>
                  <td>
                    <span className={`admin-status-badge ${announcement.priority === 'urgent' ? 'active' : ''}`}>
                      {announcement.priority === 'urgent' ? '🚨 긴급' : announcement.priority === 'important' ? '⚠️ 중요' : '📌 일반'}
                    </span>
                  </td>
                  <td style={{ color: '#F1F5F9', fontWeight: 600 }}>{announcement.title}</td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {announcement.content}
                  </td>
                  <td>{new Date(announcement.created_at).toLocaleString('ko-KR')}</td>
                  <td>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="admin-btn admin-btn-danger"
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      🗑️ 삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty-state" style={{ marginTop: '24px' }}>
            <div className="admin-empty-state-icon">📢</div>
            <h3 className="admin-empty-state-title">등록된 공지사항이 없습니다</h3>
            <p className="admin-empty-state-description">위 양식을 사용하여 첫 공지사항을 추가해보세요</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
