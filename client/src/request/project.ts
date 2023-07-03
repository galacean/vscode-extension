import { EProjectAssetType } from '@/constants';
import { request } from './requests';
import * as FormData from 'form-data';
import { Readable } from 'stream';

export function getProjectList(pageNo = 0, pageSize = 20) {
  return request<IPaginationResponse<IProjectListItem>>({
    method: 'GET',
    url: '/api/project/list',
    params: { pageNo, pageSize },
  });
}

export function fetchProjectAssetList(params: {
  projectId: number;
  type?: EProjectAssetType;
  pagination?: IPaginationParams;
}) {
  return request<IPaginationResponse<IProjectAsset>>({
    method: 'GET',
    url: `/api/project/${params.projectId}/asset/list`,
    params: { type: params.type, ...params.pagination },
  });
}

export function updateProjectAsset(
  assetId: number,
  pairs?: Partial<IProjectAsset>,
  assetContent?: {
    buffer: Buffer;
    filename: string;
  }
) {
  if (!assetContent) {
    return request<IProjectAsset>({
      method: 'POST',
      url: '/api/project/asset/update',
      data: { assetId, pairs },
    });
  } else {
    const form = new FormData();
    form.append('assetId', assetId);
    for (const k in pairs) {
      form.append(k, pairs[k]);
    }
    form.append('file', Readable.from(assetContent.buffer), {
      filename: assetContent.filename,
    });
    return request<IProjectAsset>({
      method: 'POST',
      url: '/api/project/asset/form/update',
      data: form,
      headers: form.getHeaders(),
    });
  }
}

export function createAsset(params: {
  info: ProjectAssetCreateInfo;
  assetContent?: {
    buffer: Buffer;
    filename: string;
  };
}) {
  if (params.assetContent) {
    const form = new FormData();
    for (const k in params.info) {
      form.append(k, params.info[k]);
    }
    form.append('file', Readable.from(params.assetContent.buffer), {
      filename: params.assetContent.filename,
    });
    return request<IProjectAsset>({
      method: 'POST',
      url: '/api/project/asset/form/create',
      data: form,
      headers: form.getHeaders(),
    });
  } else {
    return request<IProjectAsset>({
      method: 'POST',
      url: '/api/project/asset/create',
      data: params.info,
    });
  }
}
