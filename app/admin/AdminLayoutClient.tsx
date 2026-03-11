'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <>
      {!isLogin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e5e8eb', position: 'sticky', top: 0, zIndex: 100 }}>
          <Link href="/admin" style={{
            padding: '6px 18px', borderRadius: 8, fontSize: 14, fontWeight: pathname === '/admin' ? 700 : 500,
            background: pathname === '/admin' ? '#3182f6' : '#f2f4f6',
            color: pathname === '/admin' ? '#fff' : '#4e5968',
            textDecoration: 'none',
          }}>
            학점은행제
          </Link>
          <Link href="/admin/private-cert" style={{
            padding: '6px 18px', borderRadius: 8, fontSize: 14, fontWeight: pathname === '/admin/private-cert' ? 700 : 500,
            background: pathname === '/admin/private-cert' ? '#3182f6' : '#f2f4f6',
            color: pathname === '/admin/private-cert' ? '#fff' : '#4e5968',
            textDecoration: 'none',
          }}>
            민간자격증
          </Link>
          <Link href="/admin/stats" style={{
            padding: '6px 18px', borderRadius: 8, fontSize: 14, fontWeight: pathname === '/admin/stats' ? 700 : 500,
            background: pathname === '/admin/stats' ? '#3182f6' : '#f2f4f6',
            color: pathname === '/admin/stats' ? '#fff' : '#4e5968',
            textDecoration: 'none',
          }}>
            통계
          </Link>
          <div style={{ flex: 1 }} />
          <button onClick={handleLogout} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: '#f2f4f6', color: '#4e5968', border: 'none', cursor: 'pointer',
          }}>
            로그아웃
          </button>
        </div>
      )}
      {children}
      <style>{`footer { display: none !important; }`}</style>
    </>
  );
}
