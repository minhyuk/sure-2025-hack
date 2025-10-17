import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getTeams, getTopics, deleteTeam, updateTeam, createTeam } from '../services/api';
import '../styles/AdminLayout.css';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: '',
    topic_id: '',
    color: '#3B82F6',
    current_stage: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsData, topicsData] = await Promise.all([
        getTeams(),
        getTopics()
      ]);
      setTeams(teamsData);
      setTopics(topicsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!confirm(`"${teamName}" 팀을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    try {
      await deleteTeam(teamId);
      loadData();
      alert('팀이 삭제되었습니다!');
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert('팀 삭제에 실패했습니다.');
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;

    try {
      await updateTeam(editingTeam.id, editingTeam);
      setEditingTeam(null);
      loadData();
      alert('팀 정보가 업데이트되었습니다!');
    } catch (error) {
      console.error('Failed to update team:', error);
      alert('팀 업데이트에 실패했습니다.');
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name || !newTeam.topic_id) {
      alert('팀 이름과 주제를 선택해주세요.');
      return;
    }

    try {
      await createTeam(newTeam);
      setShowCreateModal(false);
      setNewTeam({ name: '', topic_id: '', color: '#3B82F6', current_stage: 1 });
      loadData();
      alert('새 팀이 생성되었습니다!');
    } catch (error) {
      console.error('Failed to create team:', error);
      alert('팀 생성에 실패했습니다.');
    }
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || team.topic_id === parseInt(filter);
    return matchesSearch && matchesFilter;
  });

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
        <h1 className="admin-page-title">👥 팀 관리</h1>
        <p className="admin-page-subtitle">해커톤에 참여하는 팀들을 관리합니다</p>
      </div>

      {/* Filters and Actions */}
      <div className="admin-card">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              className="admin-input"
              placeholder="🔍 팀 이름 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ minWidth: '200px' }}>
            <select
              className="admin-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">전체 주제</option>
              {topics.map(topic => (
                <option key={topic.id} value={topic.id}>
                  Topic {topic.id}: {topic.title}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="admin-btn admin-btn-primary"
          >
            ➕ 새 팀 추가
          </button>
        </div>
      </div>

      {/* Teams Table */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">팀 목록 ({filteredTeams.length}개)</h2>
        </div>

        {filteredTeams.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>팀 이름</th>
                <th>주제</th>
                <th>진행률</th>
                <th>단계</th>
                <th>팀원</th>
                <th>색상</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map(team => (
                <tr key={team.id}>
                  <td style={{ color: '#F1F5F9', fontWeight: 600 }}>
                    <span style={{ color: team.color, marginRight: '8px' }}>●</span>
                    {team.name}
                  </td>
                  <td>
                    {topics.find(t => t.id === team.topic_id)?.title || `Topic ${team.topic_id}`}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        flex: 1,
                        height: '8px',
                        background: '#334155',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${team.current_stage * 10}%`,
                          height: '100%',
                          background: team.color,
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        {team.current_stage * 10}%
                      </span>
                    </div>
                  </td>
                  <td>{team.current_stage}/10</td>
                  <td>{team.member_count || 0}명</td>
                  <td>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      background: team.color,
                      borderRadius: '4px',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }} />
                  </td>
                  <td>
                    <span className={`admin-status-badge ${team.status === 'active' ? 'active' : 'inactive'}`}>
                      {team.status === 'active' ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setEditingTeam(team)}
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        ✏️ 편집
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="admin-btn admin-btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        🗑️ 삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">👥</div>
            <h3 className="admin-empty-state-title">팀이 없습니다</h3>
            <p className="admin-empty-state-description">
              {searchQuery || filter !== 'all' ? '검색 조건에 맞는 팀이 없습니다' : '새 팀을 추가해보세요'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Team Modal */}
      {editingTeam && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="admin-card" style={{ width: '500px', maxWidth: '90%', margin: 0 }}>
            <div className="admin-card-header">
              <h2 className="admin-card-title">✏️ 팀 정보 수정</h2>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">팀 이름</label>
              <input
                type="text"
                className="admin-input"
                value={editingTeam.name}
                onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">주제</label>
              <select
                className="admin-select"
                value={editingTeam.topic_id}
                onChange={(e) => setEditingTeam({ ...editingTeam, topic_id: parseInt(e.target.value) })}
              >
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    Topic {topic.id}: {topic.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">현재 단계 (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                className="admin-input"
                value={editingTeam.current_stage}
                onChange={(e) => setEditingTeam({ ...editingTeam, current_stage: parseInt(e.target.value) })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">팀 색상</label>
              <input
                type="color"
                className="admin-input"
                value={editingTeam.color}
                onChange={(e) => setEditingTeam({ ...editingTeam, color: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">상태</label>
              <select
                className="admin-select"
                value={editingTeam.status}
                onChange={(e) => setEditingTeam({ ...editingTeam, status: e.target.value })}
              >
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
                <option value="completed">완료</option>
              </select>
            </div>

            <div className="admin-btn-group">
              <button onClick={handleUpdateTeam} className="admin-btn admin-btn-primary">
                💾 저장하기
              </button>
              <button onClick={() => setEditingTeam(null)} className="admin-btn admin-btn-secondary">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="admin-card" style={{ width: '500px', maxWidth: '90%', margin: 0 }}>
            <div className="admin-card-header">
              <h2 className="admin-card-title">➕ 새 팀 추가</h2>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">팀 이름</label>
              <input
                type="text"
                className="admin-input"
                placeholder="팀 이름 입력"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">주제</label>
              <select
                className="admin-select"
                value={newTeam.topic_id}
                onChange={(e) => setNewTeam({ ...newTeam, topic_id: parseInt(e.target.value) })}
              >
                <option value="">주제 선택</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    Topic {topic.id}: {topic.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">팀 색상</label>
              <input
                type="color"
                className="admin-input"
                value={newTeam.color}
                onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
              />
            </div>

            <div className="admin-btn-group">
              <button onClick={handleCreateTeam} className="admin-btn admin-btn-primary">
                ➕ 팀 생성하기
              </button>
              <button onClick={() => setShowCreateModal(false)} className="admin-btn admin-btn-secondary">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
