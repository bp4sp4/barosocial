import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const TABLE = 'private_cert_consultations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
    }

    const isValidDate = (v: unknown) => {
      if (!v || typeof v !== 'string') return false;
      const d = new Date(v);
      return !isNaN(d.getTime());
    };

    const insertData = rows.map((r: Record<string, unknown>) => ({
      name: r.name,
      contact: r.contact,
      major_category: r.major_category || null,
      hope_course: r.hope_course || null,
      click_source: r.click_source || null,
      reason: r.reason || null,
      memo: r.memo || null,
      status: r.status || '상담대기',
      manager: r.manager || null,
      residence: r.residence || null,
      counsel_check: r.counsel_check || null,
      subject_cost: r.subject_cost || null,
      ...(isValidDate(r.applied_at) ? { created_at: r.applied_at } : {}),
    }));

    const { error } = await supabaseAdmin.from(TABLE).insert(insertData);

    if (error) {
      console.error('Bulk insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Success', count: insertData.length }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
