import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const TABLE = 'private_cert_consultations';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching private cert consultations:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contact, education, hope_course, reason, click_source, residence, subject_cost, manager, memo, counsel_check, status } = body;

    if (!name || !contact) {
      return NextResponse.json({ error: 'Name and contact are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert([{
        name,
        contact,
        education: education || null,
        hope_course: hope_course || null,
        reason: reason || null,
        click_source: click_source || null,
        residence: residence || null,
        subject_cost: subject_cost || null,
        manager: manager || null,
        memo: memo || null,
        counsel_check: counsel_check || null,
        status: status || '상담대기',
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Success', data }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, memo, name, contact, education, reason, click_source, subject_cost, manager, residence, counsel_check, hope_course } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) updateData.status = status;
    if (memo !== undefined) updateData.memo = memo;
    if (name !== undefined) updateData.name = name;
    if (contact !== undefined) updateData.contact = contact;
    if (education !== undefined) updateData.education = education || null;
    if (reason !== undefined) updateData.reason = reason || null;
    if (click_source !== undefined) updateData.click_source = click_source || null;
    if (subject_cost !== undefined) updateData.subject_cost = subject_cost || null;
    if (manager !== undefined) updateData.manager = manager || null;
    if (residence !== undefined) updateData.residence = residence || null;
    if (counsel_check !== undefined) updateData.counsel_check = counsel_check || null;
    if (hope_course !== undefined) updateData.hope_course = hope_course || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'At least one field required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Updated', data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .in('id', ids)
      .select();

    if (error) {
      console.error('Error deleting:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Deleted', data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
