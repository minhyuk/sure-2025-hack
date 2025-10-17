import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getTopics, createTopic, updateTopic, deleteTopic } from '../services/api';
import '../styles/AdminLayout.css';

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTopic, setEditingTopic] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopic, setNewTopic] = useState({
    id: '',
    title: '',
    description: '',
    requirements: ''
  });

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const data = await getTopics();
      setTopics(data);
    } catch (error) {
      console.error('Failed to load topics:', error);
      alert('주제를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopic.id || !newTopic.title || !newTopic.description) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    try {
      await createTopic(newTopic);
      setShowCreateModal(false);
      setNewTopic({ id: '', title: '', description: '', requirements: '' });
      loadTopics();
      alert('새 주제가 생성되었습니다!');
    } catch (error) {
      console.error('Failed to create topic:', error);
      alert('주제 생성에 실패했습니다.');
    }
  };

  const handleUpdateTopic = async () => {
    if (!editingTopic) return;

    try {
      await updateTopic(editingTopic.id, editingTopic);
      setEditingTopic(null);
      loadTopics();
      alert('주제가 업데이트되었습니다!');
    } catch (error) {
      console.error('Failed to update topic:', error);
      alert('주제 업데이트에 실패했습니다.');
    }
  };

  const handleDeleteTopic = async (topicId, topicTitle) => {
    if (!confirm(`"${topicTitle}" 주제를 삭제하시겠습니까?\n\n⚠️ 주의: 이 주제에 속한 모든 팀도 함께 삭제됩니다!`)) return;

    try {
      await deleteTopic(topicId);
      loadTopics();
      alert('주제가 삭제되었습니다!');
    } catch (error) {
      console.error('Failed to delete topic:', error);
      alert('주제 삭제에 실패했습니다.');
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
        <h1 className="admin-page-title">📝 주제 관리</h1>
        <p className="admin-page-subtitle">해커톤 주제들을 관리합니다</p>
      </div>

      {/* Actions */}
      <div className="admin-card">
        <button
          onClick={() => setShowCreateModal(true)}
          className="admin-btn admin-btn-primary"
        >
          ➕ 새 주제 추가
        </button>
      </div>

      {/* Topics List */}
      {topics.map(topic => (
        <div key={topic.id} className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <h2 className="admin-card-title">
                Topic {topic.id}: {topic.title}
              </h2>
              <p className="admin-card-description" style={{ marginTop: '12px', whiteSpace: 'pre-line' }}>
                {topic.description}
              </p>
              {topic.requirements && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '8px' }}>
                    📌 요구사항:
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#94A3B8', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {topic.requirements}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
              <button
                onClick={() => setEditingTopic(topic)}
                className="admin-btn admin-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.75rem' }}
              >
                ✏️ 편집
              </button>
              <button
                onClick={() => handleDeleteTopic(topic.id, topic.title)}
                className="admin-btn admin-btn-danger"
                style={{ padding: '8px 16px', fontSize: '0.75rem' }}
              >
                🗑️ 삭제
              </button>
            </div>
          </div>

          {/* Team Count */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#94A3B8'
          }}>
            👥 참여 팀: <strong style={{ color: '#3B82F6' }}>{topic.team_count || 0}개</strong>
          </div>
        </div>
      ))}

      {topics.length === 0 && (
        <div className="admin-card">
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">📝</div>
            <h3 className="admin-empty-state-title">등록된 주제가 없습니다</h3>
            <p className="admin-empty-state-description">새 주제를 추가하여 해커톤을 시작해보세요</p>
          </div>
        </div>
      )}

      {/* Edit Topic Modal */}
      {editingTopic && (
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
          zIndex: 1000,
          padding: '20px',
          overflow: 'auto'
        }}>
          <div className="admin-card" style={{ width: '600px', maxWidth: '100%', margin: 'auto' }}>
            <div className="admin-card-header">
              <h2 className="admin-card-title">✏️ 주제 수정</h2>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">주제 번호</label>
              <input
                type="number"
                className="admin-input"
                value={editingTopic.id}
                disabled
                style={{ background: '#0F172A', opacity: 0.6, cursor: 'not-allowed' }}
              />
              <span className="admin-form-description">주제 번호는 수정할 수 없습니다</span>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">제목 *</label>
              <input
                type="text"
                className="admin-input"
                placeholder="주제 제목 입력"
                value={editingTopic.title}
                onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">설명 *</label>
              <textarea
                className="admin-textarea"
                placeholder="주제에 대한 상세 설명을 입력하세요..."
                value={editingTopic.description}
                onChange={(e) => setEditingTopic({ ...editingTopic, description: e.target.value })}
                style={{ minHeight: '120px' }}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">요구사항</label>
              <textarea
                className="admin-textarea"
                placeholder="예시:&#10;- 웹 기반 애플리케이션&#10;- REST API 구현&#10;- 사용자 인증 기능"
                value={editingTopic.requirements || ''}
                onChange={(e) => setEditingTopic({ ...editingTopic, requirements: e.target.value })}
                style={{ minHeight: '150px' }}
              />
              <span className="admin-form-description">각 요구사항을 줄바꿈으로 구분하세요</span>
            </div>

            <div className="admin-btn-group">
              <button onClick={handleUpdateTopic} className="admin-btn admin-btn-primary">
                💾 저장하기
              </button>
              <button onClick={() => setEditingTopic(null)} className="admin-btn admin-btn-secondary">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Topic Modal */}
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
          zIndex: 1000,
          padding: '20px',
          overflow: 'auto'
        }}>
          <div className="admin-card" style={{ width: '600px', maxWidth: '100%', margin: 'auto' }}>
            <div className="admin-card-header">
              <h2 className="admin-card-title">➕ 새 주제 추가</h2>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">주제 번호 *</label>
              <input
                type="number"
                className="admin-input"
                placeholder="예: 1, 2, 3..."
                value={newTopic.id}
                onChange={(e) => setNewTopic({ ...newTopic, id: e.target.value })}
              />
              <span className="admin-form-description">고유한 주제 번호를 입력하세요</span>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">제목 *</label>
              <input
                type="text"
                className="admin-input"
                placeholder="주제 제목 입력"
                value={newTopic.title}
                onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">설명 *</label>
              <textarea
                className="admin-textarea"
                placeholder="주제에 대한 상세 설명을 입력하세요..."
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                style={{ minHeight: '120px' }}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">요구사항</label>
              <textarea
                className="admin-textarea"
                placeholder="예시:&#10;- 웹 기반 애플리케이션&#10;- REST API 구현&#10;- 사용자 인증 기능"
                value={newTopic.requirements}
                onChange={(e) => setNewTopic({ ...newTopic, requirements: e.target.value })}
                style={{ minHeight: '150px' }}
              />
              <span className="admin-form-description">각 요구사항을 줄바꿈으로 구분하세요</span>
            </div>

            <div className="admin-btn-group">
              <button onClick={handleCreateTopic} className="admin-btn admin-btn-primary">
                ➕ 주제 생성하기
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
