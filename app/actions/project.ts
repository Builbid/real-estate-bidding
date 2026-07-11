'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteOwnerProjectAction(
  projectId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) return { error: 'Not authenticated.' }

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id, owner_id')
    .eq('id', projectId)
    .single()

  if (fetchError || !project) return { error: 'Project not found.' }
  if (project.owner_id !== user.id) {
    return { error: 'You can only delete your own projects.' }
  }

  const { data: deleted, error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('owner_id', user.id)
    .select('id')

  if (!deleteError && deleted && deleted.length > 0) {
    revalidatePath('/dashboard/owner')
    revalidatePath(`/dashboard/owner/project/${projectId}`)
    return { error: null }
  }

  try {
    const admin = createAdminClient()
    const { data: adminDeleted, error: adminError } = await admin
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .select('id')

    if (adminError || !adminDeleted?.length) {
      return {
        error:
          deleteError?.message
          ?? adminError?.message
          ?? 'Could not delete project. Please try again.',
      }
    }

    revalidatePath('/dashboard/owner')
    revalidatePath(`/dashboard/owner/project/${projectId}`)
    return { error: null }
  } catch {
    return {
      error:
        deleteError?.message
        ?? 'Could not delete project. Please try again or contact support.',
    }
  }
}
