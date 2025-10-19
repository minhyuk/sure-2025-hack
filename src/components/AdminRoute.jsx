import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }) {
  // localStorage에서 관리자 인증 확인
  const isAdmin = localStorage.getItem('adminAuth') === 'true';

  // 관리자가 아니면 홈으로 리다이렉트
  if (!isAdmin) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#F1F5F9',
        padding: '24px'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔒</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
          관리자 로그인이 필요합니다
        </h1>
        <p style={{ color: '#94A3B8', marginBottom: '24px' }}>
          관리자 페이지에 접근하려면 설정 버튼을 눌러 로그인하세요.
        </p>
        <a
          href="/"
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            transition: 'transform 0.2s ease'
          }}
        >
          홈으로 돌아가기
        </a>
      </div>
    );
  }

  return children;
}
