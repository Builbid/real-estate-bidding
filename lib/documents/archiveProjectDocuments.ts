import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildMistriAgreementPayload,
  generateMistriAgreementPdfBytes,
  isMistriCivilService,
} from '@/lib/contract/mistriAgreement';
import {
  documentFileName,
  documentStoragePath,
  isNumericProjectId,
  PROJECT_DOCUMENTS_BUCKET,
  type ProjectDocumentType,
} from '@/lib/documents/constants';
import { generateProjectDocumentPdfBytes } from '@/lib/documents/pdf';
import { generateNumericProjectId } from '@/lib/project/numericId';
import { formatPackageRateRange } from '@/lib/firm/bidDisplay';
import type { BidRates, PackageBidPrice, SubConfiguration, TrackType } from '@/lib/types';
import type { ConstructionTypesMap } from '@/lib/buildingConfig';

type ExistingDoc = { document_type: ProjectDocumentType };

function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('pdf')) return 'pdf';
  return 'bin';
}

async function ensureNumericId(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  current: string | null | undefined,
): Promise<string> {
  if (isNumericProjectId(current)) return current.trim();

  for (let i = 0; i < 8; i += 1) {
    const candidate = generateNumericProjectId();
    const { error } = await admin
      .from('projects')
      .update({ numeric_id: candidate })
      .eq('id', projectId)
      .is('numeric_id', null);
    if (!error) {
      const { data } = await admin
        .from('projects')
        .select('numeric_id')
        .eq('id', projectId)
        .maybeSingle();
      if (isNumericProjectId(data?.numeric_id)) return data.numeric_id.trim();
    }
  }

  const { data } = await admin
    .from('projects')
    .select('numeric_id')
    .eq('id', projectId)
    .maybeSingle();
  if (isNumericProjectId(data?.numeric_id)) return data.numeric_id.trim();

  throw new Error('Could not assign a numeric project ID.');
}

async function uploadAndInsert(options: {
  admin: ReturnType<typeof createAdminClient>;
  projectId: string;
  numericId: string;
  projectName: string;
  ownerId: string;
  workerId: string | null;
  type: ProjectDocumentType;
  bytes: Uint8Array;
  mimeType: string;
  ext: string;
}): Promise<void> {
  const fileName = documentFileName(options.type, options.numericId, options.ext);
  const storagePath = documentStoragePath(options.numericId, options.type, options.ext);

  const { error: uploadError } = await options.admin.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .upload(storagePath, options.bytes, {
      upsert: true,
      contentType: options.mimeType,
      cacheControl: '3600',
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to store document backup.');
  }

  const { error: insertError } = await options.admin.from('project_documents').insert({
    project_id: options.projectId,
    numeric_project_id: options.numericId,
    project_name: options.projectName,
    document_type: options.type,
    file_name: fileName,
    storage_path: storagePath,
    mime_type: options.mimeType,
    owner_id: options.ownerId,
    worker_id: options.workerId,
  });

  if (insertError && !insertError.message.toLowerCase().includes('duplicate')) {
    throw insertError;
  }
}

function formatBidSummary(options: {
  serviceType: string | null;
  singleRate: number | null;
  totalSum: number | null;
  packageRates: PackageBidPrice[] | null;
  rates: BidRates | null;
}): string {
  const packageRange = formatPackageRateRange(options.packageRates);
  if (packageRange) return packageRange;
  const value = options.singleRate ?? options.totalSum;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'See awarded bid on BuilBid';
  const service = (options.serviceType ?? '').toLowerCase();
  if (service === 'plumber') {
    return options.rates?.bid_unit === 'per_running_foot'
      ? `Rs. ${value.toLocaleString('en-IN')} / Rft`
      : `Rs. ${value.toLocaleString('en-IN')}`;
  }
  if (service === 'electrician') return `Rs. ${value.toLocaleString('en-IN')} / point`;
  return `Rs. ${value.toLocaleString('en-IN')} / sqft`;
}

export async function archiveAwardedProjectDocuments(options: {
  projectId: string;
  agreementPdf?: { bytes: Uint8Array };
}): Promise<void> {
  const admin = createAdminClient();

  const { data: project, error: projectError } = await admin
    .from('projects')
    .select(
      'id, owner_id, title, district, state, pincode, description, track_type, sub_configuration, building_types, construction_types, total_floors, plot_area_sqft, floor_area_sqft, mistri_details, service_type, selected_builder_id, selected_package, drawing_url, numeric_id',
    )
    .eq('id', options.projectId)
    .maybeSingle();

  if (projectError || !project?.owner_id || !project.selected_builder_id) return;

  const numericId = await ensureNumericId(admin, project.id, project.numeric_id);
  const projectName = project.title?.trim() || 'Untitled project';
  const workerId = project.selected_builder_id as string;

  const { data: existingRows } = await admin
    .from('project_documents')
    .select('document_type')
    .eq('project_id', project.id);

  const have = new Set(
    ((existingRows ?? []) as ExistingDoc[]).map((row) => row.document_type),
  );

  const [{ data: ownerRow }, { data: workerRow }] = await Promise.all([
    admin.from('profiles').select('full_name, email, mobile, physical_address').eq('id', project.owner_id).maybeSingle(),
    admin
      .from('profiles')
      .select('full_name, email, mobile, physical_address, company_name, gst_number, years_in_business, is_verified, role')
      .eq('id', workerId)
      .maybeSingle(),
  ]);

  const { data: winningBid } = await admin
    .from('bids')
    .select('id, total_sum_metric, single_rate, package_rates, rates')
    .eq('project_id', project.id)
    .eq('builder_id', workerId)
    .limit(1)
    .maybeSingle();

  const bidSummary = formatBidSummary({
    serviceType: project.service_type ?? null,
    singleRate: winningBid?.single_rate ?? null,
    totalSum: winningBid?.total_sum_metric ?? null,
    packageRates: (winningBid?.package_rates as PackageBidPrice[] | null) ?? null,
    rates: (winningBid?.rates as BidRates | null) ?? null,
  });

  const generatedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  if (!have.has('agreement')) {
    let agreementBytes = options.agreementPdf?.bytes ?? null;
    if (!agreementBytes && isMistriCivilService(project.service_type)) {
      try {
        const payload = buildMistriAgreementPayload({
          project: {
            id: project.id,
            numeric_id: numericId,
            title: project.title,
            district: project.district,
            state: project.state,
            pincode: project.pincode,
            description: project.description,
            track_type: project.track_type as TrackType,
            sub_configuration: (project.sub_configuration ?? {}) as SubConfiguration,
            building_types: project.building_types,
            construction_types: (project.construction_types ?? null) as ConstructionTypesMap | null,
            total_floors: project.total_floors,
            plot_area_sqft: project.plot_area_sqft,
            floor_area_sqft: project.floor_area_sqft,
            mistri_details: project.mistri_details,
            service_type: project.service_type,
          },
          bid: winningBid
            ? {
                id: winningBid.id,
                single_rate: winningBid.single_rate,
                total_sum_metric: winningBid.total_sum_metric,
                rates: winningBid.rates as BidRates | null,
              }
            : null,
          owner: {
            name: ownerRow?.full_name ?? 'Client',
            email: ownerRow?.email,
            mobile: ownerRow?.mobile,
            address: ownerRow?.physical_address,
          },
          mistri: {
            name: workerRow?.full_name ?? 'Worker',
            email: workerRow?.email,
            mobile: workerRow?.mobile,
            address: workerRow?.physical_address,
            companyName: workerRow?.company_name,
            gstNumber: workerRow?.gst_number ?? null,
            yearsInBusiness: workerRow?.years_in_business ?? null,
            isVerified: workerRow?.is_verified ?? null,
            platformId: workerId,
          },
        });
        agreementBytes = generateMistriAgreementPdfBytes(payload);
      } catch (err) {
        console.error('Agreement PDF archive failed (falling back to award record):', err);
      }
    }

    if (!agreementBytes) {
      agreementBytes = generateProjectDocumentPdfBytes({
        title: 'PROJECT AGREEMENT COPY',
        subtitle: 'Official awarded-project record  |  Shared homeowner & worker copy',
        numericProjectId: numericId,
        projectName,
        notice:
          'This agreement copy is generated when a worker or firm is selected. Both parties see the same Project ID on every related file.',
        rows: [
          { label: 'Project ID', value: numericId },
          { label: 'Location', value: [project.district, project.state, project.pincode].filter(Boolean).join(', ') || '—' },
          { label: 'Homeowner', value: ownerRow?.full_name ?? '—' },
          { label: 'Worker / firm', value: workerRow?.company_name || workerRow?.full_name || '—' },
          { label: 'Service', value: project.service_type ?? '—' },
          { label: 'Awarded bid', value: bidSummary },
          { label: 'Generated', value: generatedAt },
        ],
      });
    }

    await uploadAndInsert({
      admin,
      projectId: project.id,
      numericId,
      projectName,
      ownerId: project.owner_id,
      workerId,
      type: 'agreement',
      bytes: agreementBytes,
      mimeType: 'application/pdf',
      ext: 'pdf',
    });
  }

  if (!have.has('estimate')) {
    const selectedPackage = project.selected_package as PackageBidPrice | null;
    const estimateBytes = generateProjectDocumentPdfBytes({
      title: 'COST ESTIMATE PDF',
      subtitle: 'Awarded bid estimate  |  Shared homeowner & worker copy',
      numericProjectId: numericId,
      projectName,
      notice:
        'This cost estimate is stored with the same numeric Project ID as the agreement and any AI design files for this project.',
      rows: [
        { label: 'Project ID', value: numericId },
        { label: 'Homeowner', value: ownerRow?.full_name ?? '—' },
        { label: 'Worker / firm', value: workerRow?.company_name || workerRow?.full_name || '—' },
        { label: 'Service', value: project.service_type ?? '—' },
        { label: 'Awarded bid', value: bidSummary },
        {
          label: 'Selected package',
          value: selectedPackage?.package?.name
            ? `${selectedPackage.package.name} — Rs. ${selectedPackage.rate.toLocaleString('en-IN')}/sqft`
            : '—',
        },
        { label: 'District', value: project.district ?? '—' },
        { label: 'Generated', value: generatedAt },
      ],
    });

    await uploadAndInsert({
      admin,
      projectId: project.id,
      numericId,
      projectName,
      ownerId: project.owner_id,
      workerId,
      type: 'estimate',
      bytes: estimateBytes,
      mimeType: 'application/pdf',
      ext: 'pdf',
    });
  }

  if (!have.has('ai_design') && project.drawing_url) {
    try {
      const response = await fetch(project.drawing_url);
      if (response.ok) {
        const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/pdf';
        const ext = extFromMime(mimeType);
        const bytes = new Uint8Array(await response.arrayBuffer());
        await uploadAndInsert({
          admin,
          projectId: project.id,
          numericId,
          projectName,
          ownerId: project.owner_id,
          workerId,
          type: 'ai_design',
          bytes,
          mimeType,
          ext,
        });
      } else {
        throw new Error(`Drawing fetch failed (${response.status})`);
      }
    } catch (err) {
      console.warn('AI design file copy failed — storing source URL as backup record:', err);
      const { error: insertError } = await admin.from('project_documents').insert({
        project_id: project.id,
        numeric_project_id: numericId,
        project_name: projectName,
        document_type: 'ai_design',
        file_name: documentFileName('ai_design', numericId, 'pdf'),
        file_url: project.drawing_url,
        mime_type: 'application/pdf',
        owner_id: project.owner_id,
        worker_id: workerId,
      });
      if (insertError && !insertError.message.toLowerCase().includes('duplicate')) {
        console.error('AI design record insert failed:', insertError);
      }
    }
  }
}

/** Backfill document backups for awarded projects belonging to the signed-in user. */
export async function backfillUserProjectDocuments(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: projects } = await admin
      .from('projects')
      .select('id')
      .not('selected_builder_id', 'is', null)
      .or(`owner_id.eq.${userId},selected_builder_id.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (!projects?.length) return;

    const ids = projects.map((p) => p.id);
    const { data: existing } = await admin
      .from('project_documents')
      .select('project_id, document_type')
      .in('project_id', ids);

    const complete = new Set<string>();
    const byProject = new Map<string, Set<string>>();
    for (const row of existing ?? []) {
      const set = byProject.get(row.project_id) ?? new Set<string>();
      set.add(row.document_type);
      byProject.set(row.project_id, set);
    }
    for (const [projectId, types] of byProject) {
      if (types.has('agreement') && types.has('estimate')) {
        complete.add(projectId);
      }
    }

    const missing = projects.filter((p) => !complete.has(p.id)).slice(0, 8);
    for (const project of missing) {
      try {
        await archiveAwardedProjectDocuments({ projectId: project.id });
      } catch (err) {
        console.error('Document backfill failed for project', project.id, err);
      }
    }
  } catch (err) {
    console.error('Document backfill skipped:', err);
  }
}
